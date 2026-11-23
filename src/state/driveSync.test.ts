// Google Drive sync: the merge rules and full sync rounds between simulated devices, against an
// in-memory stand-in for Drive (no network).
import { CharacterRecord } from "../model/character";
import { createBlankRecord } from "./storage";
import { DriveTransport, RemoteFile } from "./googleDrive";
import { applyMerge, conflictCopyName, mergeWithCloud, parseCloudFile } from "./driveMerge";
import { runSync } from "./driveSyncEngine";
import { SyncBase, Tombstones } from "./syncState";

// ── fake Drive ──────────────────────────────────────────────────────────────────────────────────
class FakeDrive implements DriveTransport {
  file: { id: string; version: number; content: unknown } | null = null;
  beforeVersionCheck: (() => void) | null = null; // lets a test sneak in another device's save
  async find(): Promise<RemoteFile | null> {
    return this.file ? { id: this.file.id, version: String(this.file.version), content: structuredClone(this.file.content) } : null;
  }
  async version(): Promise<string | null> {
    const hook = this.beforeVersionCheck;
    this.beforeVersionCheck = null;
    hook?.();
    return this.file ? String(this.file.version) : null;
  }
  async create(content: unknown) {
    this.file = { id: "f1", version: 1, content: structuredClone(content) };
    return { id: "f1", version: "1" };
  }
  async update(_id: string, content: unknown) {
    this.file!.version++;
    this.file!.content = structuredClone(content);
    return { version: String(this.file!.version) };
  }
}

// ── simulated device ────────────────────────────────────────────────────────────────────────────
let clock = 1_000_000;
const tick = () => ++clock;

class Device {
  records: CharacterRecord[] = [];
  tombstones: Tombstones = {};
  base: SyncBase = {};
  fileId: string | null = null;
  add(name: string): CharacterRecord {
    const r = { ...createBlankRecord(undefined, name), updatedAt: tick() };
    this.records.push(r);
    return r;
  }
  edit(id: string, name: string) {
    this.records = this.records.map((r) => (r.id === id ? { ...r, name, updatedAt: tick() } : r));
  }
  remove(id: string) {
    this.records = this.records.filter((r) => r.id !== id);
    this.tombstones[id] = tick();
  }
  names() {
    return this.records.map((r) => r.name).sort();
  }
  async sync(drive: DriveTransport) {
    const out = await runSync(drive, { local: this.records, tombstones: this.tombstones, base: this.base, fileId: this.fileId }, tick);
    this.records = out.roster;
    this.base = out.base;
    this.fileId = out.fileId;
    this.tombstones = {};
    return out;
  }
}

