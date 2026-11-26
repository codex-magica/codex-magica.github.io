// A randomized test of the whole sync, and the scenarios it found.
//
// The fuzz runs the app's own rounds (driveSyncRound via realSync) between three devices with Drive
// failures, imports of earlier backup files, reloads, edits during rounds and copied browsers (only of
// browsers that have written to Drive: a copy with no marks yet, or sync off/on next to a copy, is the
// documented blind spot). It checks that no edit is lost unless a deletion saw it, and (when no browser
// was copied) that no deleted character comes back without an edit it didn't see. After a browser copy a
// deletion may come back (with a notice): the copies' versions can't be told apart, so both are kept
// (rosterStore.relabelDevice).
// Knobs: FUZZ=clone,import,reload,offon,during (features), FUZZ_FROM/FUZZ_TO (seeds), FUZZ_NOFAIL=1 (no Drive
// failures), FUZZ_LOG=<file> (step log of a failing seed).
import { defaultRecord } from "./defaultRecord";
import { parseImportFile } from "./transfer";
import { clearDriveState } from "./syncState";
import { vi } from "vitest";
import { backupFileOf, copyBrowser, Device, env, FakeDrive, later, realSync, rngFrom, seedRandomIds, setText, setupSyncHarness, storedDevice, tokensOf, writeLog } from "./testing/syncHarness";

setupSyncHarness();
afterEach(() => vi.restoreAllMocks()); // the seeded ids (seedRandomIds)

