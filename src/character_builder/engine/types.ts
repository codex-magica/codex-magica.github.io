import { Stats } from "../model/attributes";
import { CombatChannel, Pool } from "../model/effects";
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
  fok: number; // 0 for percentage skills
  percent?: number; // for percentage skills
  checkMod: number; // attribute-test modifier (or current percent for %-skills)
  difficulty: string;
}

export interface SpellView {
  name: string;
  pool: Pool;
  cost: number;
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
    kpBalance: number;
    magic: Partial<Record<Pool, { max: number }>>;
  };
  skills: OwnedSkill[];
  spells: SpellView[];
  tags: string[];
  money: number;
  inventory: InventoryItem[];
  provenance: Record<string, Contribution[]>;
  diagnostics: Diagnostic[];
}