describe("Google Drive sync", () => {
  test("first device uploads, a new device pulls everything", async () => {
    const drive = new FakeDrive();
    const a = new Device();
    a.add("Aldar");
    a.add("Brenna");
    const up = await a.sync(drive);
    expect(up.uploaded).toBe(true);
    expect(Object.keys((drive.file!.content as { characters: object }).characters)).toHaveLength(2);

    const b = new Device();
    const down = await b.sync(drive);
    expect(b.names()).toEqual(["Aldar", "Brenna"]);
    expect(down.pulled).toBe(2);
    expect(down.uploaded).toBe(false); // nothing new to send back
  });

  test("an edit on one device reaches the other", async () => {
    const drive = new FakeDrive();
    const a = new Device();
    const r = a.add("Aldar");
    await a.sync(drive);
    const b = new Device();
    await b.sync(drive);

    a.edit(r.id, "Aldar the Bold");
    await a.sync(drive);
    const out = await b.sync(drive);
    expect(b.names()).toEqual(["Aldar the Bold"]);
    expect(out.pulled).toBe(1);
    expect(out.conflictCopies).toBe(0);
  });

  test("a deletion reaches the other device and does not come back", async () => {
    const drive = new FakeDrive();
    const a = new Device();
    const r = a.add("Aldar");
    a.add("Brenna");
    await a.sync(drive);
    const b = new Device();
    await b.sync(drive);

    a.remove(r.id);
    await a.sync(drive);
    await b.sync(drive);
    expect(b.names()).toEqual(["Brenna"]);
    await a.sync(drive);
    expect(a.names()).toEqual(["Brenna"]);
  });

  test("the same character edited on both devices keeps both versions", async () => {
    const drive = new FakeDrive();
    const a = new Device();
    const r = a.add("Aldar");
    await a.sync(drive);
    const b = new Device();
    await b.sync(drive);

    a.edit(r.id, "Aldar (A)");
    b.edit(r.id, "Aldar (B)");
    await a.sync(drive);
    const out = await b.sync(drive);
    expect(out.conflictCopies).toBe(1);
    expect(b.names()).toEqual([conflictCopyName("Aldar (A)"), "Aldar (B)"].sort());
    await a.sync(drive); // A picks up both
    expect(a.names()).toEqual(b.names());
  });

  test("an edit beats a deletion made elsewhere", async () => {
    const drive = new FakeDrive();
    const a = new Device();
    const r = a.add("Aldar");
    await a.sync(drive);
    const b = new Device();
    await b.sync(drive);

    a.remove(r.id);
    b.edit(r.id, "Aldar, still alive");
    await a.sync(drive);
    await b.sync(drive);
    expect(b.names()).toEqual(["Aldar, still alive"]);
    await a.sync(drive);
    expect(a.names()).toEqual(["Aldar, still alive"]);
  });

  test("a save from another device during the upload makes the round start over", async () => {
    const drive = new FakeDrive();
    const a = new Device();
    a.add("Aldar");
    await a.sync(drive);
    const b = new Device();
    await b.sync(drive);

    const cael = { ...createBlankRecord(undefined, "Cael"), updatedAt: tick() };
    b.add("Brenna");
    let finds = 0;
    const find = drive.find.bind(drive);
    drive.find = async () => (finds++, find());
    // another device saves Cael at the moment B checks the version before uploading
    drive.beforeVersionCheck = () => {
      const f = drive.file!;
      (f.content as { characters: Record<string, unknown> }).characters[cael.id] = { updatedAt: cael.updatedAt, record: cael };
      f.version++;
    };
    await b.sync(drive);
    expect(finds).toBe(2); // the first round was abandoned and redone with the newer file
    expect(b.names()).toEqual(["Aldar", "Brenna", "Cael"]);
    const stored = (drive.file!.content as { characters: Record<string, { record?: CharacterRecord }> }).characters;
    expect(Object.values(stored).map((e) => e.record?.name).sort()).toEqual(["Aldar", "Brenna", "Cael"]);
  });

  test("an unreadable Drive file never deletes local characters", () => {
    const local = [{ ...createBlankRecord(undefined, "Aldar"), updatedAt: 5 }];
    const merged = mergeWithCloud(local, {}, parseCloudFile({ nonsense: true }), {});
    expect(merged.roster.map((r) => r.name)).toEqual(["Aldar"]);
    expect(merged.uploadNeeded).toBe(true);
    const corruptEntry = mergeWithCloud(local, {}, { format: "codex-magica-sync", version: 1, savedAt: 1, characters: { [local[0].id]: { updatedAt: 99, record: { broken: 1 } as never } } }, {});
    expect(corruptEntry.roster.map((r) => r.name)).toEqual(["Aldar"]);
  });

  test("changes made while a sync was running are kept", () => {
    const startedAt = 100;
    const a = { ...createBlankRecord("a", "A merged"), updatedAt: 50 };
    const b = { ...createBlankRecord("b", "B merged"), updatedAt: 50 };
    const current = [
      { ...createBlankRecord("a", "A edited during sync"), updatedAt: 120 },
      { ...createBlankRecord("b", "B"), updatedAt: 40 },
      { ...createBlankRecord("n", "New during sync"), updatedAt: 130 },
    ];
    const result = applyMerge(current, [a, b], {}, startedAt);
    expect(result.map((r) => r.name)).toEqual(["A edited during sync", "B merged", "New during sync"]);
    const afterDelete = applyMerge(current.filter((r) => r.id !== "b"), [a, b], { b: 140 }, startedAt);
    expect(afterDelete.map((r) => r.id)).toEqual(["a", "n"]);
  });
});
