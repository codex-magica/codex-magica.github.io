// Layer 2 — the persisted character record. This is the ONLY thing saved/serialized. The sheet is
// derived from it. It stores decisions (an ordered per-level ledger), not computed results.

import { Stats } from "./attributes";
import { CombatChannel, Effect, Resource } from "./effects";
import { SkillFok, SkillInstanceRef } from "./common";
import { Companion } from "./companions";
import type { ClassDef } from "./classes/def";

export const SCHEMA_VERSION = 1;

export type VitalKey = "Ép" | "Fp" | "Mana" | "Psi" | "Kegy";

export interface InventoryItem {
  name: string;
  qty?: number;
  note?: string;
  equipped?: boolean;
}

// A transient status effect during play (Mérgezett, Kábult, Pszi pajzs …). Play-state, NOT part of the
// build ledger — it changes at the table, not when you spend points. `effects` is the same vocabulary
// the ledger and the KM adjustments use, so the engine folds a condition in exactly like any other
// modifier (see model/conditions for the book presets and the custom builder).
export interface CharacterCondition {
  id: string;
  name: string;
  note?: string;
  appliedAtLevel?: number;
  active?: boolean; // false = kept on the sheet but NOT applied (undefined = active, so old records still count)
  effects?: Effect[];
  preset?: string; // the ConditionPreset key it came from (undefined = custom)
  magnitude?: number; // the strength the player picked, for presets that take one (a shield's E)
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
  parent?: string; // two-tier branch (Fegyverhasználat): the category a specific weapon belongs to
  from?: number;
  to: number;
  teachingUpto?: SkillFok; // explicit oktatás override (otherwise resolved from class teaching)
}

export interface HmAssignment {
  channel: CombatChannel;
  amount: number;
}

export type StatIncreaseSource = "kap" | "km" | "age" | "race";

export interface StatIncrease {
  stat: keyof Stats;
  amount: number;
  source: StatIncreaseSource;
}

// The +1 attribute a fok-4 skill INSTANCE grants (multi-attribute skills only; single-attribute ones
// auto-apply in the engine). Identified by SkillInstanceRef (covers grants at fok 4 too, e.g. the
// wizard's Pszi, which have no purchase). Lives on the record (not a per-level ledger) — it's a
// per-instance choice, not a KAP spend.
export interface Fok4Bonus extends SkillInstanceRef {
  stat: keyof Stats;
}

// A committing "path" choice forced when a skill INSTANCE reaches a trigger fok (Pszi tudat/test at fok 3).
export interface SkillPathChoice extends SkillInstanceRef {
  trigger: string; // the FokTrigger label (e.g. "Pszi fa")
  value: string; // the chosen option (e.g. "tudat")
}

// Player-set attribute requirements for an open chooseAttrs branch (Művészetek). Per instance — NOT on
// the purchase, so it survives for granted/cross-level instances.
export interface SkillAttrChoice extends SkillInstanceRef {
  attrs: (keyof Stats)[];
}

export interface LevelRecord {
  level: number;
  allocations: KapAllocation[];
  skillPurchases: SkillPurchase[];
  hmAssignments: HmAssignment[]; // KAP-BOUGHT HM (Pontvásárlás) — each point paid at KAP_RATE.HM
  grantedHmAssignments?: HmAssignment[]; // free HM from skill grants, distributed in the Szintlépési nyereségek panel
  statIncreases: StatIncrease[];
  notes?: string;
}

// KM grants, outside the KAP economy (roleplay rewards, story events).
export interface Adjustment {
  id?: string; // stable key for the builder's per-row editing (ignored by derive)
  atLevel?: number;
  effects: Effect[];
  reason: string;
}

// Optional house rules chosen at character creation. Absent field = base rules; the record is only
// ever interpreted under the variant it was created with, so no value migration is ever needed.
export interface HouseRules {
  skillRework?: boolean; // percentage skills → fok-based + Éberség merge (homebrew/skillRework.ts)
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
  updatedAt?: number; // ms epoch of the last local edit (stamped on every save; dropped from exports)
  syncVc?: Record<string, number>; // version vector for the Drive sync: edits per device (dropped from exports)
  name: string;
  player?: string;
  concept?: string;
  notes?: string;

  identity: Identity;

  race: string;
  class: string;
  customClass?: ClassDef; // a KM-authored class carried on the record; used by derive when class === customClass.name
  houseRules?: HouseRules; // fixed at creation — selects which RulesDB variant derives this record
  selections: Record<string, string>; // choiceId → option name (class specialization tree)
  backgrounds: ChosenBackground[];
  grantedBgLevels?: Record<string, number>; // player-chosen level for a class/race-GRANTED background (free, e.g. Barbár Mágiatagadás "tetszőleges mértékű")

  pointBuy: Stats; // the 135 base allocation, each ≤ racial cap
  adottsag?: Partial<Record<keyof Stats, number>>; // points above the racial cap (1 KAP each)
  subtypeOverrides?: Record<string, string>; // rename a granted subtype, keyed by `skill|originalSubtype`
  fok4Bonuses?: Fok4Bonus[]; // the +1 attribute chosen for each fok-4 skill instance
  pathChoices?: SkillPathChoice[]; // committing path choices (Pszi tudat/test), per instance
  weapons?: string[]; // weapons pinned to the sheet's Harcértékek panel (names from the weapon table)
  activeWeapon?: string; // the pinned weapon currently "in hand" — the sheet's combat tiles show its adjusted values
  armor?: string; // the sheet's vért slot (name from data/armor.ts) — its MGT/SFÉ apply as play-state
  shield?: string; // the sheet's pajzs slot — VÉ (when trained) and MGT apply as play-state
  // Worn/doffed toggles (like a weapon's kézbevétel): false = on the sheet but not equipped — nothing
  // applies. Absent/true = worn (the conditions' `active` convention).
  armorActive?: boolean;
  shieldActive?: boolean;
  skillAttrChoices?: SkillAttrChoice[]; // chosen attribute requirements for open branches, per instance

  levels: LevelRecord[]; // the build ledger (ordered per-level decisions)
  kmAdjustments: Adjustment[];

  // ── play-state (separate from the ledger; mutated at the table, not when spending points) ──
  inventory: InventoryItem[];
  inventoryText?: string; // free-text equipment list (one item per line; lines starting with a number = qty)
  vitalsState: Partial<Record<VitalKey, number>>; // current Ép/Fp/Mana/Psi/Kegy
  conditions?: CharacterCondition[]; // active status effects
  companions?: Companion[]; // társ állatok (horses, dogs…) — independent creatures, not part of the build
  // Manual override of the Szakrális szférák a kegyelt has access to (a Kegyelt + Vallásismeret 3
  // character can cast prayers without being pap/paplovag). undefined = use the deity/rend defaults;
  // any array (incl. empty) = an explicit player-set list. Only meaningful for a kegyelt.
  sacredSpheres?: string[];
}

export const emptyLevel = (level: number): LevelRecord => ({
  level,
  allocations: [],
  skillPurchases: [],
  hmAssignments: [],
  statIncreases: [],
});

// The level ledger entry for `level`, or undefined. Centralizes the `levels.find(l => l.level === …)`
// lookup that was duplicated across the builder hook, the panels, and the engine.
export const getLevelRecord = (record: CharacterRecord, level: number): LevelRecord | undefined =>
  record.levels.find((l) => l.level === level);
