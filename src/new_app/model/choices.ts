// Flexible, recursive choice tree for class specialization. A class exposes one or more ChoiceDef
// (e.g. "iskola", or "típus" + "klán"). Selecting an option applies its grants and may unlock
// further nested ChoiceDef (sub-sub-classes, e.g. Arel-pap irányzat, Isten Kardja Arc).
//
// Each choice has a skill `mode`:
//   • "override" — the selected option's SKILL grants REPLACE the accumulated skill package
//                  (used where picking a school gives a whole new package, e.g. Harcos, Lovag).
//   • "additive" — the option's skill grants ADD to the package (shared base + deltas, e.g. Pap).
// Taught skills (teachingDiscount) default to ADDING (subclass extends what the class teaches), but a
// subclass option can carry a `resetTeaching` marker to discard the inherited list first (override).
// Other non-skill grants (backgrounds, equipment, restrictions…) always add.

import { GrantEntry } from "./effects";

export type SkillMode = "override" | "additive";

export interface OptionDef {
  name: string;
  grants?: GrantEntry[];
  choices?: ChoiceDef[]; // nested choices unlocked when this option is selected
}

export interface ChoiceDef {
  id: string; // unique selection key within a class
  label: string;
  mode: SkillMode;
  options: OptionDef[];
}

export type Selections = Record<string, string>; // choiceId → option name

const isSkillGrant = (g: GrantEntry): boolean =>
  g.effect.kind === "grantSkill" || g.effect.kind === "grantSkillPercent" || g.effect.kind === "grantSkillChoice";
const isTeach = (g: GrantEntry): boolean => g.effect.kind === "teachingDiscount";
const isResetTeach = (g: GrantEntry): boolean => g.effect.kind === "resetTeaching";
const isRemove = (g: GrantEntry): boolean => g.effect.kind === "removeSkill";

// Resolve a class's choice tree against the character's selections into a flat grant list.
// `base` is the class's shared base skill package (used by additive choices; empty for pure override).
export function resolveChoiceGrants(
  classGrants: GrantEntry[],
  baseSkills: GrantEntry[] | undefined,
  choices: ChoiceDef[],
  selections: Selections
): GrantEntry[] {
  const other: GrantEntry[] = classGrants.filter((g) => !isTeach(g));
  let skills: GrantEntry[] = baseSkills ? baseSkills.slice() : [];
  let teaches: GrantEntry[] = classGrants.filter(isTeach); // class default; a subclass may reset/extend it

  const walk = (nodes: ChoiceDef[]) => {
    for (const choice of nodes) {
      const optName = selections[choice.id];
      if (!optName) continue;
      const opt = choice.options.find((o) => o.name === optName);
      if (!opt) continue;
      const og = opt.grants || [];
      const skillGrants = og.filter(isSkillGrant);
      if (choice.mode === "override") skills = skillGrants.slice();
      else for (const g of skillGrants) skills.push(g);
      if (og.some(isResetTeach)) teaches = []; // this subclass OVERRIDES what the class teaches
      for (const g of og.filter(isTeach)) teaches.push(g);
      for (const g of og.filter((g) => !isSkillGrant(g) && !isTeach(g) && !isResetTeach(g))) other.push(g);
      if (opt.choices) walk(opt.choices);
    }
  };
  walk(choices);

  // `removeSkill` must run AFTER the base/skill grants it drops — split it out and append after `skills`.
  const removes = other.filter(isRemove);
  const otherRest = other.filter((g) => !isRemove(g));
  return otherRest.concat(skills).concat(removes).concat(teaches);
}

// The ordered list of choices that should currently be shown/selected, given the selections
// (top-level choices always; nested ones appear once their parent option is chosen).
export function activeChoices(choices: ChoiceDef[], selections: Selections): ChoiceDef[] {
  const result: ChoiceDef[] = [];
  const walk = (nodes: ChoiceDef[]) => {
    for (const c of nodes) {
      result.push(c);
      const selName = selections[c.id];
      const opt = selName ? c.options.find((o) => o.name === selName) : undefined;
      if (opt && opt.choices) walk(opt.choices);
    }
  };
  walk(choices);
  return result;
}

// First-option-of-every-(reachable)-choice default selection.
export function defaultSelections(choices: ChoiceDef[]): Selections {
  const sel: Selections = {};
  const walk = (nodes: ChoiceDef[]) => {
    for (const c of nodes) {
      const first = c.options[0];
      if (!first) continue;
      sel[c.id] = first.name;
      if (first.choices) walk(first.choices);
    }
  };
  walk(choices);
  return sel;
}

// helpers for authoring class data
export const opt = (name: string, grants?: GrantEntry[], choices?: ChoiceDef[]): OptionDef => ({
  name,
  grants,
  choices,
});
export const choice = (id: string, label: string, mode: SkillMode, options: OptionDef[]): ChoiceDef => ({
  id,
  label,
  mode,
  options,
});
