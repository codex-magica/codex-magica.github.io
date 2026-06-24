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
  | { kind: "teachingDiscount"; skill?: string; category?: SkillCategory; uptoLevel: SkillFok }
  | { kind: "grantBackground"; background: string }
  | { kind: "resourcePerLevel"; resource: Resource; amount: number }
  | { kind: "poolAccess"; pool: Pool }
  | { kind: "grantPoolPoints"; pool: Pool; amount: number } // KM grant, e.g. +Kegy for roleplay
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
