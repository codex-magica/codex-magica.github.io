// Google Drive access from the browser.
//
// Turning sync on sends the player to Google's consent page (a full-page round trip, which works the
// same in a browser tab and in an app installed to the home screen). Google returns a one-time code;
// the app's token service (worker/, a small Cloudflare Worker that holds the OAuth client secret)
// exchanges it for a one-hour access token plus an encrypted long-term credential, which stays on this
// device. When the access token runs out, the app asks the token service for a new one with that
// credential: no popup, no redirect, no tap. The token service stores nothing and never sees Drive data.
//
// Without a token service configured (forks, local builds), sign-in falls back to Google Identity
// Services' popup, and an expired token is renewed by a tap (browser apps get no long-term access on
// their own).
//
// The access token is kept in localStorage until it expires, so reloads within the hour don't ask again.
//
// The OAuth client ID comes from VITE_GOOGLE_CLIENT_ID and the token service's address from
// VITE_TOKEN_SERVICE_URL, both at build time. Without a client ID the feature is simply absent. See
// docs/google-drive-sync.md.

export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? "";
export const driveSyncAvailable = (): boolean => GOOGLE_CLIENT_ID !== "";
export const TOKEN_SERVICE: string = ((import.meta.env.VITE_TOKEN_SERVICE_URL as string | undefined)?.trim() ?? "").replace(/\/+$/, "");
export const tokenServiceAvailable = (): boolean => TOKEN_SERVICE !== "";

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const SCOPES = `${SCOPE} openid email`;
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const RETURN_KEY = "magus.driveReturn.v2";
const STALE_ANSWER_MS = 30 * 60_000;
const REQUEST_TIMEOUT_MS = 60_000;
const SERVICE_TIMEOUT_MS = 20_000;
const CREDENTIAL_KEY = "magus.driveCredential.v1";
const GIS_SRC = "https://accounts.google.com/gsi/client";
const TOKEN_KEY = "magus.driveToken.v1";

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
    if (t && typeof t.exp === "number" && t.exp <= Date.now()) localStorage.removeItem(TOKEN_KEY); // expired: don't keep it around
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
// `only`: forget the stored token only if it's this one (a late answer to an old token mustn't throw
// away a newer one, e.g. after sync was turned off and on again with another account)
export const forgetToken = (only?: string): void => {
  try {
    if (only !== undefined && (JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null") as StoredToken | null)?.token !== only) return;
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

// The signed-in account's email (needs the `email` scope). Null if Google doesn't say (network trouble).
// A token Google refuses (revoked from another device, say) is forgotten, and DriveAuthError thrown, so
// the caller renews it instead of retrying a dead token until it expires.
export const fetchAccountEmail = async (token: string): Promise<string | null> => {
  let res: Response;
  // a hung request mustn't hold up every later round: give up and try again next time
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), SERVICE_TIMEOUT_MS) : undefined;
  try {
    res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token}` }, signal: ctl?.signal });
  } catch {
    clearTimeout(timer);
    return null;
  }
  if (res.status === 401) {
    clearTimeout(timer);
    forgetToken(token);
    throw new DriveAuthError("token expired");
  }
  try {
    if (!res.ok) return null;
    const info = (await res.json()) as { email?: unknown };
    return typeof info.email === "string" ? info.email : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

// ── the long-term credential (only with a token service) ───────────────────────────────────────────
// Opaque to the app: the refresh token, encrypted by the token service with a key only it has.
const loadCredential = (): string | null => {
  try {
    return localStorage.getItem(CREDENTIAL_KEY);
  } catch {
    return null;
  }
};
export const hasCredential = (): boolean => tokenServiceAvailable() && loadCredential() !== null;
const saveCredential = (c: string) => {
  try {
    localStorage.setItem(CREDENTIAL_KEY, c);
  } catch {
    /* storage full: works for this hour; the next renewal will ask for a reconnect */
  }
};
export const forgetCredential = (only?: string): void => {
  try {
    if (only !== undefined && localStorage.getItem(CREDENTIAL_KEY) !== only) return;
    localStorage.removeItem(CREDENTIAL_KEY);
  } catch {
    /* ignore */
  }
};

// ── the round trip to Google's consent page ─────────────────────────────────────────────────────────
// Where the app was, so the round trip through Google lands the user back on the same screen.
export interface ScrollMark {
  path: number[]; // child indexes from #root down to the scrolled element
  top: number;
  left: number;
}
export interface ReturnContext {
  screen: "roster" | "sheet" | "compendium";
  characterId: string | null;
  view?: "sheet" | "compendium"; // inside a character: the sheet or its compendium
  compTab?: number;
  scroll?: ScrollMark[];
}
interface PendingRedirect {
  state: string;
  at: number;
  ctx: ReturnContext;
  verifier: string; // PKCE: proves the code is redeemed by whoever asked for it
  backups?: boolean; // turning sync on: the daily backups choice made before leaving
}
export type RedirectOutcome =
  | { kind: "none" }
  | { kind: "code"; code: string; verifier: string; ctx: ReturnContext; backups?: boolean }
  | { kind: "error"; error: string; ctx: ReturnContext | null };

// The app's own address, registered in the Google Cloud console as an authorized redirect URI.
export const redirectUri = (): string => `${window.location.origin}${import.meta.env.BASE_URL}`;

const randomB64url = (n: number): string => {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
};
const b64url = (bytes: Uint8Array): string => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

// Off to Google's consent page (with the token service only). `backups` is passed when turning sync on.
// Returns false (and stays) if the round trip can't be made safely.
// Why leaving for Google didn't start: "insecure" (the page isn't on https, so the browser withholds the
// cryptography the sign-in needs), "storage" (the sign-in couldn't be noted down for the return), or
// "failed" (anything else).
export type ConnectStartFailure = "insecure" | "storage" | "failed";
export const beginConnect = async (ctx: ReturnContext, loginHint: string | null, backups?: boolean): Promise<true | ConnectStartFailure> => {
  if (!tokenServiceAvailable()) return "failed";
  if (typeof window !== "undefined" && window.isSecureContext === false) return "insecure";
  let state: string;
  let verifier: string;
  let challenge: string;
  try {
    state = randomB64url(16);
    verifier = randomB64url(32);
    challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  } catch {
    return "failed"; // no crypto: we couldn't verify the answer, so don't go
  }
  try {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ state, at: Date.now(), ctx, verifier, ...(backups === undefined ? {} : { backups }) } satisfies PendingRedirect));
  } catch {
    return "storage";
  }
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // the long-term part, which only the token service can use
    prompt: "consent", // otherwise Google leaves out the long-term part when access was given before
    include_granted_scopes: "true",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  if (loginHint) q.set("login_hint", loginHint);
  window.location.assign(`${AUTH_ENDPOINT}?${q}`);
  return true;
};

// Read Google's answer from the address once, at startup, before anything renders. It is accepted
// only if `state` matches the one saved before leaving, and the answer is removed from the address bar
// and history right away.
let outcome: RedirectOutcome | null = null;
export const consumeRedirectResult = (): RedirectOutcome => {
  if (outcome) return outcome;
  outcome = { kind: "none" };
  if (typeof window === "undefined") return outcome;
  const params = new URLSearchParams(window.location.search);
  if (!params.has("state")) {
    // No answer in the address: an ordinary start. A sign-in that was left without an answer (the player
    // went back from Google's page) needs no message, they know; its entry is dropped once it's too old
    // to be answered. A fresh one may belong to another tab that is still on its way.
    try {
      const pending = JSON.parse(localStorage.getItem(RETURN_KEY) ?? "null") as PendingRedirect | null;
      if (pending && Date.now() - pending.at > STALE_ANSWER_MS) localStorage.removeItem(RETURN_KEY);
    } catch {
      /* ignore */
    }
    return outcome;
  }
  let saved: PendingRedirect | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(RETURN_KEY) ?? "null") as PendingRedirect | null;
  } catch {
    saved = null;
  }
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  const ours = saved !== null && params.get("state") === saved.state;
  const stale = saved !== null && Date.now() - saved.at > STALE_ANSWER_MS;
  // only our own entry is removed: another tab's sign-in, started later, may still be on its way back
  if (ours || stale)
    try {
      localStorage.removeItem(RETURN_KEY);
    } catch {
      /* ignore */
    }
  if (!saved || !ours || stale) {
    // an answer that can't be used (another tab started a newer sign-in, or it took too long): say so
    // rather than come back as if nothing had happened
    outcome = { kind: "error", error: "no answer", ctx: saved && !stale ? saved.ctx : null };
    return outcome;
  }
  const code = params.get("code");
  outcome = code
    ? { kind: "code", code, verifier: saved.verifier, ctx: saved.ctx, ...(saved.backups === undefined ? {} : { backups: saved.backups }) }
    : { kind: "error", error: params.get("error") ?? "unknown", ctx: saved.ctx };
  return outcome;
};

// ── the token service ────────────────────────────────────────────────────────────────────────────────
// Thrown when the token service can't be reached or is busy: the credential stays, and the next round
// tries again.
export class TokenServiceError extends Error {}

const service = async (path: string, body: object): Promise<{ status: number; data: Record<string, unknown> }> => {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? window.setTimeout(() => ctl.abort(), SERVICE_TIMEOUT_MS) : undefined;
  try {
    const res = await fetch(`${TOKEN_SERVICE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctl?.signal });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* not JSON */
    }
    return { status: res.status, data };
  } catch {
    throw new TokenServiceError("token service unreachable");
  } finally {
    window.clearTimeout(timer);
  }
};

