// Pure derived-data selectors for the skill panel — everything here is a function of
// (record, derived, level), no JSX and no component state. Extracted from SkillLevelPanel.
import { CharacterRecord, SkillPurchase } from "../../model/character";
import { DerivedCharacter, OwnedSkill } from "../../engine/types";
import { SkillDef } from "../../model/skills";
import { rulesFor } from "../../model/rulesVariants";
import { skillStepCost, teachingUptoFor } from "../../engine/skillCost";
import { SkillCategory, skillKey } from "../../model/common";
import { Stat } from "../../model/attributes";

export type View = "meglevo" | "tanult" | "egyeb"; // meglévő = megszerzett · tanult = van rá oktató · egyéb = a többi

// A list row: a skill, optionally pinned to a taught BRANCH (subtype) — so "Vadonjárás (erdő)" can sit
// in Tanult while the general "Vadonjárás" sits in Egyéb.
export type Entry = { skill: string; subtype?: string };

export interface SkillPanelData {
  kap: number;
  // Variant (relearned) instances owned at this level, gathered from EVERY level up to the active one.
  variants: SkillPurchase[];
  // Floor maps keyed by the instance's STABLE identity (origSubtype ?? subtype).
  grantedFloor: Record<string, number>;
  inheritedFloor: Record<string, number>;
  // Trunk/grant instances (no variantId).
  ownedInstances: OwnedSkill[];
  teacherOf: (skill: string, subtype?: string) => number;
  generallyTaught: (skill: string) => boolean;
  taughtBranchesOf: (skill: string) => string[];
  // A step's Kp cost — the engine's own pricing (incl. school multiplier).
  stepCost: (skill: string, from: number, to: number, subtype?: string, attrs?: Stat[]) => number;
  subtypeSuggestions: (skill: string) => string[];
  relearnable: SkillDef[];
  specializable: (specializing: Set<string>) => SkillDef[];
  skillHasContent: (name: string) => boolean;
  entriesInCat: (cat: SkillCategory, view: View) => Entry[];
}

const isOptionalBranchDef = (def: SkillDef | undefined) => def?.branch?.[0]?.optional === true;

export function buildSkillPanelData(record: CharacterRecord, derived: DerivedCharacter, level: number): SkillPanelData {
  // The record's rules variant — the catalog the whole panel reads (base or homebrew skill rework).
  const { skills: SKILL_BY_NAME } = rulesFor(record);
  const SKILLS = Object.keys(SKILL_BY_NAME).map((n) => SKILL_BY_NAME[n]);
  const kap = derived.pools.kapBalanceByLevel[level - 1] ?? 0;
  // A variant added at an earlier level is still owned here, so gather variant purchases from EVERY
  // level up to the active one — else the row would vanish when switching levels. Edits route by id.
  const variants = record.levels.filter((l) => l.level <= level).flatMap((l) => l.skillPurchases.filter((p) => p.id));

  // Floor maps are keyed by the instance's STABLE identity (origSubtype ?? subtype) — two granted
  // instances whose overrides were both cleared to "" stay distinct.
  const grantedFloor: Record<string, number> = {};
  derived.grantedSkills.forEach((g) => {
    grantedFloor[skillKey(g.skill, g.origSubtype ?? g.subtype)] = g.percent != null ? g.percent : g.fok;
  });
  // The dec floor on THIS level: grants + everything bought in PRIOR levels (can't un-learn past
  // progress). floorByLevel[level-1] is the snapshot at the start of this level.
  const inheritedFloor: Record<string, number> = {};
  (derived.floorByLevel[level - 1] ?? derived.grantedSkills).forEach((g) => {
    inheritedFloor[skillKey(g.skill, g.origSubtype ?? g.subtype)] = g.percent != null ? g.percent : g.fok;
  });

  // User-added branches carry a variantId in the derived list; everything else is a "real" owned instance.
  const ownedInstances = derived.skills.filter((s) => s.variantId == null);
  // Teacher (oktatás) level for a specific INSTANCE — subtype-aware.
  const teacherOf = (skill: string, subtype?: string) => teachingUptoFor(derived.teachingDiscounts, SKILL_BY_NAME[skill], subtype);
  // Is the WHOLE skill taught (a general / category / all-skills teacher, not a branch-scoped one)?
  const generallyTaught = (skill: string) => {
    const def = SKILL_BY_NAME[skill];
    return derived.teachingDiscounts.some((d) => !d.subtype && (d.allSkills || (d.skill ? d.skill === skill : d.category === def.category)));
  };
  // Distinct subtypes of a skill that have a dedicated (branch-scoped) teacher, e.g. Vadonjárás → ["erdő"].
  const taughtBranchesOf = (skill: string) =>
    Array.from(new Set(derived.teachingDiscounts.filter((d) => d.subtype && d.skill === skill).map((d) => d.subtype!)));
  const stepCost = (skill: string, from: number, to: number, subtype?: string, attrs?: Stat[]) =>
    skillStepCost(SKILL_BY_NAME[skill], from, to, teacherOf(skill, subtype), derived.effectiveStats, attrs, derived.costMultipliers).kp;
  // Datalist suggestions for an open free-text branch: subtypes already learned, plus any branch the
  // character has an oktató for. Free text still allowed.
  const subtypeSuggestions = (skill: string): string[] =>
    Array.from(
      new Set([
        ...derived.skills.filter((s) => s.skill === skill && s.subtype).map((s) => s.subtype!),
        ...derived.teachingDiscounts.filter((d) => d.subtype && d.skill === skill).map((d) => d.subtype!),
      ])
    );

  const skillHasContent = (name: string) =>
    ownedInstances.some((s) => s.skill === name) || variants.some((p) => p.skill === name);

  // Skills that can be RE-learned (added as another independent row): branchable AND already learned.
  const relearnable = SKILLS.filter(
    (d) => d.branch != null && (ownedInstances.some((s) => s.skill === d.name) || variants.some((p) => p.skill === d.name))
  );
  // Optional-branch skills (Futás, Taktika, …) with an unspecialized base instance — offered in the
  // Specializálás picker (minus the ones already being specialized this session).
  const specializable = (specializing: Set<string>) =>
    SKILLS.filter((d) => isOptionalBranchDef(d) && !specializing.has(d.name) && ownedInstances.some((s) => s.skill === d.name && !s.subtype));

  const entriesInCat = (cat: SkillCategory, view: View): Entry[] => {
    const defs = SKILLS.filter((d) => d.category === cat);
    if (view === "meglevo") return defs.filter((d) => skillHasContent(d.name)).map((d) => ({ skill: d.name }));
    if (view === "egyeb")
      // Not owned AND the whole skill isn't taught. A branch-scoped teacher does NOT pull the general skill out.
      return defs.filter((d) => !skillHasContent(d.name) && !generallyTaught(d.name)).map((d) => ({ skill: d.name }));
    // tanult: generally-taught skills as-is, plus a pinned entry per branch-scoped taught branch.
    const entries: Entry[] = [];
    for (const d of defs) {
      if (generallyTaught(d.name)) entries.push({ skill: d.name });
      else for (const sub of taughtBranchesOf(d.name)) entries.push({ skill: d.name, subtype: sub });
    }
    return entries;
  };

  return {
    kap,
    variants,
    grantedFloor,
    inheritedFloor,
    ownedInstances,
    teacherOf,
    generallyTaught,
    taughtBranchesOf,
    stepCost,
    subtypeSuggestions,
    relearnable,
    specializable,
    skillHasContent,
    entriesInCat,
  };
}
