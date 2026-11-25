// The rules engine can be made to fail for one character (a future engine bug), to check that such a
// character is never lost.
vi.mock("../engine/derive", async (orig) => {
  const m = (await orig()) as Record<string, unknown>;
  const real = m.derive as (...a: unknown[]) => unknown;
  return {
    ...m,
    derive: (rules: unknown, rec: { name?: string }) => {
      const broken = (globalThis as { __breakDerive?: string | null }).__breakDerive;
      if (broken && rec?.name === broken) throw new Error("engine regression");
      return real(rules, rec);
    },
  };
});
const breakDerive = (name: string | null) => ((globalThis as { __breakDerive?: string | null }).__breakDerive = name);

// Google Drive sync: full rounds between simulated devices against an in-memory Drive (no network),
// with failure injection, interleaved concurrent rounds, skewed clocks and edits during rounds.
// Each device has its own localStorage and device id and uses the real roster store.
import { CharacterRecord } from "../model/character";
import { defaultRecord } from "./defaultRecord";
import { Version, combine, conflictCopyName, localVersions, mergeRound, parseDeviceFile, reconcile } from "./driveMerge";
import { SyncNewerVersionError } from "./driveSyncEngine";
import { createRosterStore } from "./rosterStore";
import { contentHash } from "./recordHash";
import { forgetSessionNoncesForTests } from "./syncState";
import { normalizeRecord } from "./storage";
import { parseImportFile } from "./transfer";
import { DAY, Device, FakeDrive, QuotaStorage, clashes, later, realSync, rngFrom, setupSyncHarness, tokensOf } from "./testing/syncHarness";

setupSyncHarness();

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
    a.backups = false;
    const al = a.create("Aldar");
    await a.sync(drive);
    later(DAY);
    a.edit(al.id, "x");
    a.remove(a.create("Brenna").id);
    await a.sync(drive);
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
    d.run(() => d.store.upsert({ ...openedInCreator, name: "Aldar (from creator)" }, openedInCreator));
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

