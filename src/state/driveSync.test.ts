// Google Drive sync: full rounds between simulated devices against an in-memory Drive (no network),
// with failure injection, interleaved concurrent rounds, skewed clocks and edits during rounds.
// Each device has its own localStorage and device id and uses the real roster store.
import { CharacterRecord } from "../model/character";
import { defaultRecord } from "./defaultRecord";
import { BackupMeta, DriveFileMeta, DriveTransport, FileBody } from "./googleDrive";
import { combine, localVersions, parseDeviceFile, reconcile } from "./driveMerge";
import { SyncNewerVersionError, runSync } from "./driveSyncEngine";
import { RosterStore, conflictCopyName, createRosterStore } from "./rosterStore";
import { contentHash } from "./recordHash";
import { setDeviceIdForTests } from "./versions";
import { normalizeRecord } from "./storage";
import { parseImportFile } from "./transfer";

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
    return [...this.files.entries()].filter(([, f]) => f.props.kind === "sync").map(([id]) => this.meta(id));
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
const DAY = 24 * 3600_000;
let worldTime = Date.UTC(2026, 10, 20, 9, 0, 0);

class Device {
  storage = new MemStorage();
  store: RosterStore;
  cache = new Map();
  published = {};
  backedUp = new Set<string>();
  constructor(
    public id: string,
    public skew = 0
  ) {
    this.store = this.run(() => createRosterStore());
  }
  // everything this device does runs with its own storage, id and clock
  run<T>(fn: () => T): T {
    (globalThis as { localStorage?: unknown }).localStorage = this.storage;
    setDeviceIdForTests(this.id);
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
      if (r) this.store.upsert({ ...r, inventoryText: `${r.inventoryText ?? ""}\n${token}`, ...(rename ? { name: rename } : {}) });
    });
  }
  remove(id: string) {
    this.run(() => this.store.remove(id));
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
      const out = await runSync(drive, { records: snapshot.records, deletions: snapshot.deletions, device: this.id, backups: true, backedUp: this.backedUp }, this.now, this.cache);
      this.run(() => {
        const next = reconcile(snapshot, this.store.getState(), out);
        this.store.applySync(next.records, next.deletions);
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

const tokensOf = (r: CharacterRecord) => (r.inventoryText ?? "").split("\n").filter(Boolean);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  worldTime = Date.UTC(2026, 10, 20, 9, 0, 0);
});
afterEach(() => {
  vi.useRealTimers();
  setDeviceIdForTests(null);
});

const later = (ms = 60_000) => (worldTime += ms);

describe("Google Drive sync: rounds between devices", () => {
  test("the first device publishes, a new device pulls everything", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    a.create("Aldar");
    a.create("Brenna");
    const up = await a.sync(drive);
    expect(up.uploaded).toBe(true);
    const b = new Device("devb");
    const down = await b.sync(drive);
    expect(b.records().map((r) => r.name).sort()).toEqual(["Aldar", "Brenna"]);
    expect(down.pulled).toBe(2);
  });

  test("edits and deletions travel; a deletion doesn't come back from an old copy", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    const br = a.create("Brenna");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.edit(al.id, "a1", "Aldar the Bold");
    a.remove(br.id);
    await a.sync(drive);
    await b.sync(drive);
    expect(b.records().map((r) => r.name)).toEqual(["Aldar the Bold"]);
    // b's own file still had Brenna until now; nothing brings her back
    await a.sync(drive);
    await b.sync(drive);
    expect(a.records().map((r) => r.name)).toEqual(["Aldar the Bold"]);
    expect(b.records().map((r) => r.name)).toEqual(["Aldar the Bold"]);
  });

  test("an edit beats a deletion made elsewhere in parallel", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.remove(al.id);
    b.edit(al.id, "b1", "Aldar, still alive");
    await a.sync(drive);
    await b.sync(drive);
    await a.sync(drive);
    expect(a.records().map((r) => r.name)).toEqual(["Aldar, still alive"]);
    expect(b.records().map((r) => r.name)).toEqual(["Aldar, still alive"]);
  });

  test("an edit beats a parallel deletion whichever device syncs first", async () => {
    for (const editorFirst of [true, false]) {
      const drive = new FakeDrive();
      const a = new Device("deva");
      const b = new Device("devb");
      const al = a.create("Aldar");
      await a.sync(drive);
      await b.sync(drive);
      later();
      a.remove(al.id);
      b.edit(al.id, "b1", "Aldar, still alive");
      const order = editorFirst ? [b, a, b, a] : [a, b, a, b];
      await order[0].sync(drive);
      await order[1].sync(drive);
      // whoever syncs second already sees the edit win (no flip-flop on the deleting device)
      expect(order[1].records().map((r) => r.name)).toEqual(["Aldar, still alive"]);
      for (const d of order.slice(2)) await d.sync(drive);
      expect(a.records().map((r) => r.name)).toEqual(["Aldar, still alive"]);
      expect(b.fingerprint()).toBe(a.fingerprint());
    }
  });

  test("a version of unknown origin is never silently replaced", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.create("Aldar");
    await a.sync(drive);
    // a file entry with no version history (an odd or hand-made file) and different content
    const f = drive.syncFileOf("deva")!;
    const file = JSON.parse(f.body);
    const id = Object.keys(file.characters)[0];
    file.characters[id] = { ...file.characters[id], vc: {}, record: { ...file.characters[id].record, name: "Aldar (odd)" } };
    f.body = JSON.stringify(file);
    f.version++;
    b.run(() => b.store.upsert({ ...defaultRecord, id, name: "Aldar (b)" }));
    await b.sync(drive);
    expect(b.records().map((r) => r.name).sort()).toEqual(["Aldar (b)", conflictCopyName("Aldar (odd)")].sort().reverse().sort());
  });

  test("parallel edits keep both versions, and every device ends up with the same two (no extra copies)", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const c = new Device("devc");
    const al = a.create("Aldar");
    for (const d of [a, b, c]) await d.sync(drive);
    later();
    a.edit(al.id, "a1", "Aldar (A)");
    later(1000);
    b.edit(al.id, "b1", "Aldar (B)");
    for (let i = 0; i < 3; i++) for (const d of [a, b, c]) await d.sync(drive);
    const names = a.records().map((r) => r.name).sort();
    expect(names).toEqual([conflictCopyName("Aldar (A)"), "Aldar (B)"].sort()); // the later edit keeps the character
    expect(b.fingerprint()).toBe(a.fingerprint());
    expect(c.fingerprint()).toBe(a.fingerprint());
  });

  test("a failed download writes nothing and loses nothing (the overwrite bug)", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.edit(al.id, "a1");
    a.create("Yrsa");
    await a.sync(drive);
    const before = drive.snapshot();
    drive.failOn = "read";
    await expect(b.sync(drive)).rejects.toThrow(/503/);
    expect(drive.snapshot()).toBe(before);
    drive.failOn = null;
    await b.sync(drive);
    expect(b.records().map((r) => r.name).sort()).toEqual(["Aldar", "Yrsa"]);
    expect(tokensOf(b.byName("Aldar")!)).toContain("a1");
  });

  test("a cut-off download is read again; a really damaged own file is kept aside before it's replaced", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    a.create("Aldar");
    await a.sync(drive);
    a.cache.clear();
    drive.cutNext = 1; // the first download arrives cut off, the second one fine
    later();
    a.edit(a.records()[0].id, "a1");
    await a.sync(drive);
    expect(drive.calls.filter((c) => c === "read")).toHaveLength(2);
    expect(drive.files.size).toBe(1); // nothing set aside: it was only a cut-off download
    // now really damage the file
    drive.syncFileOf("deva")!.body = '{"format":"codex-magica-sync","vers';
    a.cache.clear();
    later();
    a.edit(a.records()[0].id, "a2");
    await a.sync(drive);
    const aside = [...drive.files.values()].find((f) => f.props.kind === "unreadable");
    expect(aside?.body).toBe('{"format":"codex-magica-sync","vers');
    expect(parseDeviceFile(JSON.parse(drive.syncFileOf("deva")!.body)).ok).toBe(true);
  });

  test("another device's damaged file is left alone and can't delete anything", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    drive.syncFileOf("devb")!.body = "garbage";
    drive.syncFileOf("devb")!.version++;
    later();
    const out = await a.sync(drive);
    expect(out.skippedFiles).toBe(1);
    expect(drive.syncFileOf("devb")!.body).toBe("garbage");
    expect(a.records().map((r) => r.name)).toEqual(["Aldar"]);
  });

  test("a file from a newer app version stops the round and nothing is written", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.create("Aldar");
    await a.sync(drive);
    const f = drive.syncFileOf("deva")!;
    f.body = JSON.stringify({ ...JSON.parse(f.body), version: 3 });
    f.version++;
    const before = drive.snapshot();
    b.create("Brenna");
    await expect(b.sync(drive)).rejects.toBeInstanceOf(SyncNewerVersionError);
    expect(drive.snapshot()).toBe(before);
  });

  test("entries that can't be read are skipped, not applied and not deleted", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.create("Aldar");
    await a.sync(drive);
    const f = drive.syncFileOf("deva")!;
    const file = JSON.parse(f.body);
    file.characters.c_broken = { t: 5, vc: { deva: 1 }, h: "x", record: { name: "Broken", levels: "not a list" } };
    f.body = JSON.stringify(file);
    f.version++;
    await b.sync(drive);
    expect(b.records().map((r) => r.name)).toEqual(["Aldar"]);
    expect(JSON.parse(drive.syncFileOf("deva")!.body).characters.c_broken).toBeDefined();
  });

  test("edits made while a round is running are kept, and merged properly next time", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    later();
    b.edit(al.id, "b1", "Aldar (B)");
    await b.sync(drive);
    later();
    // a edits Aldar while its round is pulling b's version of him
    await a.sync(drive, () => a.edit(al.id, "a-during", "Aldar (A)"));
    expect(a.byName("Aldar (A)")).toBeDefined(); // the user's edit is still there
    for (let i = 0; i < 2; i++) for (const d of [a, b]) await d.sync(drive);
    const all = a.records().flatMap(tokensOf);
    expect(all).toContain("b1");
    expect(all).toContain("a-during");
    expect(b.fingerprint()).toBe(a.fingerprint());
  });

  test("a device with a clock hours behind never reverts a newer edit", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb", -3 * 3600_000); // three hours behind
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    for (let i = 0; i < 4; i++) {
      later();
      b.edit(al.id, `b${i}`);
      await b.sync(drive);
      await a.sync(drive);
      later();
      a.edit(al.id, `a${i}`);
      await a.sync(drive);
      await b.sync(drive);
    }
    const tokens = tokensOf(a.byName("Aldar")!);
    for (let i = 0; i < 4; i++) expect(tokens).toEqual(expect.arrayContaining([`a${i}`, `b${i}`]));
    expect(a.records()).toHaveLength(1); // sequential edits, no conflict copies
    expect(b.fingerprint()).toBe(a.fingerprint());
  });

  test("restoring an old backup on a new device and turning sync on keeps the newer version too", async () => {
    const drive = new FakeDrive();
    const phone = new Device("phone");
    const al = phone.create("Aldar");
    const backupFile = JSON.stringify({ format: "codex-magica-backup", version: 1, exportedAt: "x", characters: phone.records().map(({ updatedAt: _u, syncVc: _v, ...r }) => r) });
    await phone.sync(drive);
    later(DAY);
    phone.edit(al.id, "level-up");
    await phone.sync(drive);
    const ipad = new Device("ipad");
    ipad.run(() => {
      const imported = parseImportFile(backupFile, ipad.records())!;
      imported.add.forEach((r) => ipad.store.upsert(r));
    });
    await ipad.sync(drive);
    await phone.sync(drive);
    const tokens = ipad.records().flatMap(tokensOf);
    expect(tokens).toContain("level-up");
    expect(ipad.records()).toHaveLength(2); // the restored old one and the newer one, both kept
    expect(phone.fingerprint()).toBe(ipad.fingerprint());
  });

  test("the same content restored on another device is not duplicated", async () => {
    const drive = new FakeDrive();
    const phone = new Device("phone");
    phone.create("Aldar");
    const backupFile = JSON.stringify({ format: "codex-magica-backup", version: 1, exportedAt: "x", characters: phone.records().map(({ updatedAt: _u, syncVc: _v, ...r }) => r) });
    await phone.sync(drive);
    const ipad = new Device("ipad");
    ipad.run(() => parseImportFile(backupFile, ipad.records())!.add.forEach((r) => ipad.store.upsert(r)));
    await ipad.sync(drive);
    expect(ipad.records()).toHaveLength(1);
  });

  test("a write whose answer got lost is reconciled on the next round", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.create("Aldar");
    await a.sync(drive);
    later();
    a.edit(a.records()[0].id, "a1");
    drive.lostResponseRate = 1;
    await expect(a.sync(drive)).rejects.toThrow(/lost/);
    drive.lostResponseRate = 0;
    later();
    a.edit(a.records()[0].id, "a2");
    await a.sync(drive);
    await b.sync(drive);
    expect(tokensOf(b.records()[0])).toEqual(expect.arrayContaining(["a1", "a2"]));
    expect(b.records()).toHaveLength(1);
  });

  test("turning sync off and on again doesn't overwrite edits made elsewhere meanwhile", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    // a turns sync off (keeps its characters), both keep editing
    later();
    b.edit(al.id, "b1");
    await b.sync(drive);
    a.edit(al.id, "a1");
    a.published = {};
    a.backedUp = new Set();
    a.cache.clear();
    await a.sync(drive); // back on
    await b.sync(drive);
    const all = a.records().flatMap(tokensOf);
    expect(all).toEqual(expect.arrayContaining(["a1", "b1"]));
    expect(b.fingerprint()).toBe(a.fingerprint());
  });

  test("a round with nothing new costs one listing and writes nothing", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    a.create("Aldar");
    await a.sync(drive);
    drive.calls = [];
    const out = await a.sync(drive);
    expect(drive.calls).toEqual(["list"]);
    expect(out.uploaded).toBe(false);
  });
});