describe("fuzz: copied browsers, imports, reloads, edits during rounds, real rounds", () => {
  const F = (env("FUZZ") ?? "clone,import,reload,during").split(",");
  const run = async (seed: number) => {
    seedRandomIds(seed);
    const rng = rngFrom(seed);
    const drive = new FakeDrive();
    drive.rng = rngFrom(seed * 13 + 5);
    drive.failRate = 0.04;
    drive.lostResponseRate = 0.04;
    drive.cutRate = 0.02;
    if (env("FUZZ_NOFAIL")) drive.failRate = drive.lostResponseRate = drive.cutRate = 0;
    const devices = [storedDevice("deviceaa"), storedDevice("devicebb", -2 * 3600_000), storedDevice("devicecc", 90_000)];
    const deletedSaw = new Set<string>();
    const deletions: { id: string; seen: Set<string>; step: number }[] = [];
    const recreated = new Map<string, number>(); // id → last step it was deliberately brought back (import)
    const created = new Set<string>();
    const exports: string[] = [];
    let tokenSeq = 0;
    const labels = new Map<Device, string>([[devices[0], "A"], [devices[1], "B"], [devices[2], "C"]]);
    const L = (d: Device) => `${labels.get(d)}(${d.id})`;
    const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
    const log: string[] = [];

    for (let step = 0; step < 260; step++) {
      later(Math.floor(rng() * 6 * 3600_000));
      const d = pick(devices);
      const roll = rng();
      const recs = d.records();
      if (roll < 0.1 || recs.length === 0) {
        const token = `t${++tokenSeq}`;
        created.add(token);
        d.run(() => d.store.upsert({ ...defaultRecord, id: `c_${seed}_${tokenSeq}`, name: `Hős ${tokenSeq}`, inventoryText: token }));
        log.push(`${step} ${L(d)} create ${token}`);
      } else if (roll < 0.45) {
        const r = pick(recs);
        const token = `t${++tokenSeq}`;
        created.add(token);
        d.edit(r.id, token);
        log.push(`${step} ${L(d)} edit ${r.id} ${token}`);
      } else if (roll < 0.55) {
        const r = pick(recs);
        tokensOf(r).forEach((t) => deletedSaw.add(t));
        deletions.push({ id: r.id, seen: new Set(tokensOf(r)), step });
        d.remove(r.id, r);
        log.push(`${step} ${L(d)} remove ${r.id}`);
      } else if (roll < 0.58 && F.includes("import")) {
        exports.push(backupFileOf(recs));
      } else if (roll < 0.61 && exports.length && F.includes("import")) {
        const file = pick(exports);
        const parsed = d.run(() => parseImportFile(file, d.records()))!;
        for (const r of parsed.add) recreated.set(r.id, step);
        d.run(() => d.store.importRecords(parsed.add));
        log.push(`${step} ${L(d)} import ${parsed.add.map((r) => r.id).join(",")}`);
      } else if (roll < 0.64 && F.includes("reload")) {
        d.reopen(); // a reload
      } else if (roll < 0.655 && devices.length < 5 && F.includes("clone") && d.storage.getItem("magus.driveNonceConfirmed.v1")) {
        // (a copy of a browser that has written to Drive: one with no marks yet is the documented blind spot)
        { const c = copyBrowser(d); labels.set(c, `K${devices.length}of${labels.get(d)}`); devices.push(c); } // browser data copied onto another device
        log.push(`${step} clone of ${L(d)}`);
      } else if (roll < 0.665 && F.includes("offon")) {
        // sync turned off and on again
        d.run(() => clearDriveState());
        d.storage.setItem("magus.driveSync.v1", JSON.stringify({ enabled: true, backups: true, lastSyncAt: null, email: null }));
        d.cache.clear();
        log.push(`${step} ${L(d)} off/on`);
      } else {
        const during =
          rng() < 0.3 && F.includes("during")
            ? () => {
                const rs = d.records();
                if (rs.length === 0) return;
                const token = `t${++tokenSeq}`;
                created.add(token);
                const r = pick(rs);
                d.edit(r.id, token);
                log.push(`${step} ${L(d)} edit-during ${r.id} ${token}`);
              }
            : null;
        let fired = false;
        drive.onOp = during
          ? (op) => {
              if (!fired && op === "list") {
                fired = true;
                during();
              }
            }
          : null;
        await realSync(d, drive).then(
          () => log.push(`${step} ${L(d)} sync`),
          (e) => log.push(`${step} ${L(d)} sync failed ${String(e)}`)
        );
        drive.onOp = null;
      }
    }

    drive.failRate = drive.lostResponseRate = drive.cutRate = 0;
    for (let i = 0; i < 5; i++) for (const d of devices) await realSync(d, drive);

    const final = devices[0].records();
    for (const d of devices.slice(1)) expect(d.fingerprint()).toBe(devices[0].fingerprint());
    const finalTokens = new Set(final.flatMap(tokensOf));
    const lost = [...created].filter((t) => !finalTokens.has(t) && !deletedSaw.has(t));
    // a deletion that came back without an edit it didn't see
    const reverted = (devices.length > 3 ? [] : deletions) // (a copied browser: see the top)
      // (a dropped alternative of a conflict may come back: a later conflict with the same content asks
      // again rather than risk dropping a fresh edit, see driveMerge.combine)
      .filter((del) => !recreated.has(del.id) && !del.id.includes("~"))
      .filter((del) => {
        const r = final.find((x) => x.id === del.id);
        return r && tokensOf(r).every((t) => del.seen.has(t));
      })
      .map((del) => del.id);
    if ((lost.length || reverted.length) && env("FUZZ_LOG")) writeLog(env("FUZZ_LOG")!, log);
    expect({ lost, reverted }).toEqual({ lost: [], reverted: [] });
  };
  for (let seed = Number(env("FUZZ_FROM") ?? 1); seed <= Number(env("FUZZ_TO") ?? 10); seed++) test(`seed ${seed}`, () => run(seed), 120_000);
});

describe("a copied browser: the two copies' parallel versions are both kept", () => {
  test("the clone edits twice offline, the original once: both edits are kept", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const x = a.create("Xena");
    await realSync(a, drive);
    await realSync(a, drive);
    const k = copyBrowser(a); // browser data restored onto a second phone
    later();
    k.edit(x.id, "k1"); // the new phone, offline: {deva: 2}
    later();
    k.edit(x.id, "k2"); // {deva: 3}
    later();
    a.edit(x.id, "a1"); // the old phone: {deva: 2}, a different version under the same id and count
    await realSync(a, drive);
    await realSync(k, drive); // clash → new id → relabel: k2 becomes {deva: 1, new: 3}, parallel to a1
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await realSync(k, drive);
    }
    expect({ a: a.tokens().includes("a1"), k: k.tokens().includes("a1"), k2: a.tokens().includes("k2") }).toEqual({ a: true, k: true, k2: true });
  });

  test("the same with the clone deleting after an edit: the original's parallel edit wins", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const x = a.create("Xena");
    await realSync(a, drive);
    await realSync(a, drive);
    const k = copyBrowser(a);
    later();
    k.edit(x.id, "k1"); // {deva: 2}
    later();
    k.remove(x.id); // marker {deva: 3}
    later();
    a.edit(x.id, "a1"); // {deva: 2}, never saw the deletion
    await realSync(a, drive);
    await realSync(k, drive);
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await realSync(k, drive);
    }
    expect(a.tokens()).toContain("a1"); // an edit made in parallel with a deletion wins
  });
});

