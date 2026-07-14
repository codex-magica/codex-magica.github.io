// Weapon rows on the sheet's Harcértékek panel: resolve the character's training for a weapon and
// compute the weapon's contribution to the combat values (book ch.16 Fegyverhasználat / Pusztakezes
// harc, ch.17 Képzetlen fegyverforgatás):
//   fok 0 — untrained: no weapon values, damage −1 per die, KÉ lost against a trained opponent
//   fok 1 — no penalties, but the weapon's own combat values are NOT applied yet
//   fok 2 — the weapon's KÉ/TÉ/VÉ/CÉ apply (category-level training suffices)
//   fok 3 — +2 KÉ, +5 TÉ/VÉ/CÉ (weapon-SPECIFIC: only the instance named for this weapon counts)
//   fok 4+ — +5 KÉ, +10 TÉ/VÉ/CÉ (not cumulative with fok 3); fok 5 also +1 Sp damage

import { WeaponInfo, WeaponValues, baseWeaponName } from "../data/weapons";
import { SKILL_BY_NAME } from "./skills";
import { CombatMod, MartialStyle, SWORDMASTER_WEAPONS, TRADITIONAL_WEAPONS, parseMartialSubtype, styleTeachesWeapon, techniquesFor, unarmedStyle } from "./martialArts";

// Minimal structural view of an owned skill instance (the engine's OwnedSkill satisfies it).
export interface SkillView {
  skill: string;
  subtype?: string;
  fok: number;
}

const FIST_GROUP = "Ököltávolságban alkalmazott fegyverek"; // governed by Pusztakezes harc, not Fegyverhasználat
const MARTIAL_GROUP = "Harcművész fegyverek"; // the traditional ten — governed by Harcművészet (ch.9)
const NO_BONUS = { ke: 0, te: 0, ve: 0, ce: 0 };
const TIER3 = { ke: 2, te: 5, ve: 5, ce: 5 };
const TIER4 = { ke: 5, te: 10, ve: 10, ce: 10 };

