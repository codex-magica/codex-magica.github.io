import {Skill} from "@/magus/skills";

export const StatValues = {
  Erő: { short: "Erő" },
  Gyorsaság: { short: "Gy" },
  Ügyesség: { short: "Ügy" },
  Állóképesség: { short: "Áks" },
  Egészség: { short: "Egs" },
  Karizma: { short: "Krz" },
  Intelligencia: { short: "Int" },
  Akaraterő: { short: "Akr" },
  Asztrál: { short: "Aszt" },
  Érzékelés: { short: "Érz" },
};
export type Stat = keyof typeof StatValues;

export type Stats  = {
  [key in Stat]: number;
}

const calcBonuses = (c: Character, stat: Stat | DerivedStat) => {
  return 0;
}

export const DerivedStatValues = {
  Ép: {
    calc: (c: Character) => (c.stats['Egészség'] + calcBonuses(c, 'Ép')),
  },
  Fp: {
    calc: (c: Character) => (c.stats['Állóképesség'] + c.stats['Egészség'] + calcBonuses(c, 'Fp')),
  },
  Kp: {
    calc: (c: Character) => (c.baseStats['Intelligencia'] + calcBonuses(c, 'Kp')),
  },
  Psi: {
    calc: (c: Character) => (c.baseStats['Intelligencia'] + calcBonuses(c, 'Psi')),
  },
  KÉ: {
    calc: (c: Character) => (c.stats['Érzékelés'] + c.stats['Gyorsaság'] + calcBonuses(c, 'KÉ')),
  },
  TÉ: {
    calc: (c: Character) => (c.stats['Ügyesség'] + c.stats['Gyorsaság'] + c.stats['Erő'] + calcBonuses(c, 'TÉ')),
  },
  VÉ: {
    calc: (c: Character) => (c.stats['Ügyesség'] + c.stats['Gyorsaság'] + 60 + calcBonuses(c, 'VÉ')),
  },
  CÉ: {
    calc: (c: Character) => (c.stats['Ügyesség'] + c.stats['Érzékelés'] + calcBonuses(c, 'CÉ')),
  },
  SebzésBónusz:{
    calc: (c: Character) => (Math.max(c.stats['Erő'] - 15, 0) + calcBonuses(c, 'SebzésBónusz')),
  },
  MME:{
    calc: (c: Character) => (c.stats['Akaraterő'] + calcBonuses(c, 'MME')),
  },
  AME:{
    calc: (c: Character) => (c.stats['Asztrál'] + calcBonuses(c, 'AME')),
  },
};
export type DerivedStat = keyof typeof DerivedStatValues;

export type DerivedStats = typeof DerivedStatValues;

interface Modifier {
  stat: Stat | DerivedStat;
  value: number;
  description?: string;
}
interface TagValue {
  modifiers?: Modifier[];
  description?: string;
}

export const TagValues = {
  "Infralátás": {
    description: "Hőlátás. Segítségével a tárgyak és testek által kibocsátott hőt lehet látni. Nem ad tiszta képet a világról, csak a hőfoltok alapján enged tájékozódni.",
  } as TagValue,
  "Elf látás": {} as TagValue,
  "Elf hallás": {} as TagValue,
  "Erős nekromancia érzékenység": {} as TagValue,
  "Félelf látás": {} as TagValue,
  "Félelf hallás": {} as TagValue,
  "Gyenge nekromancia érzékenység": {} as TagValue,
  "Ork szaglás": {} as TagValue,
  "Idő és irányérzék": {} as TagValue,
  "Archeológiai érzék": {} as TagValue,
}
export type Tag = keyof typeof TagValues;

export type SkillTaught = {
  skill: Skill;
  level: 1 | 2 | 3 | 4 | 5;
}

interface RaceInfo {
  statLimits: StatLimits;
  tags?: Tag[];
  skillTaught?: SkillTaught[];
}

interface StatLimits extends Stats {}
export const RaceValues = {
  Ember: {
    statLimits: {
      Erő: 18,
      Gyorsaság: 18,
      Ügyesség: 18,
      Állóképesség: 18,
      Egészség: 18,
      Karizma: 18,
      Intelligencia: 18,
      Akaraterő: 18,
      Asztrál: 18,
      Érzékelés: 18,
    } as StatLimits
  },
  Elf: {
    statLimits: {
      Erő: 16,
      Gyorsaság: 20,
      Ügyesség: 18,
      Állóképesség: 16,
      Egészség: 18,
      Karizma: 20,
      Intelligencia: 18,
      Akaraterő: 18,
      Asztrál: 18,
      Érzékelés: 20,
    } as StatLimits
  },
  Félelf: {
    statLimits: {
      Erő: 17,
      Gyorsaság: 19,
      Ügyesség: 18,
      Állóképesség: 17,
      Egészség: 18,
      Karizma: 19,
      Intelligencia: 18,
      Akaraterő: 18,
      Asztrál: 18,
      Érzékelés: 19,
    } as StatLimits
  },
  'Udvari Ork': {
    statLimits: {
      Erő: 20,
      Gyorsaság: 18,
      Ügyesség: 18,
      Állóképesség: 20,
      Egészség: 20,
      Karizma: 16,
      Intelligencia: 16,
      Akaraterő: 18,
      Asztrál: 16,
      Érzékelés: 18,
    } as StatLimits
  },
  Törpe: {
    statLimits: {
      Erő: 19,
      Gyorsaság: 18,
      Ügyesség: 18,
      Állóképesség: 19,
      Egészség: 19,
      Karizma: 17,
      Intelligencia: 17,
      Akaraterő: 18,
      Asztrál: 17,
      Érzékelés: 18,
    } as StatLimits
  },
  'Kyr Származék': {
    statLimits: {
      Erő: 17,
      Gyorsaság: 18,
      Ügyesség: 18,
      Állóképesség: 17,
      Egészség: 17,
      Karizma: 19,
      Intelligencia: 19,
      Akaraterő: 18,
      Asztrál: 19,
      Érzékelés: 18,
    } as StatLimits
  }
};
export type Race = keyof typeof RaceValues;

export type SkillLevel = {
  skill: Skill;
  skillSubtype?: string;
  level: number;
}

export interface Character {
  baseStats: Stats;
  stats: Stats;
  derivedStats: DerivedStats;
  race: Race;
  class: string;
  skills: SkillLevel[];
}

