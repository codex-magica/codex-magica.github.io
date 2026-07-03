// Weapon rows on the sheet's Harcértékek panel: resolve the character's training for a weapon and
// compute the weapon's contribution to the combat values (book ch.16 Fegyverhasználat / Pusztakezes
// harc, ch.17 Képzetlen fegyverforgatás):
//   fok 0 — untrained: no weapon values, damage −1 per die, KÉ lost against a trained opponent
//   fok 1 — no penalties, but the weapon's own combat values are NOT applied yet
//   fok 2 — the weapon's KÉ/TÉ/VÉ/CÉ apply (category-level training suffices)
//   fok 3 — +2 KÉ, +5 TÉ/VÉ/CÉ (weapon-SPECIFIC: only the instance named for this weapon counts)
//   fok 4+ — +5 KÉ, +10 TÉ/VÉ/CÉ (not cumulative with fok 3); fok 5 also +1 Sp damage

import { WeaponInfo, WeaponValues } from "../data/weapons";
import { SKILL_BY_NAME } from "./skills";

// Minimal structural view of an owned skill instance (the engine's OwnedSkill satisfies it).
export interface SkillView {
  skill: string;
  subtype?: string;
  fok: number;
}

const FIST_GROUP = "Ököltávolságban alkalmazott fegyverek"; // governed by Pusztakezes harc, not Fegyverhasználat
const NO_BONUS = { ke: 0, te: 0, ve: 0, ce: 0 };
const TIER3 = { ke: 2, te: 5, ve: 5, ce: 5 };
const TIER4 = { ke: 5, te: 10, ve: 10, ce: 10 };

// Same normalization the skill catalog uses for branch children: a trailing "(...)" variant collapses
// to the base weapon.
const baseName = (n: string) => n.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
const wnum = (v: number | string | undefined): number => {
  if (typeof v === "number") return v;
  const m = String(v ?? "").match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export interface CombatMod {
  ke: number;
  te: number;
  ve: number;
  ce: number;
}

export interface WeaponUse {
  weapon: WeaponInfo;
  kind: "melee" | "ranged";
  fok: number; // resolved training (0 = untrained; category training counts up to 2)
  skillLabel: string; // "Fegyverhasználat" | "Pusztakezes harc" — for the row badge
  weaponVals: CombatMod; // the weapon's own combat values (zeroed below fok 2)
  masteryVals: CombatMod; // the fok-3+ professional bonus
  ke: number; // weaponVals + masteryVals — add to the character's combat values
  te: number;
  ve: number;
  ce: number;
  baseDmg: string; // the weapon's damage — for fists it scales with the Pusztakezes fok instead of the table
  dmgBonus: number; // fok-5 Fegyverhasználat mastery +1 Sp
}

export const weaponByName = (name: string): WeaponInfo | undefined => WeaponValues.find((w) => w.name === name);

// Untrained damage: −1 per die (book ch.17, "kockadobásonként 1 ponttal kevesebbet, de legalább 1 Sp")
// folded into an NkM(+X) dice expression; non-dice damage strings get a textual suffix instead.
const untrainedDmg = (dmg: string): string => {
  const m = dmg.trim().replace(/−/g, "-").match(/^(\d+)k(\d+)\s*([+-]\s*\d+)?$/);
  if (!m) return /k\d/.test(dmg) ? `${dmg} (−1/kocka)` : dmg; // no dice (e.g. "-", "0") → nothing to reduce
  const dice = parseInt(m[1], 10);
  const mod = (m[3] ? parseInt(m[3].replace(/\s/g, ""), 10) : 0) - dice;
  return `${m[1]}k${m[2]}${mod > 0 ? `+${mod}` : mod < 0 ? `−${-mod}` : ""}`;
};

export function resolveWeaponUse(weapon: WeaponInfo, skills: SkillView[]): WeaponUse {
  const isFist = weapon.subType === FIST_GROUP;
  const govern = isFist ? "Pusztakezes harc" : "Fegyverhasználat";
  const base = baseName(weapon.name);
  // The weapon's category = the Fegyverhasználat branch option listing it as a child.
  const category = SKILL_BY_NAME["Fegyverhasználat"]?.branch?.[0]?.options
    ?.find((o) => (o.children ?? []).some((c) => c.toLowerCase() === base))
    ?.name.toLowerCase();

  let specFok = 0; // instance named for THIS weapon (fok 3+ mastery)
  let catFok = 0; // instance at the weapon-family level (counts up to fok 2)
  for (const s of skills) {
    if (s.skill !== govern) continue;
    const sub = (s.subtype ?? "").trim().toLowerCase();
    if (isFist) specFok = Math.max(specFok, s.fok); // Pusztakezes harc has no per-weapon branching
    else if (sub === base) specFok = Math.max(specFok, s.fok);
    else if (category && sub === category) catFok = Math.max(catFok, s.fok);
  }
  const fok = Math.max(specFok, Math.min(catFok, 2));

  const bonus = fok >= 4 ? TIER4 : fok === 3 ? TIER3 : NO_BONUS;
  const values = fok >= 2; // the weapon's own combat values only apply from fok 2
  const weaponVals: CombatMod = values
    ? { ke: wnum(weapon.KÉ), te: wnum(weapon.TÉ), ve: wnum(weapon.VÉ), ce: wnum(weapon.CÉ) }
    : NO_BONUS;
  // Fist damage scales with the Pusztakezes fok (book ch.16: fok 1 → 1k3, fok 2 → 1k6, fok 5 → 1k10).
  // Untrained (any weapon): −1 damage per die, min 1 Sp (ch.17) — folded into the dice expression.
  const fistDmg = fok >= 5 ? "1k10" : fok >= 2 ? "1k6" : "1k3";
  const rawDmg = isFist ? fistDmg : weapon.damage;
  return {
    weapon,
    kind: weapon.type === "ranged" ? "ranged" : "melee",
    fok,
    skillLabel: govern,
    weaponVals,
    masteryVals: bonus,
    ke: weaponVals.ke + bonus.ke,
    te: weaponVals.te + bonus.te,
    ve: weaponVals.ve + bonus.ve,
    ce: weaponVals.ce + bonus.ce,
    baseDmg: fok === 0 ? untrainedDmg(rawDmg) : rawDmg,
    dmgBonus: !isFist && fok >= 5 ? 1 : 0,
  };
}