describe("Google Drive sync: daily backups", () => {
  test("an edit on a later day keeps the previous day's last version, once", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    a.edit(al.id, "day1-morning");
    await a.sync(drive);
    later(3600_000);
    a.edit(al.id, "day1-evening");
    await a.sync(drive);
    expect(drive.backups()).toHaveLength(0); // same day: no backup
    later(DAY);
    a.edit(al.id, "day2");
    await a.sync(drive);
    await b.sync(drive);
    await a.sync(drive);
    const kept = drive.backups();
    expect(kept).toHaveLength(1);
    const content = JSON.parse(kept[0].body);
    expect(content.record.inventoryText).toContain("day1-evening");
    expect(content.record.inventoryText).not.toContain("day2");
    expect(kept[0].props).toMatchObject({ char: al.id, reason: "daily", name: "Aldar" });
  });

  test("deleting a character keeps its last version, even on the same day", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const al = a.create("Aldar");
    a.edit(al.id, "last");
    await a.sync(drive);
    later();
    a.remove(al.id);
    await a.sync(drive);
    const kept = drive.backups();
    expect(kept).toHaveLength(1);
    expect(kept[0].props.reason).toBe("deleted");
    expect(JSON.parse(kept[0].body).record.inventoryText).toContain("last");
  });

  test("only the last state is kept, not older versions still in other devices' files", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive); // b's file now holds this early version
    later();
    a.edit(al.id, "morning");
    await a.sync(drive);
    later();
    a.edit(al.id, "evening");
    await a.sync(drive);
    later(DAY);
    a.edit(al.id, "next day");
    await a.sync(drive);
    expect(drive.backups()).toHaveLength(1); // the evening version, not the early one or the morning one
    expect(JSON.parse(drive.backups()[0].body).record.inventoryText).toContain("evening");
    later();
    a.remove(al.id);
    await a.sync(drive);
    const deleted = drive.backups().filter((f) => f.props.reason === "deleted");
    expect(deleted).toHaveLength(1);
    expect(JSON.parse(deleted[0].body).record.inventoryText).toContain("next day");
  });

  test("if the backup can't be written, nothing is replaced", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const al = a.create("Aldar");
    await a.sync(drive);
    later(DAY);
    a.edit(al.id, "day2");
    const before = drive.syncFileOf("deva")!.body;
    drive.failOn = "backup";
    await expect(a.sync(drive)).rejects.toThrow();
    expect(drive.syncFileOf("deva")!.body).toBe(before);
    drive.failOn = null;
    await a.sync(drive);
    expect(drive.backups()).toHaveLength(1);
  });

  test("backups off: none are made", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const al = a.create("Aldar");
    const s0 = a.store.getState();
    await runSync(drive, { records: s0.records, deletions: s0.deletions, device: "deva", backups: false, backedUp: new Set() }, a.now, a.cache);
    later(DAY);
    a.edit(al.id, "x");
    const s1 = a.store.getState();
    await runSync(drive, { records: s1.records, deletions: s1.deletions, device: "deva", backups: false, backedUp: new Set() }, a.now, a.cache);
    expect(drive.backups()).toHaveLength(0);
  });
});

