import { Stat, Stats } from "../model/attributes";
import { CombatChannel, Pool, Resource } from "../model/effects";
import { InventoryItem, VitalKey } from "../model/character";
import { Discount, SkillScope } from "./skillCost";

export interface Contribution {
  source: string;
  amount: number;
}

export type Severity = "error" | "warn" | "info";

// A special ability (tag grant), as surfaced on the sheet's Képességek panel. `source` is the
// human-readable origin ("Faj: Elf", "Kaszt: Harcos", "Háttér: …") the sheet groups by; `atLevel` (>1)
// is the level the ability activates at; `text` is custom (KM-authored) rules text — built-ins look
// theirs up in ABILITIES. The single shared shape: DeriveCtx.tags flows into DerivedCharacter.tags
// unchanged, and AbilityRows renders it.
export interface AbilityTag {
  name: string;
  source: string;
  atLevel?: number;
  text?: string;
}

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
  parent?: string; // two-tier branch (Fegyverhasználat): the category a specific weapon belongs to
  attrs?: Stat[]; // resolved attribute requirements (branch/category/chosen), overriding the skill default
  unmetAttrs?: Stat[]; // governing attrs below the requirement (10 + fok), ignoring this skill's own fok-4 +1
  placeholder?: boolean; // an unresolved grantSkillChoice (e.g. "első fegyver" awaiting a concrete weapon)
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
  domains?: string[]; // prayers only — the fohász's spheres, shown as initials on the sheet
}

export type DerivedKeyOut = "Ép" | "Fp" | "MME" | "AME" | "Sebzésbónusz" | "Mozgás";

// One KAP-relevant operation in the build ledger, as the engine actually charged it. The ledger view
// renders these directly — no string keys to reconstruct on the UI side.
export interface LedgerEntry {
  level: number;
  kind: "skill" | "alloc" | "hm" | "ghm" | "stat";
  // Within-level identity: alloc → the resource target; hm/ghm → the channel; stat → `${stat}:${source}`;
  // skill → the engine's stable instance key (matching is by `idx` though, not this).
  id: string;
  idx?: number; // skill entries: the purchase's position within that level's skillPurchases
  cost: number; // KAP charged (0 = free, e.g. granted HM, km/race stat increases)
  before: number; // the affected running value, before → after (alloc/hm re-based onto the final total)
  after: number;
}

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
  allowedSkills: { skill: string; subtype?: string }[]; // "may learn if the DM allows" (allowSkill grants)
  grantedSkills: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number }[]; // grant-only floor (level 1)
  // Skill floor at the START of each level (grants + all PRIOR levels), indexed by level−1. Editing level L
  // can't reduce a skill below floorByLevel[L-1].
  floorByLevel: { skill: string; subtype?: string; origSubtype?: string; fok: number; percent?: number }[][];
  // Non-variant purchases that raise nothing (to ≤ inherited) — auto-pruned so no phantom purchases linger.
  // `idx` pins the exact entry in that level's skillPurchases (same-key twins must not be co-deleted).
  redundantPurchases: { level: number; idx: number; skill: string; subtype?: string }[];
  teachingDiscounts: Discount[]; // raw active teacher discounts (subtype-aware) — for per-branch teacher/cost
  costMultipliers: (SkillScope & { factor: number })[]; // school Kp-cost penalties (Barbár ×1.5) — the UI must show the multiplied cost
  spells: SpellView[];
  // Special abilities (tag grants). See AbilityTag.
  tags: AbilityTag[];
  // Effective Szakrális szférák (a manual kegyelt override, else the deity/rend defaults) — drives the
  // Szakrális panel caption and the prayer sphere-gate (a Kis/Nagy Arkánum fohász is castable only if
  // it shares a sphere with these).
  spheres: string[];
  sphereDefaults: string[]; // the deity/rend-granted spheres, ignoring any override — for "reset to default"
  // Worn vért / carried pajzs, resolved against Vértviselet/Pajzshasználat (effective SFÉ/MGT/VÉ).
  // Their stat/VÉ effects are already folded into effectiveStats/combat; these views drive the panel.
  armorUse?: import("../model/armorUse").ArmorUse;
  shieldUse?: import("../model/armorUse").ShieldUse;
  grantedBackgrounds: string[]; // backgrounds conferred free by race/class (locked in the UI)
  money: number;
  inventory: InventoryItem[];
  provenance: Record<string, Contribution[]>;
  diagnostics: Diagnostic[];
  // Every KAP-relevant operation, in fold order — drives the ledger view.
  ledger: LedgerEntry[];
  // Resources granted by skills at their current fok (fok 3→+1, 4→+2, 5→+3), PER LEVEL (indexed by level−1) —
  // the amount scales with the skill's fok, so it grows as the skill is raised across levels. Drives the
  // Szintlépési nyereségek panel; HM grants are distributed via grantedHmAssignments, the rest fold into pools/Fp.
  resourceGrantsByLevel: { source: string; resource: Resource; amount: number }[][];
}
