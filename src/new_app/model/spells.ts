// Spells (varázslatok / imák / pszi diszciplínák). A spell points BACK to the skill that teaches it
// and the pool it spends from. known = you own the gating skill at the required fok; castable =
// known AND the pool currently holds >= cost.
//
// MVP: a tiny sample so the "spells" view on the sheet is exercised. The full spell lists live in
// the existing src/data/*Magic.ts and migrate into this shape later.

import { Pool } from "./effects";
import { SkillFok } from "./common";

export interface SpellDef {
  name: string;
  pool: Pool;
  cost: number;
  requires: { skill: string; subtype?: string; fok: SkillFok };
  description?: string;
}

export const SPELLS: SpellDef[] = [
  {
    name: "Megnyugtató dallam",
    pool: "Mana",
    cost: 2,
    requires: { skill: "Tapasztalati mágia", subtype: "bárd", fok: 3 },
    description: "A bárd zenéje lecsillapítja a hallgatóságot.",
  },
  {
    name: "Hárfaszó-bűbáj",
    pool: "Mana",
    cost: 4,
    requires: { skill: "Tapasztalati mágia", subtype: "bárd", fok: 3 },
    description: "Elbűvöli a célpontot.",
  },
  {
    name: "Igazlátás",
    pool: "Psi",
    cost: 3,
    requires: { skill: "Pszi", fok: 3 },
    description: "Pszi diszciplína: a hazugság érzékelése.",
  },
];
