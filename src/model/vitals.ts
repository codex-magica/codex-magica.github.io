// Single source of truth for the five vitals/resource pools: their display label, the css token
// suffix used by the keypad calculators, the Chakra colour token for the progress bar, and (for the
// magic pools) the unit shown in spell tables. The sheet, the vitals card and the point-buy panel
// previously each hand-maintained parallel slices of this.

import { VitalKey } from "./character";

export interface VitalMeta {
  key: VitalKey;
  label: string;
  kind: string; // "hp" | "fp" | "mana" | "kegy" | "pszi"
  token: string; // Chakra colour token for the bar fill
  unit?: string; // pool unit for spell tables (Mp / Ψp / Kp); only the magic pools have one
}

export const VITALS: VitalMeta[] = [
  { key: "Ép", label: "Életpont", kind: "hp", token: "vitHp" },
  { key: "Fp", label: "Fájdalompont", kind: "fp", token: "vitFp" },
  { key: "Mana", label: "Mana", kind: "mana", token: "vitMana", unit: "Mp" },
  { key: "Kegy", label: "Kegypont", kind: "kegy", token: "vitKegy", unit: "Kp" },
  { key: "Psi", label: "Pszi", kind: "pszi", token: "vitPszi", unit: "Ψp" },
];

// kind → bar colour token (e.g. "hp" → "vitHp")
export const VIT_TOKEN: Record<string, string> = Object.fromEntries(VITALS.map((v) => [v.kind, v.token]));

// pool name → unit label (e.g. "Mana" → "Mp"). Keyed by the pool/VitalKey string.
export const POOL_UNIT: Record<string, string> = Object.fromEntries(
  VITALS.filter((v) => v.unit).map((v) => [v.key, v.unit as string])
);
