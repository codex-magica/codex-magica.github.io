// Tests for the homebrew "képzettség-átdolgozás" variant (model/homebrew/skillRework.ts):
// referential consistency, the transform's invariants, the doc's explicit Éberség placements, and
// golden snapshots for homebrew characters. Base-rules snapshots (derive.test.ts) must stay
// byte-identical — the variant is a copy-on-write overlay, never an edit of base data.
import { derive } from "./derive";
import { skillKpCost } from "./skillCost";
import { validateRules } from "../model/validateRules";
import { homebrewProse, rulesHomebrew } from "../model/rulesVariants";
import { pctToFok } from "../model/homebrew/skillRework";
import { RULES } from "../model/rulesDb";
import { CharacterRecord, SCHEMA_VERSION } from "../model/character";
import { Stats } from "../model/attributes";
import { GrantEntry } from "../model/effects";
import { ChoiceDef } from "../model/choices";
import { TIER_COST, SkillDef } from "../model/skills";

const pb = (v: Partial<Stats>): Stats => ({
  Erő: 12, Gyorsaság: 13, Ügyesség: 13, Állóképesség: 14, Egészség: 14,
  Karizma: 13, Intelligencia: 14, Akaraterő: 13, Asztrál: 14, Érzékelés: 15,
  ...v,
});

const base = (over: Partial<CharacterRecord>): CharacterRecord => ({
  schemaVersion: SCHEMA_VERSION,
  id: "test-hb",
  name: "Teszt",
  identity: { sex: "male", ageCategory: "Ifjúkor" },
  race: "Ember",
  class: "Tolvaj",
  houseRules: { skillRework: true },
  selections: {},
  backgrounds: [],
  pointBuy: pb({}),
  levels: [{ level: 1, allocations: [], skillPurchases: [], hmAssignments: [], statIncreases: [] }],
  kmAdjustments: [],
  inventory: [],
  vitalsState: {},
  ...over,
});

const HB = rulesHomebrew();
const MERGED = ["Rejtekhelykutatás", "Csapdakeresés", "Veszélyérzék"];

// Every grant entry in a class — class grants, baseSkills and the whole (nested) choice tree.
const allGrantsOf = (className: string): GrantEntry[] => {
  const k = HB.classes[className];
  const out: GrantEntry[] = [...k.grants, ...(k.baseSkills ?? [])];
  const walkChoices = (choices: ChoiceDef[] | undefined) => {
    for (const c of choices ?? [])
      for (const o of c.options) {
        out.push(...(o.grants ?? []));
        walkChoices(o.choices);
      }
  };
  walkChoices(k.choices);
  return out;
};
const skillNameOf = (g: GrantEntry): string | undefined => ("skill" in g.effect ? (g.effect as { skill?: string }).skill : undefined);

test("homebrew rules are referentially consistent (skills + prose)", () => {
  expect(validateRules(HB, homebrewProse())).toEqual([]);
});

test("base rules are untouched by building the homebrew variant", () => {
  expect(RULES.skills["Lopódzás"].cost).toBe("percentage");
  expect(RULES.skills["Veszélyérzék"]).toBeDefined();
  expect(RULES.skills["Éberség"]).toBeUndefined();
});

test("pctToFok thresholds", () => {
  expect(pctToFok(1)).toBe(1);
  expect(pctToFok(20)).toBe(1);
  expect(pctToFok(21)).toBe(2);
  expect(pctToFok(40)).toBe(2);
  expect(pctToFok(60)).toBe(3);
  expect(pctToFok(80)).toBe(4);
  expect(pctToFok(81)).toBe(5);
  expect(pctToFok(120)).toBe(5);
});

test("transform invariants: no percentage skill remains; merged names gone; Éberség tier III", () => {
  const defs = Object.keys(HB.skills).map((n) => HB.skills[n]);
  expect(defs.filter((d) => d.cost === "percentage")).toEqual([]);
  for (const m of MERGED) expect(HB.skills[m]).toBeUndefined();
  expect(HB.skills["Éberség"].cost).toEqual(TIER_COST.III); // 2-8-15-30-45
  expect(HB.skills["Lopódzás"].cost).toEqual(TIER_COST.I); // 1-3-8-15-25
  expect(HB.skills["Mászás"].attrsAny).toBe(true);
  expect(HB.skills["Mászás"].attrs).toEqual(["Erő", "Ügyesség"]);
  expect(HB.skills["Akrobatika"].attrs).toEqual(["Ügyesség"]); // user decision: no Erő
  expect(HB.skills["Zárnyitás"].hardReq).toEqual([]); // user decision: no Mechanika req
  expect(HB.skills["Rejtőzés"]).toBeUndefined(); // user decision: base name kept
  expect(HB.skills["Rejtőzködés"].cost).toEqual(TIER_COST.I);
});

test("no class references the merged skill names anywhere (grants, teaching, choice tree)", () => {
  for (const name of Object.keys(HB.classes)) {
    const offenders = allGrantsOf(name)
      .map(skillNameOf)
      .filter((s): s is string => !!s && MERGED.indexOf(s) >= 0);
    expect({ class: name, offenders }).toEqual({ class: name, offenders: [] });
  }
});