export interface Connection {
  token: string;
  expiresIn: number;
  credential: string | null;
}
const parseAnswer = (data: Record<string, unknown>): Connection => {
  const token = typeof data.access_token === "string" ? data.access_token : null;
  if (!token) throw new TokenServiceError("no token");
  return { token, expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600, credential: typeof data.credential === "string" ? data.credential : null };
};
// Store what the token service gave (after the account was checked, for a new connection).
export const keepConnection = (c: Connection): void => {
  storeToken(c.token, c.expiresIn);
  if (c.credential) saveCredential(c.credential);
};

// After the consent page: the code becomes an access token and the long-term credential. Not stored yet:
// the caller checks the account first, so a wrong account can't replace the right one's credential.
export const exchangeCode = async (code: string, verifier: string): Promise<Connection> => {
  const { status, data } = await service("/v1/exchange", { code, code_verifier: verifier, redirect_uri: redirectUri() });
  if (status !== 200) {
    if (status >= 500 || status === 429) throw new TokenServiceError(`exchange: HTTP ${status}`);
    throw new DriveAuthError(typeof data.error === "string" ? data.error : "exchange failed");
  }
  // the Drive permission left unticked on Google's screen (the token service already undid the grant)
  if (!(typeof data.scope === "string" && data.scope.split(" ").includes(SCOPE))) throw new DriveAuthError("drive permission not granted");
  return parseAnswer(data);
};

