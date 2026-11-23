// RulesDB variant selection. Each character record is derived under exactly one variant, fixed at
// creation (houseRules on the record). Kept out of rulesDb.ts to avoid an import cycle with the
// homebrew transform (which imports RulesDB).

import { RULES, RulesDB } from "./rulesDb";
import { HouseRules, LevelRecord } from "./character";
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

// Switching the house rule (at creation only): purchases of skills the other catalog lacks
// (Veszélyérzék ↔ Éberség) or prices differently (every % skill becomes a fok skill: Mászás 18% must
// not turn into fok 18) are removed. `dropped` lists them, so the player can be told what went.
export interface DroppedPurchase {
  level: number;
  skill: string;
  subtype?: string;
  to: number;
  percent: boolean;
}
export function switchSkillRework<R extends HasHouseRules & { levels: LevelRecord[] }>(
  record: R,
  on: boolean
): { levels: LevelRecord[]; dropped: DroppedPurchase[] } {
  const current = rulesFor(record);
  const target = rulesFor({ houseRules: { skillRework: on } });
  const samePrice = (skill: string) => {
    const a = current.skills[skill];
    const b = target.skills[skill];
    return !!a && !!b && JSON.stringify(a.cost) === JSON.stringify(b.cost);
  };
  const dropped: DroppedPurchase[] = [];
  const levels = record.levels.map((l) => {
    const keep = l.skillPurchases.filter((p) => samePrice(p.skill));
    if (keep.length === l.skillPurchases.length) return l;
    for (const p of l.skillPurchases)
      if (!samePrice(p.skill))
        dropped.push({ level: l.level, skill: p.skill, subtype: p.subtype, to: p.to, percent: current.skills[p.skill]?.cost === "percentage" });
    return { ...l, skillPurchases: keep };
  });
  return { levels, dropped };
}
