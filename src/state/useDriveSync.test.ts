// Failure and race scenarios for the Drive sync orchestration (useDriveSync + googleDrive), found in the
// pre-release review and fixed; run against the real hook
// with a tiny stand-in for React's hooks, an in-memory localStorage shared by "tabs" (separate module
// instances), fake timers, and a fake fetch for Google (Drive REST) and the token service.
// Each test asserts the intended behaviour.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemStorage } from "./testing/syncHarness";

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
    useMemo(fn: () => any, deps: unknown[]) {
      const [s] = slot(() => ({ deps: undefined, v: undefined }));
      if (changed(s.deps, deps)) {
        s.v = fn();
        s.deps = deps;
      }
      return s.v;
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
  const mount = <T,>(fn: () => T): { readonly api: T; unmount: () => void } => {
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
      // the component goes away (TabGate shows "open in another tab"): every effect's cleanup runs, and
      // later state changes render nothing
      unmount() {
        c.render = () => undefined;
        for (const s of c.slots) {
          if (s && typeof s.cleanup === "function") s.cleanup();
          if (s && typeof s.unsub === "function") s.unsub();
        }
      },
    };
  };
  return { react, mount };
});
vi.mock("react", () => ({ ...R.react, default: R.react }));

// ── browser stand-ins ────────────────────────────────────────────────────────────────────────────────
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
  if (url.startsWith(TS)) {
    const path = url.slice(TS.length);
    const res = await tokenService(path, JSON.parse(String(init?.body ?? "{}")));
    // like the real token service: the exchange answer names the account (from Google's ID token)
    if (path === "/v1/exchange" && res.status === 200) {
      const body = (await res.clone().json()) as Record<string, unknown>;
      if (typeof body.access_token === "string" && !("email" in body)) return jsonRes(200, { ...body, email: accountOf(body.access_token) });
    }
    return res;
  }
  const token = tokenOf(init);
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
  const tab = R.mount(() => hook.useDriveSync());
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
  test("an edit is uploaded 2 s later and the status settles on idle", async () => {
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
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), verifier: "v".repeat(43) }));
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
    expect(ls.getItem(NONCES_KEY) ?? "[]").toBe("[]");
    expect(ls.getItem(CONFIRMED_NONCE_KEY)).toBeNull();
    // 3. back to account Y (after the consent round trip: a fresh page)
    enableWith("y@test", "y-2", "cred-y2");
    t = await openTab();
    await settle(2500);
    expect(t.store.getState().records.map((r) => r.name)).toEqual(["Aragorn II"]);
    expect(ls.getItem(DEVICE_KEY)).toBe(device);
  });

  test("coming back from Google with an answer for an older sign-in (another tab started a newer one): said, and the newer one is kept", async () => {
    const newer = { state: "S2", at: Date.now(), verifier: "w".repeat(43) };
    ls.setItem(RETURN_KEY, JSON.stringify(newer));
    win.location.search = "?state=S1&code=C1"; // this tab's sign-in, overwritten by the other tab's
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.note?.error).toBe(true);
    expect(tab.api.note?.text).toContain("nem fejeződött be");
    expect(tab.api.connectProblem).toBe(true); // the window opens again to say so
    expect(JSON.parse(ls.getItem(RETURN_KEY)!)).toEqual(newer); // the other tab's answer can still land
    expect(calls.some((c) => c.includes("/v1/exchange"))).toBe(false);
  });

  test("a failed return from Google (permission refused) reopens the window with the reason", async () => {
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), verifier: "v".repeat(43) }));
    win.location.search = "?state=S1&code=C1";
    tokenService = (path) => (path === "/v1/exchange" ? jsonRes(200, { access_token: "x-1", expires_in: 3600, scope: "openid email" }) : jsonRes(500, {}));
    const { tab } = await openTab();
    expect(tab.api.connectProblem).toBe(false);
    await settle(100);
    expect(tab.api.status).toBe("off");
    expect(tab.api.note?.error).toBe(true);
    expect(tab.api.note?.text).toContain("jelöld be a Drive-ra vonatkozó négyzetet");
    expect(tab.api.connectProblem).toBe(true);
  });

  test("a failed round retries by itself: after 30 s, then twice as long each time; a success starts over; turning off stops them", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    let fail = true;
    override = (url) => (fail && url.startsWith("https://www.googleapis.com/drive/v3/files?") ? jsonRes(503, {}) : null);
    const rounds = () => calls.filter((c) => c.startsWith("GET https://www.googleapis.com/drive/v3/files")).length;
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500); // the edit's round fails
    expect(tab.api.status).toBe("error");
    expect(tab.api.note?.text).toContain("magától újra megpróbálja"); // "it will retry by itself"
    const n = rounds();
    await settle(28_000);
    expect(rounds()).toBe(n); // not yet
    await settle(3_000);
    expect(rounds()).toBe(n + 1); // 30 s
    await settle(57_000);
    expect(rounds()).toBe(n + 1);
    await settle(4_000);
    expect(rounds()).toBe(n + 2); // then 60 s
    fail = false;
    await settle(121_000); // then 120 s: works
    expect(tab.api.status).toBe("idle");
    expect(tab.api.pending.count).toBe(0);
    fail = true;
    store.upsert(storage.createBlankRecord("c_b", "Boromir"));
    await settle(2500);
    const m = rounds();
    await settle(31_000);
    expect(rounds()).toBe(m + 1); // 30 s again, not 240
    tab.api.disable();
    await settle(30 * 60_000);
    expect(rounds()).toBe(m + 1);
  });

  test("the Google permission gone in the background: a one-time card says so, until dismissed", async () => {
    enableWith("x@test", null, "cred-x");
    tokenService = () => jsonRes(401, { error: "invalid_grant" });
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("needsTap");
    expect(tab.api.hop).toBe("lost");
    tab.api.dismissHop();
    await settle(0);
    expect(tab.api.hop).toBeNull();
  });

  test("without a token service there's no sync at all (no button, no requests)", async () => {
    vi.stubEnv("VITE_TOKEN_SERVICE_URL", "");
    enableWith("x@test", "at-1", null);
    const { tab, store, storage } = await openTab();
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(5000);
    expect(tab.api.available).toBe(false);
    expect(calls).toEqual([]);
  });

  test("Drive data from a newer app version: sync waits for the update, without retrying", async () => {
    enableWith("x@test", "at-1", "cred-x");
    drives["x@test"] = new Map([
      ["f99", { name: "codex-magica-sync.other.json", props: { kind: "sync", device: "other" }, body: JSON.stringify({ format: "codex-magica-sync", version: 99, device: "other", characters: {} }), version: 1, created: 1 }],
    ]);
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.needsUpdate).toBe(true);
    expect(tab.api.status).toBe("error");
    expect(tab.api.note?.text).toContain("újabb verzióját");
    const n = calls.length;
    await settle(30 * 60_000);
    expect(calls.length).toBe(n); // nothing to gain by asking again
  });

  test("cancelling on Google's page is a notice, not an error; the window says it once", async () => {
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), verifier: "v".repeat(43) }));
    win.location.search = "?state=S1&error=access_denied";
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("off");
    expect(tab.api.note?.error).toBe(false);
    expect(tab.api.note?.text).toContain("kikapcsolva maradt");
    expect(tab.api.connectProblem).toBe(true);
    tab.api.ackConnectProblem(); // the player closed the window
    await settle(0);
    expect(tab.api.connectProblem).toBe(false); // the roster screen coming back doesn't reopen it
  });

});

