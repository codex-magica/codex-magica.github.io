// Google Drive client pieces: how Drive's answers are read, token renewal through the token service.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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
}

const TS = "https://ts.test";
let ls: MemStorage;
let fetchMock: ReturnType<typeof vi.fn>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const load = async () => {
  vi.resetModules();
  return import("./googleDrive");
};

beforeEach(() => {
  ls = new MemStorage();
  fetchMock = vi.fn();
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", { setTimeout, clearTimeout, location: { origin: "https://app.test", search: "", pathname: "/", hash: "" } });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "cid.apps.googleusercontent.com");
  vi.stubEnv("VITE_TOKEN_SERVICE_URL", TS);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Drive answers", () => {
  test("401: that token is forgotten (only that one) and a renewal is asked for", async () => {
    const g = await load();
    ls.setItem("magus.driveToken.v1", JSON.stringify({ token: "t-1", exp: Date.now() + 3600_000 }));
    fetchMock.mockResolvedValue(json(401, {}));
    await expect(g.httpDrive("t-1").listSyncFiles()).rejects.toBeInstanceOf(g.DriveAuthError);
    expect(ls.getItem("magus.driveToken.v1")).toBeNull();
    ls.setItem("magus.driveToken.v1", JSON.stringify({ token: "t-2", exp: Date.now() + 3600_000 }));
    await expect(g.httpDrive("t-1").listSyncFiles()).rejects.toBeInstanceOf(g.DriveAuthError);
    expect(g.validToken()).toBe("t-2"); // a newer token stays
  });

  test("storage full is its own error; other failures are ordinary ones", async () => {
    const g = await load();
    fetchMock.mockResolvedValueOnce(json(403, { error: { errors: [{ reason: "storageQuotaExceeded" }] } }));
    await expect(g.httpDrive("t").updateFile("f1", {})).rejects.toBeInstanceOf(g.DriveFullError);
    fetchMock.mockResolvedValueOnce(json(403, { error: { errors: [{ reason: "userRateLimitExceeded" }] } }));
    const busy = await g.httpDrive("t").updateFile("f1", {}).catch((e: unknown) => e);
    expect(busy).not.toBeInstanceOf(g.DriveFullError);
    expect(String(busy)).toContain("userRateLimitExceeded");
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 503 }));
    await expect(g.httpDrive("t").listSyncFiles()).rejects.toThrow("HTTP 503");
  });

  test("a download that isn't JSON comes back as text (so it can be kept aside intact)", async () => {
    const g = await load();
    fetchMock.mockResolvedValue(new Response('{"cut off', { status: 200 }));
    expect(await g.httpDrive("t").readFile("f1")).toEqual({ raw: '{"cut off' });
  });

  test("a backup's name is quoted safely in the search", async () => {
    const g = await load();
    fetchMock.mockResolvedValue(json(200, { files: [] }));
    await g.httpDrive("t").backupExists("Ki'rály\\nő");
    const q = new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("q")!;
    expect(q).toBe("name='Ki\\'rály\\\\nő' and trashed=false");
  });

  test("long names are cut on a character boundary to fit Drive's limit", async () => {
    const { fitBytes } = await load();
    expect(fitBytes("Árnyék", 110)).toBe("Árnyék");
    const cut = fitBytes("Ő".repeat(80), 110); // 2 bytes each
    expect(new TextEncoder().encode(cut).length).toBeLessThanOrEqual(110);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.slice(0, -1)).toMatch(/^Ő+$/);
  });
});

describe("renewal through the token service", () => {
  test("callers at the same time share one request", async () => {
    const g = await load();
    ls.setItem("magus.driveCredential.v1", "cred-1");
    let answer!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (answer = r)));
    const a = g.refreshAccess();
    const b = g.refreshAccess();
    answer(json(200, { access_token: "at-9", expires_in: 3600 }));
    expect(await a).toBe("at-9");
    expect(await b).toBe("at-9");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(g.validToken()).toBe("at-9");
  });

  test("permission gone (401): that credential is forgotten; the service busy: it's kept", async () => {
    const g = await load();
    ls.setItem("magus.driveCredential.v1", "cred-1");
    fetchMock.mockResolvedValueOnce(json(503, {}));
    await expect(g.refreshAccess()).rejects.toBeInstanceOf(g.TokenServiceError);
    expect(ls.getItem("magus.driveCredential.v1")).toBe("cred-1");
    fetchMock.mockResolvedValueOnce(json(401, { error: "invalid_grant" }));
    await expect(g.refreshAccess()).rejects.toBeInstanceOf(g.DriveAuthError);
    expect(ls.getItem("magus.driveCredential.v1")).toBeNull();
  });

  test("a new credential in the answer (key rotation) replaces the old one", async () => {
    const g = await load();
    ls.setItem("magus.driveCredential.v1", "cred-old");
    fetchMock.mockResolvedValue(json(200, { access_token: "at-1", expires_in: 3600, credential: "cred-new" }));
    await g.refreshAccess();
    expect(ls.getItem("magus.driveCredential.v1")).toBe("cred-new");
  });
});
