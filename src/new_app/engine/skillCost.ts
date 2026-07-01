// Pure skill Kp-cost helpers, shared by the derivation engine and the level-up UI.

import { Stats } from "../model/attributes";
import { PERCENT_KP_RATE, PERCENT_KP_RATE_TAUGHT, SkillDef } from "../model/skills";

export type Discount = { skill?: string; category?: string; allSkills?: boolean; uptoLevel: number };

// Highest teacher (oktatás) level available for a skill, given the active discounts. 0 = no teacher.
export function teachingUptoFor(discounts: Discount[], def: SkillDef): number {
  let max = 0;
  for (const d of discounts) {
    const matches = d.allSkills || (d.skill ? d.skill === def.name : d.category === def.category);
    if (matches && d.uptoLevel > max) max = d.uptoLevel;
  }
  return max;
}

// Kp cost to raise a skill from→to, with a resolved teacher level and the character's stats.
// Tiered: cumulative-difference minus a (teacher fok − 2)/fok teaching discount (min 1 each), up to the
// teacher's fok, plus an unmet-attribute penalty. Percentage: ceil(Δ% / rate), rate 3 (or 5 with a teacher).
export function skillKpCost(
  def: SkillDef,
  from: number,
  to: number,
  teachingUpto: number,
  stats: Stats
): { kp: number; note?: string } {
  if (to <= from) return { kp: 0 };
  if (def.cost === "percentage") {
    const rate = teachingUpto > 0 ? PERCENT_KP_RATE_TAUGHT : PERCENT_KP_RATE;
    return { kp: Math.ceil((to - from) / rate) };
  }
  const cum = def.cost;
  // A teacher of fok T discounts each levelup by (T − 2) Kp — fok 3 → 1, 4 → 2, 5 → 3; below fok 3 nothing —
  // and can teach up to fok T. Every levelup still costs at least 1 Kp.
  const perFok = Math.max(0, teachingUpto - 2);
  let kp = 0;
  for (let f = from + 1; f <= to; f++) {
    const inc = cum[f - 1] - (f > 1 ? cum[f - 2] : 0);
    const disc = f <= teachingUpto ? perFok : 0;
    kp += Math.max(1, inc - disc);
  }
  let penalty = 0;
  def.attrs.forEach((a) => {
    const need = 10 + to;
    if (stats[a] < need) penalty += need - stats[a];
  });
  return { kp: kp + penalty, note: penalty > 0 ? `${def.name}: tulajdonság-hiány miatt +${penalty} Kp.` : undefined };
}