// ── helpers for the tests below ──
const syncFileHas = (account: string, text: string) => [...(drives[account]?.values() ?? [])].some((f) => f.props.kind === "sync" && f.body.includes(text));
const codeReturn = (state: string) => {
  ls.setItem(RETURN_KEY, JSON.stringify({ state, at: Date.now(), verifier: "v".repeat(43) }));
  win.location.search = `?state=${state}&code=C-${state}`;
};

describe("sync orchestration: reconnects, Google storage", () => {
  test("Google storage full (403 storageQuotaExceeded): the player is told their storage is full, and sync goes on once there's room", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    override = (url) =>
      url.startsWith("https://www.googleapis.com/upload/")
        ? jsonRes(403, { error: { code: 403, message: "The user's Drive storage quota has been exceeded.", errors: [{ reason: "storageQuotaExceeded" }] } })
        : null;
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(3 * 3600_000);
    expect(tab.api.status).toBe("error");
    const uploads = calls.filter((c) => c.startsWith("PATCH https://www.googleapis.com/upload/")).length;
    expect(uploads).toBeGreaterThan(5); // keeps trying (slowly), so it goes on by itself once there's room
    expect(tab.api.note?.text ?? "").not.toMatch(/magától újra megpróbálja/);
    expect(tab.api.note?.text ?? "").toMatch(/tárhely/i);
    expect(tab.api.driveFull).toBe(true);
    override = null; // the player made room
    await settle(16 * 60_000);
    expect(tab.api.status).toBe("idle");
    expect(tab.api.driveFull).toBe(false);
  });
  test("phone: an edit, then the app goes to the background within 2 s with the access token expired: the edit still leaves for Drive", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("idle");
    // more than an hour later (no sync since: nothing changed), the access token has run out
    ls.removeItem(TOKEN_KEY);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn")); // e.g. HP changed at the table
    await settle(500);
    doc.visibilityState = "hidden"; // phone locked / app switched: the page is frozen soon after
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle(1000); // still before the 2-second timer (which a frozen page never reaches)
    expect(calls.some((c) => c.includes("/v1/token"))).toBe(true); // a renewal was at least attempted
    expect(syncFileHas("x@test", "Aragorn")).toBe(true);
  });

  test("cancelling a reconnect says sync is still stopped (not that it didn't turn on)", async () => {
    enableWith("x@test", null, null);
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), verifier: "v".repeat(43) }));
    win.location.search = "?state=S1&error=access_denied";
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.note?.text).toContain("továbbra is szünetel");
  });

  test("offline, it doesn't leave for Google's page (the browser's error page, outside the app)", async () => {
    enableWith("x@test", null, null);
    vi.stubGlobal("navigator", { onLine: false });
    const { tab } = await openTab();
    await settle(100);
    tab.api.syncNow();
    await settle(100);
    expect(win.location.assign).not.toHaveBeenCalled();
    expect(tab.api.note?.text).toContain("Nincs internetkapcsolat");
  });

});

