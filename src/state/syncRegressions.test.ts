// Regression tests for bugs found in the pre-release review of persistence and the Drive merge (R1–R5).
// Each one is a concrete scenario that lost, resurrected or overwrote a character before its fix.
import { CharacterRecord } from "../model/character";
import { createRosterStore } from "./rosterStore";
import { unreadableKeys } from "./storage";
import { DAY, Device, FakeDrive, MemStorage, QuotaStorage, clashes, later, realSync, settle, tokensOf, setupSyncHarness } from "./testing/syncHarness";
import { defaultRecord } from "./defaultRecord";

setupSyncHarness();

// ════════════════════════════════════════════════════════════════════════════════════════════════
describe("R1 a deletion that saw a merged version's content wins over it (the character doesn't come back)", () => {
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
describe("R2 storage full: deleting a character saves the roster and the deletion marker together", () => {
  test("R2 what's saved fits together, and after a reload the character doesn't come back from Drive", async () => {
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
describe("R3 a cloned device with a second tab: both tabs take the new device id", () => {
  test("R3 an edit from the second tab is not numbered under the original device's id, and survives", async () => {
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
describe("R4 an unreadable saved roster when storage is (nearly) full", () => {
  test("R4 it isn't saved over, and it's offered for download", () => {
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
describe("R5 a deletion confirmed after a sync brought a newer version", () => {
  test("R5 doesn't delete the version the player never saw (the dialog was opened on the older one)", async () => {
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

const backupBodies = (drive: FakeDrive) => drive.backups().map((f) => JSON.parse(f.body) as { record: CharacterRecord; reason: string });

describe("storage full and long absences (second review)", () => {
  test("storage full, sync off: after a deletion that only fit without its backup copy, later saves count as saved", () => {
    const a = new Device("deva");
    const qs = new QuotaStorage();
    a.storage = qs;
    a.store = a.run(() => createRosterStore());
    const x = a.create("Xena");
    const w = a.create("Wulf");
    a.create("Yorick");
    qs.cap = qs.used() + 40; // full: the last save that grew failed (that's when players start deleting)
    later();
    expect(a.remove(x.id)).toBe(true);
    // the roster and the marker were saved (only the backup copy of Xena's last state didn't fit)
    const savedDeletions = JSON.parse(qs.getItem("magus.deletions.v1") ?? "{}") as Record<string, { last?: unknown }>;
    expect(savedDeletions[x.id]).toBeDefined();
    later();
    a.edit(w.id, "w1"); // an ordinary edit that fits
    const savedW = (JSON.parse(qs.getItem("magus.roster.v1")!) as CharacterRecord[]).find((r) => r.id === w.id)!;
    expect(tokensOf(savedW)).toContain("w1"); // it IS saved...
    // ...but the app keeps saying "Nem sikerült menteni" (banner, update banner held back, Drive connect
    // refused unless a backup file is exported), and numbers every edit under the "unsaved" lineage
    expect(Object.keys(savedW.syncVc ?? {}).some((k) => k.includes(".u"))).toBe(false);
    expect(a.store.getState().saveFailed).toBe(false);
  });

  test("a device not opened for two months keeps the state before a deletion until it's in Drive, so its last edit is backed up when a parallel edit wins", async () => {
    const drive = new FakeDrive();
    const phone = new Device("phone");
    phone.storage.setItem("magus.driveSync.v1", JSON.stringify({ enabled: true, backups: true, lastSyncAt: null, email: null }));
    const laptop = new Device("laptop");
    const x = phone.create("Xena");
    await realSync(phone, drive);
    await realSync(laptop, drive);
    later();
    // on the phone, offline (or closed within 2 s): a last edit, then the character is deleted
    phone.edit(x.id, "phone-last-edit");
    phone.remove(x.id);
    // meanwhile the laptop edits Xena (it never saw the deletion)
    laptop.edit(x.id, "laptop-edit");
    await realSync(laptop, drive);
    // the phone app isn't opened for 61 days, then it is (a fresh page load) and syncs
    later(61 * DAY);
    phone.store = phone.run(() => createRosterStore());
    await realSync(phone, drive);
    const back = phone.byName("Xena");
    expect(back && tokensOf(back)).toContain("laptop-edit"); // the parallel edit wins (by design)
    // docs: "a deletion keeps the last state on the device until it's in Drive, so an edit just before
    // deleting is kept too, also when a parallel edit elsewhere wins over the deletion"
    const kept = backupBodies(drive).some((b) => tokensOf(b.record).includes("phone-last-edit"));
    expect(kept).toBe(true);
  });

  test("the same within 60 days keeps the phone's last edit as a backup", async () => {
    const drive = new FakeDrive();
    const phone = new Device("phone");
    const laptop = new Device("laptop");
    const x = phone.create("Xena");
    await phone.sync(drive);
    await laptop.sync(drive);
    later();
    phone.edit(x.id, "phone-last-edit");
    phone.remove(x.id);
    laptop.edit(x.id, "laptop-edit");
    await laptop.sync(drive);
    later(59 * DAY);
    phone.store = phone.run(() => createRosterStore());
    await phone.sync(drive);
    expect(backupBodies(drive).some((b) => tokensOf(b.record).includes("phone-last-edit"))).toBe(true);
  });
});

describe("saving when storage is full", () => {
  test("nothing fits: what was saved before stays exactly as it was", () => {
    const a = new Device("deva");
    const qs = new QuotaStorage();
    a.storage = qs;
    a.store = a.run(() => createRosterStore());
    const x = a.create("Xena");
    const before = { roster: qs.getItem("magus.roster.v1"), deletions: qs.getItem("magus.deletions.v1") };
    qs.cap = qs.used(); // not a byte more
    a.edit(x.id, "x".repeat(500));
    expect(a.store.getState().saveFailed).toBe(true);
    expect(qs.getItem("magus.roster.v1")).toBe(before.roster);
    expect(qs.getItem("magus.deletions.v1")).toBe(before.deletions);
    expect(tokensOf(a.records()[0]).some((t) => t.startsWith("xxx"))).toBe(false); // not made: memory is what's saved
    later();
    a.remove(x.id); // deleting still works (it's how the player makes room)
    expect(a.store.getState().saveFailed).toBe(false);
    expect(a.records()).toEqual([]);
  });

  test("an unreadable roster with no room to keep it aside: offered for download, then replaced by what could be read", () => {
    const a = new Device("deva");
    const qs = new QuotaStorage();
    a.storage = qs;
    const good = { ...defaultRecord, id: "c_ok", name: "Megvan" };
    const raw = JSON.stringify([good, { broken: true }]); // one record can't be read
    qs.setItem("magus.roster.v1", raw);
    qs.cap = qs.used() + 50; // no room for a copy
    a.store = a.run(() => createRosterStore());
    expect(a.records().map((r) => r.name)).toEqual(["Megvan"]);
    const keys = a.run(() => unreadableKeys());
    expect(keys).toEqual(["magus.roster.v1"]); // the roster itself is what's offered
    a.edit("c_ok", "note");
    expect(qs.getItem("magus.roster.v1")).toBe(raw); // not saved over...
    expect(a.store.getState().saveFailed).toBe(true); // ...and said
    qs.cap = Infinity;
    a.run(() => a.store.dropUnreadable(keys)); // downloaded, then "Törlés erről az eszközről"
    expect(a.store.getState().saveFailed).toBe(false);
    expect(a.run(() => unreadableKeys())).toEqual([]);
    const saved = JSON.parse(qs.getItem("magus.roster.v1")!) as CharacterRecord[];
    expect(saved.map((r) => r.name)).toEqual(["Megvan"]);
    a.edit("c_ok", "note");
    expect(tokensOf(a.records()[0])).toContain("note"); // editing works again
  });
});

const cloneOf = (a: Device): Device => {
  const c = new Device(a.id);
  for (const [k, v] of a.storage.m) c.storage.m.set(k, v);
  c.store = c.run(() => createRosterStore());
  return c;
};

describe("a cloned device relabelling its edits keeps their history (third review)", () => {
  test("a clone deletes a character nobody else touched: after the relabel it stays deleted", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const w = a.create("Wulf");
    const v = a.create("Vera");
    await realSync(a, drive);
    await realSync(a, drive);
    const clone = cloneOf(a); // browser data restored onto a second phone
    later();
    clone.remove(w.id); // the player deletes Wulf on the new phone
    a.edit(v.id, "a-edit"); // the old phone keeps playing (its write marks the file as its own)
    await realSync(a, drive);
    await realSync(clone, drive); // clash → new id → relabel → run again
    expect(clashes.get(clone) ?? 0).toBe(1);
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await realSync(clone, drive);
    }
    // nobody edited Wulf after the clone's deletion: it must not come back
    expect(clone.byName("Wulf")).toBeUndefined();
    expect(a.byName("Wulf")).toBeUndefined();
  });

  test("a clone edits a character the original didn't touch: no '(másik változat)' copy of its own ancestor", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const w = a.create("Wulf");
    const v = a.create("Vera");
    await realSync(a, drive);
    await realSync(a, drive);
    const clone = cloneOf(a);
    later();
    clone.edit(w.id, "clone-edit"); // continues Wulf as published
    a.edit(v.id, "a-edit");
    await realSync(a, drive);
    await realSync(clone, drive);
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await realSync(clone, drive);
    }
    const wulfs = clone.records().filter((r) => r.name.startsWith("Wulf"));
    expect(wulfs.flatMap(tokensOf)).toContain("clone-edit");
    expect(wulfs).toHaveLength(1); // the clone's edit simply continues Wulf
  });
});
