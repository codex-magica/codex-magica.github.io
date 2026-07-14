// Pure skill Kp-cost helpers, shared by the derivation engine and the level-up UI.

import { Stat, Stats } from "../model/attributes";
import { PERCENT_KP_RATE, PERCENT_KP_RATE_TAUGHT, SkillDef } from "../model/skills";

export type Discount = { skill?: string; subtype?: string; category?: string; allSkills?: boolean; uptoLevel: number };

// Highest teacher (oktatás) level available for a skill instance, given the active discounts. 0 = none.
// A subtype-scoped discount (Szakma(vadászat)) only matches that branch.
export function teachingUptoFor(discounts: Discount[], def: SkillDef, subtype?: string): number {
  let max = 0;
  for (const d of discounts) {
    const matches = d.subtype != null
      ? d.skill === def.name && d.subtype === subtype
      : d.allSkills || (d.skill ? d.skill === def.name : d.category === def.category);
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
  stats: Stats,
  attrs?: Stat[] // the instance's resolved attributes (branch/category/chosen); defaults to def.attrs
): { kp: number; note?: string } {
  if (to <= from) return { kp: 0 };
  if (def.cost === "percentage") {
    // %/Kp scales with the teacher's fok: none/fok 1–2 → 3%, fok 3 → 4%, fok 4 → 5%, fok 5 → 6% (book ch.16).
    const rate = PERCENT_KP_RATE + Math.max(0, teachingUpto - 2);
    return { kp: Math.ceil((to - from) / rate) };
  }
  const cum = def.cost;
  // A teacher discounts each levelup: fok 1–2 → 1 Kp, fok 3 → 1, fok 4 → 2, fok 5 → 3 (book ch.16) — and
  // can teach up to fok T. Every levelup still costs at least 1 Kp.
  const perFok = teachingUpto >= 3 ? teachingUpto - 2 : teachingUpto >= 1 ? 1 : 0;
  let kp = 0;
  for (let f = from + 1; f <= to; f++) {
    const inc = cum[f - 1] - (f > 1 ? cum[f - 2] : 0);
    const disc = f <= teachingUpto ? perFok : 0;
    kp += Math.max(1, inc - disc);
  }
  let penalty = 0;
  (attrs ?? def.attrs).forEach((a) => {
    const need = 10 + to;
    if (stats[a] < need) penalty += need - stats[a];
  });
  return { kp: kp + penalty, note: penalty > 0 ? `${def.name}: tulajdonság-hiány miatt +${penalty} Kp.` : undefined };
}