// ── the app continued in another tab ("Folytatás itt"): the tab that stepped back does nothing more ──
const syncFiles = (account: string) => [...(drives[account]?.values() ?? [])].filter((f) => f.props.kind === "sync");

describe("taking over in another tab", () => {
  test("while this tab finishes turning sync on: it keeps nothing (the player turns it on again in the tab in use)", async () => {
    codeReturn("S1"); // back from Google's page, turning sync on
    let answer!: () => void;
    tokenService = (path) =>
      path === "/v1/exchange"
        ? new Promise<Response>((res) => (answer = () => res(jsonRes(200, { access_token: "x-1", expires_in: 3600, scope: `${DRIVE_SCOPE} openid email`, credential: "cred-x" }))))
        : jsonRes(200, { access_token: "x-r", expires_in: 3600, scope: DRIVE_SCOPE });
    const A = await openTab();
    A.store.upsert(A.storage.createBlankRecord("c_a", "Aragorn"));
    await settle(100); // exchanging the code
    A.tab.unmount(); // "Folytatás itt" in another tab
    win.location.search = "";
    const B = await openTab();
    await settle(100);
    const before = calls.length;
    answer();
    await settle(5000);
    expect(calls.slice(before).filter((c) => c.includes("googleapis.com"))).toHaveLength(0); // no round from the stepped-back tab
    expect(JSON.parse(ls.getItem(SETTINGS_KEY) ?? "{}").enabled ?? false).toBe(false); // nothing turned on
    expect(ls.getItem(CREDENTIAL_KEY)).toBeNull();
    expect(B.tab.api.enabled).toBe(false);
  });
  test("while this tab finishes turning sync on and Drive is unreachable: it doesn't keep retrying in the background", async () => {
    codeReturn("S1");
    let answer!: () => void;
    tokenService = (path) =>
      path === "/v1/exchange"
        ? new Promise<Response>((res) => (answer = () => res(jsonRes(200, { access_token: "x-1", expires_in: 3600, scope: `${DRIVE_SCOPE} openid email`, credential: "cred-x" }))))
        : jsonRes(200, { access_token: "x-r", expires_in: 3600, scope: DRIVE_SCOPE });
    override = (url) => (url.startsWith("https://www.googleapis.com/drive/v3/files?") ? jsonRes(503, {}) : null);
    const A = await openTab();
    await settle(100);
    A.tab.unmount();
    answer();
    await settle(100);
    const n = calls.length;
    await settle(60 * 60_000);
    expect(calls.length).toBe(n);
  });

  test("in the middle of a round: that round writes nothing, and the tab in use keeps the device id and sends the edit", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const A = await openTab();
    A.store.upsert(A.storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500); // first round: this device's file and mark exist
    A.store.upsert({ ...A.store.getState().records[0], name: "Aragorn II" }, A.store.getState().records[0]);
    const device = ls.getItem(DEVICE_KEY);
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let holding = true;
    override = (url) => (holding && url.startsWith("https://www.googleapis.com/drive/v3/files?") ? (held.then(() => null) as any) : null);
    await settle(2500); // the next round waits on the listing...
    A.tab.unmount(); // ...when "Folytatás itt" in another tab takes over
    holding = false;
    release();
    await settle(100);
    expect(syncFiles("x@test")[0].body).not.toContain("Aragorn II"); // the round that's no longer wanted wrote nothing
    const B = await openTab();
    await settle(100);
    expect(B.tab.api.status).toBe("idle");
    expect(ls.getItem(DEVICE_KEY)).toBe(device); // no false clone
    expect(syncFiles("x@test")).toHaveLength(1);
    expect(syncFiles("x@test")[0].body).toContain("Aragorn II"); // the tab in use sent it
  });

  test("a sign-in answer that doesn't name the account isn't kept (the account can't be checked)", async () => {
    enableWith("x@test", null, "cred-x");
    codeReturn("S1");
    tokenService = (path) =>
      path === "/v1/exchange" ? jsonRes(200, { access_token: "x-2", expires_in: 3600, scope: `${DRIVE_SCOPE} openid email`, credential: "cred-new", email: "" }) : jsonRes(500, {});
    const { tab } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("needsTap");
    expect(tab.api.note?.text).toContain("Nem sikerült ellenőrizni");
    expect(ls.getItem(CREDENTIAL_KEY)).toBe("cred-x"); // the right account's credential stays
  });
});

