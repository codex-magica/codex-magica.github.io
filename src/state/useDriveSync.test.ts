// Failure and race scenarios for the Drive sync orchestration (useDriveSync + googleDrive), found in the
// pre-release review and fixed; run against the real hook
// with a tiny stand-in for React's hooks, an in-memory localStorage shared by "tabs" (separate module
// instances), fake timers, and a fake fetch for Google (userinfo, Drive REST) and the token service.
// Each test asserts the intended behaviour.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// ── a minimal hooks runtime (enough for useDriveSync) ─────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
const R = vi.hoisted(() => {
  interface Comp {
    slots: any[];
    idx: number;
    effects: (() => void)[];
    out: any;
    scheduled: boolean;
    render: () => void;
  }
  let cur: Comp | null = null;
  const changed = (a?: unknown[], b?: unknown[]) => !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));
  const schedule = (c: Comp) => {
    if (c.scheduled) return;
    c.scheduled = true;
    queueMicrotask(() => {
      c.scheduled = false;
      c.render();
    });
  };
  const slot = (init: () => any): [any, Comp] => {
    const c = cur!;
    const i = c.idx++;
    if (!(i in c.slots)) c.slots[i] = init();
    return [c.slots[i], c];
  };
  const react: any = {
    useState(init: any) {
      const [s, c] = slot(() => ({ v: typeof init === "function" ? init() : init }));
      return [
        s.v,
        (u: any) => {
          const nv = typeof u === "function" ? u(s.v) : u;
          if (!Object.is(nv, s.v)) {
            s.v = nv;
            schedule(c);
          }
        },
      ];
    },
    useRef(init: any) {
      return slot(() => ({ current: init }))[0];
    },
    useReducer(reducer: (s: any, a: any) => any, arg: any, init?: (a: any) => any) {
      const [s, c] = slot(() => ({ v: init ? init(arg) : arg, dispatch: null as null | ((a: any) => void) }));
      s.dispatch ??= (a: any) => {
        const nv = reducer(s.v, a);
        if (!Object.is(nv, s.v)) {
          s.v = nv;
          schedule(c);
        }
      };
      return [s.v, s.dispatch];
    },
    useMemo(fn: () => any, deps: unknown[]) {
      const [s] = slot(() => ({ deps: undefined, v: undefined }));
      if (changed(s.deps, deps)) {
        s.v = fn();
        s.deps = deps;
      }
      return s.v;
    },
    useCallback(fn: any, deps: unknown[]) {
      return react.useMemo(() => fn, deps);
    },
    useEffect(fn: () => any, deps: unknown[]) {
      const [s, c] = slot(() => ({ deps: undefined, cleanup: undefined, first: true }));
      if (s.first || changed(s.deps, deps)) {
        s.first = false;
        s.deps = deps;
        c.effects.push(() => {
          if (typeof s.cleanup === "function") s.cleanup();
          s.cleanup = fn();
        });
      }
    },
    useSyncExternalStore(sub: (l: () => void) => () => void, get: () => any) {
      const c = cur!;
      slot(() => ({ unsub: sub(() => schedule(c)) }));
      return get();
    },
  };
  const mount = <T,>(fn: () => T): { readonly api: T } => {
    const c: Comp = { slots: [], idx: 0, effects: [], out: undefined, scheduled: false, render: () => undefined };
    c.render = () => {
      cur = c;
      c.idx = 0;
      c.effects = [];
      try {
        c.out = fn();
      } finally {
        cur = null;
      }
      const fx = c.effects;
      c.effects = [];
      fx.forEach((f) => f());
    };
    c.render();
    return {
      get api() {
        return c.out as T;
      },
    };
  };
  return { react, mount };
});
vi.mock("react", () => ({ ...R.react, default: R.react }));

// ── browser stand-ins ────────────────────────────────────────────────────────────────────────────────
class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  get length() {
    return this.m.size;
  }
}

const TS = "https://ts.test";
const SETTINGS_KEY = "magus.driveSync.v1";
const TOKEN_KEY = "magus.driveToken.v1";
const CREDENTIAL_KEY = "magus.driveCredential.v1";
const RETURN_KEY = "magus.driveReturn.v2";
const NONCES_KEY = "magus.driveNonces.v1";
const CONFIRMED_NONCE_KEY = "magus.driveNonceConfirmed.v1";
const DEVICE_KEY = "magus.deviceId.v1";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

