// A randomized test of the whole sync, and the scenarios it found.
//
// The fuzz runs the app's own rounds (driveSyncRound via
// realSync) between three devices with Drive failures, imports of earlier backup files, reloads, edits
// during rounds and copied browsers (only of browsers that have written to Drive: a copy with no marks
// yet, or sync off/on next to a copy, is the documented blind spot). It checks that no edit is lost
// unless a deletion saw it, and (when no browser was copied) that no deleted character comes back without
// an edit it didn't see. After a browser copy a deletion may come back (with a notice): the copies' versions can't
// be told apart, so both are kept (rosterStore.relabelDevice).
// Knobs: FUZZ=clone,import,reload,offon,during (features), FUZZ_FROM/FUZZ_TO (seeds), FUZZ_NOFAIL=1 (no Drive
// failures), FUZZ_LOG=<file> (step log of a failing seed), FUZZ_WATCH=<token>/FUZZ_WID=<id> (trace one).
import { CharacterRecord } from "../model/character";
import { defaultRecord } from "./defaultRecord";
import { createRosterStore } from "./rosterStore";
import { parseImportFile } from "./transfer";
import { clearDriveState } from "./syncState";
import { vi } from "vitest";
import { Device, FakeDrive, later, realSync, rngFrom, setupSyncHarness, tokensOf } from "./testing/syncHarness";

setupSyncHarness();

// (vitest runs under node; the app's tsconfig has no node types)
declare const process: { env: Record<string, string | undefined> };
declare const require: (m: string) => { writeFileSync: (f: string, s: string) => void };

const backupFileOf = (recs: CharacterRecord[]) =>
  JSON.stringify({ format: "codex-magica-backup", version: 1, exportedAt: "x", characters: recs.map(({ updatedAt: _u, syncVc: _v, syncCvc: _c, ...r }) => r) });

const cloneOf = (a: Device, name: string): Device => {
  const c = new Device(a.id);
  for (const [k, v] of a.storage.m) c.storage.m.set(k, v);
  c.storedId = a.storedId;
  c.store = c.run(() => createRosterStore());
  void name;
  return c;
};