test("Éberség school grants match the doc (threshold conversion dropped, explicit list injected)", () => {
  const eberFokOf = (rec: CharacterRecord): number =>
    Math.max(0, ...derive(HB, rec).skills.filter((s) => s.skill === "Éberség").map((s) => s.fok));
  // Fejvadász Testőr: max(gp 20%, 20%) would threshold to fok 1 — the doc says 2 (explicit override).
  expect(eberFokOf(base({ class: "Fejvadász", selections: { tipus: "Testőr", klan: "Gorviki Vértestvériség" } }))).toBe(2);
  expect(eberFokOf(base({ class: "Fejvadász", selections: { tipus: "Harcos", klan: "Gorviki Vértestvériség" } }))).toBe(1);
  expect(eberFokOf(base({ class: "Tolvaj", selections: { tipus: "Besurranó", klan: "Kobrák" } }))).toBe(2);
  expect(eberFokOf(base({ class: "Tolvaj", selections: { tipus: "Általános", klan: "Kobrák" } }))).toBe(1);
  expect(eberFokOf(base({ class: "Bárd", selections: { iskola: "Aszisz Énekmondó" } }))).toBe(1);
  // Harcművész: pure additions — Tűz 1, Szél (Levegő) 2. Other bárd schools get nothing.
  expect(eberFokOf(base({ class: "Harcművész", selections: { stilus: "Shien-ka-to (Tűz)" } }))).toBe(1);
  expect(eberFokOf(base({ class: "Harcművész", selections: { stilus: "Nisen-nid-to (Levegő)" } }))).toBe(2);
  expect(eberFokOf(base({ class: "Bárd", selections: { iskola: "Magányos mester" } }))).toBe(0);
});

test("Éberség teaching: only the doc's schools teach it", () => {
  const teachesEberseg = (rec: CharacterRecord): boolean =>
    derive(HB, rec).teachingDiscounts.some((d) => d.skill === "Éberség");
  expect(teachesEberseg(base({ class: "Tolvaj", selections: { tipus: "Zsebes", klan: "Kobrák" } }))).toBe(true);
  expect(teachesEberseg(base({ class: "Fejvadász", selections: { tipus: "Felderítő", klan: "Anat-Akhan" } }))).toBe(true);
  expect(teachesEberseg(base({ class: "Harcművész", selections: { stilus: "Nisen-nid-to (Levegő)" } }))).toBe(true);
  expect(teachesEberseg(base({ class: "Bárd", selections: { iskola: "Aszisz Énekmondó" } }))).toBe(true);
  // Magányos mester inherits only the class teach list — merged names dropped, no Éberség injected.
  expect(teachesEberseg(base({ class: "Bárd", selections: { iskola: "Magányos mester" } }))).toBe(false);
  expect(teachesEberseg(base({ class: "Harcos", selections: { iskola: "Általános" } }))).toBe(false);
});

test("attrsAny: only the BEST attribute must qualify (Mászás Erő VAGY Ügyesség)", () => {
  const def = HB.skills["Mászás"];
  const stats = (ero: number, ugy: number): Stats => pb({ Erő: ero, Ügyesség: ugy });
  // to=2 needs attr ≥ 12: one qualifying attribute → no penalty even if the other is far below.
  expect(skillKpCost(def, 0, 2, 0, stats(16, 8)).kp).toBe(skillKpCost(def, 0, 2, 0, stats(16, 16)).kp);
  // Both below: min shortfall (12−10=2, 12−11=1 → +1), not the sum (+3).
  const bothLow = skillKpCost(def, 0, 2, 0, stats(10, 11));
  const noPenalty = skillKpCost(def, 0, 2, 0, stats(16, 16));
  expect(bothLow.kp - noPenalty.kp).toBe(1);
  // Control: an all-required skill of the same shape sums the shortfalls.
  const andDef: SkillDef = { ...def, attrsAny: undefined };
  expect(skillKpCost(andDef, 0, 2, 0, stats(10, 11)).kp - noPenalty.kp).toBe(3);
});

test("golden: homebrew Tolvaj Besurranó (fok-based ex-pct skills, Éberség 2, taught pricing, fok-4 raise)", () => {
  const rec = base({
    class: "Tolvaj",
    selections: { tipus: "Besurranó", klan: "Kobrák" },
    pointBuy: pb({ Ügyesség: 16, Érzékelés: 16 }),
    levels: [
      {
        level: 1,
        allocations: [{ target: "Fp", points: 3 }],
        // Lopódzás: granted fok 2 (30%→2), taught by the class → discounted fok pricing.
        skillPurchases: [{ skill: "Lopódzás", to: 3 }],
        hmAssignments: [],
        statIncreases: [],
      },
      {
        level: 2,
        allocations: [],
        // Raise the reworked Lopódzás to fok 4 — the fok-4 +1 attribute now applies (multi-attr → choice).
        skillPurchases: [{ skill: "Lopódzás", to: 4 }, { skill: "Éberség", to: 3 }],
        hmAssignments: [],
        statIncreases: [],
      },
    ],
    fok4Bonuses: [{ skill: "Lopódzás", stat: "Ügyesség" }],
  });
  expect(derive(HB, rec)).toMatchSnapshot();
});

test("golden: homebrew Harcművész Nisen-nid-to (Éberség granted+taught, Mászás attrsAny purchase)", () => {
  const rec = base({
    class: "Harcművész",
    selections: { stilus: "Nisen-nid-to (Levegő)" },
    pointBuy: pb({ Erő: 15, Ügyesség: 10, Akaraterő: 15 }),
    levels: [
      {
        level: 1,
        allocations: [{ target: "Fp", points: 3 }],
        // Mászás from the granted fok 0 → 2 with Ügyesség below the requirement but Erő above (attrsAny).
        skillPurchases: [{ skill: "Mászás", to: 2 }],
        hmAssignments: [],
        statIncreases: [],
      },
    ],
  });
  expect(derive(HB, rec)).toMatchSnapshot();
});
