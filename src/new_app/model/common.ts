// Small shared vocabulary used across the model. Kept dependency-free to avoid import cycles.

export type SkillFok = 1 | 2 | 3 | 4 | 5;

export type SkillCategory =
  | "Harci"
  | "Alvilági"
  | "Világi"
  | "Tudományos"
  | "Szociális"
  | "Misztikus";

// Canonical book display order for the skill categories. Use this instead of re-listing the strings;
// the sheet, the creator's skill panel and the compendium all group by it.
export const SKILL_CATEGORIES: SkillCategory[] = [
  "Harci",
  "Alvilági",
  "Világi",
  "Tudományos",
  "Szociális",
  "Misztikus",
];

// Learning difficulty (book ch.16). Drives learning time / availability. NOT the Kp cost — each
// skill carries its own explicit cumulative cost array (the book table has per-skill deviations).
export type SkillDifficulty = "I" | "II" | "III" | "IV";

// A reference to a skill instance (subtype optional, free text).
export type SkillRef = { skill: string; subtype?: string };

export const skillKey = (skill: string, subtype?: string): string =>
  subtype ? `${skill}|${subtype}` : skill;