// A conflict alternative's id comes from the losing content (`${id}~${hash}`). When the same content loses
// a second time (HP back to where it was, a condition toggled off again, an old backup file imported), the
// second alternative lands on the same id: it must not replace edits made to the first one (its history is
// under keys of its own).
describe("a second conflict alternative of the same content", () => {
  test("HP down and back up on two devices at the table, twice: the edit made on the first alternative is kept", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const b = new Device("devb");
    a.backups = b.backups = false;
    const x = a.create("Xena", "full");
    await realSync(a, drive);
    await realSync(b, drive);
    // round 1: on A the HP goes down and back up (content as it was), on B a parallel edit made later
    later();
    setText(a, x.id, "hurt");
    setText(a, x.id, "full"); // the same content as before: {deva: 3}
    later();
    setText(b, x.id, "b1"); // later: keeps Xena
    await realSync(a, drive);
    await realSync(b, drive);
    await realSync(a, drive); // A: "Xena (másik változat)" = the "full" content, id Xena~hash(full)
    const alt = a.records().find((r) => r.id.startsWith(`${x.id}~`))!;
    expect(alt).toBeDefined();
    // the player keeps playing the alternative on A
    later();
    setText(a, alt.id, "full\nalt-edit");
    await realSync(a, drive);
    await realSync(b, drive);
    // round 2: the same happens again on Xena (A sets it back to "full", B edits in parallel, later)
    later();
    setText(a, x.id, "full"); // {deva: 4, devb: 1}, content "full" again
    later();
    setText(b, x.id, "b2");
    await realSync(a, drive);
    await realSync(b, drive);
    for (let i = 0; i < 2; i++) {
      await realSync(a, drive);
      await realSync(b, drive);
    }
    expect({ onA: a.tokens().includes("alt-edit"), onB: b.tokens().includes("alt-edit") }).toEqual({ onA: true, onB: true });
  });
});

describe("a copied browser whose last upload's answer was lost", () => {
  test("B deletes the version C published; the copy of C can't tell it was published: Xena comes back, and B is told", async () => {
    const drive = new FakeDrive();
    const b = new Device("devb");
    const c = new Device("devc");
    b.backups = c.backups = false;
    const x = c.create("Xena");
    await realSync(c, drive);
    await realSync(c, drive);
    await realSync(b, drive);
    later();
    c.edit(x.id, "c1");
    drive.lostResponseRate = 1; // the upload lands, its answer doesn't: C's "published" stays behind
    await expect(realSync(c, drive)).rejects.toThrow(/lost/);
    drive.lostResponseRate = 0;
    const k = copyBrowser(c); // C's browser data copied onto another device now
    await realSync(b, drive); // B gets c1...
    later();
    expect(tokensOf(b.byName("Xena")!)).toContain("c1");
    b.remove(x.id); // ...and deletes Xena, having seen it
    await realSync(b, drive);
    await realSync(c, drive); // C takes the deletion (and writes: its mark changes)
    await realSync(k, drive); // the copy: clash → relabel (c1 looks unpublished: kept, as a parallel edit)
    const told: string[] = [];
    for (let i = 0; i < 2; i++) for (const d of [b, c, k]) told.push(...(await realSync(d, drive)).undeleted);
    // when in doubt both are kept: Xena comes back everywhere, with a notice (not silently)
    expect({ b: !!b.byName("Xena"), c: !!c.byName("Xena"), k: !!k.byName("Xena") }).toEqual({ b: true, c: true, k: true });
    expect(told).toContain("Xena");
  });
});
