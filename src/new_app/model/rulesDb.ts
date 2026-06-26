// Assembles the static catalogs into one read-only RulesDB passed to the derivation engine.

import { RaceDef, RACES } from "./races";
import { ClassDef, CLASSES } from "./classes";
import { BackgroundDef, BACKGROUNDS } from "./backgrounds";
import { SkillDef, SKILL_BY_NAME } from "./skills";
import { SpellDef, SPELLS } from "./spells";

export interface RulesDB {
  races: Record<string, RaceDef>;
  classes: Record<string, ClassDef>;
  backgrounds: Record<string, BackgroundDef>;
  skills: Record<string, SkillDef>;
  spells: SpellDef[];
}

export const RULES: RulesDB = {
  races: RACES,
  classes: CLASSES,
  backgrounds: BACKGROUNDS,
  skills: SKILL_BY_NAME,
  spells: SPELLS,
};
