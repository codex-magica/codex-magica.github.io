// A permissive structural supertype of the various book spell/prayer/psi info shapes (BardMagicInfo,
// PrayerInfo, PsiInfo, FireMagicInfo, …). The compendium table adapters and the spell-requirement
// builder are generic over all of them, so they accept this widened view instead of `any`. Every
// per-family interface is structurally assignable to it (all fields optional except `name`).
export interface SpellLike {
  name: string;
  type?: string;
  source?: string;
  cost?: string;
  castingTime?: string;
  range?: string;
  duration?: string;
  level?: number;
  domains?: string[];
  save?: string | string[];
  erosseg?: string | number;
  incubationPeriod?: string;
  burnDuration?: string;
  size?: string | number;
  combatModifier?: string;
  ingredientsCost?: string | number;
  sellPrice?: string | number;
  special?: string;
  description: string | string[];
}
