// Codex Magica token service: a small Cloudflare Worker that lets the app renew its Google Drive access
// without a tap.
//
// Browser apps get only one-hour access tokens from Google. A refresh token would last, but Google hands
// it out only to a party that holds the OAuth client secret, and a secret can't be kept in a public web
// app. So this Worker keeps the secret and does exactly two things for the app:
//
//   POST /v1/exchange  { code, code_verifier, redirect_uri }  the one-time code from Google's consent
//                      screen → an access token, plus the refresh token encrypted into an opaque
//                      "credential" that only this Worker can read
//   POST /v1/token     { credential }  → a fresh access token
//   POST /v1/revoke    { credential }  → the refresh token is revoked at Google (turning sync off)
//   GET  /health
//
// It stores nothing and logs nothing (see wrangler.toml): the credential lives on the player's device.
// Requests are accepted only from the app's own origins, and rate-limited. The Worker never sees any
// Drive data: it only talks to Google's token endpoints.

export interface RateLimit {
  limit(o: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string; // secret
  BLOB_KEY: string; // secret: 32 random bytes, base64 (openssl rand -base64 32)
  BLOB_KEY_PREVIOUS?: string; // secret, optional: the key before a rotation, still accepted for reading
  ALLOWED_ORIGINS: string; // space- or comma-separated, e.g. "https://codex-magica.github.io"
  LIMITER?: RateLimit;
}

export const VERSION = "1";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const MAX_BODY = 8192;
const UPSTREAM_TIMEOUT_MS = 10_000;

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

// ── small helpers ────────────────────────────────────────────────────────────────────────────────
const b64url = (bytes: Uint8Array): string => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string): Uint8Array<ArrayBuffer> => {
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(std + "=".repeat((4 - (std.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s.trim()), (c) => c.charCodeAt(0));

const origins = (env: Env): string[] =>
  env.ALLOWED_ORIGINS.split(/[\s,]+/)
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

// ── the credential: the refresh token, encrypted with AES-GCM under the Worker's key ───────────────
// Format: "v1.<key id>.<iv>.<ciphertext>" (base64url). The key id picks the key, so the key can be
// rotated: the previous key still decrypts, and a credential read with it is re-encrypted with the new
// one. The client ID is bound in as additional data, so a credential only works for this client.
interface Key {
  id: string;
  key: CryptoKey;
}
const loadKey = async (b64: string): Promise<Key> => {
  const raw = fromB64(b64);
  if (raw.length !== 32) throw new Error("BLOB_KEY must be 32 bytes (base64)");
  const id = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", raw)).slice(0, 6));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  return { id, key };
};

interface Secret {
  rt: string; // the refresh token
  iat: number; // when it was issued (ms)
}

export const sealCredential = async (env: Env, secret: Secret): Promise<string> => {
  const k = await loadKey(env.BLOB_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(secret));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(env.GOOGLE_CLIENT_ID) }, k.key, data));
  return `v1.${k.id}.${b64url(iv)}.${b64url(ct)}`;
};

// null: not ours, tampered with, or from a key that's gone. `stale`: read with the previous key.
export const openCredential = async (env: Env, credential: string): Promise<{ secret: Secret; stale: boolean } | null> => {
  const parts = credential.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const keys = [await loadKey(env.BLOB_KEY)];
  if (env.BLOB_KEY_PREVIOUS) keys.push(await loadKey(env.BLOB_KEY_PREVIOUS));
  const k = keys.find((x) => x.id === parts[1]);
  if (!k) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(parts[2]), additionalData: new TextEncoder().encode(env.GOOGLE_CLIENT_ID) },
      k.key,
      fromB64url(parts[3])
    );
    const secret = JSON.parse(new TextDecoder().decode(plain)) as Secret;
    if (typeof secret.rt !== "string" || !secret.rt) return null;
    return { secret, stale: k !== keys[0] };
  } catch {
    return null;
  }
};

// ── HTTP ─────────────────────────────────────────────────────────────────────────────────────────
const cors = (origin: string): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});
const reply = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

const googlePost = async (doFetch: Fetch, url: string, form: Record<string, string>): Promise<{ status: number; body: Record<string, unknown> }> => {
  const res = await doFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* empty or not JSON (revoke answers with an empty body) */
  }
  return { status: res.status, body };
};

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);

// What the app gets back after a successful exchange or refresh.
const tokenAnswer = (g: Record<string, unknown>, credential: string | null) => ({
  access_token: g.access_token,
  expires_in: typeof g.expires_in === "number" ? g.expires_in : 3600,
  scope: typeof g.scope === "string" ? g.scope : "",
  ...(credential ? { credential } : {}),
});