describe("fuzz: clones, imports, reloads, sync off/on, real rounds", () => {
  const F = (process.env.FUZZ ?? "clone,import,reload,during").split(",");
  const run = async (seed: number) => {
    // deterministic ids and marks, so a failing seed can be replayed
    const idRng = rngFrom(seed * 31 + 7);
    vi.spyOn(Math, "random").mockImplementation(idRng);
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(<T extends ArrayBufferView | null>(a: T): T => {
      const u = a as unknown as Uint32Array;
      for (let i = 0; i < u.length; i++) u[i] = Math.floor(idRng() * 2 ** 32);
      return a;
    });
    const rng = rngFrom(seed);
    const drive = new FakeDrive();
    drive.rng = rngFrom(seed * 13 + 5);
    drive.failRate = 0.04;
    drive.lostResponseRate = 0.04;
    drive.cutRate = 0.02;
    if (process.env.FUZZ_NOFAIL) drive.failRate = drive.lostResponseRate = drive.cutRate = 0;
    // ids from storage, like the app (the harness pins Device.id otherwise, and a round that fails right
    // after taking a new id would go on under the old one)
    const stored = (id: string, skew = 0) => {
      const d = new Device(id, skew);
      d.storage.setItem("magus.deviceId.v1", id);
      d.storedId = true;
      return d;
    };
    const devices = [stored("deviceaa"), stored("devicebb", -2 * 3600_000), stored("devicecc", 90_000)];
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
        d.store = d.run(() => createRosterStore()); // a reload
      } else if (roll < 0.655 && devices.length < 5 && F.includes("clone") && d.storage.getItem("magus.driveNonceConfirmed.v1")) {
        // (a copy of a browser that has written to Drive: one with no marks yet is the documented blind spot)
        { const c = cloneOf(d, ""); labels.set(c, `K${devices.length}of${labels.get(d)}`); devices.push(c); } // browser data copied onto another device
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
      const W = process.env.FUZZ_WATCH;
      if (W) {
        const where = devices.flatMap((dv) => dv.records().filter((r) => tokensOf(r).includes(W)).map((r) => `${labels.get(dv)}:${r.id}:${JSON.stringify(r.syncVc)}${r.syncCvc ? "cvc" + JSON.stringify(r.syncCvc) : ""}`));
        const inDrive = [...drive.files.values()].filter((f) => f.body.includes(`${W}\\n`) || f.body.includes(`${W}"`)).map((f) => f.props.kind + ":" + (f.props.device ?? f.props.char));
        log.push(`   [${W}] ${where.join(" ")} | drive: ${inDrive.join(" ")}`);
        const WID = process.env.FUZZ_WID;
        if (WID) {
          for (const dv of devices) {
            const r = dv.records().find((x) => x.id === WID);
            const del = dv.store.getState().deletions[WID];
            log.push(`      ${labels.get(dv)} ${r ? JSON.stringify(r.syncVc) + (r.syncCvc ? " cvc" + JSON.stringify(r.syncCvc) : "") + " " + tokensOf(r).join(",") : del ? "DEL " + JSON.stringify(del.vc) : "-"}`);
          }
          for (const f of drive.files.values())
            if (f.props.kind === "sync") {
              try {
                const e = (JSON.parse(f.body) as { characters: Record<string, { vc: unknown; cvc?: unknown; deleted?: boolean; record?: CharacterRecord }> }).characters[WID];
                log.push(`      file ${f.props.device}: ${e ? JSON.stringify(e.vc) + (e.cvc ? " cvc" + JSON.stringify(e.cvc) : "") + (e.deleted ? " DEL" : " " + tokensOf(e.record!).join(",")) : "-"}`);
              } catch {
                log.push(`      file ${f.props.device}: unreadable`);
              }
            }
        }
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
    if (lost.length || reverted.length) (globalThis as { __log?: string }).__log = log.join("\n");
    if ((lost.length || reverted.length) && process.env.FUZZ_LOG) require("fs").writeFileSync(process.env.FUZZ_LOG, log.join("\n"));
    vi.restoreAllMocks();
    expect({ lost, reverted }).toEqual({ lost: [], reverted: [] });
  };
  for (let seed = Number(process.env.FUZZ_FROM ?? 1); seed <= Number(process.env.FUZZ_TO ?? 20); seed++) test(`seed ${seed}`, () => run(seed), 120_000);
});

describe("a copied browser: the two copies' parallel versions are both kept", () => {
  test("the clone edits twice offline, the original once: both edits are kept", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const x = a.create("Xena");
    await realSync(a, drive);
    await realSync(a, drive);
    const k = cloneOf(a, "k"); // browser data restored onto a second phone
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
    const everywhere = (d: Device) => d.records().flatMap(tokensOf);
    expect({ a: everywhere(a).includes("a1"), k: everywhere(k).includes("a1"), k2: everywhere(a).includes("k2") }).toEqual({ a: true, k: true, k2: true });
  });

  test("the same with the clone deleting after an edit: the original's parallel edit wins", async () => {
    const drive = new FakeDrive();
    const a = new Device("deva");
    const x = a.create("Xena");
    await realSync(a, drive);
    await realSync(a, drive);
    const k = cloneOf(a, "k");
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
    expect(a.records().flatMap(tokensOf)).toContain("a1"); // an edit made in parallel with a deletion wins
  });
});

// A conflict copy's id comes from the losing content (`${id}~${hash}`). When the same content loses a
// second time (HP back to where it was, a condition toggled off again, an old backup file imported), the
// second copy lands on the same id: it must not replace edits made to the first one (the copy has a
// history of its own, not the losing version's).
describe("a second conflict copy of the same content", () => {
  const setText = (d: Device, id: string, text: string) =>
    d.run(() => {
      const r = d.records().find((x) => x.id === id)!;
      d.store.upsert({ ...r, inventoryText: text }, r);
    });

  test("HP down and back up on two devices at the table, twice: the edit made on the first copy is kept", async () => {
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
    const copy = a.records().find((r) => r.id.startsWith(`${x.id}~`))!;
    expect(copy).toBeDefined();
    // the player keeps playing the copy on A
    later();
    setText(a, copy.id, "full\ncopy-edit");
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
    const all = (d: Device) => d.records().flatMap(tokensOf);
    expect({ onA: all(a).includes("copy-edit"), onB: all(b).includes("copy-edit") }).toEqual({ onA: true, onB: true });
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
    const k = cloneOf(c, "k"); // C's browser data copied onto another device now
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