// ── found by an independent review: each of these lost data before it was fixed ──────────────────
describe("Google Drive sync: review findings", () => {
  afterEach(() => breakDerive(null));
  const reopen = (d: Device) => {
    d.cache = new Map();
    d.store = d.run(() => createRosterStore()); // a fresh page load (an app update is one)
  };

  test("a character the rules engine can't compute (a future engine bug) is never dropped, anywhere", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    const br = a.create("Brenna");
    await a.sync(drive);
    await b.sync(drive);
    later(DAY);
    a.edit(al.id, "day2");
    await a.sync(drive);
    await b.sync(drive);
    breakDerive("Aldar"); // an update breaks the engine for Aldar
    reopen(a);
    reopen(b);
    later();
    a.edit(br.id, "x");
    await a.sync(drive);
    await b.sync(drive);
    breakDerive(null); // the next update fixes it
    later();
    reopen(a);
    reopen(b);
    await a.sync(drive);
    await b.sync(drive);
    expect(tokensOf(a.byName("Aldar")!)).toContain("day2");
    expect(tokensOf(b.byName("Aldar")!)).toContain("day2");
    expect([...drive.files.values()].some((f) => f.props.kind === "sync" && f.body.includes("day2"))).toBe(true);
  });

  test("storage full: an edit that can't be saved isn't made (memory stays what's saved), and it's said", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const al = a.create("Aldar");
    await a.sync(drive);
    const real = a.storage.setItem.bind(a.storage);
    a.storage.setItem = (k: string, v: string) => {
      if (k === "magus.roster.v1") throw new Error("QuotaExceededError");
      real(k, v);
    };
    later();
    a.edit(al.id, "while-full");
    expect(a.store.getState().saveFailed).toBe(true);
    expect(tokensOf(a.byName("Aldar")!)).not.toContain("while-full");
    a.storage.setItem = real; // room again
    later();
    a.edit(al.id, "after");
    expect(a.store.getState().saveFailed).toBe(false);
    await a.sync(drive);
    expect(drive.syncFileOf("deva")!.body).toContain("after");
  });

  test("storage full: a round whose result can't be saved here fails (and is tried again), nothing half-applied", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.create("Aldar");
    await realSync(a, drive);
    b.create("Bori");
    await realSync(b, drive);
    const real = a.storage.setItem.bind(a.storage);
    a.storage.setItem = (k: string, v: string) => {
      if (k === "magus.roster.v1") throw new Error("QuotaExceededError");
      real(k, v);
    };
    await expect(realSync(a, drive)).rejects.toThrow("couldn't save");
    expect(a.records().map((r) => r.name)).toEqual(["Aldar"]);
    a.storage.setItem = real;
    await realSync(a, drive);
    expect(a.records().map((r) => r.name).sort()).toEqual(["Aldar", "Bori"]);
  });

  test("an editor's draft saved after a sync brought another device's change keeps both", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const al = a.create("Aldar");
    await a.sync(drive);
    await b.sync(drive);
    const openedWith = a.byName("Aldar")!; // the inventory editor opens
    const draft = `${openedWith.inventoryText}\nA typed this`;
    later();
    b.edit(al.id, "B-edit");
    await b.sync(drive);
    await a.sync(drive); // pulled while the editor is open
    a.run(() => a.store.upsert({ ...a.byName("Aldar")!, inventoryText: draft }, openedWith));
    await a.sync(drive);
    await b.sync(drive);
    const all = b.records().flatMap(tokensOf);
    expect(all).toContain("B-edit");
    expect(all).toContain("A typed this");
  });

  test("two tabs: a tab that missed the other's changes can't drop or wipe them", async () => {
    const drive = new FakeDrive();
    const tab1 = new Device("deva");
    const al = tab1.create("Aldar");
    const br = tab1.create("Brenna");
    await tab1.sync(drive);
    const tab2 = new Device("deva");
    tab2.storage = tab1.storage;
    tab2.store = tab2.run(() => createRosterStore());
    later();
    tab1.edit(al.id, "tab1-a");
    tab1.edit(al.id, "tab1-b");
    tab1.edit(br.id, "tab1-brenna");
    // tab2 never got the storage events and edits Aldar from what it still shows
    const shown = tab2.store.getState().records.find((r) => r.id === al.id)!;
    tab2.run(() => tab2.store.upsert({ ...shown, inventoryText: `${shown.inventoryText}\ntab2-edit` }, shown));
    tab1.run(() => tab1.store.reload());
    await tab1.sync(drive);
    const tokens = tab1.records().flatMap(tokensOf);
    expect(tokens).toEqual(expect.arrayContaining(["tab2-edit", "tab1-b", "tab1-brenna"]));
  });

  test("two devices with the same id (restored browser data) don't drop each other's edits", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const al = a.create("Aldar");
    await a.sync(drive);
    const clone = new Device("deva");
    for (const [k, v] of a.storage.m) clone.storage.m.set(k, v);
    clone.store = clone.run(() => createRosterStore());
    clone.nonces = [...a.nonces];
    later();
    clone.edit(al.id, "on-the-clone");
    a.edit(al.id, "on-a-1");
    a.edit(al.id, "on-a-2");
    await a.sync(drive);
    await clone.sync(drive);
    await a.sync(drive);
    await clone.sync(drive);
    const all = a.records().flatMap(tokensOf);
    expect(all).toEqual(expect.arrayContaining(["on-the-clone", "on-a-2"]));
    expect(clone.fingerprint()).toBe(a.fingerprint());
  });

  test("a device with a clock far ahead doesn't stop the daily backups", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const fut = new Device("devf", 365 * DAY);
    const al = a.create("Aldar");
    await a.sync(drive);
    await fut.sync(drive);
    fut.edit(al.id, "from-future");
    await fut.sync(drive);
    await a.sync(drive);
    const before = drive.backups().length;
    for (let d = 1; d <= 3; d++) {
      later(DAY);
      a.edit(al.id, `day${d}`);
      await a.sync(drive);
    }
    expect(drive.backups().length - before).toBe(3);
  });

  test("an edit followed by a delete before the next sync still leaves a backup of the edit", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const al = a.create("Aldar");
    await a.sync(drive);
    later();
    a.edit(al.id, "last-words");
    a.remove(al.id);
    await a.sync(drive);
    const kept = drive.backups();
    expect(kept).toHaveLength(1);
    expect(JSON.parse(kept[0].body).record.inventoryText).toContain("last-words");
    expect(a.store.getState().deletions[al.id].last).toBeUndefined(); // dropped once it's in Drive
  });

  test("the order files arrive in can't create a spurious copy of an older version", () => {
    const base = { ...defaultRecord, id: "c1" };
    const v = (inv: string, vc: Record<string, number>, t: number): Version => {
      const record = { ...base, inventoryText: inv, syncVc: vc, updatedAt: t };
      return { id: "c1", t, vc, h: contentHash(record), record };
    };
    const P = v("P", { a: 2 }, 20);
    const Q = v("P\nQ", { a: 2, b: 1 }, 30); // continues P
    const R = v("R", { a: 1, c: 1 }, 10); // parallel
    const local = { records: [R.record!], deletions: {} };
    const result = (srcs: Version[][]) =>
      mergeRound(local, srcs.map((x) => new Map(x.map((y) => [y.id, y]))), null, "c", 0, false).records.map((r) => r.inventoryText).sort();
    expect(result([[P], [Q]])).toEqual(result([[Q], [P]]));
    expect(result([[P], [Q]])).toHaveLength(2); // Q and R; P is part of Q
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

// ═══════════════════ second adversarial review: each test was a proven failure ═══════════════════

describe("nonces, tabs, conflicts, clones (earlier review findings)", () => {
  test("storage full: an unsaved nonce doesn't make the next round take the device for a clone", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const qs = new QuotaStorage();
    a.storage = qs;
    a.store = a.run(() => createRosterStore());
    const b = new Device("devb");
    const x = a.create("Xena");
    const w = a.create("Wulf");
    const v = a.create("Vera");
    await realSync(a, drive);
    await b.sync(drive);
    await realSync(a, drive);
    // storage fills up (the case the design says is handled: "the sync uploads from memory")
    qs.cap = qs.used();
    later();
    a.edit(x.id, "while-full");
    expect(a.store.getState().saveFailed).toBe(true);
    await realSync(a, drive); // uploads the edit; rememberNonce silently fails
    later();
    b.remove(w.id);
    b.edit(v.id, "b-edit");
    await b.sync(drive);
    await realSync(a, drive);
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await b.sync(drive);
    }
    expect(clashes.get(a) ?? 0).toBe(0);
    expect(b.byName("Wulf")).toBeUndefined(); // b deleted it; nobody edited it since
    expect(b.records().filter((r) => r.name.startsWith("Vera"))).toHaveLength(1);
  });

  test("Drive full (any repeated update failure) for 20+ rounds: the remembered nonces don't roll over into a false clash", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Xena");
    const w = a.create("Wulf");
    const v = a.create("Vera");
    await realSync(a, drive);
    await b.sync(drive);
    later();
    b.remove(w.id);
    b.edit(v.id, "b-edit");
    await b.sync(drive);
    drive.failOn = "update"; // e.g. 403 storageQuotaExceeded: list and reads work, writes don't
    for (let i = 0; i < 21; i++) {
      later();
      a.edit(x.id, `a${i}`);
      await realSync(a, drive).catch(() => undefined);
    }
    drive.failOn = null;
    a.run(() => forgetSessionNoncesForTests()); // and the app was reopened meanwhile: only what's saved counts
    await realSync(a, drive);
    for (let i = 0; i < 2; i++) {
      await b.sync(drive);
      await realSync(a, drive);
    }
    expect(clashes.get(a) ?? 0).toBe(0);
    expect(b.byName("Wulf")).toBeUndefined();
    expect(b.records().filter((r) => r.name.startsWith("Vera"))).toHaveLength(1);
  });

  test("two tabs: an edit in tab 2 that reaches tab 1 after its round's last response is kept", async () => {
    const drive = new FakeDrive();
    const tab1 = new Device("deva");
    const x = tab1.create("Xena");
    await tab1.sync(drive);
    const tab2 = new Device("deva");
    tab2.storage = tab1.storage;
    tab2.store = tab2.run(() => createRosterStore());
    later();
    tab1.edit(x.id, "tab1-edit"); // something to publish, so the round ends with an update
    let fired = false;
    drive.onOp = (op) => {
      if (op === "update" && !fired) {
        fired = true;
        tab2.edit(x.id, "tab2-edit"); // lands while the upload is in flight
      }
    };
    await tab1.sync(drive);
    drive.onOp = null;
    tab2.run(() => tab2.store.reload()); // tab 2 receives tab 1's write
    const saved = JSON.parse(tab1.storage.getItem("magus.roster.v1")!) as CharacterRecord[];
    expect(saved.flatMap(tokensOf)).toContain("tab2-edit");
  });

  test("after a conflict, the winning device's next edit (before it pulls the merge) makes no copy of its own older version", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Xena");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.edit(x.id, "A1");
    later();
    b.edit(x.id, "B1");
    await b.sync(drive); // B1 in Drive
    await a.sync(drive); // a: A1 ∥ B1 → B1 keeps Xena, A1 becomes the copy; a publishes B1 with the joined vector
    later();
    b.edit(x.id, "B2"); // b keeps playing; its 2-second round hasn't run yet
    for (let i = 0; i < 3; i++) {
      await b.sync(drive);
      await a.sync(drive);
    }
    expect(a.records()).toHaveLength(2); // Xena [B1,B2] and the A1 copy
  });

  test("a real clone: relabelling leaves the versions the clone never touched, so the original's deletions stay", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const w = a.create("Wulf");
    const v = a.create("Vera");
    await realSync(a, drive);
    const clone = new Device("deva");
    for (const [k, val] of a.storage.m) clone.storage.m.set(k, val);
    clone.published = { ...a.published }; // in the app it's in the copied storage too
    clone.store = clone.run(() => createRosterStore());
    later();
    a.remove(w.id); // the original deletes Wulf and edits Vera after the clone was made
    a.edit(v.id, "a-edit");
    await realSync(a, drive);
    later();
    clone.create("Cora");
    await realSync(clone, drive);
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await realSync(clone, drive);
    }
    expect(a.byName("Wulf")).toBeUndefined();
    expect(a.records().filter((r) => r.name.startsWith("Vera"))).toHaveLength(1);
  });
});