export const handle = async (request: Request, env: Env, doFetch: Fetch = fetch): Promise<Response> => {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    // whether the secrets are in place (never their values): for checking a fresh setup
    let keyOk = false;
    try {
      await loadKey(env.BLOB_KEY ?? "");
      keyOk = true;
    } catch {
      keyOk = false;
    }
    return reply(200, { ok: true, version: VERSION, configured: keyOk && !!env.GOOGLE_CLIENT_SECRET && !!env.GOOGLE_CLIENT_ID && origins(env).length > 0 });
  }

  // only the app itself: other sites (and requests without an Origin, i.e. not from a browser) are turned away
  const origin = request.headers.get("Origin") ?? "";
  if (!origins(env).includes(origin)) return reply(403, { error: "origin" });
  const h = cors(origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (request.method !== "POST") return reply(405, { error: "method" }, h);

  const route = url.pathname;
  if (route !== "/v1/exchange" && route !== "/v1/token" && route !== "/v1/revoke") return reply(404, { error: "not found" }, h);

  const text = await request.text();
  if (text.length > MAX_BODY) return reply(413, { error: "too large" }, h);
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return reply(400, { error: "bad request" }, h);
  }
  if (!input || typeof input !== "object") return reply(400, { error: "bad request" }, h);

  // rate limit per address, and per credential (a copied credential can't be hammered from many places)
  if (env.LIMITER) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const keys = [`ip:${ip}`];
    const c = str(input.credential, 4096);
    if (c) keys.push(`cred:${b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(c)))).slice(0, 22)}`);
    for (const key of keys) if (!(await env.LIMITER.limit({ key })).success) return reply(429, { error: "slow down" }, { ...h, "Retry-After": "60" });
  }

  try {
    if (route === "/v1/exchange") {
      const code = str(input.code, 2048);
      const verifier = str(input.code_verifier, 128);
      const redirect = str(input.redirect_uri, 512);
      if (!code || !verifier || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier) || !redirect) return reply(400, { error: "bad request" }, h);
      // the redirect must be one of the app's own addresses (Google checks it against the client too)
      let redirectOk = false;
      try {
        const r = new URL(redirect);
        redirectOk = origins(env).includes(r.origin) && !r.search && !r.hash;
      } catch {
        redirectOk = false;
      }
      if (!redirectOk) return reply(400, { error: "redirect" }, h);
      const g = await googlePost(doFetch, GOOGLE_TOKEN, {
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: redirect,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      });
      if (g.status !== 200 || typeof g.body.access_token !== "string") return reply(g.status >= 500 ? 502 : 400, { error: typeof g.body.error === "string" ? g.body.error : "exchange failed" }, h);
      const scope = typeof g.body.scope === "string" ? g.body.scope : "";
      const rt = typeof g.body.refresh_token === "string" ? g.body.refresh_token : null;
      // without the Drive permission (left unticked on Google's screen) the grant is useless: undo it
      if (!scope.split(" ").includes(DRIVE_SCOPE)) {
        if (rt) await googlePost(doFetch, GOOGLE_REVOKE, { token: rt }).catch(() => undefined);
        return reply(200, tokenAnswer(g.body, null), h);
      }
      const credential = rt ? await sealCredential(env, { rt, iat: Date.now() }) : null;
      return reply(200, tokenAnswer(g.body, credential), h);
    }

    const credential = str(input.credential, 4096);
    if (!credential) return reply(400, { error: "bad request" }, h);
    const opened = await openCredential(env, credential);
    if (!opened) return reply(401, { error: "invalid_credential" }, h);

    if (route === "/v1/token") {
      const g = await googlePost(doFetch, GOOGLE_TOKEN, {
        grant_type: "refresh_token",
        refresh_token: opened.secret.rt,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      });
      if (g.status === 200 && typeof g.body.access_token === "string") {
        // a new refresh token (rare), or one read with the previous key: hand back a fresh credential
        const rt = typeof g.body.refresh_token === "string" ? g.body.refresh_token : null;
        const renewed = rt || opened.stale ? await sealCredential(env, { rt: rt ?? opened.secret.rt, iat: rt ? Date.now() : opened.secret.iat }) : null;
        return reply(200, tokenAnswer(g.body, renewed), h);
      }
      // the grant is gone (revoked, expired, password change…): the app must ask the user again
      if (g.body.error === "invalid_grant") return reply(401, { error: "invalid_grant" }, h);
      return reply(502, { error: "upstream" }, h);
    }

    // /v1/revoke: best effort; already revoked counts as done
    await googlePost(doFetch, GOOGLE_REVOKE, { token: opened.secret.rt });
    return reply(200, { ok: true }, h);
  } catch {
    // Google unreachable or slow: the app keeps its credential and tries again later
    return reply(502, { error: "upstream" }, h);
  }
};

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handle(request, env),
};
