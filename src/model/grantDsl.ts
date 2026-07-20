// The compact grant DSL shared by every rules-data module (classes, races). ONE signature set —
// copy-pasting a grant between class and race files must never silently reinterpret arguments.

import { GrantEntry, grant } from "./effects";
import { taughtSkill } from "./skills";
import { SkillCategory, SkillFok } from "./common";

// Granted skill at a fok (subtype optional).
export const gs = (skill: string, level: number, subtype?: string): GrantEntry =>
  taughtSkill(skill, level as SkillFok, subtype);
// Granted percentage skill.
export const gp = (skill: string, percent: number, subtype?: string): GrantEntry =>
  grant({ kind: "grantSkillPercent", skill, subtype, percent });
// A weapon-choice placeholder (fő/másodfegyver): granted at a fok, but the player must resolve it to a
// concrete weapon category/weapon in the builder.
export const weaponChoice = (label: string, level: number): GrantEntry =>
  grant({ kind: "grantSkillChoice", skill: "Fegyverhasználat", label, level: level as SkillFok });
// "May learn if the DM allows" — informational, not auto-granted (Bárd Pszi).
export const allow = (skill: string, subtype?: string): GrantEntry =>
  grant({ kind: "allowSkill", skill, subtype });
// Teacher scoped to ONE branch of a skill, e.g. Művészetek(Rajz), Ősi nyelv(kyr). Default uptoLevel 4.
export const teachSub = (skill: string, subtype: string, uptoLevel: SkillFok = 4): GrantEntry =>
  grant({ kind: "teachingDiscount", skill, subtype, uptoLevel });
// A subclass DROPS a base-granted skill it doesn't receive (Arel: Írás/olvasás; Lar-Dor: Pszi kyr).
export const remove = (skill: string, subtype?: string): GrantEntry =>
  grant({ kind: "removeSkill", skill, subtype });
export const bg = (background: string, atLevel?: number): GrantEntry =>
  grant({ kind: "grantBackground", background }, atLevel);
export const teach = (...skills: string[]): GrantEntry[] =>
  skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel: 4 }));
// For a subclass option that teaches its OWN list instead of the class's: discards the inherited teach
// list, then teaches only `skills`. (Plain `teach(...)` in an option EXTENDS what the class teaches.)
export const teachOnly = (...skills: string[]): GrantEntry[] => [grant({ kind: "resetTeaching" }), ...teach(...skills)];
// Teaching variants for the school special-rules: a specific fok, whole categories, ALL skills, and
// level-gated forms (apply only from `fromLvl`). #2 ("any/all skills"): teachCat / teachAll.
export const teachAt = (fok: SkillFok, ...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel: fok }));
export const teachCat = (fok: SkillFok, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "teachingDiscount", category, uptoLevel: fok }));
export const teachAll = (fok: SkillFok): GrantEntry => grant({ kind: "teachingDiscount", allSkills: true, uptoLevel: fok });
// #1 level-gated ("X. szinttől"):
export const teachFrom = (fromLvl: number, fok: SkillFok, ...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "teachingDiscount", skill, uptoLevel: fok }, fromLvl));
export const teachCatFrom = (fromLvl: number, fok: SkillFok, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "teachingDiscount", category, uptoLevel: fok }, fromLvl));
export const teachAllFrom = (fromLvl: number, fok: SkillFok): GrantEntry => grant({ kind: "teachingDiscount", allSkills: true, uptoLevel: fok }, fromLvl);
// #3 cost penalty, #4 bans (→ warnings), #5 fok caps (→ warnings):
export const costMult = (factor: number, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "skillCostMultiplier", category, factor }));
export const forbidSkills = (...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "forbidSkill", skill }));
export const forbidCat = (...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "forbidSkill", category }));
export const capSkill = (fok: SkillFok, ...skills: string[]): GrantEntry[] => skills.map((skill) => grant({ kind: "maxSkillFok", skill, fok }));
export const capCat = (fok: SkillFok, ...cats: SkillCategory[]): GrantEntry[] => cats.map((category) => grant({ kind: "maxSkillFok", category, fok }));
export const tag = (t: string): GrantEntry => grant({ kind: "tag", tag: t }); // #6: school "ability"/sense, like Elf látás
// Szakrális szférák a deity/rend confers (Élet/Halál/Lélek/Természet). Gate Kis/Nagy Arkánum fohászok.
export const sphere = (s: string): GrantEntry => grant({ kind: "grantSphere", sphere: s });
export const spheres = (...ss: string[]): GrantEntry[] => ss.map(sphere);
export const equip = (item: string): GrantEntry => grant({ kind: "grantEquipment", item });
export const restrict = (text: string): GrantEntry => grant({ kind: "restriction", text });
