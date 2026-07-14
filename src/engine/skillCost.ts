// Pure skill Kp-cost helpers, shared by the derivation engine and the level-up UI.

import { Stat, Stats } from "../model/attributes";
import { SkillCategory } from "../model/common";
import { PERCENT_KP_RATE, SkillDef } from "../model/skills";

// A scope selecting skills: one skill (optionally one branch), a whole category, or everything.
// Teaching discounts, school cost multipliers, bans and fok caps all select skills this way.
export type SkillScope = { skill?: string; subtype?: string; category?: SkillCategory; allSkills?: boolean };

// Does `scope` select this skill (instance)? A subtype-scoped entry (Szakma(vadászat)) only matches
// that branch; otherwise: everything / the named skill / the whole category.
export const scopeMatches = (scope: SkillScope, def: SkillDef, subtype?: string): boolean =>
  scope.subtype != null
    ? scope.skill === def.name && scope.subtype === subtype
    : scope.allSkills || (scope.skill ? scope.skill === def.name : scope.category != null && scope.category === def.category);

export type Discount = SkillScope & { uptoLevel: number };

// Highest teacher (oktatás) level available for a skill instance, given the active discounts. 0 = none.
export function teachingUptoFor(discounts: Discount[], def: SkillDef, subtype?: string): number {
  let max = 0;
  for (const d of discounts) if (scopeMatches(d, def, subtype) && d.uptoLevel > max) max = d.uptoLevel;
  return max;
}

// Highest active school cost multiplier for a skill (e.g. Barbár: Szociális ×1.5 Kp). 1 = no penalty.
export function costMultiplierFor(multipliers: (SkillScope & { factor: number })[], def: SkillDef): number {
  let m = 1;
  for (const cm of multipliers) if (scopeMatches(cm, def)) m = Math.max(m, cm.factor);
  return m;
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
  const reqAttrs = attrs ?? def.attrs;
  const need = 10 + to;
  if (def.attrsAny && reqAttrs.length) {
    // Alternative attributes: only the best one must qualify.
    penalty = Math.min(...reqAttrs.map((a) => Math.max(0, need - stats[a])));
  } else {
    reqAttrs.forEach((a) => {
      if (stats[a] < need) penalty += need - stats[a];
    });
  }
  return { kp: kp + penalty, note: penalty > 0 ? `${def.name}: tulajdonság-hiány miatt +${penalty} Kp.` : undefined };
}

// The FINAL Kp/KAP charged for raising from→to: skillKpCost × the school multiplier, rounded up.
// This is the single pricing authority — the engine charges it and the UI displays it.
export function skillStepCost(
  def: SkillDef,
  from: number,
  to: number,
  teachingUpto: number,
  stats: Stats,
  attrs: Stat[] | undefined,
  multipliers: (SkillScope & { factor: number })[]
): { kp: number; note?: string } {
  const cost = skillKpCost(def, from, to, teachingUpto, stats, attrs);
  const mult = costMultiplierFor(multipliers, def);
  return mult === 1 ? cost : { ...cost, kp: Math.ceil(cost.kp * mult) };
}