const listing = (url: string) => url.startsWith("https://www.googleapis.com/drive/v3/files?") && url.includes("'sync'");

describe("one round at a time, and what failures say", () => {
  test("an edit made while a round runs, with the token service down for a moment: it still reaches Drive by itself", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    expect(tab.api.status).toBe("idle");
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let holding = true;
    override = (url) => (holding && listing(url) ? (held.then(() => null) as any) : null);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500); // round 1 starts with at-1 and waits on Drive
    // the access token runs out meanwhile, and the token service has a hiccup
    ls.removeItem(TOKEN_KEY);
    tokenService = () => jsonRes(503, {});
    store.upsert(storage.createBlankRecord("c_b", "Boromir")); // an edit while round 1 runs
    await settle(2500); // asked for while round 1 runs: it runs right after it
    holding = false;
    release();
    await settle(100); // round 1 succeeds (Aragorn), and clears the retry meant for Boromir
    let n = 0;
    tokenService = (path) => (path === "/v1/token" ? jsonRes(200, { access_token: `at-r${++n}`, expires_in: 3600, scope: DRIVE_SCOPE }) : jsonRes(500, {}));
    await settle(30 * 60_000); // app open, no further edits
    expect(syncFileHas("x@test", "Aragorn")).toBe(true);
    expect({ status: tab.api.status, pending: tab.api.pending.count, boromirInDrive: syncFileHas("x@test", "Boromir") }).toEqual({ status: "idle", pending: 0, boromirInDrive: true });
  });

  test("the permission gone while a round runs: after it, the player is asked to reconnect (not told it synced)", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let holding = true;
    override = (url) => (holding && listing(url) ? (held.then(() => null) as any) : null);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    ls.removeItem(TOKEN_KEY);
    tokenService = () => jsonRes(401, { error: "invalid_grant" });
    store.upsert(storage.createBlankRecord("c_b", "Boromir"));
    await settle(2500);
    holding = false;
    release();
    await settle(100);
    expect(tab.api.status).toBe("needsTap"); // Boromir can't go up without a reconnect
  });

  test("an edit, then the phone locked while a round runs: the edit leaves right after that round", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { store, storage } = await openTab();
    await settle(100);
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let holding = true;
    override = (url) => (holding && listing(url) ? (held.then(() => null) as any) : null);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500); // round 1 waits on a slow network
    store.upsert(storage.createBlankRecord("c_b", "Boromir"));
    await settle(200);
    doc.visibilityState = "hidden"; // phone locked: a round is asked for, one is running
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle(10);
    holding = false;
    release();
    await settle(1000); // the page gets a moment before it's frozen
    expect(syncFileHas("x@test", "Aragorn")).toBe(true);
    expect(syncFileHas("x@test", "Boromir")).toBe(true);
  });

  test("a round whose result can't be saved on this device says so (not that Google Drive is unreachable)", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    ls.full.add("magus.roster.v1"); // storage full right after the edit
    ls.full.add("magus.deletions.v1");
    await settle(2500);
    expect(tab.api.status).toBe("error");
    expect(tab.api.note?.text ?? "").not.toContain("nem érhető el a Google Drive");
  });

  test("storage full when the round notes its mark: it writes nothing and says this device can't save", async () => {
    enableWith("x@test", "at-1", "cred-x");
    const { tab, store, storage } = await openTab();
    await settle(100);
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    ls.full.add(NONCES_KEY);
    await settle(2500);
    expect(tab.api.status).toBe("error");
    expect(tab.api.note?.text ?? "").toContain("Ezen az eszközön most nem sikerül menteni");
  });

  test("several triggers failing at once on the token service back off once, not three times", async () => {
    enableWith("x@test", null, "cred-x");
    tokenService = () => jsonRes(503, {});
    const { tab } = await openTab();
    await settle(100); // start: renewal fails, retry in 30 s
    expect(tab.api.status).toBe("error");
    await settle(25_000);
    win.dispatchEvent(new Event("online"));
    doc.dispatchEvent(new Event("visibilitychange")); // visible, > 20 s since last attempt... (no round yet: lastAttempt 0)
    await settle(100);
    const before = calls.filter((c) => c.includes("/v1/token")).length;
    await settle(65_000); // second failure: the next try should come 60 s later (30, 60, 120, ...)
    expect(calls.filter((c) => c.includes("/v1/token")).length).toBeGreaterThan(before);
  });

  test("React's development double start (start, stop, start) while finishing sign-in syncs once and settles", async () => {
    ls.setItem(RETURN_KEY, JSON.stringify({ state: "S1", at: Date.now(), verifier: "v".repeat(43) }));
    win.location.search = "?state=S1&code=C1";
    tokenService = (path) =>
      path === "/v1/exchange" ? jsonRes(200, { access_token: "x-1", expires_in: 3600, scope: `${DRIVE_SCOPE} openid email`, credential: "cred-x" }) : jsonRes(200, { access_token: "x-r", expires_in: 3600, scope: DRIVE_SCOPE });
    vi.resetModules();
    const ctl = await import("./driveSyncController");
    const s = ctl.driveSync();
    s.start();
    s.stop();
    s.start();
    s.start();
    await settle(3000);
    expect(calls.filter((c) => c.includes("/v1/exchange"))).toHaveLength(1);
    expect(s.getState().status).toBe("idle");
    expect(s.getState().settings.enabled).toBe(true);
    expect(s.getState().hop === "backDone" || s.getState().hop === null).toBe(true);
  });

  test("Google storage full, then the permission lost: the roster asks to reconnect (not to free space)", async () => {
    enableWith("x@test", "at-1", null);
    const { tab, store, storage } = await openTab();
    await settle(100);
    override = (url) =>
      url.startsWith("https://www.googleapis.com/upload/") ? jsonRes(403, { error: { errors: [{ reason: "storageQuotaExceeded" }] } }) : null;
    store.upsert(storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    expect(tab.api.driveFull).toBe(true);
    override = null;
    deadTokens.add("at-1"); // the permission is gone (and there's no credential to renew with)
    tab.api.syncNow();
    await settle(100);
    expect(tab.api.status).toBe("needsTap");
    expect(tab.api.driveFull).toBe(false);
  });
});