const baseName = (n: string) => baseWeaponName(n).toLowerCase();
const wnum = (v: number | string | undefined): number => {
  if (typeof v === "number") return v;
  const m = String(v ?? "").match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export type { CombatMod } from "./martialArts";

export interface WeaponUse {
  weapon: WeaponInfo;
  kind: "melee" | "ranged";
  fok: number; // resolved training (0 = untrained; category training counts up to 2)
  skillLabel: string; // "Fegyverhasználat" | "Pusztakezes harc" — for the row badge
  weaponVals: CombatMod; // the weapon's own combat values (zeroed below fok 2)
  masteryVals: CombatMod; // the fok-3+ professional bonus
  extras: { label: string; vals: CombatMod }[]; // stacking technique bonuses (Shien-su, Dhala-saa)
  ke: number; // weaponVals + masteryVals + extras — add to the character's combat values
  te: number;
  ve: number;
  ce: number;
  baseDmg: string; // the weapon's damage — for fists it scales with the Pusztakezes fok instead of the table
  dmgBonus: number; // fok-5 Fegyverhasználat mastery +1 Sp
}

export const weaponByName = (name: string): WeaponInfo | undefined => WeaponValues.find((w) => w.name === name);

// The built-in, non-removable first weapon row: bare hands (Pusztakezes harc governs it).
export const FIST = "pusztakezes harc";

// One row of the sheet's Harcértékek weapon list: the resolved training + the weapon-adjusted damage
// string + the calculator payload for the melee/ranged weapon modal.
export interface WeaponRowView {
  w: WeaponInfo;
  use: WeaponUse;
  dmg: string;
  modal:
    | { kind: "melee"; name: string; dmg: string; baseKE: number; baseTE: number; baseVE: number }
    | { kind: "ranged"; name: string; dmg: string; range?: string; baseCE: number };
}

// Build the weapon rows for the sheet: the fist row first (always), then the pinned weapons. Pure
// weapon-math — the melee damage bonus and the weapon-adjusted calculator base values live here, next
// to resolveWeaponUse, so the sheet component only renders.
export function buildWeaponRows(
  pinned: string[],
  skills: SkillView[],
  combat: { KÉ: number; TÉ: number; VÉ: number; CÉ: number },
  sebzesBonus: number
): WeaponRowView[] {
  return [FIST, ...pinned]
    .map((name) => weaponByName(name))
    .filter((w): w is WeaponInfo => w != null)
    .map((w) => {
      const use = resolveWeaponUse(w, skills);
      const melee = use.kind === "melee";
      const dmgPlus = use.dmgBonus + (melee ? sebzesBonus : 0);
      const dmg = `${use.baseDmg}${dmgPlus > 0 ? ` +${dmgPlus}` : ""}`;
      const modal = melee
        ? { kind: "melee" as const, name: w.name, dmg, baseKE: combat.KÉ + use.ke, baseTE: combat.TÉ + use.te, baseVE: combat.VÉ + use.ve }
        : { kind: "ranged" as const, name: w.name, dmg, range: w.range, baseCE: combat.CÉ + use.ce };
      return { w, use, dmg, modal };
    });
}

// "Pusztakezes harc 2. fok" would repeat the fist row's name — collapse to "2. fok" there.
export const masteryLabel = (r: WeaponRowView): string =>
  r.use.fok === 0 ? "képzetlen" : r.use.skillLabel.toLowerCase() === r.w.name.toLowerCase() ? `${r.use.fok}. fok` : `${r.use.skillLabel} ${r.use.fok}. fok`;

const USE_KEY = { KÉ: "ke", TÉ: "te", VÉ: "ve", CÉ: "ce" } as const;
export type CombatKey = keyof typeof USE_KEY;
export const weaponUseKey = (k: CombatKey) => USE_KEY[k];

// Breakdown lines the combat-info modal appends in weapon mode (weapon value + mastery bonus, itemized).
export function weaponExtraFor(row: WeaponRowView | undefined, k: string): { label: string; amount: number }[] | undefined {
  if (!row || !(k in USE_KEY)) return undefined;
  const uk = USE_KEY[k as CombatKey];
  const { use } = row;
  return [
    { label: row.w.name, amount: use.weaponVals[uk] },
    { label: `${use.skillLabel} ${use.fok}. fok`, amount: use.masteryVals[uk] },
    ...use.extras.map((e) => ({ label: e.label, amount: e.vals[uk] })),
  ];
}

// Grouped add-picker options; already-pinned weapons and the built-in fist row removed.
export const weaponPickerGroups = (pinned: string[]): { group: string; items: WeaponInfo[] }[] =>
  Array.from(new Set(WeaponValues.map((w) => w.subType)))
    .map((g) => ({
      group: g,
      items: WeaponValues.filter((w) => w.subType === g && w.name !== FIST && !pinned.includes(w.name)),
    }))
    .filter((g) => g.items.length > 0);

// Untrained damage: −1 per die (book ch.17, "kockadobásonként 1 ponttal kevesebbet, de legalább 1 Sp")
// folded into an NkM(+X) dice expression; non-dice damage strings get a textual suffix instead.
const untrainedDmg = (dmg: string): string => {
  const m = dmg.trim().replace(/−/g, "-").match(/^(\d+)k(\d+)\s*([+-]\s*\d+)?$/);
  if (!m) return /k\d/.test(dmg) ? `${dmg} (−1/kocka)` : dmg; // no dice (e.g. "-", "0") → nothing to reduce
  const dice = parseInt(m[1], 10);
  const mod = (m[3] ? parseInt(m[3].replace(/\s/g, ""), 10) : 0) - dice;
  return `${m[1]}k${m[2]}${mod > 0 ? `+${mod}` : mod < 0 ? `−${-mod}` : ""}`;
};

// The training a skill can provide for one weapon (or for the bare hands): the fok, plus the label and
// (for Harcművészet) the style whose values stand in for the "weapon" when fighting unarmed.
interface Training {
  fok: number;
  label: string;
  style?: MartialStyle;
}
const NO_TRAINING: Training = { fok: 0, label: "" };

// Fegyverhasználat (or Pusztakezes harc for the fists) — the ordinary governing skill.
function baseTraining(weapon: WeaponInfo, skills: SkillView[], isFist: boolean): Training {
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
  return { fok: Math.max(specFok, Math.min(catFok, 2)), label: govern };
}

// Harcművészet — governs the harcművész weapons AND the unarmed art (ch.16). A style-level instance
// ("Harcművészet (Avad-ka-kinito)") covers everything the style teaches but counts only up to fok 2;
// naming the weapon — or the unarmed art — is the fok-3 commitment that unlocks the higher bonuses.
function martialTraining(weapon: WeaponInfo, skills: SkillView[], isFist: boolean): Training {
  const base = baseName(weapon.name);
  let best = NO_TRAINING;
  for (const s of skills) {
    if (s.skill !== "Harcművészet") continue;
    const sub = parseMartialSubtype(s.subtype);
    if (sub.technique) continue; // Shien-su isn't a weapon or the unarmed art — it stacks on top, below
    // The fok-3 choice is "a weapon of the style, OR the unarmed art" (ch.16), and the subtype says
    // which: Harcművészet (weapon) IS that weapon's instance, Harcművészet (anything else — a style,
    // a school, "fegyvertelen") is the unarmed one. Either way the instance's full fok counts here.
    const committed = isFist ? sub.weapons.length === 0 : sub.weapons.includes(base);
    // Style level (or a subtype we can't read): covers everything the style teaches, but only up to fok 2.
    const styleLevel = (sub.styles.length > 0 || sub.bare) && (isFist || styleTeachesWeapon(sub, base));
    const fok = committed ? s.fok : styleLevel ? Math.min(s.fok, 2) : 0;
    const style = unarmedStyle(sub);
    // Higher fok wins; on a TIE keep whichever names a style — unarmed, its values beat a styleless one.
    if (fok === 0 || fok < best.fok || (fok === best.fok && best.style && !style)) continue;
    best = { fok, label: style ? `Harcművészet (${style.name})` : "Harcművészet", style };
  }
  return best;
}

export function resolveWeaponUse(weapon: WeaponInfo, skills: SkillView[]): WeaponUse {
  const isFist = weapon.subType === FIST_GROUP;
  const martialWeapon =
    weapon.subType === MARTIAL_GROUP ||
    [...SWORDMASTER_WEAPONS, ...TRADITIONAL_WEAPONS].some((w) => baseName(w) === baseName(weapon.name));

  // Two skills can govern the same weapon (a harcművész may also have Fegyverhasználat for it) — the
  // better training wins. On a tie the weapon's natural governor does: Harcművészet for the harcművész
  // arms and the bare hands (its style values beat the plain fist), Fegyverhasználat for the rest.
  const base = baseTraining(weapon, skills, isFist);
  const martial = martialTraining(weapon, skills, isFist);
  const preferMartial = isFist || martialWeapon;
  const t = martial.fok > base.fok || (martial.fok === base.fok && martial.fok > 0 && preferMartial) ? martial : base;
  const fok = t.fok;

  const bonus = fok >= 4 ? TIER4 : fok === 3 ? TIER3 : NO_BONUS;
  const values = fok >= 2; // the weapon's own combat values only apply from fok 2
  // Fighting unarmed in a style, the STYLE's values are the "weapon" values (ch.16, fok 2).
  const styleVals: CombatMod | undefined =
    isFist && t.style ? { ke: t.style.ke, te: t.style.te, ve: t.style.ve, ce: 0 } : undefined;
  const weaponVals: CombatMod = !values
    ? NO_BONUS
    : styleVals ?? { ke: wnum(weapon.KÉ), te: wnum(weapon.TÉ), ve: wnum(weapon.VÉ), ce: wnum(weapon.CÉ) };
  // Fist damage scales with the Pusztakezes fok (book ch.16: fok 1 → 1k3, fok 2 → 1k6, fok 5 → 1k10),
  // unless a Harcművészet style governs the bare hands — then the style's own damage applies from fok 2.
  // Untrained (any weapon): −1 damage per die, min 1 Sp (ch.17) — folded into the dice expression.
  const fistDmg = t.style && fok >= 2 ? t.style.damage : fok >= 5 ? "1k10" : fok >= 2 ? "1k6" : "1k3";
  const rawDmg = isFist ? fistDmg : weapon.damage;
  const isMartial = t === martial;
  // The kardművész techniques stack their OWN mastery tier on top of the blade's (ch.9: "a bónuszok
  // összeadódnak, s a választott fegyver harcértékéhez számítódnak"), each on the combat values it
  // governs — Shien-su on all of them, Dhala-saa on KÉ and VÉ only. Combat values only: no second +1 Sp.
  const extras = techniquesFor(weapon.name, skills).map(({ tech, fok: tf }) => {
    const tier = tf >= 4 ? TIER4 : tf === 3 ? TIER3 : NO_BONUS;
    const vals = { ...NO_BONUS };
    for (const k of tech.keys) vals[k] = tier[k];
    return { label: `${tech.name} ${tf}. fok`, vals };
  });
  const extraVals = extras.reduce(
    (a, e) => ({ ke: a.ke + e.vals.ke, te: a.te + e.vals.te, ve: a.ve + e.vals.ve, ce: a.ce + e.vals.ce }),
    { ...NO_BONUS }
  );
  return {
    weapon,
    kind: weapon.type === "ranged" ? "ranged" : "melee",
    fok,
    skillLabel: t.label || (isFist ? "Pusztakezes harc" : "Fegyverhasználat"),
    weaponVals,
    masteryVals: bonus,
    extras,
    ke: weaponVals.ke + bonus.ke + extraVals.ke,
    te: weaponVals.te + bonus.te + extraVals.te,
    ve: weaponVals.ve + bonus.ve + extraVals.ve,
    ce: weaponVals.ce + bonus.ce + extraVals.ce,
    baseDmg: fok === 0 ? untrainedDmg(rawDmg) : rawDmg,
    // fok 5 mastery: +1 Sp. Under Harcművészet that holds unarmed too (ch.16 fok 5); plain Pusztakezes
    // harc has no such bonus — its fists get the 1k10 die instead.
    dmgBonus: fok >= 5 && (isMartial || !isFist) ? 1 : 0,
  };
}
