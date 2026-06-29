import { Stats } from "../model/attributes";
import { CombatChannel, Pool, Resource } from "../model/effects";
import { InventoryItem, VitalKey } from "../model/character";

export interface Contribution {
  source: string;
  amount: number;
}

export type Severity = "error" | "warn" | "info";

export interface Diagnostic {
  severity: Severity;
  message: string;
  atLevel?: number;
}

export interface OwnedSkill {
  skill: string;
  subtype?: string;
  origSubtype?: string; // original granted subtype (the stable key for renaming)
  variantId?: string; // set on user-added branch instances (so they never collide with the trunk)
  fok: number; // 0 for percentage skills
  percent?: number; // for percentage skills
  checkMod: number; // attribute-test modifier (or current percent for %-skills)
  difficulty: string;
}

export interface SpellView {
  name: string;
  school: string;
  category: string;
  pool: Pool;
  cost: number;
  castingTime: string;
  known: boolean;
  castableNow: boolean;
}

export type DerivedKeyOut = "Ép" | "Fp" | "MME" | "AME" | "Sebzésbónusz" | "Mozgás";

export interface DerivedCharacter {
  level: number;
  baseStats: Stats;
  effectiveStats: Stats;
  combat: Record<CombatChannel, number>;
  derived: Record<DerivedKeyOut, number>;
  vitals: Record<VitalKey, { current: number; max: number }>;
  pools: {
    kapIncomeByLevel: number[];
    kapBalanceByLevel: number[];
    hmGrantedByLevel: number[];
    magic: Partial<Record<Pool, { max: number }>>;
  };
  skills: OwnedSkill[];
  grantedSkills: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number }[]; // grant-only floor
  teaching: Record<string, number>; // skill name → teacher (oktatás) level available
  spells: SpellView[];
  tags: string[];
  grantedBackgrounds: string[]; // backgrounds conferred free by race/class (locked in the UI)
  money: number;
  inventory: InventoryItem[];
  provenance: Record<string, Contribution[]>;
  diagnostics: Diagnostic[];
  // KAP charged per ledger operation, keyed `L{lvl}:{kind}:{id}` (skill/alloc/hm/stat) — for the ledger view.
  ledgerCosts: Record<string, number>;
  // The running value an operation changed, before → after (same keys as ledgerCosts).
  ledgerDelta: Record<string, { before: number; after: number }>;
  // Per-level resources granted by skills at their current fok (fok 3→+1, 4→+2, 5→+3), for the last level —
  // e.g. Harctéri gyakorlat (4. fok) → +2 HM/szint. Drives the Szintlépési nyereségek panel. HM grants are
  // distributed via the per-level grantedHmAssignments; the rest already fold into the pools/Fp totals.
  resourceGrants: { source: string; resource: Resource; amount: number }[];
}
