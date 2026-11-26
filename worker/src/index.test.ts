// Tests for the token service (src/index.ts), with Google's token endpoints faked.
import { describe, expect, test } from "vitest";
import { Env, handle, openCredential, sealCredential } from "./index";

const APP = "https://codex-magica.github.io";
const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i + 1)));
const KEY2 = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => 200 - i)));
const DRIVE = "https://www.googleapis.com/auth/drive.appdata";
const VERIFIER = "v".repeat(43);

const env = (over: Partial<Env> = {}): Env => ({
  GOOGLE_CLIENT_ID: "client-1.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "the-client-secret",
  BLOB_KEY: KEY,
  ALLOWED_ORIGINS: `${APP} http://localhost:3000`,
  ...over,
});

interface Call {
  url: string;
  form: Record<string, string>;
}
// A fake Google: answers by grant type; records every call.
const google = (answers: { exchange?: [number, object]; refresh?: [number, object]; revoke?: [number, object] } = {}) => {
  const calls: Call[] = [];
  const doFetch = async (url: string, init?: RequestInit): Promise<Response> => {
    const form = Object.fromEntries(new URLSearchParams(String(init?.body ?? "")));
    calls.push({ url, form });
    const pick = url.endsWith("/revoke") ? answers.revoke ?? [200, {}] : form.grant_type === "authorization_code" ? answers.exchange ?? [200, {}] : answers.refresh ?? [200, {}];
    return new Response(JSON.stringify(pick[1]), { status: pick[0], headers: { "Content-Type": "application/json" } });
  };
  return { calls, doFetch };
};

