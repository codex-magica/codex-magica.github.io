// A randomized test of the conflict question: three devices (ids from storage), real rounds with Drive
// failures; besides edits, deletions, reloads and edits during rounds, the player answers conflict
// questions on random devices (a version / both / later) and leaves an editor (the creator) open across
// syncs. No edit may be lost except by a deletion or a conflict answer that saw it, all devices converge,
// and no roster holds an id twice.
// Knobs: CFUZZ_FROM/CFUZZ_TO (seeds), CFUZZ_LOG=<file> (step log of a failing seed).
import { vi } from "vitest";
import { CharacterRecord } from "../model/character";
import { defaultRecord } from "./defaultRecord";
import { conflictsOf, listedRecords } from "./rosterStore";
import { Device, env, FakeDrive, later, realSync, rngFrom, seedRandomIds, setupSyncHarness, storedDevice, tokensOf, writeLog } from "./testing/syncHarness";

setupSyncHarness();
afterEach(() => vi.restoreAllMocks()); // the seeded ids (seedRandomIds)

describe("fuzz: conflict answers and open editors", () => {
  const run = async (seed: number) => {
    seedRandomIds(seed);
    const rng = rngFrom(seed);
    const drive = new FakeDrive();
    drive.rng = rngFrom(seed * 13 + 5);
    drive.failRate = 0.03;
    drive.lostResponseRate = 0.03;
    const devices = [storedDevice("deviceaa"), storedDevice("devicebb", -2 * 3600_000), storedDevice("devicecc", 90_000)];
    devices[1].backups = false;
    const names = new Map(devices.map((d, i) => [d, "ABC"[i]]));
    const created = new Set<string>();
    const excused = new Set<string>(); // seen by a deletion or dropped by a conflict answer that showed it
    const editors = new Map<Device, CharacterRecord>();
    let tokenSeq = 0;
    const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
    const log: string[] = [];
    const tok = () => {
      const t = `t${++tokenSeq}`;
      created.add(t);
      return t;
    };
    for (let step = 0; step < 300; step++) {
      later(Math.floor(rng() * 3 * 3600_000));
      const d = pick(devices);
      const L = names.get(d);
      const listed = listedRecords(d.records());
      const roll = rng();
      if (roll < 0.08 || listed.length === 0) {
        const t = tok();
        d.run(() => d.store.upsert({ ...defaultRecord, id: `c_${seed}_${tokenSeq}`, name: `Hős ${tokenSeq}`, inventoryText: t }));
        log.push(`${step} ${L} create ${t}`);
      } else if (roll < 0.36) {
        const r = pick(listed);
        const t = tok();
        d.edit(r.id, t);
        log.push(`${step} ${L} edit ${r.id} ${t}`);
      } else if (roll < 0.42) {
        const r = pick(listed);
        tokensOf(r).forEach((t) => excused.add(t));
        d.remove(r.id, r);
        log.push(`${step} ${L} remove ${r.id}`);
      } else if (roll < 0.48 && !editors.has(d)) {
        editors.set(d, JSON.parse(JSON.stringify(pick(listed))));
        log.push(`${step} ${L} open editor ${editors.get(d)!.id}`);
      } else if (roll < 0.54 && editors.has(d)) {
        const base = editors.get(d)!;
        editors.delete(d);
        const t = tok();
        d.run(() => d.store.upsert({ ...base, inventoryText: `${base.inventoryText ?? ""}\n${t}` }, base));
        log.push(`${step} ${L} save editor ${base.id} ${t}`);
      } else if (roll < 0.66) {
        const cs = conflictsOf(d.records());
        if (cs.length === 0) continue;
        const c = pick(cs);
        const versions = [c.main, ...c.alternatives];
        const choice = rng();
        if (choice < 0.2) {
          log.push(`${step} ${L} later ${c.main.id}`);
          continue;
        }
        const keep = choice < 0.4 ? "both" : pick(versions).id;
        if (keep !== "both") {
          const kept = new Set(tokensOf(versions.find((v) => v.id === keep)!));
          for (const v of versions) for (const t of tokensOf(v)) if (!kept.has(t)) excused.add(t);
        }
        d.run(() => d.store.resolveConflict(c.main.id, keep));
        log.push(`${step} ${L} resolve ${c.main.id} keep ${keep}`);
      } else if (roll < 0.69) {
        d.reopen();
        log.push(`${step} ${L} reload`);
      } else {
        let fired = false;
        drive.onOp =
          rng() < 0.25
            ? (op) => {
                if (fired || op !== "list") return;
                fired = true;
                const rs = listedRecords(d.records());
                if (!rs.length) return;
                const r = pick(rs);
                const t = tok();
                d.edit(r.id, t);
                log.push(`${step} ${L} edit-during ${r.id} ${t}`);
              }
            : null;
        await realSync(d, drive).then(
          () => log.push(`${step} ${L} sync`),
          (e) => log.push(`${step} ${L} sync failed ${String(e)}`)
        );
        drive.onOp = null;
      }
    }
    drive.failRate = drive.lostResponseRate = 0;
    for (let i = 0; i < 5; i++) for (const d of devices) await realSync(d, drive);
    const final = new Set(devices[0].records().flatMap(tokensOf));
    const lost = [...created].filter((t) => !final.has(t) && !excused.has(t));
    const diverged = devices.slice(1).some((d) => d.fingerprint() !== devices[0].fingerprint());
    if (diverged) {
      const fp = (d: Device) => new Set(d.fingerprint().split("\n"));
      for (const d of devices) {
        const mine = fp(d);
        const other = fp(devices[0]);
        log.push(`FINAL ${names.get(d)}(${d.id}) only-here: ${[...mine].filter((x) => !other.has(x)).join(" ")} | missing: ${[...other].filter((x) => !mine.has(x)).join(" ")}`);
        for (const r of d.records()) log.push(`   ${r.id} ${JSON.stringify(r.syncVc)} ${tokensOf(r).join(",")}`);
        log.push(`   dels ${JSON.stringify(Object.fromEntries(Object.entries(d.store.getState().deletions).map(([k, v]) => [k, v.vc])))}`);
      }
    }
    if ((lost.length || diverged) && env("CFUZZ_LOG")) writeLog(env("CFUZZ_LOG")!, log);
    const dupIds = devices.map((d) => d.records().length - new Set(d.records().map((r) => r.id)).size);
    expect({ lost, diverged, dupIds }).toEqual({ lost: [], diverged: false, dupIds: [0, 0, 0] });
  };
  // default: 1..20, plus seeds that found an alternative lost to an earlier answer's drop mark (126, 158,
  // 219) and one id twice in a roster (36), before that was fixed
  const seeds = env("CFUZZ_FROM")
    ? Array.from({ length: Number(env("CFUZZ_TO") ?? env("CFUZZ_FROM")) - Number(env("CFUZZ_FROM")) + 1 }, (_, i) => Number(env("CFUZZ_FROM")) + i)
    : [...Array.from({ length: 20 }, (_, i) => i + 1), 36, 126, 158, 219];
  for (const seed of seeds) test(`seed ${seed}`, () => run(seed), 120_000);
});
