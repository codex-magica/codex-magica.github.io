// Golden-record tests: representative characters in → the FULL derived sheet out, snapshotted.
// These pin the engine's behavior so structural refactors (phase splits, helper moves) can be
// verified as no-ops: if a snapshot changes, the refactor changed the rules.
import { derive } from "./derive";
import { RULES } from "../model/rulesDb";
import { validateRules } from "../model/validateRules";
import { defaultRecord } from "../state/defaultRecord";
import { CharacterRecord, SCHEMA_VERSION } from "../model/character";
import { buildCustomClass } from "../model/customClass";
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

test("KM overrides: grantKap adds spendable KAP; pool/skill/teacher grants surface", () => {
  const baseline = derive(RULES, base({}));
  const rec = base({
    kmAdjustments: [
      { id: "a", atLevel: 1, reason: "bónusz", effects: [{ kind: "grantKap", amount: 30 }] },
      { id: "b", atLevel: 1, reason: "kegy", effects: [{ kind: "grantPoolPoints", pool: "Kegy", amount: 12 }] },
      { id: "c", atLevel: 1, reason: "skill", effects: [{ kind: "grantSkill", skill: "Úszás", level: 2 }] },
      { id: "d", atLevel: 1, reason: "teacher", effects: [{ kind: "teachingDiscount", skill: "Alkímia", uptoLevel: 4 }] },
    ],
  });
  const d = derive(RULES, rec);
  expect(d.pools.kapBalanceByLevel[0]).toBe(baseline.pools.kapBalanceByLevel[0] + 30); // spendable
  expect(d.pools.magic.Kegy?.max).toBe(12);
  expect(d.skills.some((s) => s.skill === "Úszás" && s.fok >= 2)).toBe(true);
  expect(d.teachingDiscounts.some((t) => t.skill === "Alkímia")).toBe(true);
});

test("KM overrides: half-filled rows stay benign (no phantom skill / empty pool / empty tag)", () => {
  const d = derive(RULES, base({
    kmAdjustments: [
      { id: "e", atLevel: 1, reason: "", effects: [{ kind: "grantSkill", skill: "", level: 1 }] },
      { id: "f", atLevel: 1, reason: "", effects: [{ kind: "grantPoolPoints", pool: "Kegy", amount: 0 }] },
      { id: "g", atLevel: 1, reason: "", effects: [{ kind: "tag", tag: "" }] },
    ],
  }));
  expect(d.skills.some((s) => s.skill === "")).toBe(false);
  expect(d.pools.magic.Kegy).toBeUndefined();
  expect(d.tags.some((t) => t.name === "")).toBe(false);
});

test("KM overrides: textual (tag) grant surfaces on the abilities panel, level-gated", () => {
  const rec = base({
    levels: [
      { level: 1, allocations: [], skillPurchases: [], hmAssignments: [], statIncreases: [] },
      { level: 2, allocations: [], skillPurchases: [], hmAssignments: [], statIncreases: [] },
    ],
    kmAdjustments: [
      { id: "t", atLevel: 2, reason: "Sárkányvér", effects: [{ kind: "tag", tag: "Lát a sötétben" }] },
    ],
  });
  const d = derive(RULES, rec);
  const tag = d.tags.find((t) => t.name === "Lát a sötétben");
  expect(tag).toBeDefined();
  expect(tag!.source).toBe("KM: Sárkányvér");
  expect(tag!.atLevel).toBe(2);
});

test("KM overrides: tag grant carries custom rules text; built-ins stay bare; regrant rewords", () => {
  const rec = base({
    race: "Elf", // has built-in tag grants (Elf látás, …), so the bare-shape assertion is non-vacuous
    kmAdjustments: [
      { id: "t", reason: "", effects: [{ kind: "tag", tag: "Lát a sötétben", text: " Vaksötétben is lát, 10 láb távolságig. " }] },
      { id: "r", reason: "", effects: [{ kind: "tag", tag: "Elf látás", text: "Házi szabály: +15 CÉ." }] }, // reword a built-in
    ],
  });
  const d = derive(RULES, rec);
  const tag = d.tags.find((t) => t.name === "Lát a sötétben");
  expect(tag!.text).toBe("Vaksötétben is lát, 10 láb távolságig."); // trimmed
  expect(tag!.source).toBe("Egyéb"); // no reason → tag grouped under Egyéb, not "KM"
  const reworded = d.tags.find((t) => t.name === "Elf látás")!;
  expect(reworded.source).toBe("Faj: Elf"); // dedup keeps the original grant…
  expect(reworded.text).toBe("Házi szabály: +15 CÉ."); // …but the KM's custom text still lands
  const builtIn = d.tags.find((t) => t.name === "Elf hallás");
  expect(builtIn).toBeDefined();
  expect("text" in builtIn!).toBe(false); // absent key, not undefined — golden snapshots stay byte-identical
});

test("KM overrides: missing reason doesn't throw; numeric grants keep the KM provenance label", () => {
  const rec = base({
    kmAdjustments: [
      { effects: [{ kind: "statBonus", stat: "Erő", amount: 1 }] } as never, // legacy/imported: no reason field
    ],
  });
  const d = derive(RULES, rec); // must not throw (derive's no-throw contract)
  expect(d.provenance["Erő"].some((c) => c.source === "KM" && c.amount === 1)).toBe(true); // not "Egyéb"
});

test("custom class: record-embedded ClassDef grants skills and teachers", () => {
  const def = buildCustomClass("Kósza", 5, [
    { id: "1", kind: "skill", skill: "Vadonjárás", fok: 3, atLevel: 1 },
    { id: "2", kind: "teacher", skill: "Fájdalomtűrés", fok: 4, atLevel: 1 },
    { id: "3", kind: "skill", skill: "Úszás", fok: 2, atLevel: 2 }, // level-gated: not at level 1
  ]);
  const d = derive(RULES, base({ class: "Kósza", customClass: def }));
  expect(d.skills.some((s) => s.skill === "Vadonjárás" && s.fok >= 3)).toBe(true);
  expect(d.teachingDiscounts.some((t) => t.skill === "Fájdalomtűrés")).toBe(true);
  expect(d.grantedSkills.some((s) => s.skill === "Úszás")).toBe(false); // atLevel 2, character is level 1
  expect(d.diagnostics.some((x) => x.severity === "error" && /Ismeretlen kaszt/.test(x.message))).toBe(false);
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
