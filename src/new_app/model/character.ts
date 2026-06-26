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
  equipped?: boolean;
}

// A transient status effect during play (Mérgezett, Szédült, Bénult …). Play-state, NOT part of the
// build ledger — it changes at the table, not when you spend points.
export interface CharacterCondition {
  id: string;
  name: string;
  note?: string;
  appliedAtLevel?: number;
}

export interface ChosenBackground {
  background: string;
  source: "chosen" | "granted";
  acquiredAtLevel: number; // 1 = at creation; cost applies from this level onward
  level?: number; // for ranged backgrounds (Vagyon, Manalátó…) the chosen magnitude = KAP cost
  option?: string; // a sub-choice, e.g. which attribute Adottság raises
}

// One KAP allocation: buy `points` of `target`. KAP spent = points × KAP_RATE[target].
export interface KapAllocation {
  target: Resource;
  points: number;
}

// A skill bought/raised this level. `to` is the target fok/percent; `from` is optional — when omitted
// the engine uses whatever is already owned (grants + earlier purchases). For a branched variant
// (e.g. a second weapon specialized from a sibling), `from` is the branch fok inherited for free.
// `id` makes a user-added variant identifiable while its subtype is being edited.
export interface SkillPurchase {
  id?: string;
  skill: string;
  subtype?: string;
  from?: number;
  to: number;
  teachingUpto?: SkillFok; // explicit oktatás override (otherwise resolved from class teaching)
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

  pointBuy: Stats; // the 135 base allocation, each ≤ racial cap
  adottsag?: Partial<Record<keyof Stats, number>>; // points above the racial cap (1 KAP each)
  subtypeOverrides?: Record<string, string>; // rename a granted subtype, keyed by `skill|originalSubtype`

  levels: LevelRecord[]; // the build ledger (ordered per-level decisions)
  kmAdjustments: Adjustment[];

  // ── play-state (separate from the ledger; mutated at the table, not when spending points) ──
  inventory: InventoryItem[];
  vitalsState: Partial<Record<VitalKey, number>>; // current Ép/Fp/Mana/Psi/Kegy
  conditions?: CharacterCondition[]; // active status effects
}

export const emptyLevel = (level: number): LevelRecord => ({
  level,
  allocations: [],
  skillPurchases: [],
  hmAssignments: [],
  statIncreases: [],
});
