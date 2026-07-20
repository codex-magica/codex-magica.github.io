// Armor & shield resolution for the sheet's Harcértékek panel (book ch.16 Vértviselet /
// Pajzshasználat, ch.21 armor tables):
//   MGT (Mozgásgátló Tényező) — subtracts from Ügyesség/Gyorsaság/Állóképesség (never below 5),
//     which cascades into KÉ/TÉ/VÉ/CÉ, Fp and Mozgás through the normal stat formulas.
//   Vértviselet — fok 2+: light MGT −1; fok 3: light −2 / heavy −1, SFÉ +1; fok 4: heavy −2,
//     SFÉ +2; fok 5: heavy −3, SFÉ +3. Rugalmas nehézvért needs fok 1, merev nehézvért fok 2.
//   Pajzshasználat — the shield's VÉ only applies when trained (fok 1+); fok 3/4/5: MGT −1/−2/−3.
//   Weapon piercing — melee canPierce + Fegyverhasználat fok 3/4/5: enemy armor resists with
//     −1/−2/−3 SFÉ; bows/crossbows: Átütés = the damage roll's dice count.

import { ArmorInfo, ArmorValues, ShieldInfo, ShieldValues } from "../data/armor";
import { SkillView, WeaponRowView } from "./weaponUse";

export type ArmorCategory = "Könnyűvértezet" | "Rugalmas nehézvért" | "Merev nehézvért";

// Book ch.16: light = non-metal; flexible heavy = ring/chain/scale (the clan vérts are leather-metal
// composites — flexible); rigid heavy = plate. Names match data/armor.ts.
const LIGHT = new Set(["fegyverkabát", "bőrpáncél", "keményített bőrvértezet"]);
const FLEXIBLE = new Set(["gyűrűs vértezet", "brigandin", "láncing", "sodronying", "pikkelyvért", "gladiátorvért", "kráni vért", "kardművész vért"]);

export const armorCategory = (name: string): ArmorCategory =>
  LIGHT.has(name) ? "Könnyűvértezet" : FLEXIBLE.has(name) ? "Rugalmas nehézvért" : "Merev nehézvért";

// Signed number with a true minus glyph (−4, not -4) — for sublines that interpolate raw numbers.
export const signedNum = (n: number): string => (n < 0 ? `−${-n}` : String(n));

export const armorByName = (name: string): ArmorInfo | undefined => ArmorValues.find((a) => a.name === name);
export const shieldByName = (name: string): ShieldInfo | undefined => ShieldValues.find((s) => s.name === name);

const fokOf = (skills: SkillView[], skill: string): number =>
  skills.reduce((a, s) => (s.skill === skill ? Math.max(a, s.fok) : a), 0);

export interface ArmorUse {
  armor: ArmorInfo;
  category: ArmorCategory;
  fok: number; // Vértviselet
  sfe: number; // effective (base + Vértviselet fok 3/4/5 → +1/+2/+3)
  baseSfe: number;
  mgt: number; // effective, ≤ 0 (base relieved by Vértviselet, never past 0)
  baseMgt: number;
  untrained: boolean; // heavy armor below the required fok (rugalmas: 1, merev: 2) — book penalties apply
  worn?: boolean; // set by the engine view: false = on the sheet but doffed (nothing applies)
}

export function resolveArmorUse(armor: ArmorInfo, skills: SkillView[]): ArmorUse {
  const category = armorCategory(armor.name);
  const fok = fokOf(skills, "Vértviselet");
  const light = category === "Könnyűvértezet";
  const relief = light
    ? fok >= 3 ? 2 : fok >= 2 ? 1 : 0
    : fok >= 5 ? 3 : fok >= 4 ? 2 : fok >= 3 ? 1 : 0;
  return {
    armor,
    category,
    fok,
    sfe: armor.SFÉ + (fok >= 3 ? fok - 2 : 0),
    baseSfe: armor.SFÉ,
    mgt: Math.min(0, armor.MGT + relief),
    baseMgt: armor.MGT,
    untrained: !light && fok < (category === "Rugalmas nehézvért" ? 1 : 2),
  };
}

export interface ShieldUse {
  shield: ShieldInfo;
  fok: number; // Pajzshasználat
  ve: number; // the VÉ that applies in melee (0 when untrained)
  veText: string; // the table value as written ("35", "30/40")
  mgt: number; // effective, ≤ 0
  baseMgt: number;
  untrained: boolean; // no Pajzshasználat — the MGT still applies but the VÉ doesn't
  worn?: boolean; // set by the engine view: false = on the sheet but doffed (nothing applies)
}

export function resolveShieldUse(shield: ShieldInfo, skills: SkillView[]): ShieldUse {
  const fok = fokOf(skills, "Pajzshasználat");
  const veNum = typeof shield.VÉ === "number" ? shield.VÉ : parseInt(String(shield.VÉ), 10) || 0;
  const relief = fok >= 5 ? 3 : fok >= 4 ? 2 : fok >= 3 ? 1 : 0;
  return {
    shield,
    fok,
    ve: fok >= 1 ? veNum : 0,
    veText: String(shield.VÉ),
    mgt: Math.min(0, shield.MGT + relief),
    baseMgt: shield.MGT,
    untrained: fok < 1,
  };
}

// The stats an armor's/shield's MGT drags down (book ch.21), never below 5.
export const MGT_STATS = ["Ügyesség", "Gyorsaság", "Állóképesség"] as const;

// The in-hand weapon's SFÉ-negation — shown only when it exists (canPierce + the training to use it).
export interface PierceInfo {
  label: string; // "SFÉ-átütés" (melee mastery) | "Átütés" (bow/crossbow inherent)
  value: string;
  hint: string;
}

export function pierceFor(row: WeaponRowView | undefined): PierceInfo | undefined {
  if (!row || !row.w.canPierce) return undefined;
  if (row.use.kind === "ranged") {
    // Bows/crossbows: Átütés = the damage dice count (+1 with páncéltörő bolts — a table footnote).
    const m = row.w.damage.match(/(\d+)\s*k/);
    if (!m) return undefined;
    return { label: "Átütés", value: m[1], hint: "A lövedék ennyi ponttal csökkentett SFÉ-vel szemben sebez (páncéltörő lövedékkel +1)." };
  }
  // Melee: the fok 3/4/5 Fegyverhasználat exploit — enemy armor resists with −1/−2/−3 SFÉ.
  if (row.use.fok < 3) return undefined;
  const n = Math.min(row.use.fok - 2, 3);
  return { label: "SFÉ-átütés", value: `−${n}`, hint: "Az ellenfél páncélja ennyivel csökkentett SFÉ-vel áll ellen a csapásoknak." };
}
