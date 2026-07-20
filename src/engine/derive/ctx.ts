// DeriveCtx — the shared mutable state threaded through the derivation phases (baseStats →
// activations → levelFold → finalize). createCtx initializes every accumulator exactly as the
// original single-function engine did; the phase modules mutate it in order.

import { RulesDB } from "../../model/rulesDb";
import { CharacterRecord, InventoryItem } from "../../model/character";
import { Stat, Stats } from "../../model/attributes";
import { CombatChannel, Effect, Pool, Resource } from "../../model/effects";
import { RaceDef } from "../../model/races";
import { Discount, SkillScope } from "../skillCost";
import { AbilityTag, Contribution, Diagnostic, LedgerEntry, Severity } from "../types";

export type OwnedMap = Record<string, { skill: string; subtype?: string; parent?: string; attrs?: Stat[]; placeholder?: boolean; fok: number; percent: number; origSubtype?: string; variantId?: string }>;

export const POOLS: Pool[] = ["Mana", "Psi", "Kegy"];

// Element shape of the grant/floor skill snapshots (grantedSkillsSnapshot, floorSnapshots).
export type SkillSnapshot = { skill: string; subtype?: string; origSubtype?: string; fok: number; percent: number }[];

export interface DeriveCtx {
  db: RulesDB;
  rec: CharacterRecord;

  diagnostics: Diagnostic[];
  provenance: Record<string, Contribution[]>;
  diag: (severity: Severity, message: string, atLevel?: number) => void;
  addProv: (key: string, source: string, amount: number) => void;

  // ── 1. Base attributes ─────────────────────────────────────────────────────
  race: RaceDef | undefined;
  base: Stats;
  adottsagPoints: number;

  // ── 2/3. Background activations + grants flattened by level ────────────────
  perLevelEffects: { effect: Effect; source: string; level: number }[];
  bgCostAtLevel: Record<number, number>;
  staticPerLevel: { resource: string; amount: number; fromLevel: number }[];
  staticDerivedPerLevel: { target: string; amount: number; fromLevel: number }[];
  seenBg: Record<string, boolean>;
  grantedBg: Record<string, boolean>; // backgrounds conferred via grantBackground (race/class)

  // ── Accumulators for the per-level fold ────────────────────────────────────
  effective: Stats;
  combatAcc: Record<CombatChannel, number>;
  derivedBonus: Record<string, number>;
  // Snapshot of the three accumulators as they stood BEFORE the play-state conditions were folded in
  // (set only when the character has any). finalize re-bases the build ledger onto these, so a
  // temporary condition never rewrites what the character actually bought.
  preConditions?: { effective: Stats; combatAcc: Record<CombatChannel, number>; derivedBonus: Record<string, number> };
  fpGains: number;
  poolMax: Record<Pool, number>;
  poolExists: Record<Pool, boolean>;
  owned: OwnedMap;
  grantedFokOf: Record<string, number>; // key → highest GRANTED fok (grants don't need prereqs)
  tags: AbilityTag[]; // special abilities, with their origin/level (and custom rules text on KM grants)
  spheres: Set<string>; // szakrális szférák the deity/rend grants — gates Kis/Nagy Arkánum fohászok
  money: number;
  inventory: InventoryItem[];
  discounts: Discount[];
  costMultipliers: (SkillScope & { factor: number })[]; // e.g. ×1.5 Kp
  skillBans: (SkillScope & { source: string })[]; // schools that can't learn X → warning
  fokCaps: (SkillScope & { fok: number })[]; // schools that cap X at a fok → warning
  allowedSkills: { skill: string; subtype?: string }[]; // "may learn if DM allows" (allowSkill)
  kapBalance: number; // skills (1 Kp = 1 KAP), HM/Fp/Mana/Psi/Kegy and attribute buys all draw from this
  kapIncomeByLevel: number[];
  kapBalanceByLevel: number[];
  hmGrantedByLevel: number[]; // free HM (from skills) per level — assignable at no cost
  ledger: LedgerEntry[]; // every KAP-relevant op, in fold order (for the ledger view)
  resourceGrantsByLevel: { source: string; resource: Resource; amount: number }[][]; // skill-fok grants per level
  cumulativeBgCost: number;

  // ── Per-level fold snapshots / one-time trackers ────────────────────────────
  // Snapshot of skills owned purely from grants at level 1 (the floor the level-up UI can't go below).
  grantedSkillsSnapshot: SkillSnapshot;
  // Owned skills at the START of EACH level (grants + every PRIOR level's purchases). Editing level L can't
  // reduce a skill below floorSnapshots[L-1] — you can't un-learn what earlier levels already locked in.
  floorSnapshots: SkillSnapshot[];
  // Non-variant skill purchases that raise nothing (to ≤ inherited fok) — phantom no-ops to be auto-pruned.
  // `idx` = position within the level's skillPurchases: the prune must target exactly this entry — two
  // same-key purchases can coexist (subtype renamed onto a twin), and only the no-op one may be dropped.
  redundantPurchases: { level: number; idx: number; skill: string; subtype?: string }[];
  // Skills that already received their one-time fok-4 attribute bonus (so it applies exactly once).
  fok4Bonused: Set<string>;
  fok4StatOfSkill: Record<string, Set<string>>; // per skill: stats already +1'd (repeat = warning)
}

export function createCtx(db: RulesDB, rec: CharacterRecord): DeriveCtx {
  const diagnostics: Diagnostic[] = [];
  const provenance: Record<string, Contribution[]> = {};
  return {
    db,
    rec,
    diagnostics,
    provenance,
    diag: (severity, message, atLevel) => {
      diagnostics.push({ severity, message, atLevel });
    },
    addProv: (key, source, amount) => {
      if (!provenance[key]) provenance[key] = [];
      provenance[key].push({ source, amount });
    },

    race: db.races[rec.race],
    base: { ...rec.pointBuy },
    adottsagPoints: 0,

    perLevelEffects: [],
    bgCostAtLevel: {},
    staticPerLevel: [],
    staticDerivedPerLevel: [],
    seenBg: {},
    grantedBg: {},

    // `effective` is re-seeded to { ...base } at the end of the base-attribute phase, once base is final.
    effective: { ...rec.pointBuy },
    combatAcc: { KÉ: 0, TÉ: 0, VÉ: 0, CÉ: 0 },
    derivedBonus: { Ép: 0, Fp: 0, MME: 0, AME: 0, Sebzésbónusz: 0 },
    fpGains: 0,
    poolMax: { Mana: 0, Psi: 0, Kegy: 0 },
    poolExists: { Mana: false, Psi: false, Kegy: false },
    owned: {},
    grantedFokOf: {},
    tags: [],
    spheres: new Set(),
    money: 0,
    inventory: rec.inventory.slice(),
    discounts: [],
    costMultipliers: [],
    skillBans: [],
    fokCaps: [],
    allowedSkills: [],
    kapBalance: 0,
    kapIncomeByLevel: [],
    kapBalanceByLevel: [],
    hmGrantedByLevel: [],
    ledger: [],
    resourceGrantsByLevel: [],
    cumulativeBgCost: 0,

    grantedSkillsSnapshot: [],
    floorSnapshots: [],
    redundantPurchases: [],
    fok4Bonused: new Set<string>(),
    fok4StatOfSkill: {},
  };
}
