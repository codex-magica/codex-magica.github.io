// Google Drive access from the browser, with no server of our own.
//
// Sign-in uses Google Identity Services' token client: a Google popup asks once for the
// `drive.appdata` permission (a hidden folder only this app can see in the user's own Drive), plus the
// user's email (to show which account syncs and to skip Google's account chooser later). It returns an
// access token that lasts about an hour; browser-only apps get no refresh token.
//
// Renewal without a tap: a popup needs a tap, but a page navigation doesn't. So at safe moments the app
// navigates to Google's authorization endpoint with `prompt=none` and comes straight back with a new
// token in the URL fragment, as long as the user's Google session is alive (usually weeks). Google calls
// this endpoint legacy; if it ever stops working, the app falls back to the tap.
//
// The token is kept in localStorage until it expires, so reloads within the hour don't ask again.
//
// The OAuth client ID comes from VITE_GOOGLE_CLIENT_ID at build time. Without it the feature is
// simply absent (forks and local builds stay local-only). See docs/google-drive-sync.md.

export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";
export const driveSyncAvailable = (): boolean => GOOGLE_CLIENT_ID !== "";

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const SCOPES = `${SCOPE} openid email`;
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const RETURN_KEY = "magus.driveReturn.v1";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const TOKEN_KEY = "magus.driveToken.v1";
export const FILE_NAME = "codex-magica-roster.json";

// ── Google Identity Services (minimal typing of what we use) ─────────────────────────────────────
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken: (o?: { prompt?: string; login_hint?: string }) => void;
}
interface GoogleOAuth2 {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: { type: string; message?: string }) => void;
  }) => TokenClient;
  hasGrantedAllScopes: (r: TokenResponse, ...scopes: string[]) => boolean;
  revoke: (token: string, done?: () => void) => void;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

export class DriveAuthError extends Error {}

let gisPromise: Promise<GoogleOAuth2> | null = null;
export const loadGoogleIdentity = (): Promise<GoogleOAuth2> => {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google.accounts.oauth2) : reject(new Error("Google sign-in did not load")));
      s.onerror = () => {
        gisPromise = null; // allow a retry (e.g. after coming back online)
        reject(new Error("Google sign-in could not be loaded"));
      };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
};

// ── token ─────────────────────────────────────────────────────────────────────────────────────────
interface StoredToken {
  token: string;
  exp: number;
}
export const validToken = (): string | null => {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null") as StoredToken | null;
    return t && typeof t.token === "string" && t.exp > Date.now() + 60_000 ? t.token : null;
  } catch {
    return null;
  }
};
const storeToken = (token: string, expiresIn: number) => {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + expiresIn * 1000 }));
  } catch {
    /* ignore */
  }
};
export const forgetToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

let tokenClient: TokenClient | null = null;
let pending: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;

// Load Google's script and set up the token client ahead of time: the popup must open directly
// from the user's tap, with no awaiting in between, or browsers (Safari especially) block it.
export const prepareSignIn = async (): Promise<void> => {
  const oauth2 = await loadGoogleIdentity();
  if (tokenClient) return;
  tokenClient = oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (r) => {
      const p = pending;
      pending = null;
      if (!p) return;
      if (r.error || !r.access_token) return p.reject(new DriveAuthError(r.error_description || r.error || "sign-in failed"));
      if (!oauth2.hasGrantedAllScopes(r, SCOPE)) return p.reject(new DriveAuthError("drive permission not granted"));
      storeToken(r.access_token, r.expires_in ?? 3600);
      p.resolve(r.access_token);
    },
    error_callback: (e) => {
      const p = pending;
      pending = null;
      p?.reject(new DriveAuthError(e.type === "popup_closed" ? "popup closed" : e.message || e.type));
    },
  });
};
export const signInReady = (): boolean => tokenClient !== null;

// Must be called synchronously inside a click/tap handler (after prepareSignIn() has finished).
// `firstTime` shows the consent screen; otherwise Google only shows it if permission is missing.
// `loginHint` (the account's email) skips Google's account chooser.
export const requestTokenInteractive = (firstTime: boolean, loginHint?: string | null): Promise<string> => {
  if (!tokenClient) return Promise.reject(new Error("Google sign-in is not ready yet"));
  pending?.reject(new DriveAuthError("superseded"));
  const p = new Promise<string>((resolve, reject) => (pending = { resolve, reject }));
  tokenClient.requestAccessToken({ prompt: firstTime ? "consent" : "", ...(loginHint ? { login_hint: loginHint } : {}) });
  return p;
};

// The signed-in account's email (needs the `email` scope). Null if Google doesn't say.
export const fetchAccountEmail = async (token: string): Promise<string | null> => {
  try {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const info = (await res.json()) as { email?: unknown };
    return typeof info.email === "string" ? info.email : null;
  } catch {
    return null;
  }
};

