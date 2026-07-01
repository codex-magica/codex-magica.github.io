// The Effect vocabulary — emitted by races, classes, subclasses, backgrounds, skill foks and KM
// grants. The derivation engine folds these into the sheet.

import { Stat } from "./attributes";
import { SkillCategory, SkillFok } from "./common";

// Anything that can be gained/spent during a level-up.
export type Resource = "Mana" | "Psi" | "Kegy" | "HM" | "Fp" | "Kp";

// The three spendable magic pools.
export type Pool = "Mana" | "Psi" | "Kegy";

export type CombatChannel = "KÉ" | "TÉ" | "VÉ" | "CÉ";

// Derived values an effect may flatly bonus.
export type DerivedKey =
  | "Ép"
  | "Fp"
  | "MME"
  | "AME"
  | "Sebzésbónusz";

export type Effect =
  | { kind: "grantSkill"; skill: string; subtype?: string; level: SkillFok }
  | { kind: "grantSkillPercent"; skill: string; subtype?: string; percent: number }
  | { kind: "teachingDiscount"; skill?: string; subtype?: string; category?: SkillCategory; allSkills?: boolean; uptoLevel: SkillFok } // subtype = teacher scoped to one branch (Szakma(vadászat)). allSkills = teaches everything. Level-gated grants carry an atLevel.
  | { kind: "grantSkillChoice"; skill: string; label: string; level: SkillFok } // a placeholder branch the player must resolve to a concrete subtype (fegyverhasználat első/második fegyver)
  | { kind: "allowSkill"; skill: string; subtype?: string } // "may learn if the DM allows" (Bárd Pszi) — informational permission, not auto-granted
  | { kind: "resetTeaching" } // in a subclass option: discard the inherited (class) teach list before adding its own — the subclass OVERRIDES rather than extends what it teaches
  | { kind: "skillCostMultiplier"; skill?: string; category?: SkillCategory; allSkills?: boolean; factor: number } // e.g. Barbár: Szociális/Alvilági/Tudományos Kp cost ×1.5
  | { kind: "forbidSkill"; skill?: string; category?: SkillCategory; text?: string } // school cannot learn this skill/category — surfaced as a builder warning, not hard-blocked
  | { kind: "maxSkillFok"; skill?: string; category?: SkillCategory; fok: SkillFok } // school caps a skill/category at this fok — surfaced as a builder warning
  | { kind: "grantBackground"; background: string }
  | { kind: "resourcePerLevel"; resource: Resource; amount: number }
  | { kind: "derivedPerLevel"; target: DerivedKey; amount: number } // e.g. +N MME/AME each level (faith, Mágiatagadás)
  | { kind: "poolAccess"; pool: Pool }
  | { kind: "grantPoolPoints"; pool: Pool; amount: number } // KM grant, e.g. +Kegy for roleplay
  | { kind: "grantPoolFromStat"; pool: Pool; stat: Stat } // e.g. Pszi érzékenység → Psi = Int (one-time)
  | { kind: "statBonus"; stat: Stat; amount: number }
  | { kind: "combatBonus"; channel: CombatChannel; amount: number }
  | { kind: "derivedBonus"; target: DerivedKey; amount: number }
  | { kind: "tag"; tag: string }
  | { kind: "grantEquipment"; item: string; qty?: number }
  | { kind: "grantMoney"; amount: number }
  | { kind: "restriction"; text: string }
  | { kind: "note"; text: string };

// A grant may be scheduled for a later character level. Default atLevel = 1 (granted at creation).
export type GrantEntry = { atLevel?: number; effect: Effect };

export const grant = (effect: Effect, atLevel?: number): GrantEntry =>
  atLevel === undefined ? { effect } : { atLevel, effect };
