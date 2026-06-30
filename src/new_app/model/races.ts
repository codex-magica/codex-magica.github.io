// Playable races (fajok). A race IS a background: it has a cost that reduces per-level KAP
// (0 for human, 1 for the rest) plus grants (tags, innate cheaper skills) and stat caps.

import { Stats } from "./attributes";
import { GrantEntry, grant } from "./effects";
import { SkillFok } from "./common";

export interface AgeCategory {
  name: string;
  statMods: Partial<Stats>;
}

export interface RaceDef {
  name: string;
  cost: number; // background cost (reduces per-level KAP)
  statLimits: Stats;
  grants: GrantEntry[];
  ageCategories: AgeCategory[];
}

// MVP age model: a single neutral "adult" category per race (no modifiers). The structure supports
// the full age table (with stat penalties for old age etc.) later.
const adult: AgeCategory[] = [{ name: "Ifjúkor", statMods: {} }];

// Innate racial teaching talent: the listed skills are learned as if from an `uptoLevel`-fok teacher
// (a (fok − 2) Kp/fok discount up to that fok — e.g. fok 3 → 1 Kp up to 3, fok 4 → 2 Kp up to 4).
const teach = (uptoLevel: SkillFok, ...skills: string[]): GrantEntry[] =>
  skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel }));

export const RACES: Record<string, RaceDef> = {
  Ember: {
    name: "Ember",
    cost: 0,
    statLimits: { Erő: 18, Gyorsaság: 18, Ügyesség: 18, Állóképesség: 18, Egészség: 18, Karizma: 18, Intelligencia: 18, Akaraterő: 18, Asztrál: 18, Érzékelés: 18 },
    grants: [],
    ageCategories: adult,
  },
  Elf: {
    name: "Elf",
    cost: 1,
    statLimits: { Erő: 16, Gyorsaság: 20, Ügyesség: 18, Állóképesség: 16, Egészség: 18, Karizma: 20, Intelligencia: 18, Akaraterő: 18, Asztrál: 18, Érzékelés: 20 },
    grants: [
      grant({ kind: "tag", tag: "Elf látás" }),
      grant({ kind: "tag", tag: "Elf hallás" }),
      grant({ kind: "tag", tag: "Erős nekromancia érzékenység" }),
      grant({ kind: "combatBonus", channel: "CÉ", amount: 10 }),
      ...teach(4, "Állatismeret", "Idomítás", "Vadonjárás", "Lovaglás"),
    ],
    ageCategories: adult,
  },
  Félelf: {
    name: "Félelf",
    cost: 1,
    statLimits: { Erő: 17, Gyorsaság: 19, Ügyesség: 18, Állóképesség: 17, Egészség: 18, Karizma: 19, Intelligencia: 18, Akaraterő: 18, Asztrál: 18, Érzékelés: 19 },
    grants: [
      grant({ kind: "tag", tag: "Félelf látás" }),
      grant({ kind: "tag", tag: "Félelf hallás" }),
      grant({ kind: "tag", tag: "Gyenge nekromancia érzékenység" }),
      ...teach(3, "Állatismeret", "Idomítás", "Vadonjárás", "Lovaglás"),
    ],
    ageCategories: adult,
  },
  "Udvari Ork": {
    name: "Udvari Ork",
    cost: 1,
    statLimits: { Erő: 20, Gyorsaság: 18, Ügyesség: 18, Állóképesség: 20, Egészség: 20, Karizma: 16, Intelligencia: 16, Akaraterő: 18, Asztrál: 16, Érzékelés: 18 },
    grants: [grant({ kind: "tag", tag: "Infralátás" }), grant({ kind: "tag", tag: "Ork szaglás" })],
    ageCategories: adult,
  },
  Törpe: {
    name: "Törpe",
    cost: 1,
    statLimits: { Erő: 19, Gyorsaság: 18, Ügyesség: 18, Állóképesség: 19, Egészség: 19, Karizma: 17, Intelligencia: 17, Akaraterő: 18, Asztrál: 17, Érzékelés: 18 },
    grants: [
      grant({ kind: "tag", tag: "Infralátás" }),
      grant({ kind: "tag", tag: "Idő és irányérzék" }),
      grant({ kind: "tag", tag: "Archeológiai érzék" }),
      ...teach(4, "Építészet", "Térképészet", "Mechanika", "Művészetek", "Szakma"),
    ],
    ageCategories: adult,
  },
  "Kyr Származék": {
    name: "Kyr Származék",
    cost: 1,
    statLimits: { Erő: 17, Gyorsaság: 18, Ügyesség: 18, Állóképesség: 17, Egészség: 17, Karizma: 19, Intelligencia: 19, Akaraterő: 18, Asztrál: 19, Érzékelés: 18 },
    grants: [grant({ kind: "teachingDiscount", category: "Szociális", uptoLevel: 4 })],
    ageCategories: adult,
  },
};

export const RACE_NAMES = Object.keys(RACES);
