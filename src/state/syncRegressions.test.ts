// Regression tests for bugs found in the pre-release review of persistence and the Drive merge (R1–R5).
// Each one is a concrete scenario that lost, resurrected or overwrote a character before its fix.
// The harness below is copied from driveSync.test.ts (not exported there).
import { CharacterRecord } from "../model/character";
import { defaultRecord } from "./defaultRecord";
import { BackupMeta, DriveFileMeta, DriveTransport, FileBody } from "./googleDrive";
import { DeviceIdClashError, runSync } from "./driveSyncEngine";
import { RosterStore, createRosterStore } from "./rosterStore";
import { contentHash } from "./recordHash";
import { deviceId, resetDeviceId, setDeviceIdForTests } from "./versions";
import { confirmNonce, forgetNonces, loadNonces, rememberNonce } from "./syncState";
import { unreadableKeys } from "./storage";


// ── a tiny seeded random generator ───────────────────────────────────────────────────────────────
const rngFrom = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── in-memory localStorage, one per device ───────────────────────────────────────────────────────
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

// ── fake Drive ───────────────────────────────────────────────────────────────────────────────────
interface FakeFile {
  name: string;
  props: Record<string, string>;
  body: string;
  version: number;
  created: number;
}
class FakeDrive implements DriveTransport {
  files = new Map<string, FakeFile>();
  seq = 0;
  rng = rngFrom(1);
  failRate = 0; // the request fails before it does anything
  lostResponseRate = 0; // a write happens, but the answer never arrives
  cutRate = 0; // a download arrives cut off
  cutNext = 0; // the next N downloads arrive cut off
  jitter = 0; // how much rounds interleave
  failOn: string | null = null; // fail every call of this kind
  onOp: ((op: string) => void | Promise<void>) | null = null;
  calls: string[] = [];

  private async step(op: string) {
    this.calls.push(op);
    for (let i = Math.floor(this.rng() * (this.jitter + 1)); i > 0; i--) await Promise.resolve(); // let other rounds run in between
    if (this.onOp) await this.onOp(op);
    if (this.failOn === op || this.rng() < this.failRate) throw new Error(`Google Drive: HTTP 503 (${op})`);
  }
  private lose() {
    if (this.rng() < this.lostResponseRate) throw new Error("network: response lost");
  }
  private meta(id: string): DriveFileMeta {
    const f = this.files.get(id)!;
    return { id, device: f.props.device ?? "", version: String(f.version), createdTime: String(f.created).padStart(12, "0") };
  }
  async listSyncFiles() {
    await this.step("list");
    return [...this.files.entries()].filter(([, f]) => f.props.kind === "sync" || f.name === "codex-magica-roster.json").map(([id]) => this.meta(id));
  }
  async readFile(id: string): Promise<FileBody> {
    await this.step("read");
    const f = this.files.get(id);
    if (!f) throw new Error("Google Drive: HTTP 404");
    if (this.cutNext > 0 || this.rng() < this.cutRate) {
      this.cutNext = Math.max(0, this.cutNext - 1);
      return { raw: f.body.slice(0, Math.floor(f.body.length / 2)) };
    }
    try {
      return { json: JSON.parse(f.body) };
    } catch {
      return { raw: f.body };
    }
  }
  async createSyncFile(device: string, content: unknown) {
    await this.step("create");
    const id = `f${++this.seq}`;
    this.files.set(id, { name: `codex-magica-sync.${device}.json`, props: { kind: "sync", device }, body: JSON.stringify(content), version: 1, created: this.seq });
    this.lose();
    return this.meta(id);
  }
  async updateFile(id: string, content: unknown) {
    await this.step("update");
    const f = this.files.get(id)!;
    f.body = JSON.stringify(content);
    f.version++;
    this.lose();
    return { version: String(f.version) };
  }
  async backupExists(name: string) {
    await this.step("backupExists");
    return [...this.files.values()].some((f) => f.name === name);
  }
  async createBackup(name: string, props: Record<string, string>, content: unknown) {
    await this.step("backup");
    this.files.set(`f${++this.seq}`, { name, props: { kind: "backup", ...props }, body: JSON.stringify(content), version: 1, created: this.seq });
    this.lose();
  }
  async keepUnreadable(name: string, raw: string) {
    await this.step("keepUnreadable");
    this.files.set(`f${++this.seq}`, { name, props: { kind: "unreadable" }, body: raw, version: 1, created: this.seq });
  }
  async listBackups(): Promise<BackupMeta[]> {
    await this.step("listBackups");
    return [...this.files.entries()]
      .filter(([, f]) => f.props.kind === "backup")
      .map(([id, f]) => ({ id, characterId: f.props.char, name: f.props.name, day: f.props.day, reason: f.props.reason as "daily" | "deleted", createdTime: String(f.created) }));
  }
  syncFileOf(device: string) {
    return [...this.files.values()].find((f) => f.props.kind === "sync" && f.props.device === device);
  }
  backups() {
    return [...this.files.values()].filter((f) => f.props.kind === "backup");
  }
  snapshot() {
    return JSON.stringify([...this.files.entries()]);
  }
}