// A fresh access token from the credential, without any UI. Concurrent callers share one request.
let refreshing: Promise<string> | null = null;
export const refreshAccess = (): Promise<string> => {
  if (refreshing) return refreshing;
  const credential = loadCredential();
  if (!credential || !tokenServiceAvailable()) return Promise.reject(new DriveAuthError("no credential"));
  refreshing = (async () => {
    try {
      const { status, data } = await service("/v1/token", { credential });
      if (loadCredential() !== credential) {
        // sync was turned off (or reconnected) meanwhile, here or in another tab: keep nothing from this
        const now = validToken();
        if (now) return now;
        throw new DriveAuthError("no credential");
      }
      if (status === 200) {
        const got = parseAnswer(data);
        keepConnection(got);
        return got.token;
      }
      if (status === 401) {
        // the grant is gone (revoked in the Google account, or unused for months): ask the user again
        forgetCredential(credential);
        throw new DriveAuthError("credential revoked");
      }
      throw new TokenServiceError(`token: HTTP ${status}`);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
};

// ── Drive REST ────────────────────────────────────────────────────────────────────────────────────
// Every file lives in the hidden app folder and is tagged with `appProperties`:
//   kind=sync     one per device: that device's copy of the roster (only that device writes it)
//   kind=backup   one per kept version of a character (created once, never modified)
//   kind=unreadable  a sync file that couldn't be read, kept aside before it was replaced
export interface DriveFileMeta {
  id: string;
  device: string;
  version: string;
  createdTime: string;
}
export interface BackupMeta {
  id: string;
  characterId: string;
  name: string;
  day: string; // YYYY-MM-DD, the day of the kept version
  reason: "daily" | "deleted";
  createdTime: string;
}
export type FileBody = { json: unknown } | { raw: string };

// What the sync needs from Drive. The real implementation is below; tests use an in-memory fake.
export interface DriveTransport {
  listSyncFiles(): Promise<DriveFileMeta[]>;
  readFile(id: string): Promise<FileBody>; // throws on any HTTP or network error; { raw } if it isn't JSON
  createSyncFile(device: string, content: unknown): Promise<DriveFileMeta>;
  updateFile(id: string, content: unknown): Promise<{ version: string }>;
  backupExists(name: string): Promise<boolean>;
  createBackup(name: string, props: Record<string, string>, content: unknown): Promise<void>;
  keepUnreadable(name: string, raw: string): Promise<void>;
  listBackups(): Promise<BackupMeta[]>;
}

export const SYNC_FILE_PREFIX = "codex-magica-sync";

const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

// appProperties values are limited to 124 bytes together with the key: cut long names on a character
// boundary.
export const fitBytes = (s: string, max: number): string => {
  const enc = new TextEncoder();
  if (enc.encode(s).length <= max) return s;
  let out = "";
  for (const ch of s) {
    if (enc.encode(out + ch).length > max - 3) break;
    out += ch;
  }
  return out + "…";
};

export const httpDrive = (token: string): DriveTransport => {
  const call = async (url: string, init: RequestInit = {}): Promise<Response> => {
    // a stalled request would hold up every later sync round: give up after a minute (the timer also
    // covers reading the body; aborting a finished request does nothing)
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    if (ctl) window.setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
    const res = await fetch(url, { ...init, signal: ctl?.signal, headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) } });
    if (res.status === 401) {
      forgetToken(token);
      throw new DriveAuthError("token expired");
    }
    if (!res.ok) throw new Error(`Google Drive: HTTP ${res.status}`);
    return res;
  };
  const json = async <T,>(res: Response): Promise<T> => (await res.json()) as T;

  const list = async <F,>(q: string, fields: string): Promise<F[]> => {
    const out: F[] = [];
    let pageToken = "";
    do {
      const url = `${API}?spaces=appDataFolder&pageSize=100&q=${encodeURIComponent(q)}&fields=${encodeURIComponent(`nextPageToken,files(${fields})`)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
      const page = await json<{ files?: F[]; nextPageToken?: string }>(await call(url));
      out.push(...(page.files ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
    return out;
  };

  const multipart = async (meta: object, body: string, mime: string, fields: string) => {
    const boundary = "codexmagica" + Math.random().toString(36).slice(2);
    const payload =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ parents: ["appDataFolder"], mimeType: mime, ...meta }) +
      `\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n` +
      body +
      `\r\n--${boundary}--`;
    return call(`${UPLOAD}?uploadType=multipart&fields=${fields}`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: payload });
  };

  type Props = { appProperties?: Record<string, string> };
  return {
    async listSyncFiles() {
      // the device files, plus the single shared file of the first sync version if it's still there
      const files = await list<{ id: string; version: string; createdTime: string } & Props>(
        "(appProperties has { key='kind' and value='sync' } or name='codex-magica-roster.json') and trashed=false",
        "id,version,createdTime,appProperties"
      );
      return files.map((f) => ({ id: f.id, version: f.version, createdTime: f.createdTime, device: f.appProperties?.device ?? "" }));
    },
    async readFile(id) {
      const text = await (await call(`${API}/${id}?alt=media`)).text();
      try {
        return { json: JSON.parse(text) };
      } catch {
        return { raw: text };
      }
    },
    async createSyncFile(device, content) {
      const res = await multipart({ name: `${SYNC_FILE_PREFIX}.${device}.json`, appProperties: { kind: "sync", device } }, JSON.stringify(content), "application/json", "id,version,createdTime");
      const f = await json<{ id: string; version: string; createdTime: string }>(res);
      return { ...f, device };
    },
    async updateFile(id, content) {
      return json(await call(`${UPLOAD}/${id}?uploadType=media&fields=version`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) }));
    },
    async backupExists(name) {
      const q = `name='${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and trashed=false`;
      const files = await json<{ files?: unknown[] }>(await call(`${API}?spaces=appDataFolder&pageSize=1&q=${encodeURIComponent(q)}&fields=files(id)`));
      return (files.files ?? []).length > 0;
    },
    async createBackup(name, props, content) {
      await multipart({ name, appProperties: { kind: "backup", ...props } }, JSON.stringify(content), "application/json", "id");
    },
    async keepUnreadable(name, raw) {
      await multipart({ name, appProperties: { kind: "unreadable" } }, raw, "text/plain", "id");
    },
    async listBackups() {
      const files = await list<{ id: string; createdTime: string } & Props>("appProperties has { key='kind' and value='backup' } and trashed=false", "id,createdTime,appProperties");
      return files.map((f) => {
        const p = f.appProperties ?? {};
        return { id: f.id, createdTime: f.createdTime, characterId: p.char ?? "", name: p.name ?? "", day: p.day ?? "", reason: p.reason === "deleted" ? "deleted" : "daily" };
      });
    },
  };
};
