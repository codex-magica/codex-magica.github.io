// RulesDB variant selection. Each character record is derived under exactly one variant, fixed at
// creation (houseRules on the record). Kept out of rulesDb.ts to avoid an import cycle with the
// homebrew transform (which imports RulesDB).

import { RULES, RulesDB } from "./rulesDb";
import { HouseRules } from "./character";
import { MERGED_INTO_EBERSEG, buildSkillReworkRules } from "./homebrew/skillRework";
import { HomebrewSkillValues, SkillInfo, SkillValues } from "../data/skillsText";

type HasHouseRules = { houseRules?: HouseRules };

export const isHomebrew = (rec: HasHouseRules | undefined): boolean => !!rec?.houseRules?.skillRework;

let cachedRules: RulesDB | null = null;
export const rulesHomebrew = (): RulesDB => cachedRules || (cachedRules = buildSkillReworkRules(RULES));

export const rulesFor = (rec: HasHouseRules | undefined): RulesDB => (isHomebrew(rec) ? rulesHomebrew() : RULES);

// The homebrew variant's prose catalog: same-named homebrew entries replace the base entry, the three
// merged skills' prose drops (Éberség covers them).
let cachedProse: SkillInfo[] | null = null;
export const homebrewProse = (): SkillInfo[] => {
  if (!cachedProse) {
    const replaced = new Set<string>([...MERGED_INTO_EBERSEG, ...HomebrewSkillValues.map((s) => s.name)]);
    cachedProse = SkillValues.filter((s) => !replaced.has(s.name)).concat(HomebrewSkillValues);
  }
  return cachedProse;
};