// ── simulated device ─────────────────────────────────────────────────────────────────────────────
let worldTime = Date.UTC(2026, 10, 20, 9, 0, 0);

class Device {
  storage = new MemStorage();
  store: RosterStore;
  backups = true;
  cache = new Map();
  published: Record<string, string> = {};
  backedUp = new Set<string>();
  nonces: string[] = [];
  storedId = false; // like the app: the id comes from this storage (shared by tabs), not pinned by the test
  constructor(
    public id: string,
    public skew = 0
  ) {
    this.store = this.run(() => createRosterStore());
  }
  // everything this device does runs with its own storage, id and clock
  run<T>(fn: () => T): T {
    (globalThis as { localStorage?: unknown }).localStorage = this.storage;
    setDeviceIdForTests(this.storedId ? null : this.id);
    if (this.storedId) this.id = deviceId();
    vi.setSystemTime(worldTime + this.skew);
    return fn();
  }
  now = () => worldTime + this.skew;
  records() {
    return this.store.getState().records;
  }
  byName(name: string) {
    return this.records().find((r) => r.name === name);
  }
  create(name: string, token = `${name}#0`): CharacterRecord {
    return this.run(() => {
      this.store.upsert({ ...defaultRecord, id: `c_${name.replace(/\W/g, "")}_${this.id}`, name, inventoryText: token });
      return this.records()[this.records().length - 1];
    });
  }
  edit(id: string, token: string, rename?: string) {
    this.run(() => {
      const r = this.records().find((x) => x.id === id);
      if (r) this.store.upsert({ ...r, inventoryText: `${r.inventoryText ?? ""}\n${token}`, ...(rename ? { name: rename } : {}) }, r);
    });
  }
  remove(id: string, base?: CharacterRecord) {
    return this.run(() => this.store.remove(id, base));
  }
  // one round, the way useDriveSync does it; `during` runs while the round is waiting on Drive
  async sync(drive: FakeDrive, during?: () => void) {
    const snapshot = this.run(() => {
      this.store.reload();
      return this.store.getState();
    });
    const prevOnOp = drive.onOp;
    let fired = false;
    if (during)
      drive.onOp = (op) => {
        if (!fired && op === "list") {
          fired = true;
          during();
        }
        return prevOnOp?.(op);
      };
    try {
      let snap = snapshot;
      const go = () => {
        snap = this.store.getState();
        const input = { records: snap.records, deletions: snap.deletions, device: this.id, backups: this.backups, backedUp: this.backedUp, ourNonces: this.nonces, rememberNonce: (n: string) => this.nonces.push(n) };
        return runSync(drive, input, this.now, this.cache);
      };
      let out;
      try {
        out = await go();
      } catch (e) {
        if (!(e instanceof DeviceIdClashError)) throw e;
        // what useDriveSync does: a fresh id, this device's versions relabelled, sync again
        const old = this.id;
        this.id = `${old}x${Math.floor(Math.random() * 1e6)}`;
        this.run(() => this.store.relabelDevice(old, this.id, new Set<string>([...e.published, ...Object.values(this.published)])));
        this.nonces = [];
        this.published = {};
        out = await go();
      }
      const snapshotUsed = snap;
      this.run(() => {
        this.store.applyRound(snapshotUsed, out);
      });
      this.published = out.published;
      this.backedUp = out.backedUp;
      return out;
    } finally {
      if (during) drive.onOp = prevOnOp;
    }
  }
  fingerprint() {
    return this.records()
      .map((r) => `${r.id}:${contentHash(r)}`)
      .sort()
      .join("\n");
  }
}



beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  worldTime = Date.UTC(2026, 10, 20, 9, 0, 0);
});
afterEach(() => {
  vi.useRealTimers();
  setDeviceIdForTests(null);
});

const later = (ms = 60_000) => (worldTime += ms);



class QuotaStorage extends MemStorage {
  cap = Infinity;
  used() {
    let n = 0;
    for (const [k, v] of this.m) n += k.length + v.length;
    return n;
  }
  setItem(k: string, v: string) {
    const prev = this.m.get(k);
    const next = this.used() - (prev === undefined ? 0 : k.length + prev.length) + k.length + String(v).length;
    if (next > this.cap) throw new Error("QuotaExceededError");
    super.setItem(k, v);
  }
}

// one round exactly the way useDriveSync.round does it: the real nonce bookkeeping (syncState), a clash
// → resetDeviceId + relabelDevice (only versions not in Drive) + forgetNonces, applyRound
const clashes = new Map<Device, number>();
async function realSync(dev: Device, drive: FakeDrive) {
  dev.run(() => dev.store.reload());
  let snap = dev.store.getState();
  const go = () =>
    dev.run(() => {
      snap = dev.store.getState();
      return runSync(
        drive,
        {
          records: snap.records,
          deletions: snap.deletions,
          device: dev.id,
          backups: dev.backups,
          backedUp: dev.backedUp,
          ourNonces: loadNonces(),
          rememberNonce: (n: string) => dev.run(() => rememberNonce(n)),
          confirmNonce: (n: string) => dev.run(() => confirmNonce(n)),
        },
        dev.now,
        dev.cache
      );
    });
  let out;
  try {
    out = await go();
  } catch (e) {
    if (!(e instanceof DeviceIdClashError)) throw e;
    clashes.set(dev, (clashes.get(dev) ?? 0) + 1);
    const old = dev.id;
    const fresh = dev.run(() => resetDeviceId());
    dev.id = fresh;
    dev.run(() => {
      dev.store.relabelDevice(old, fresh, new Set<string>([...e.published, ...Object.values(dev.published)]));
      forgetNonces();
    });
    dev.published = {};
    out = await go();
  }
  const used = snap;
  dev.run(() => dev.store.applyRound(used, out));
  dev.published = out.published;
  dev.backedUp = out.backedUp;
  return out;
}

