// Golden-record tests: representative characters in → the FULL derived sheet out, snapshotted.
// These pin the engine's behavior so structural refactors (phase splits, helper moves) can be
// verified as no-ops: if a snapshot changes, the refactor changed the rules.
import { derive } from "./derive";
import { RULES } from "../model/rulesDb";
import { validateRules } from "../model/validateRules";
import { defaultRecord } from "../state/defaultRecord";
import { CharacterRecord, SCHEMA_VERSION } from "../model/character";
import { Stats } from "../model/attributes";

const pb = (v: Partial<Stats>): Stats => ({
  Erő: 12, Gyorsaság: 13, Ügyesség: 13, Állóképesség: 14, Egészség: 14,
  Karizma: 13, Intelligencia: 14, Akaraterő: 13, Asztrál: 14, Érzékelés: 15,
  ...v,
});

const base = (over: Partial<CharacterRecord>): CharacterRecord => ({
  schemaVersion: SCHEMA_VERSION,
  id: "test",
  name: "Teszt",
  identity: { sex: "male", ageCategory: "Ifjúkor" },
  race: "Ember",
  class: "Harcos",
  selections: {},
  backgrounds: [],
  pointBuy: pb({}),
  levels: [{ level: 1, allocations: [], skillPurchases: [], hmAssignments: [], statIncreases: [] }],
  kmAdjustments: [],
  inventory: [],
  vitalsState: {},
  ...over,
});

test("rules data is referentially consistent", () => {
  expect(validateRules(RULES)).toEqual([]);
});

test("golden: seed Elf Bárd (level 1, pools + bought HM/Fp/Mana + skills)", () => {
  expect(derive(RULES, defaultRecord)).toMatchSnapshot();
});

test("golden: Barbár Harcos, 3 levels (cost multiplier, granted Mágiatagadás, adottság, weapon variant)", () => {
  const rec = base({
    class: "Harcos",
    selections: { iskola: "Barbár" },
    identity: { sex: "male", ageCategory: "Ifjúkor" },
    pointBuy: pb({ Erő: 17, Állóképesség: 16, Egészség: 16, Intelligencia: 12, Asztrál: 12, Érzékelés: 13 }),
    adottsag: { Erő: 2 },
    grantedBgLevels: { Mágiatagadás: 3 },
    levels: [
      {
        level: 1,
        allocations: [{ target: "Fp", points: 5 }],
        skillPurchases: [
          { skill: "Fegyverhasználat", subtype: "csatabárdok", from: 0, to: 2 },
          { skill: "Lélektan", from: 0, to: 1 }, // Szociális → ×1.5 Kp (Barbár)
          { skill: "Úszás", to: 3 },
        ],
        hmAssignments: [{ channel: "TÉ", amount: 3 }],
        statIncreases: [],
      },
      {
        level: 2,
        allocations: [],
        skillPurchases: [
          { id: "v-axe", skill: "Fegyverhasználat", subtype: "kétkezes csatabárd", parent: "csatabárdok", from: 2, to: 3 },
          { skill: "Harctéri gyakorlat", to: 3 },
        ],
        hmAssignments: [],
        grantedHmAssignments: [{ channel: "KÉ", amount: 1 }],
        statIncreases: [{ stat: "Érzékelés", amount: 1, source: "kap" }],
      },
      {
        level: 3,
        allocations: [{ target: "Fp", points: 2 }],
        skillPurchases: [{ skill: "Fájdalomtűrés", to: 4 }],
        hmAssignments: [{ channel: "VÉ", amount: 1 }],
        grantedHmAssignments: [{ channel: "TÉ", amount: 1 }],
        statIncreases: [],
      },
    ],
    fok4Bonuses: [{ skill: "Fájdalomtűrés", stat: "Állóképesség" }],
  });
  expect(derive(RULES, rec)).toMatchSnapshot();
});

test("golden: Domvik-pap (Kegy pool, per-fok Vallásismeret resources, prayers known)", () => {
  const rec = base({
    class: "Pap",
    selections: { rend: "Domvik-pap" },
    pointBuy: pb({ Intelligencia: 16, Asztrál: 16, Akaraterő: 15 }),
    backgrounds: [{ background: "Vagyon", source: "chosen", acquiredAtLevel: 1, level: 2 }],
    levels: [
      {
        level: 1,
        allocations: [{ target: "Kegy", points: 5 }],
        skillPurchases: [{ skill: "Vallásismeret", subtype: "Domvik", to: 4 }],
        hmAssignments: [],
        statIncreases: [],
      },
      {
        level: 2,
        allocations: [{ target: "Kegy", points: 2 }],
        skillPurchases: [],
        hmAssignments: [],
        statIncreases: [],
      },
    ],
  });
  expect(derive(RULES, rec)).toMatchSnapshot();
});

test("golden: Varázsló (Mana + Pszi pools, granted Pszi 4 fok-4 bonus, path choice, spells)", () => {
  const rec = base({
    class: "Varázsló",
    selections: { iskola: "Doran" },
    pointBuy: pb({ Intelligencia: 17, Akaraterő: 16, Asztrál: 15, Erő: 10 }),
    levels: [
      {
        level: 1,
        allocations: [{ target: "Mana", points: 3 }],
        skillPurchases: [{ skill: "Élettan", to: 2 }],
        hmAssignments: [],
        statIncreases: [],
      },
    ],
    // The class grants Pszi (kyr) at fok 4 → a grant-driven fok-4 instance choice + a path commit.
    fok4Bonuses: [{ skill: "Pszi", subtype: "kyr", stat: "Akaraterő" }],
    pathChoices: [{ skill: "Pszi", subtype: "kyr", trigger: "Pszi fa", value: "tudat" }],
  });
  expect(derive(RULES, rec)).toMatchSnapshot();
});

test("golden: KM adjustments (statBonus applies; per-level kind + note surface as diagnostics)", () => {
  const rec = base({
    kmAdjustments: [
      {
        atLevel: 1,
        reason: "Történetjutalom",
        effects: [
          { kind: "statBonus", stat: "Erő", amount: 1 },
          { kind: "note", text: "A jutalom a kaland lezárásakor járt." },
          { kind: "resourcePerLevel", resource: "Fp", amount: 1 }, // unsupported late → warn diagnostic
        ],
      },
    ],
  });
  expect(derive(RULES, rec)).toMatchSnapshot();
});