let ls: MemStorage;
let win: EventTarget & Record<string, any>;
let doc: EventTarget & Record<string, any>;

// ── fake Google (per-account Drive, chosen by the token's prefix) + token service ───────────────────
type Handler = (url: string, init: RequestInit | undefined) => Promise<Response | null> | Response | null;
interface DFile {
  name: string;
  props: Record<string, string>;
  body: string;
  version: number;
  created: number;
}
const accountOf = (token: string) => (token.startsWith("y") ? "y@test" : "x@test");
let drives: Record<string, Map<string, DFile>>;
let seq = 0;
let calls: string[];
let override: Handler | null;
const deadTokens = new Set<string>();
let tokenService: (path: string, body: any) => Promise<Response> | Response;

const jsonRes = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const tokenOf = (init?: RequestInit) => String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "").replace("Bearer ", "");

const fakeFetch = async (input: string, init?: RequestInit): Promise<Response> => {
  const url = String(input);
  calls.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
  const o = override ? await override(url, init) : null;
  if (o) return o;
  if (url.startsWith(TS)) return tokenService(url.slice(TS.length), JSON.parse(String(init?.body ?? "{}")));
  const token = tokenOf(init);
  if (url.startsWith("https://openidconnect.googleapis.com/v1/userinfo")) {
    if (deadTokens.has(token)) return jsonRes(401, {});
    return jsonRes(200, { email: accountOf(token) });
  }
  if (!url.startsWith("https://www.googleapis.com/")) throw new Error(`unexpected ${url}`);
  if (deadTokens.has(token)) return jsonRes(401, { error: "invalid" });
  const files = (drives[accountOf(token)] ??= new Map());
  const u = new URL(url);
  const method = init?.method ?? "GET";
  const meta = (id: string) => {
    const f = files.get(id)!;
    return { id, version: String(f.version), createdTime: String(f.created).padStart(12, "0"), appProperties: f.props };
  };
  if (u.pathname === "/drive/v3/files" && method === "GET") {
    const q = u.searchParams.get("q") ?? "";
    const want = q.includes("'backup'") ? "backup" : q.includes("'sync'") ? "sync" : null;
    let list = [...files.entries()].filter(([, f]) => (want ? f.props.kind === want : false));
    const nameQ = /name='([^']+)'/.exec(q)?.[1];
    if (q.startsWith("name=")) list = [...files.entries()].filter(([, f]) => f.name === nameQ);
    return jsonRes(200, { files: list.map(([id]) => meta(id)) });
  }
  if (u.pathname.startsWith("/drive/v3/files/") && u.searchParams.get("alt") === "media") {
    const f = files.get(u.pathname.split("/").pop()!);
    return f ? new Response(f.body, { status: 200 }) : jsonRes(404, {});
  }
  if (u.pathname === "/upload/drive/v3/files" && method === "POST") {
    const body = String(init?.body);
    const boundary = /boundary=(.+)$/.exec(String((init!.headers as Record<string, string>)["Content-Type"]))![1];
    const parts = body.split(`--${boundary}`).slice(1, 3).map((p) => p.slice(p.indexOf("\r\n\r\n") + 4).replace(/\r\n$/, ""));
    const m = JSON.parse(parts[0]) as { name: string; appProperties: Record<string, string> };
    const id = `f${++seq}`;
    files.set(id, { name: m.name, props: m.appProperties, body: parts[1], version: 1, created: seq });
    return jsonRes(200, meta(id));
  }
  if (u.pathname.startsWith("/upload/drive/v3/files/") && method === "PATCH") {
    const f = files.get(u.pathname.split("/").pop()!)!;
    f.body = String(init?.body);
    f.version++;
    return jsonRes(200, { version: String(f.version) });
  }
  throw new Error(`unhandled ${method} ${url}`);
};

// ── one "tab": a fresh instance of the app's modules over the shared storage ─────────────────────────
const openTab = async () => {
  vi.resetModules();
  const hook = await import("./useDriveSync");
  const roster = await import("./rosterStore");
  const storage = await import("./storage");
  const tab = R.mount(() => hook.useDriveSync({ returnContext: () => ({ screen: "roster", characterId: null }) }));
  return { tab, store: roster.rosterStore(), storage };
};

