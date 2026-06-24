// Layer 2 — the persisted character record. This is the ONLY thing saved/serialized. The sheet is
// derived from it. It stores decisions (an ordered per-level ledger), not computed results.

import { Stats } from "./attributes";
import { CombatChannel, Effect, Resource } from "./effects";
import { SkillFok } from "./common";

export const SCHEMA_VERSION = 1;

export type VitalKey = "Ép" | "Fp" | "Mana" | "Psi" | "Kegy";

export interface InventoryItem {
  name: string;
  qty?: number;
  note?: string;
}

export interface ChosenBackground {
  background: string;
  source: "chosen" | "granted";
  acquiredAtLevel: number; // 1 = at creation; cost applies from this level onward
}

// One KAP allocation: buy `points` of `target`. KAP spent = points × KAP_RATE[target].
export interface KapAllocation {
  target: Resource;
  points: number;
}

// A skill bought/raised this level. from = current owned fok/percent (0 = unowned). Order matters.
export interface SkillPurchase {
  skill: string;
  subtype?: string;
  from: number;
  to: number;
  teachingUpto?: SkillFok; // an oktatás bonus applies up to this fok
}

export interface HmAssignment {
  channel: CombatChannel;
  amount: number;
}

export type StatIncreaseSource = "kap" | "skillFok4" | "km" | "age" | "race";

export interface StatIncrease {
  stat: keyof Stats;
  amount: number;
  source: StatIncreaseSource;
  refSkill?: string; // for skillFok4: which skill triggered it
}

export interface LevelRecord {
  level: number;
  allocations: KapAllocation[];
  skillPurchases: SkillPurchase[];
  hmAssignments: HmAssignment[];
  statIncreases: StatIncrease[];
  notes?: string;
}

// KM grants, outside the KAP economy (roleplay rewards, story events).
export interface Adjustment {
  atLevel?: number;
  effects: Effect[];
  reason: string;
}

export interface Identity {
  alignment?: string;
  secondaryAlignment?: string;
  religion?: string;
  homeland?: string;
  sex?: "male" | "female";
  ageCategory?: string;
}

export interface CharacterRecord {
  schemaVersion: number;
  id: string;
  name: string;
  player?: string;
  concept?: string;
  notes?: string;

  identity: Identity;

  race: string;
  class: string;
  selections: Record<string, string>; // choiceId → option name (class specialization tree)
  backgrounds: ChosenBackground[];

  pointBuy: Stats;

  levels: LevelRecord[];
  kmAdjustments: Adjustment[];

  inventory: InventoryItem[];
  vitalsState: Partial<Record<VitalKey, number>>;
}

export const emptyLevel = (level: number): LevelRecord => ({
  level,
  allocations: [],
  skillPurchases: [],
  hmAssignments: [],
  statIncreases: [],
});
