// Per-instance Kp pricing rules that hang off the SUBTYPE (book ch.9).
import { SKILL_BY_NAME } from "../model/skills";
import { skillStepCost } from "./skillCost";

const STATS = { Erő: 14, Gyorsaság: 14, Ügyesség: 16, Állóképesség: 13, Egészség: 13, Karizma: 13, Intelligencia: 14, Akaraterő: 14, Asztrál: 14, Érzékelés: 13 } as any;
const cost = (subtype: string | undefined, from: number, to: number) =>
  skillStepCost(SKILL_BY_NAME["Harcművészet"], from, to, 0, STATS, undefined, [], subtype).kp;

test("Dhala-saa is taught for half the usual Harcművészet price (ch.9), rounded up", () => {
  // Harcművészet is difficulty IV: [3, 10, 20, 35, 55] cumulative.
  expect(cost("Slan kard", 0, 4)).toBe(35);
  expect(cost("Dhala-saa", 0, 4)).toBe(18); // ceil(35 / 2)
  expect(cost("Dhala-saa", 3, 4)).toBe(8); // ceil((35 − 20) / 2)
});

test("every other Harcművészet instance pays full price", () => {
  expect(cost("Shien-su", 0, 4)).toBe(35); // Shien-su has no discount — only Dhala-saa does
  expect(cost("Avad-ka-kinito", 0, 4)).toBe(35);
  expect(cost(undefined, 0, 4)).toBe(35);
});