describe("the notice that a deleted character came back", () => {
  // Sync runs when the app goes to the background with changes waiting, which is exactly when a phone's
  // OS may end the app: the notice must survive that (it's kept on the device until dismissed).
  test("a deletion undone by a background round is still announced after the app was closed and reopened", async () => {
    const lsA = ls;
    const lsB = new MemStorage();
    // device A: Aragorn, synced
    lsA.setItem(DEVICE_KEY, "deviceaa");
    enableWith("x@test", "at-1", "cred-x");
    let t = await openTab();
    await settle(100);
    t.store.upsert(t.storage.createBlankRecord("c_a", "Aragorn"));
    await settle(2500);
    expect(t.tab.api.pending.count).toBe(0);
    t.tab.unmount();
    // device B: gets Aragorn, edits it, syncs
    ls = lsB;
    vi.stubGlobal("localStorage", lsB);
    lsB.setItem(DEVICE_KEY, "devicebb");
    enableWith("x@test", "at-2", "cred-x");
    t = await openTab();
    await settle(100);
    const got = t.store.getState().records.find((r) => r.id === "c_a")!;
    expect(got).toBeDefined();
    t.store.upsert({ ...got, inventoryText: "edited on B" }, got);
    await settle(2500);
    t.tab.unmount();
    // device A, not synced since: the player deletes Aragorn and locks the phone
    ls = lsA;
    vi.stubGlobal("localStorage", lsA);
    t = await openTab();
    // (no foreground round yet: the app was just opened; the deletion happens right away)
    const before = t.store.getState().records.find((r) => r.id === "c_a")!;
    expect(t.store.remove("c_a", before)).toBe(true);
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    await settle(100);
    expect(t.store.getState().records.some((r) => r.id === "c_a")).toBe(true); // back: B's edit wins (by design)
    expect(t.tab.api.notice?.text).toContain("Aragorn"); // said, in memory
    // the OS ends the app in the background; the player opens it again
    t.tab.unmount();
    doc.visibilityState = "visible";
    t = await openTab();
    await settle(100);
    expect(t.store.getState().records.some((r) => r.id === "c_a")).toBe(true);
    expect(t.tab.api.notice?.text ?? null).not.toBeNull(); // the player must still be told why it's back
  });
});