const tokensOf = (r: CharacterRecord) => (r.inventoryText ?? "").split("\n").filter(Boolean);
const settle = async (drive: FakeDrive, ...devs: Device[]) => {
  for (let i = 0; i < 3; i++) for (const d of devs) await d.sync(drive);
};

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("R1 a deletion that saw a merged version's content loses to it (deleted character comes back)", () => {
  test("R1a after a conflict: the device whose version won deletes the character before pulling the merge", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Xena");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.edit(x.id, "A1");
    later();
    b.edit(x.id, "B1"); // edited last: keeps the character on every device
    await b.sync(drive);
    await a.sync(drive); // a: B1 keeps Xena (joined vector, cvc = B1), A1 becomes "Xena (másik változat)"
    later();
    b.remove(x.id); // b, still on B1 (exactly the content a published), deletes Xena
    await settle(drive, b, a);
    // b deleted Xena having seen every edit made to her content (A1 lives on as its own copy)
    expect(b.records().find((r) => r.id === x.id)).toBeUndefined();
    expect(a.records().find((r) => r.id === x.id)).toBeUndefined();
  });

  test("R1b after an edit beat a parallel deletion: the editing device deletes it too", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Xena");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.remove(x.id);
    b.edit(x.id, "B1");
    await b.sync(drive);
    await a.sync(drive); // a: the edit wins over a's deletion (correct); a publishes B1 with the joined vector
    later();
    b.remove(x.id); // now b deletes it as well, before pulling a's file
    await settle(drive, b, a);
    expect(b.records().find((r) => r.id === x.id)).toBeUndefined();
    expect(a.records().find((r) => r.id === x.id)).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("R2 storage full: deleting a character saves the roster but not the deletion marker", () => {
  test("R2 the deletion marker is never saved; after a reload the character comes back from Drive", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const qs = new QuotaStorage();
    a.storage = qs;
    a.store = a.run(() => createRosterStore());
    const b = new Device("devb");
    const x = a.create("Xena");
    a.create("Wulf");
    await a.sync(drive);
    await b.sync(drive);
    qs.cap = qs.used(); // storage full (the usual reason a player starts deleting characters)
    later();
    a.remove(x.id);
    // Before the fix this saved the roster without Xena but no deletion marker (the marker write, carrying
    // her whole last state, failed first; the shrinking roster write then succeeded). What's saved must fit
    // together: Xena in the roster, or her marker saved.
    const savedRoster = JSON.parse(qs.getItem("magus.roster.v1")!) as CharacterRecord[];
    const savedDeletions = JSON.parse(qs.getItem("magus.deletions.v1") ?? "{}") as Record<string, unknown>;
    expect(savedRoster.some((r) => r.id === x.id) || savedDeletions[x.id] !== undefined).toBe(true);
    // the app is closed before the next round (offline, or within the 2-second delay), and reopened
    a.store = a.run(() => createRosterStore());
    later();
    await a.sync(drive);
    expect(a.records().find((r) => r.id === x.id)).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("R3 a cloned device with a second tab: the other tab keeps the old device id", () => {
  test("R3 an edit from the stale tab is numbered under the original device's id and silently superseded", async () => {
    const drive = new FakeDrive();
    const orig = new Device("devaaa");
    orig.storage.m.set("magus.deviceId.v1", "devaaa");
    orig.storedId = true;
    const x = orig.create("Xena");
    await realSync(orig, drive);
    // browser data restored onto a second device, opened in two tabs
    const tab1 = new Device("devaaa");
    for (const [k, v] of orig.storage.m) tab1.storage.m.set(k, v);
    tab1.storedId = true;
    tab1.store = tab1.run(() => createRosterStore());
    const tab2 = new Device("devaaa"); // same browser: same storage
    tab2.storage = tab1.storage;
    tab2.storedId = true;
    tab2.store = tab2.run(() => createRosterStore());
    later();
    orig.edit(x.id, "o1");
    await realSync(orig, drive);
    await realSync(tab1, drive); // clash → tab 1 takes a fresh id (resetDeviceId); tab 2 is not told
    expect(tab1.id).not.toBe("devaaa");
    later();
    tab2.run(() => tab2.store.reload()); // the storage event
    tab2.edit(x.id, "tab2-edit"); // numbered under "deva" (tab 2's cached id), with the counter just reset
    later();
    orig.edit(x.id, "o2");
    orig.edit(x.id, "o3");
    await realSync(orig, drive);
    await realSync(tab1, drive); // e.g. tab 1 comes to the foreground first and syncs tab 2's edit
    for (let i = 0; i < 2; i++) {
      await realSync(orig, drive);
      await realSync(tab1, drive);
    }
    const everywhere = [...orig.records(), ...tab1.records()].flatMap(tokensOf);
    expect(everywhere).toContain("tab2-edit");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("R4 an unreadable saved roster can't be kept aside when storage is (nearly) full", () => {
  test("R4 the unreadable roster is overwritten by the next save", () => {
    const d = new Device("deva");
    const qs = new QuotaStorage();
    d.storage = qs;
    // a damaged roster (or one this version can't parse) that takes more than half the free space
    const big = JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ ...defaultRecord, id: `c_${i}`, name: `Hős ${i}` })));
    const damaged = big.slice(0, big.length - 3);
    qs.setItem("magus.roster.v1", damaged);
    qs.cap = qs.used() + 2000;
    d.store = d.run(() => createRosterStore());
    expect(d.records()).toEqual([]);
    d.create("Új"); // the player starts over: the new small roster is saved over the damaged one
    const keptSomewhere = [...qs.m.values()].some((v) => v === damaged);
    expect(d.run(() => unreadableKeys())).not.toEqual([]);
    expect(keptSomewhere).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("R5 a deletion confirmed after a sync brought a newer version deletes a version the player never saw", () => {
  test("R5 the delete dialog was opened on v1; a round pulls b's edit; confirming deletes b's edit (backups off)", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.backups = b.backups = false;
    const x = a.create("Xena");
    await a.sync(drive);
    await b.sync(drive);
    const shownInDialog = a.records().find((r) => r.id === x.id)!; // WelcomeScreen: confirmDeleteId set
    later();
    b.edit(x.id, "b-edit-never-seen-on-a");
    await b.sync(drive);
    await a.sync(drive); // the 2-second / visibility round lands while the dialog is open
    expect(tokensOf(a.records().find((r) => r.id === x.id)!)).toContain("b-edit-never-seen-on-a");
    expect(a.remove(shownInDialog.id, shownInDialog)).toBe(false); // it changed since the dialog opened: not deleted
    await settle(drive, a, b);
    const everywhere = [...a.records(), ...b.records()].flatMap(tokensOf);
    expect(everywhere).toContain("b-edit-never-seen-on-a");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("this device's own file downloaded cut off twice, at different points", () => {
  test("the round stops (tried again later) instead of treating the file as damaged and rewriting it", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    a.create("Xena");
    await a.sync(drive);
    const ownId = [...drive.files.keys()][0];
    const before = drive.files.get(ownId)!.body;
    const fileCount = drive.files.size;
    a.cache.clear(); // as after a reload
    let cuts = 0;
    const realRead = drive.readFile.bind(drive);
    drive.readFile = async (id: string) => {
      const f = drive.files.get(id);
      if (id === ownId && f && cuts < 2) return { raw: f.body.slice(0, 20 + 15 * ++cuts) }; // a flaky connection
      return realRead(id);
    };
    await expect(a.sync(drive)).rejects.toThrow();
    expect(drive.files.get(ownId)!.body).toBe(before);
    expect(drive.files.size).toBe(fileCount); // nothing kept aside as "unreadable"
    await a.sync(drive); // the connection is fine again
    expect(a.records().map((r) => r.name)).toEqual(["Xena"]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("a new device id taken in one tab", () => {
  test("is used by the browser's other tabs at once (each tab has its own copy of the code)", async () => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemStorage();
    vi.resetModules();
    const tab1 = await import("./versions");
    vi.resetModules();
    const tab2 = await import("./versions");
    const old = tab1.deviceId();
    expect(tab2.deviceId()).toBe(old);
    const fresh = tab1.resetDeviceId(); // tab 1 found a clone writing under the old id
    expect(fresh).not.toBe(old);
    expect(tab2.deviceId()).toBe(fresh);
    expect(tab2.bump({}, tab2.deviceId())).toEqual({ [fresh]: expect.any(Number) });
  });
});