describe("Google Drive sync: building blocks", () => {
  test("merging is order-independent", () => {
    const base = { ...defaultRecord, id: "c1" };
    const v = (name: string, vc: Record<string, number>, t: number) => {
      const record = { ...base, name, syncVc: vc, updatedAt: t };
      return { id: "c1", t, vc, h: contentHash(record), record };
    };
    const x = v("X", { a: 2 }, 10);
    const y = v("Y", { b: 1 }, 11);
    const z = v("Z", { a: 1, c: 1 }, 12);
    const fold = (list: ReturnType<typeof v>[]) => {
      let acc = list[0];
      const copies: string[] = [];
      for (const n of list.slice(1)) {
        const r = combine(acc, n);
        acc = r.version as typeof acc;
        if (r.copy) copies.push(r.copy.id);
      }
      return { winner: acc.record.name, copies: copies.sort() };
    };
    const results = [fold([x, y, z]), fold([z, y, x]), fold([y, x, z]), fold([z, x, y])];
    for (const r of results) expect(r).toEqual(results[0]);
    expect(results[0].winner).toBe("Z");
  });

  test("reconcile keeps changes made during the round and takes the merge elsewhere", () => {
    const r = (id: string, name: string, vc: Record<string, number>) => ({ ...defaultRecord, id, name, syncVc: vc, updatedAt: 1 });
    const snapshot = { records: [r("a", "A", { d: 1 }), r("b", "B", { d: 1 })], deletions: {} };
    const current = { records: [r("a", "A edited", { d: 2 }), r("b", "B", { d: 1 }), r("n", "New", { d: 1 })], deletions: {} };
    const merged = { records: [r("a", "A from Drive", { d: 1, e: 1 }), r("b", "B from Drive", { d: 1, e: 1 }), r("z", "Pulled", { e: 1 })], deletions: {} };
    const out = reconcile(snapshot, current, merged);
    expect(out.records.map((x) => x.name)).toEqual(["A edited", "B from Drive", "New", "Pulled"]);
  });

  test("the store keeps a version an edit never saw (creator open during a sync)", () => {
    const d = new Device("deva");
    const al = d.create("Aldar");
    const openedInCreator = d.records().find((x) => x.id === al.id)!;
    d.edit(al.id, "synced-meanwhile", "Aldar (newer)");
    d.run(() => d.store.upsert({ ...openedInCreator, name: "Aldar (from creator)" }));
    expect(d.records().map((x) => x.name).sort()).toEqual([conflictCopyName("Aldar (newer)"), "Aldar (from creator)"].sort());
  });

  test("damaged records are rejected or repaired, never let through", () => {
    expect(normalizeRecord({ name: "x" })).toBeNull();
    expect(normalizeRecord({ name: "x", levels: "nope" })).toBeNull();
    expect(normalizeRecord(null)).toBeNull();
    const { identity: _i, inventory: _inv, vitalsState: _vs, ...missing } = defaultRecord;
    const fixed = normalizeRecord(missing);
    expect(fixed?.identity).toBeDefined();
    expect(fixed?.inventory).toEqual([]);
    const imported = parseImportFile(JSON.stringify({ format: "codex-magica-backup", version: 1, exportedAt: "x", characters: [defaultRecord, { name: "bad" }] }), []);
    expect(imported?.add).toHaveLength(1);
    expect(imported?.invalid).toBe(1);
  });

  test("local versions include deletions", () => {
    const v = localVersions([{ ...defaultRecord, id: "a", syncVc: { d: 1 } }], { b: { t: 5, vc: { d: 2 } } });
    expect([...v.keys()].sort()).toEqual(["a", "b"]);
  });
});