const settle = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const enableWith = (email: string, token: string | null, credential: string | null) => {
  ls.setItem(SETTINGS_KEY, JSON.stringify({ enabled: true, backups: false, lastSyncAt: null, email }));
  if (token) ls.setItem(TOKEN_KEY, JSON.stringify({ token, exp: Date.now() + 3600_000 }));
  if (credential) ls.setItem(CREDENTIAL_KEY, credential);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  ls = new MemStorage();
  win = new EventTarget() as any;
  win.location = { origin: "https://app.test", search: "", pathname: "/", hash: "", assign: vi.fn() };
  win.history = { replaceState: vi.fn() };
  win.setTimeout = (f: () => void, ms?: number) => globalThis.setTimeout(f, ms);
  win.clearTimeout = (t: any) => globalThis.clearTimeout(t);
  doc = new EventTarget() as any;
  doc.visibilityState = "visible";
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("navigator", { onLine: true }); // no Web Locks: one tab's rounds are what's under test
  vi.stubGlobal("fetch", fakeFetch);
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "cid.apps.googleusercontent.com");
  vi.stubEnv("VITE_TOKEN_SERVICE_URL", TS);
  drives = {};
  seq = 0;
  calls = [];
  override = null;
  deadTokens.clear();
  let n = 0;
  tokenService = (path) => (path === "/v1/token" ? jsonRes(200, { access_token: `at-r${++n}`, expires_in: 3600, scope: DRIVE_SCOPE }) : jsonRes(500, {}));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sync orchestration (useDriveSync): failure and race scenarios", () => {
  test("harness sanity: an edit is uploaded 2 s later and the status settles on idle", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("idle");
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    expect(tab.api.status).toBe("idle");
    expect(tab.api.pending.count).toBe(0);
    expect([...(drives["x@test"]?.values() ?? [])].some((f) => f.props.kind === "sync" && f.body.includes("Aragorn"))).toBe(true);
  });

  test("grant revoked with two tabs open: the tab whose retry runs after the other forgot the credential asks to reconnect (not stuck on syncing)", async () => {
    enableWith("x@test", "at-1", "cred-x");
    // the player removed the app in their Google account: every token and the refresh grant are dead
    deadTokens.add("at-1");
    tokenService = (path) => (path === "/v1/token" ? jsonRes(401, { error: "invalid_grant" }) : jsonRes(500, {}));
    const A = await openTab(); // tab A syncs at start → the token is refused → renew-and-retry in 2 s, status stays "syncing"
    await settle(100);
    expect(A.tab.api.status).toBe("syncing");
    await settle(900);
    const B = await openTab(); // tab B (opened a second later) renews → invalid_grant → forgets the shared credential
    await settle(100);
    expect(B.tab.api.status).toBe("needsTap");
    await settle(1500); // A's retry: no token, no credential → getToken() null → status kept at "syncing"
    // every later trigger in A: an edit, coming back online, coming back to the foreground
    A.store.upsert(A.storage.createBlankRecord("c_b", "Boromir"));
    await settle(2500);
    win.dispatchEvent(new Event("online"));
    await settle(60_000);
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle(100);
    expect(A.tab.api.status).toBe("needsTap");
  });

  test("a failed round (Drive 503) retries by itself and the edit reaches Drive while the app stays open", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    let fail = true;
    override = (url) => (fail && url.startsWith("https://www.googleapis.com/drive/v3/files?") ? jsonRes(503, {}) : null);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    expect(tab.api.status).toBe("error");
    expect(tab.api.note?.text).toContain("magától újra megpróbálja"); // "it will retry by itself"
    fail = false;
    await settle(30 * 60_000); // half an hour, app open in the foreground, no further edits
    expect(tab.api.pending.count).toBe(0);
  });

  test("a hung account check times out and doesn't block later rounds", async () => {
    enableWith("x@test", "at-1", "cred-x");
    // hangs until aborted, as a real fetch would with its signal
    override = (url, init) =>
      url.startsWith("https://openidconnect.googleapis.com/")
        ? new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))
        : null;
    const { tab, store, storage } = await openTab();
    await settle(100);
    override = null; // the network is fine again; only that one request hangs
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    win.dispatchEvent(new Event("online"));
    await settle(10 * 60_000);
    expect(tab.api.status).not.toBe("syncing");
    expect(tab.api.pending.count).toBe(0);
  });

  test("a renewal answered after turning sync off leaves no token on the device", async () => {
    enableWith("x@test", null, "cred-x");
    let answer!: () => void;
    tokenService = (path) =>
      path === "/v1/token" ? new Promise<Response>((res) => (answer = () => res(jsonRes(200, { access_token: "at-late", expires_in: 3600, scope: DRIVE_SCOPE })))) : jsonRes(500, {});
    const { tab } = await openTab();
    await settle(100); // app start: renewal in flight
    tab.api.disable(); // "Kikapcsolás": forgets the token and the credential
    expect(ls.getItem(TOKEN_KEY)).toBeNull();
    answer();
    await settle(100);
    expect(tab.api.status).toBe("off");
    expect(ls.getItem(TOKEN_KEY)).toBeNull();
  });

  test("reconnecting with the wrong account keeps the right account's credential", async () => {
    enableWith("x@test", null, "cred-x");
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), ctx: { screen: "roster", characterId: null }, verifier: "v".repeat(43) }));
    win.location.search = "?state=S1&code=C1";
    tokenService = (path) =>
      path === "/v1/exchange" ? jsonRes(200, { access_token: "y-1", expires_in: 3600, scope: `${DRIVE_SCOPE} openid email`, credential: "cred-y" }) : jsonRes(200, { access_token: "at-r", expires_in: 3600 });
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("needsTap");
    expect(tab.api.note?.text).toContain("y@test");
    expect(ls.getItem(CREDENTIAL_KEY)).toBe("cred-x");
  });

  test("a round still running when sync is turned off leaves no nonces behind (no false clone on another account)", async () => {
    // 1. this device synced with account Y once (its file is in Y's Drive), then sync was turned off
    enableWith("y@test", "y-1", "cred-y");
    let t = await openTab();
    t.store.upsert(t.storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    expect([...drives["y@test"].values()].filter((f) => f.props.kind === "sync")).toHaveLength(1);
    t.tab.api.disable();
    const device = ls.getItem(DEVICE_KEY);
    // 2. later: sync with account X; turned off while X's upload is on its way
    enableWith("x@test", "at-1", "cred-x");
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    override = (url, init) => (url.startsWith("https://www.googleapis.com/upload/") && init?.method === "POST" && !String(init.body).includes("backup") ? (held.then(() => null) as any) : null);
    t = await openTab();
    t.store.upsert({ ...t.store.getState().records[0], name: "Aragorn II" }, t.store.getState().records[0]); // an edit while syncing with X
    await settle(2500); // that round's upload held
    t.tab.api.disable();
    override = null;
    release();
    await settle(100);
    expect.soft(ls.getItem(NONCES_KEY) ?? "[]").toBe("[]");
    expect.soft(ls.getItem(CONFIRMED_NONCE_KEY)).toBeNull();
    // 3. back to account Y (after the consent round trip: a fresh page)
    enableWith("y@test", "y-2", "cred-y2");
    t = await openTab();
    await settle(2500);
    expect.soft(t.store.getState().records.map((r) => r.name)).toEqual(["Aragorn II"]);
    expect(ls.getItem(DEVICE_KEY)).toBe(device);
  });

  test("coming back from Google with an answer for an older sign-in (another tab started a newer one): said, and the newer one is kept", async () => {
    const newer = { state: "S2", at: Date.now(), ctx: { screen: "roster", characterId: null }, verifier: "w".repeat(43) };
    ls.setItem(RETURN_KEY, JSON.stringify(newer));
    win.location.search = "?state=S1&code=C1"; // this tab's sign-in, overwritten by the other tab's
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.note?.error).toBe(true);
    expect(tab.api.note?.text).toContain("nem fejeződött be");
    expect(tab.api.connectIssue).toBeGreaterThan(0); // the window opens again to say so
    expect(JSON.parse(ls.getItem(RETURN_KEY)!)).toEqual(newer); // the other tab's answer can still land
    expect(calls.some((c) => c.includes("/v1/exchange"))).toBe(false);
  });

  test("a failed return from Google (permission refused) reopens the window with the reason", async () => {
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), ctx: { screen: "roster", characterId: null }, verifier: "v".repeat(43) }));
    win.location.search = "?state=S1&code=C1";
    tokenService = (path) => (path === "/v1/exchange" ? jsonRes(200, { access_token: "x-1", expires_in: 3600, scope: "openid email" }) : jsonRes(500, {}));
    const { tab } = await openTab();
    expect(tab.api.connectIssue).toBe(0);
    await settle(100);
    expect(tab.api.status).toBe("off");
    expect(tab.api.note?.error).toBe(true);
    expect(tab.api.note?.text).toContain("Drive");
    expect(tab.api.connectIssue).toBeGreaterThan(0);
  });
});