// ── renewal by redirect (no tap) ───────────────────────────────────────────────────────────────────
// Where the app was, so the round trip through Google lands the user back on the same screen.
export interface ReturnContext {
  screen: "roster" | "sheet" | "compendium";
  characterId: string | null;
}
interface PendingRedirect {
  state: string;
  at: number;
  ctx: ReturnContext;
}
export type RedirectOutcome =
  | { kind: "none" }
  | { kind: "token"; ctx: ReturnContext }
  | { kind: "error"; error: string; ctx: ReturnContext | null };

// The app's own address, registered in the Google Cloud console as an authorized redirect URI.
export const redirectUri = (): string => `${window.location.origin}${import.meta.env.BASE_URL}`;

export const beginSilentRenewal = (ctx: ReturnContext, loginHint: string | null): void => {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ state, at: Date.now(), ctx } satisfies PendingRedirect));
  } catch {
    return; // without storage we couldn't verify the answer: don't go
  }
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "token",
    scope: SCOPES,
    include_granted_scopes: "true",
    prompt: "none",
    state,
  });
  if (loginHint) q.set("login_hint", loginHint);
  window.location.assign(`${AUTH_ENDPOINT}?${q}`);
};

// Read Google's answer from the URL fragment once, at startup, before anything renders. The token is
// accepted only if `state` matches the one saved before leaving, and the fragment is removed from the
// address bar and history right away.
let outcome: RedirectOutcome | null = null;
export const consumeRedirectResult = (): RedirectOutcome => {
  if (outcome) return outcome;
  outcome = { kind: "none" };
  if (typeof window === "undefined" || !window.location.hash.includes("state=")) return outcome;
  const params = new URLSearchParams(window.location.hash.slice(1));
  let saved: PendingRedirect | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(RETURN_KEY) ?? "null") as PendingRedirect | null;
    localStorage.removeItem(RETURN_KEY);
  } catch {
    saved = null;
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!saved || params.get("state") !== saved.state) return outcome; // not ours: ignore
  const token = params.get("access_token");
  const granted = (params.get("scope") ?? "").split(" ");
  if (token && granted.includes(SCOPE)) {
    storeToken(token, Number(params.get("expires_in")) || 3600);
    outcome = { kind: "token", ctx: saved.ctx };
  } else {
    outcome = { kind: "error", error: params.get("error") ?? (token ? "drive permission not granted" : "unknown"), ctx: saved.ctx };
  }
  return outcome;
};

export const revokeAccess = async (): Promise<void> => {
  const token = validToken();
  forgetToken();
  if (!token) return;
  try {
    const oauth2 = await loadGoogleIdentity();
    await new Promise<void>((done) => oauth2.revoke(token, () => done()));
  } catch {
    /* offline: the token simply expires on its own within the hour */
  }
};

// ── Drive REST ────────────────────────────────────────────────────────────────────────────────────
export interface RemoteFile {
  id: string;
  version: string; // Drive bumps it on every change
  content: unknown;
}

// What the sync engine needs from Drive. The real implementation is below; tests use a fake.
export interface DriveTransport {
  find(fileIdHint: string | null): Promise<RemoteFile | null>;
  version(id: string): Promise<string | null>;
  create(content: unknown): Promise<{ id: string; version: string }>;
  update(id: string, content: unknown): Promise<{ version: string }>;
}

const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export const httpDrive = (token: string): DriveTransport => {
  const call = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) } });
    if (res.status === 401) {
      forgetToken();
      throw new DriveAuthError("token expired");
    }
    return res;
  };
  const json = async <T,>(res: Response): Promise<T> => {
    if (!res.ok) throw new Error(`Google Drive: HTTP ${res.status}`);
    return (await res.json()) as T;
  };
  const read = async (id: string): Promise<RemoteFile | null> => {
    const meta = await call(`${API}/${id}?fields=id,version,trashed`);
    if (meta.status === 404) return null;
    const m = await json<{ id: string; version: string; trashed?: boolean }>(meta);
    if (m.trashed) return null;
    const body = await call(`${API}/${id}?alt=media`);
    let content: unknown = null;
    try {
      content = await json<unknown>(body);
    } catch {
      content = null; // unreadable file: treated as empty, and overwritten by the next upload
    }
    return { id: m.id, version: m.version, content };
  };
  return {
    async find(hint) {
      if (hint) {
        const f = await read(hint);
        if (f) return f;
      }
      const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
      const list = await json<{ files: { id: string }[] }>(await call(`${API}?spaces=appDataFolder&q=${q}&fields=files(id)&orderBy=modifiedTime desc`));
      return list.files[0] ? read(list.files[0].id) : null;
    },
    async version(id) {
      const res = await call(`${API}/${id}?fields=version`);
      if (res.status === 404) return null;
      return (await json<{ version: string }>(res)).version;
    },
    async create(content) {
      const boundary = "codexmagica" + Math.random().toString(36).slice(2);
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" }) +
        `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n` +
        JSON.stringify(content) +
        `\r\n--${boundary}--`;
      return json(await call(`${UPLOAD}?uploadType=multipart&fields=id,version`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }));
    },
    async update(id, content) {
      return json(await call(`${UPLOAD}/${id}?uploadType=media&fields=version`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) }));
    },
  };
};
