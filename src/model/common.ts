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

// The ten deities. Single source for Vallásismeret's subtypes and the szakrális prayer gating.
export const DEITIES = [
  "Arel", "Darton", "Domvik", "Dreina", "Krad", "Kyel", "Ranagol", "Sogron", "Tharr", "Uwel",
] as const;

// A reference to a skill instance (subtype optional, free text).
export type SkillRef = { skill: string; subtype?: string };

export const skillKey = (skill: string, subtype?: string): string =>
  subtype ? `${skill}|${subtype}` : skill;

// A skill INSTANCE's identity: a user-added branch by its variantId, otherwise skill + subtype.
// Per-instance choices (fok-4 +1, Pszi path, chosen attrs) are stored and matched by this triple.
// The subtype used for matching must be the STABLE one (a granted instance's ORIGINAL subtype,
// not its display rename).
export interface SkillInstanceRef {
  skill: string;
  subtype?: string;
  variantId?: string;
}

// Do two refs address the same instance? variantId wins when either side has one; otherwise
// skill + normalized subtype ("" and undefined are the same).
export const sameInstance = (a: SkillInstanceRef, b: SkillInstanceRef): boolean =>
  a.variantId != null || b.variantId != null
    ? a.variantId === b.variantId
    : a.skill === b.skill && (a.subtype ?? "") === (b.subtype ?? "");

// Ephemeral string form of the identity — for set membership and React keys. Never stored.
export const instanceKey = (ref: SkillInstanceRef): string =>
  ref.variantId != null ? `v:${ref.variantId}` : `s:${skillKey(ref.skill, ref.subtype || undefined)}`;

// The stored per-instance choice addressing `ref`, if any.
export const findInstanceChoice = <T extends SkillInstanceRef>(
  list: T[] | undefined,
  ref: SkillInstanceRef
): T | undefined => list?.find((c) => sameInstance(c, ref));