const post = (path: string, body: unknown, origin: string | null = APP, ip = "1.2.3.4") =>
  new Request(`https://auth.example.workers.dev${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip, ...(origin ? { Origin: origin } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const json = async (r: Response) => (await r.json()) as Record<string, unknown>;

describe("token service", () => {
  test("health says whether the secrets are configured, without revealing them", async () => {
    const ok = await json(await handle(new Request("https://x/health"), env()));
    expect(ok).toEqual({ ok: true, version: "1", configured: true });
    const missing = await json(await handle(new Request("https://x/health"), env({ GOOGLE_CLIENT_SECRET: "", BLOB_KEY: "short" })));
    expect(missing.configured).toBe(false);
  });

  test("health: a broken previous key counts as not configured (every renewal would fail)", async () => {
    expect((await json(await handle(new Request("https://x/health"), env({ BLOB_KEY_PREVIOUS: "short" })))).configured).toBe(false);
    expect((await json(await handle(new Request("https://x/health"), env({ BLOB_KEY_PREVIOUS: KEY2 })))).configured).toBe(true);
  });

  test("only the app's own origins get in; preflight answers with CORS headers", async () => {
    const g = google();
    expect((await handle(post("/v1/token", { credential: "x" }, "https://evil.example"), env(), g.doFetch)).status).toBe(403);
    expect((await handle(post("/v1/token", { credential: "x" }, null), env(), g.doFetch)).status).toBe(403);
    const pre = await handle(new Request("https://x/v1/token", { method: "OPTIONS", headers: { Origin: APP } }), env(), g.doFetch);
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    expect(g.calls).toHaveLength(0);
  });

  test("exchange: the code becomes an access token and an encrypted credential", async () => {
    const idToken = `h.${btoa(JSON.stringify({ email: "player@example.com", sub: "1" })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.sig`;
    const g = google({ exchange: [200, { access_token: "at-1", expires_in: 3599, scope: `${DRIVE} openid email`, refresh_token: "rt-1", id_token: idToken }] });
    const res = await handle(post("/v1/exchange", { code: "c-1", code_verifier: VERIFIER, redirect_uri: `${APP}/` }), env(), g.doFetch);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.access_token).toBe("at-1");
    expect(body.expires_in).toBe(3599);
    expect(typeof body.credential).toBe("string");
    expect(JSON.stringify(body)).not.toContain("rt-1"); // the refresh token itself never leaves the Worker
    expect(JSON.stringify(body)).not.toContain("the-client-secret");
    expect(body).not.toHaveProperty("id_token");
    expect(body.email).toBe("player@example.com"); // for the app's one account check
    expect((await openCredential(env(), body.credential as string))?.secret.rt).toBe("rt-1");
    // Google got the secret, the PKCE verifier and the exact redirect
    expect(g.calls[0].form).toMatchObject({ grant_type: "authorization_code", code: "c-1", code_verifier: VERIFIER, redirect_uri: `${APP}/`, client_secret: "the-client-secret" });
  });

  test("exchange without the Drive permission: no credential, and the grant is revoked", async () => {
    const g = google({ exchange: [200, { access_token: "at-1", scope: "openid email", refresh_token: "rt-1" }] });
    const body = await json(await handle(post("/v1/exchange", { code: "c", code_verifier: VERIFIER, redirect_uri: `${APP}/` }), env(), g.doFetch));
    expect(body.credential).toBeUndefined();
    expect(body.scope).toBe("openid email");
    expect(g.calls.map((c) => c.url)).toContain("https://oauth2.googleapis.com/revoke");
  });

  test("exchange refuses a foreign redirect, a bad verifier, and garbage", async () => {
    const g = google();
    const bad = async (b: unknown) => (await handle(post("/v1/exchange", b), env(), g.doFetch)).status;
    expect(await bad({ code: "c", code_verifier: VERIFIER, redirect_uri: "https://evil.example/" })).toBe(400);
    expect(await bad({ code: "c", code_verifier: VERIFIER, redirect_uri: `${APP}/?x=1` })).toBe(400);
    expect(await bad({ code: "c", code_verifier: "short", redirect_uri: `${APP}/` })).toBe(400);
    expect(await bad("not json")).toBe(400);
    expect(await bad({})).toBe(400);
    expect(g.calls).toHaveLength(0);
  });

  test("exchange passes Google's refusal on (e.g. a used code)", async () => {
    const g = google({ exchange: [400, { error: "invalid_grant" }] });
    const res = await handle(post("/v1/exchange", { code: "c", code_verifier: VERIFIER, redirect_uri: `${APP}/` }), env(), g.doFetch);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("invalid_grant");
  });

  test("exchange: Google busy (429, 5xx) is a 502, so the app says to try again later", async () => {
    for (const status of [429, 503]) {
      const g = google({ exchange: [status, { error: "rate_limit_exceeded" }] });
      expect((await handle(post("/v1/exchange", { code: "c", code_verifier: VERIFIER, redirect_uri: `${APP}/` }), env(), g.doFetch)).status).toBe(502);
    }
  });

  test("exchange: no refresh token from Google means no credential", async () => {
    const g = google({ exchange: [200, { access_token: "at-1", expires_in: 3599, scope: DRIVE }] });
    const body = await json(await handle(post("/v1/exchange", { code: "c", code_verifier: VERIFIER, redirect_uri: `${APP}/` }), env(), g.doFetch));
    expect(body.access_token).toBe("at-1");
    expect(body.credential).toBeUndefined();
  });

  test("token: a credential gets a fresh access token", async () => {
    const credential = await sealCredential(env(), { rt: "rt-1", iat: 1 });
    const g = google({ refresh: [200, { access_token: "at-2", expires_in: 3599, scope: DRIVE }] });
    const body = await json(await handle(post("/v1/token", { credential }), env(), g.doFetch));
    expect(body.access_token).toBe("at-2");
    expect(body.credential).toBeUndefined(); // nothing new to hand back
    expect(g.calls[0].form).toMatchObject({ grant_type: "refresh_token", refresh_token: "rt-1", client_secret: "the-client-secret" });
  });

  test("token: a revoked grant is reported as invalid_grant, so the app asks again", async () => {
    const credential = await sealCredential(env(), { rt: "rt-1", iat: 1 });
    const g = google({ refresh: [400, { error: "invalid_grant" }] });
    const res = await handle(post("/v1/token", { credential }), env(), g.doFetch);
    expect(res.status).toBe(401);
    expect((await json(res)).error).toBe("invalid_grant");
  });

  test("token: Google trouble is a 502 (the app keeps its credential and retries later)", async () => {
    const credential = await sealCredential(env(), { rt: "rt-1", iat: 1 });
    expect((await handle(post("/v1/token", { credential }), env(), google({ refresh: [503, {}] }).doFetch)).status).toBe(502);
    const throwing = async (): Promise<Response> => {
      throw new Error("network");
    };
    expect((await handle(post("/v1/token", { credential }), env(), throwing)).status).toBe(502);
  });

  test("a tampered credential, or one made for another client, is refused without asking Google", async () => {
    const credential = await sealCredential(env(), { rt: "rt-1", iat: 1 });
    const g = google();
    // change a character inside the ciphertext (the last one may only carry padding bits)
    const at = credential.length - 6;
    const tampered = credential.slice(0, at) + (credential[at] === "A" ? "B" : "A") + credential.slice(at + 1);
    expect((await handle(post("/v1/token", { credential: tampered }), env(), g.doFetch)).status).toBe(401);
    expect((await handle(post("/v1/token", { credential }), env({ GOOGLE_CLIENT_ID: "other.apps.googleusercontent.com" }), g.doFetch)).status).toBe(401);
    expect((await handle(post("/v1/token", { credential: "v1.x.y.z" }), env(), g.doFetch)).status).toBe(401);
    expect(g.calls).toHaveLength(0);
  });

  test("key rotation: the previous key still works, and the answer carries a credential under the new key", async () => {
    const old = await sealCredential(env({ BLOB_KEY: KEY }), { rt: "rt-1", iat: 5 });
    const rotated = env({ BLOB_KEY: KEY2, BLOB_KEY_PREVIOUS: KEY });
    const g = google({ refresh: [200, { access_token: "at-3", scope: DRIVE }] });
    const body = await json(await handle(post("/v1/token", { credential: old }), rotated, g.doFetch));
    expect(body.access_token).toBe("at-3");
    expect(typeof body.credential).toBe("string");
    const fresh = await openCredential(env({ BLOB_KEY: KEY2 }), body.credential as string);
    expect(fresh?.secret).toEqual({ rt: "rt-1", iat: 5 });
    expect(fresh?.stale).toBe(false);
    // once the old key is dropped, old credentials stop working
    expect((await handle(post("/v1/token", { credential: old }), env({ BLOB_KEY: KEY2 }), g.doFetch)).status).toBe(401);
  });

  test("key rotation: a new refresh token under rotation is sealed with the new key and a fresh date", async () => {
    const old = await sealCredential(env({ BLOB_KEY: KEY }), { rt: "rt-1", iat: 5 });
    const g = google({ refresh: [200, { access_token: "at-4", scope: DRIVE, refresh_token: "rt-2" }] });
    const body = await json(await handle(post("/v1/token", { credential: old }), env({ BLOB_KEY: KEY2, BLOB_KEY_PREVIOUS: KEY }), g.doFetch));
    const fresh = await openCredential(env({ BLOB_KEY: KEY2 }), body.credential as string);
    expect(fresh?.secret.rt).toBe("rt-2");
    expect(fresh?.secret.iat).toBeGreaterThan(5);
    expect(fresh?.stale).toBe(false);
  });

  test("rate limit: a refused address stops before the credential is looked at, and the 429 is readable by the app", async () => {
    const credential = await sealCredential(env(), { rt: "rt-1", iat: 1 });
    const seen: string[] = [];
    const limiter = { limit: async ({ key }: { key: string }) => (seen.push(key), { success: false }) };
    const res = await handle(post("/v1/token", { credential }), env({ LIMITER: limiter }), google().doFetch);
    expect(res.status).toBe(429);
    expect(seen).toEqual(["ip:1.2.3.4"]);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(APP);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  test("rate limit per credential (keyed by a hash of it, never the credential): 429 before Google is asked", async () => {
    const credential = await sealCredential(env(), { rt: "rt-1", iat: 1 });
    const seen: string[] = [];
    const limiter = { limit: async ({ key }: { key: string }) => (seen.push(key), { success: !key.startsWith("cred:") }) };
    const g = google();
    const res = await handle(post("/v1/token", { credential }), env({ LIMITER: limiter }), g.doFetch);
    expect(res.status).toBe(429);
    expect(seen[0]).toBe("ip:1.2.3.4");
    expect(seen[1]).toMatch(/^cred:/);
    expect(seen.join()).not.toContain(credential); // only a hash of the credential is used as a key
    expect(g.calls).toHaveLength(0);
  });

  test("unknown routes and methods are refused, and bodies over the size limit get 413 (no revoke route: turning sync off is device-only)", async () => {
    const g = google();
    expect((await handle(post("/v1/other", {}), env(), g.doFetch)).status).toBe(404);
    expect((await handle(post("/v1/revoke", { credential: "x" }), env(), g.doFetch)).status).toBe(404);
    expect((await handle(new Request("https://x/v1/token", { method: "GET", headers: { Origin: APP } }), env(), g.doFetch)).status).toBe(405);
    expect((await handle(post("/v1/token", "x".repeat(9000)), env(), g.doFetch)).status).toBe(413);
    const big = new Request("https://x/v1/token", { method: "POST", headers: { Origin: APP, "Content-Length": "100000" }, body: "{}" });
    expect((await handle(big, env(), g.doFetch)).status).toBe(413);
    expect(g.calls).toHaveLength(0);
  });
});
