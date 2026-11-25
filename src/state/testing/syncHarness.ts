// Shared harness for the Drive sync tests: simulated devices (each with its own localStorage, device id
// and clock skew, using the real roster store) against an in-memory Drive with failure injection.
// `Device.sync` runs a round with the state kept on the device object, so tests can interleave rounds of
// several devices; `realSync` runs the app's own round (driveSyncRound.ts) on one device at a time.
import { afterEach, beforeEach, vi } from "vitest";
import { CharacterRecord } from "../../model/character";
import { defaultRecord } from "../defaultRecord";
import { BackupMeta, DriveFileMeta, DriveTransport, FileBody } from "../googleDrive";
import { DeviceIdClashError, SyncOutput, runSync } from "../driveSyncEngine";
import { syncRound } from "../driveSyncRound";
import { RosterStore, createRosterStore } from "../rosterStore";
import { contentHash } from "../recordHash";
import { deviceId, setDeviceIdForTests } from "../versions";

// ── a tiny seeded random generator ───────────────────────────────────────────────────────────────
export const rngFrom = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── in-memory localStorage, one per device ───────────────────────────────────────────────────────
export class MemStorage {
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
export class FakeDrive implements DriveTransport {
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
const START = Date.UTC(2026, 10, 20, 9, 0, 0);
let worldTime = START;
export const DAY = 24 * 3600_000;
// the shared clock every simulated device reads (plus its own skew); `later` moves it on
export const later = (ms = 60_000) => (worldTime += ms);
export const worldNow = () => worldTime;

export class Device {
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
    // sync is on (a deleted character's last state is kept for its Drive backup only then)
    this.storage.setItem("magus.driveSync.v1", JSON.stringify({ enabled: true, backups: true, lastSyncAt: null, email: null }));
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
  // one round, the way driveSyncRound does it; `during` runs while the round is waiting on Drive
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
        // what driveSyncRound does: a fresh id, this device's versions relabelled, sync again
        const old = this.id;
        this.id = `${old}x${Math.floor(Math.random() * 1e6)}`;
        this.run(() => this.store.relabelDevice(old, this.id, new Set<string>([...e.published, ...Object.values(this.published)]), this.published));
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

export class QuotaStorage extends MemStorage {
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

// Call once at the top of a test file: a fresh clock for every test, and no pinned device id after it.
export const setupSyncHarness = (): void => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    worldTime = START;
  });
  afterEach(() => {
    vi.useRealTimers();
    setDeviceIdForTests(null);
  });
};

// One round exactly as the app runs it (driveSyncRound.syncRound, with this device's own saved sync
// state: nonces, what it published, backups made). Rounds of different devices must not overlap here.
export const clashes = new Map<Device, number>();
export async function realSync(dev: Device, drive: FakeDrive): Promise<SyncOutput> {
  const result = await dev.run(() => syncRound({ store: dev.store, drive, backups: dev.backups, current: () => true, now: dev.now, cache: dev.cache }));
  if (!result) throw new Error("round dropped");
  if (result.newDeviceId) {
    clashes.set(dev, (clashes.get(dev) ?? 0) + 1);
    dev.id = result.newDeviceId;
  }
  return result.out;
}

export const tokensOf = (r: CharacterRecord) => (r.inventoryText ?? "").split("\n").filter(Boolean);
export const settle = async (drive: FakeDrive, ...devs: Device[]) => {
  for (let i = 0; i < 3; i++) for (const d of devs) await d.sync(drive);
};
