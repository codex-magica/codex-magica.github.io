// Állapotok: play-state conditions folded into the derived sheet (see model/conditions).
import { CharacterCondition, CharacterRecord, SCHEMA_VERSION } from "../model/character";
import { CONDITION_PRESETS } from "../model/conditions";
import { RULES } from "../model/rulesDb";
import { derive } from "./derive";

const pb = (v: Partial<CharacterRecord["pointBuy"]>) => ({
  Erő: 14, Gyorsaság: 14, Ügyesség: 14, Állóképesség: 14, Egészség: 14,
  Karizma: 14, Intelligencia: 14, Akaraterő: 14, Asztrál: 14, Érzékelés: 14,
  ...v,
});

const base = (conditions?: CharacterCondition[]): CharacterRecord => ({
  schemaVersion: SCHEMA_VERSION,
  id: "test",
  name: "Teszt",
  identity: { sex: "male", ageCategory: "Ifjúkor" },
  race: "Ember",
  class: "Harcos",
  selections: {},
  backgrounds: [],
  pointBuy: pb({}) as CharacterRecord["pointBuy"],
  levels: [{ level: 1, allocations: [], skillPurchases: [], hmAssignments: [], statIncreases: [] }],
  kmAdjustments: [],
  inventory: [],
  vitalsState: {},
  conditions,
});

const preset = (key: string, magnitude = 0): CharacterCondition => {
  const p = CONDITION_PRESETS.find((x) => x.key === key)!;
  return { id: key, name: p.name, effects: p.effects(magnitude), preset: key, magnitude };
};

test("every preset yields whole-number modifiers at any magnitude (no fractional bonuses)", () => {
  for (const p of CONDITION_PRESETS) {
    // presets with a magnitude field are free-text — try values on both sides of the default
    for (const n of p.magnitude ? [1, 2, 3, 5, 7, 10] : [0]) {
      for (const e of p.effects(n)) {
        if (e.kind === "combatBonus" || e.kind === "derivedBonus" || e.kind === "statBonus") {
          expect(Number.isInteger(e.amount)).toBe(true);
        }
      }
    }
  }
});

test("no conditions ⇒ nothing changes", () => {
  const clean = derive(RULES, base());
  expect(derive(RULES, base([])).combat).toEqual(clean.combat);
});

test("a parked condition (active: false) stays on the record but applies nothing", () => {
  const clean = derive(RULES, base());
  const parked = derive(RULES, base([{ ...preset("kabultsag"), active: false }]));
  expect(parked.combat).toEqual(clean.combat);
  expect(parked.derived).toEqual(clean.derived);
  // switching it back on applies it again
  expect(derive(RULES, base([{ ...preset("kabultsag"), active: true }])).combat.TÉ).toBeLessThan(clean.combat.TÉ);
});

test("a flat combat condition lowers the combat values", () => {
  const clean = derive(RULES, base());
  const hurt = derive(RULES, base([preset("serulesi-modosito")]));
  expect(hurt.combat.TÉ).toBe(clean.combat.TÉ - 10);
  expect(hurt.combat.VÉ).toBe(clean.combat.VÉ - 10);
});

test("an ATTRIBUTE condition cascades into combat, MME/AME, Fp max and Mozgás", () => {
  const clean = derive(RULES, base());
  const dazed = derive(RULES, base([preset("kabultsag")]));
  // Kábultság: Erő/Áks/Gy/Ügy −2, Int/Akr/Aszt −5, plus KÉ −10 TÉ −20 VÉ −10 CÉ −30.
  expect(dazed.effectiveStats.Gyorsaság).toBe(clean.effectiveStats.Gyorsaság - 2);
  expect(dazed.derived.MME).toBe(clean.derived.MME - 5); // via Akaraterő, not a flat MME modifier
  expect(dazed.derived.AME).toBe(clean.derived.AME - 5); // via Asztrál
  expect(dazed.derived.Fp).toBe(clean.derived.Fp - 7); // Áks −2 and Akr −5 both feed Fp
  expect(dazed.derived.Mozgás).toBe(clean.derived.Mozgás - 10); // Gyorsaság × 5
  expect(dazed.combat.TÉ).toBeLessThan(clean.combat.TÉ - 20); // the flat −20 AND the lost attributes
});

test("a psi shield cast by an ally raises the magic resistance it protects", () => {
  const clean = derive(RULES, base());
  const shielded = derive(RULES, base([preset("statikus-pajzs-mentalis", 7)]));
  expect(shielded.derived.MME).toBe(clean.derived.MME + 7);
  expect(shielded.derived.AME).toBe(clean.derived.AME); // the Mental shield leaves the Astral side alone
});

test("conditions are itemized in the provenance, so the breakdown modals explain them", () => {
  const d = derive(RULES, base([preset("hatrany-jelentos")]));
  expect(d.provenance["TÉ"]).toContainEqual(expect.objectContaining({ source: "Állapot: Hátrány — Jelentős", amount: -25 }));
});

test("a max-lowering condition clamps the current vital without destroying the stored value", () => {
  const rec = base([preset("magikus-kifaradas", 5)]);
  const clean = derive(RULES, base());
  rec.vitalsState = { Fp: clean.derived.Fp }; // at full Fp when the fatigue lands
  const tired = derive(RULES, rec);
  expect(tired.vitals.Fp.max).toBe(clean.derived.Fp - 5);
  expect(tired.vitals.Fp.current).toBe(tired.vitals.Fp.max); // clamped, not overflowing
  // the stored current is untouched, so removing the condition restores it
  expect(derive(RULES, { ...rec, conditions: [] }).vitals.Fp.current).toBe(clean.derived.Fp);
});

test("the BUILD ledger is not rewritten by a temporary condition", () => {
  const withHm: CharacterRecord = {
    ...base(),
    levels: [{ level: 1, allocations: [], skillPurchases: [], hmAssignments: [{ channel: "TÉ", amount: 3 }], statIncreases: [] }],
  };
  const clean = derive(RULES, withHm);
  const dazed = derive(RULES, { ...withHm, conditions: [preset("kabultsag")] });
  const hmEntry = (d: typeof clean) => d.ledger.find((e) => e.kind === "hm" && e.id === "TÉ")!;
  expect(hmEntry(dazed)).toEqual(hmEntry(clean)); // the ledger shows what was BOUGHT, not the dazed total
  expect(dazed.combat.TÉ).toBeLessThan(clean.combat.TÉ); // …while the sheet's TÉ really does drop
});