describe("an edit before a losing deletion", () => {
  test("edit then delete on A, parallel edit on B: A's last edit is kept (in the roster or a backup)", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Xena");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.edit(x.id, "a-last-edit");
    a.remove(x.id);
    b.edit(x.id, "b-edit");
    await b.sync(drive);
    await a.sync(drive);
    await b.sync(drive);
    const inRecords = a.records().flatMap(tokensOf).includes("a-last-edit");
    const inBackups = drive.backups().some((f) => f.body.includes("a-last-edit"));
    expect(inRecords || inBackups).toBe(true);
  });
});

describe("what a round tells the player", () => {
  test("a parallel edit kept as a copy is named, on the device that gets the copy", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Kael");
    await a.sync(drive);
    await b.sync(drive);
    later();
    a.edit(x.id, "a-edit");
    b.edit(x.id, "b-edit");
    const first = await a.sync(drive);
    expect(first.copied).toEqual([]);
    later();
    const second = await b.sync(drive); // b sees a's parallel edit
    expect(second.copied).toEqual(["Kael"]);
    expect(second.undeleted).toEqual([]);
  });

  test("a deletion undone by a parallel edit elsewhere is named on the device that deleted", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    const x = a.create("Mira");
    await a.sync(drive);
    await b.sync(drive);
    later();
    b.edit(x.id, "b-edit");
    await b.sync(drive);
    a.remove(x.id); // a hasn't seen b's edit
    const out = await a.sync(drive);
    expect(out.undeleted).toEqual(["Mira"]);
    expect(a.byName("Mira")).toBeDefined();
  });
});