// ── randomized: many devices, random edits, concurrent rounds, failures, skewed clocks ──────────────
describe("Google Drive sync: randomized multi-device runs", () => {
  const run = async (seed: number) => {
    const rng = rngFrom(seed);
    const drive = new FakeDrive();
    drive.rng = rngFrom(seed * 7 + 1);
    drive.failRate = 0.04;
    drive.lostResponseRate = 0.04;
    drive.cutRate = 0.03;
    drive.jitter = 3;
    const devices = [new Device("deva"), new Device("devb", -2 * 3600_000), new Device("devc", 90_000)];
    const deletedSaw = new Set<string>(); // tokens a deletion had seen (and so may legitimately remove)
    const created = new Set<string>();
    let tokenSeq = 0;
    const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];

    for (let step = 0; step < 220; step++) {
      later(Math.floor(rng() * 6 * 3600_000)); // up to 6 hours: crosses days now and then
      const d = pick(devices);
      const roll = rng();
      const recs = d.records();
      if (roll < 0.12 || recs.length === 0) {
        const token = `t${++tokenSeq}`;
        created.add(token);
        d.run(() => d.store.upsert({ ...defaultRecord, id: `c_${seed}_${tokenSeq}`, name: `Hős ${tokenSeq}`, inventoryText: token }));
      } else if (roll < 0.55) {
        const r = pick(recs);
        const token = `t${++tokenSeq}`;
        created.add(token);
        d.edit(r.id, token);
      } else if (roll < 0.66) {
        const r = pick(recs);
        tokensOf(r).forEach((t) => deletedSaw.add(t));
        d.remove(r.id);
      } else {
        // one or more devices sync at the same time, maybe with an edit landing mid-round
        const group = devices.filter(() => rng() < 0.6);
        if (group.length === 0) group.push(d);
        await Promise.all(
          group.map((g) => {
            const during =
              rng() < 0.3
                ? () => {
                    const rs = g.records();
                    if (rs.length === 0) return;
                    const token = `t${++tokenSeq}`;
                    created.add(token);
                    g.edit(pick(rs).id, token);
                  }
                : undefined;
            return g.sync(drive, during).catch(() => undefined); // a failed round is retried later
          })
        );
      }
    }

    // settle: no more failures, everyone syncs until nothing changes
    drive.failRate = drive.lostResponseRate = drive.cutRate = 0;
    for (let i = 0; i < 4; i++) for (const d of devices) await d.sync(drive);

    const finalTokens = new Set(devices[0].records().flatMap(tokensOf));
    for (const d of devices.slice(1)) expect(d.fingerprint()).toBe(devices[0].fingerprint());
    const lost = [...created].filter((t) => !finalTokens.has(t) && !deletedSaw.has(t));
    expect(lost).toEqual([]);
    // and after settling, another round changes nothing anywhere
    drive.calls = [];
    for (const d of devices) await d.sync(drive);
    expect(drive.calls.filter((c) => c !== "list" && c !== "read")).toEqual([]);
  };

  for (let seed = 1; seed <= 24; seed++) test(`seed ${seed}`, () => run(seed), 60_000);
});
