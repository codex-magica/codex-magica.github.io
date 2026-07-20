// Vértezet: worn armor / carried shield folded into the derived sheet (see model/armorUse).
import { CharacterRecord, SCHEMA_VERSION } from "../model/character";
import { RULES } from "../model/rulesDb";
import { derive } from "./derive";
import { armorCategory, resolveArmorUse, resolveShieldUse, armorByName, shieldByName } from "../model/armorUse";
import { ArmorValues, ShieldValues } from "../data/armor";

const pb = (): CharacterRecord["pointBuy"] => ({
  Erő: 14, Gyorsaság: 14, Ügyesség: 14, Állóképesség: 14, Egészség: 14,
  Karizma: 14, Intelligencia: 14, Akaraterő: 14, Asztrál: 14, Érzékelés: 14,
});

const base = (over: Partial<CharacterRecord> = {}): CharacterRecord => ({
  schemaVersion: SCHEMA_VERSION,
  id: "test",
  name: "Teszt",
  identity: { sex: "male", ageCategory: "Ifjúkor" },
  race: "Ember",
  class: "Harcos",
  selections: {},
  backgrounds: [],
  pointBuy: pb(),
  levels: [{ level: 1, allocations: [], skillPurchases: [], hmAssignments: [], statIncreases: [] }],
  kmAdjustments: [],
  inventory: [],
  vitalsState: {},
  ...over,
});

test("every armor and shield name resolves and classifies", () => {
  for (const a of ArmorValues) {
    expect(armorByName(a.name)).toBe(a);
    expect(["Könnyűvértezet", "Rugalmas nehézvért", "Merev nehézvért"]).toContain(armorCategory(a.name));
  }
  for (const s of ShieldValues) expect(shieldByName(s.name)).toBe(s);
});

test("armor MGT drags Ügyesség/Gyorsaság/Állóképesség down (never below 5) and cascades into TÉ/VÉ", () => {
  const clean = derive(RULES, base());
  const armored = derive(RULES, base({ armor: "teljes vértezet" }));
  // teljes vértezet: MGT −5, no Vértviselet → full −5 on all three stats (14 → 9)
  expect(armored.effectiveStats.Ügyesség).toBe(clean.effectiveStats.Ügyesség - 5);
  expect(armored.effectiveStats.Gyorsaság).toBe(clean.effectiveStats.Gyorsaság - 5);
  expect(armored.effectiveStats.Állóképesség).toBe(clean.effectiveStats.Állóképesség - 5);
  expect(armored.combat.TÉ).toBeLessThan(clean.combat.TÉ);
  expect(armored.combat.VÉ).toBeLessThan(clean.combat.VÉ);
  expect(armored.armorUse?.sfe).toBe(6);
  expect(armored.armorUse?.untrained).toBe(true); // merev nehézvért needs Vértviselet 2
});

test("the MGT clamp: a stat already near 5 only drops to 5", () => {
  const d = derive(RULES, base({ armor: "teljes vértezet", pointBuy: { ...pb(), Gyorsaság: 7 } }));
  expect(d.effectiveStats.Gyorsaság).toBe(5); // 7 − min(7−5, 5) = 5, not 2
});

test("Vértviselet relieves MGT and raises SFÉ (fok 3: heavy −1, SFÉ +1)", () => {
  const armor = armorByName("teljes vértezet")!;
  const use = resolveArmorUse(armor, [{ skill: "Vértviselet", fok: 3 }]);
  expect(use.mgt).toBe(-4); // −5 relieved by 1
  expect(use.sfe).toBe(7); // 6 + 1
  expect(use.untrained).toBe(false);
  const use5 = resolveArmorUse(armor, [{ skill: "Vértviselet", fok: 5 }]);
  expect(use5.mgt).toBe(-2);
  expect(use5.sfe).toBe(9);
  // light armor: fok 3 → MGT −2 relief, but never past 0
  const light = resolveArmorUse(armorByName("bőrpáncél")!, [{ skill: "Vértviselet", fok: 3 }]);
  expect(light.mgt).toBe(0);
});

test("a shield's VÉ applies only when trained; untrained keeps the MGT", () => {
  const shield = shieldByName("Pajzs, nagy")!;
  const untrained = resolveShieldUse(shield, []);
  expect(untrained.ve).toBe(0);
  expect(untrained.untrained).toBe(true);
  expect(untrained.mgt).toBe(-3);
  const trained = resolveShieldUse(shield, [{ skill: "Pajzshasználat", fok: 1 }]);
  expect(trained.ve).toBe(50);
  const master = resolveShieldUse(shield, [{ skill: "Pajzshasználat", fok: 5 }]);
  expect(master.mgt).toBe(0); // −3 relieved by 3

  // engine: an untrained carrier gets NO VÉ bonus (only the MGT drag)
  const clean = derive(RULES, base());
  const carrying = derive(RULES, base({ shield: "Pajzs, nagy" }));
  // VÉ moves only through the stat drag (Ügyesség/Gyorsaság), never gains the shield's 50
  expect(carrying.combat.VÉ).toBeLessThan(clean.combat.VÉ);
});

test("doffed gear (armorActive/shieldActive === false) stays a view but applies nothing", () => {
  const clean = derive(RULES, base());
  const doffed = derive(RULES, base({ armor: "teljes vértezet", armorActive: false, shield: "Pajzs, nagy", shieldActive: false }));
  expect(doffed.effectiveStats).toEqual(clean.effectiveStats);
  expect(doffed.combat).toEqual(clean.combat);
  // the views still resolve (the rows must render), flagged as not worn
  expect(doffed.armorUse?.worn).toBe(false);
  expect(doffed.shieldUse?.worn).toBe(false);
});

test("armor is play-state: the build ledger totals don't shift when donned", () => {
  const clean = derive(RULES, base());
  const armored = derive(RULES, base({ armor: "mellvért" }));
  const cleanLedger = clean.ledger.filter((e) => e.kind === "hm" || e.kind === "alloc");
  const armoredLedger = armored.ledger.filter((e) => e.kind === "hm" || e.kind === "alloc");
  expect(armoredLedger).toEqual(cleanLedger);
});
