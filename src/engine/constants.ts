import { Resource } from "../model/effects";

export const POINT_BUY_TOTAL = 135;
export const ATTR_MAX = 20; // a Tulajdonság abszolút maximuma (Adottsággal is)
export const BASE_KAP_PER_LEVEL = 50;
// The VÉ base (60) lives in model/combatInfo.ts (COMBAT_INFO.VÉ.base) — the combat formulas are
// data-driven off COMBAT_INFO so the engine and the sheet's breakdown share one source.

// KAP cost to buy one point of each resource.
export const KAP_RATE: Record<Resource, number> = {
  Kp: 1,
  Fp: 1,
  HM: 2,
  Psi: 2,
  Mana: 3,
  Kegy: 3,
};

// KAP cost to raise an attribute by 1 (later levels). TODO: confirm exact value.
export const ATTR_KAP_COST = 20;

// Skill-check modifier granted by owning a skill at a given fok (book ch.16).
export const FOK_CHECK_MOD: Record<number, number> = {
  0: 0,
  1: -1,
  2: 0,
  3: 1,
  4: 2,
  5: 3,
};

// MME/AME offset over the governing attribute. The existing app uses +0; the book may use +10.
// Kept as a constant so it is trivial to change once confirmed.
export const MAGIC_DEFENSE_OFFSET = 0;
