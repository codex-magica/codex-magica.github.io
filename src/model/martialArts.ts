// Harcművészet (book ch.16 "Harcművészet", ch.9 "Harcművész stílusok" / "A harcművész fegyvertára").
//
// The skill is taken PER STYLE — "Harcművészet (Avad-ka-kinito) 2. fok" — and at that level it covers
// the whole style: every weapon the style teaches AND the unarmed technique. From fok 3 the character
// must commit to ONE of them: a weapon of the style, or the unarmed art.
//
// The SUBTYPE is what names that commitment, and one instance means one thing:
//   Harcművészet (<weapon>)  → that weapon        — "Harcművészet 4. fok (tonfa)"
//   Harcművészet (<anything else>) → the unarmed art, in that style — "Harcművészet (Avad-ka-kinito) 4. fok"
// A character who masters both keeps two instances, one of each. Below fok 3 a style instance still
// covers the weapons it teaches (capped at fok 2, exactly like a Fegyverhasználat category).
//
// The subtype stays FREE TEXT — styles and schools are open-ended, a KM invents one and the sheet must
// still work — so we parse it leniently rather than enumerating: an unreadable subtype is treated as a
// style (i.e. the unarmed art), never as nothing.

import { WeaponValues, baseWeaponName } from "../data/weapons";

export interface MartialStyle {
  name: string;
  element: string;
  // The style's own combat values — at fok 2+ these ARE the unarmed "weapon values" (ch.16 fok 2:
  // "már megkapja a fegyver VAGY A STÍLUS harcértékeit"). No CÉ: the styles are melee only.
  ke: number;
  te: number;
  ve: number;
  damage: string; // the style's unarmed damage, replacing the plain Pusztakezes fist progression
  signature?: string; // a weapon the style teaches beyond the traditional ten
}

// ch.9 "Harcművész stílusok" — the four Tiadlan/Niare schools.
export const MARTIAL_STYLES: MartialStyle[] = [
  { name: "Shien-ka-to", element: "Tűz", ke: 10, te: 15, ve: 8, damage: "1k10" },
  { name: "Dart-nid-kinito", element: "Víz", ke: 7, te: 10, ve: 19, damage: "1k6+1" },
  { name: "Avad-ka-kinito", element: "Föld", ke: 5, te: 19, ve: 5, damage: "1k10+2" },
  { name: "Nisen-nid-to", element: "Levegő", ke: 11, te: 13, ve: 14, damage: "1k6+2", signature: "Nisen-kard" },
];

// The traditional ten (ch.9 "A harcművész fegyvertára") — every style teaches these, so a style-level
// instance covers them (capped at fok 2). "Botok" is one of the ten but two table rows.
export const TRADITIONAL_WEAPONS = [
  "hollószárnyak", "mesterkard", "sryn-tőr", "hosszú bot", "rövid bot", "tonfa",
  "holdsarló", "nunchaku", "vaskígyó", "két-, illetve háromrészes bot", "tigriskarmok",
];
// Kardművész blades: Harcművészet governs them ("forgatásukhoz fegyverhasználat képzettség nem
// szükséges"), but they belong to no style — they only match when NAMED in the subtype.
export const SWORDMASTER_WEAPONS = ["Slan kard", "Slan tőr", "Slan csatakard"];

// ── The two kardművész techniques (ch.9) ─────────────────────────────────────
// Both are exceptions to everything above: neither a style nor a weapon, but a SEPARATE Harcművészet
// instance taken on top of the blade instance(s) it builds on. Its bonuses ADD to theirs on the blade
// in hand ("a bónuszok összeadódnak, s a választott fegyver harcértékéhez számítódnak"), it can only be
// learned as far as those blades go ("erős előkövetelmény"), and it must never read as the unarmed art.
export interface MartialTechnique {
  name: string;
  requires: string[]; // the Harcművészet (blade) instances it builds on — ALL needed, and they cap its fok
  weapons: string[]; // the blades it actually applies to
  keys: (keyof CombatMod)[]; // which combat values it adds to
  costFactor?: number; // Kp multiplier for this instance (Dhala-saa: half price)
}
export interface CombatMod { ke: number; te: number; ve: number; ce: number }

export const TECHNIQUES: MartialTechnique[] = [
  // "A harc útját járó" irányzat: the two blades at once — the most complete form of the art.
  { name: "Shien-su", requires: ["Slan kard", "Slan tőr"], weapons: ["Slan kard", "Slan tőr"], keys: ["ke", "te", "ve", "ce"] },
  // Udvari irányzat: the one-handed art. Adds to KÉ and VÉ ONLY, and costs half the usual Kp.
  { name: "Dhala-saa", requires: ["Slan kard"], weapons: ["Slan kard"], keys: ["ke", "ve"], costFactor: 0.5 },
];

const norm = (s: string) => baseWeaponName(s).trim().toLowerCase();

// Free-text subtype → what it grants. Split on the separators players actually type: parens, slashes,
// commas, dashes between words. Each token is matched against the styles, the weapon table, and the
// unarmed keywords; a subtype may name several things ("Avad-ka-kinito (tonfa)" = style + weapon).
// "és" is in here because the book itself writes the Shien-su prerequisite as one instance —
// "Harcművészet (Slan kard és Slan tőr)" — even though our convention is one instance per weapon.
const SEP = /[(),/;+|]|\s+(?:és|[–—-])\s+/;
const UNARMED_WORDS = ["fegyvertelen", "puszta kéz", "pusztakéz", "pusztakezes", "pusztakezes harc", "fegyver nélkül", "ökölharc"];
const WEAPON_NAMES = new Set(WeaponValues.map((w) => norm(w.name)));

export interface MartialSubtype {
  styles: MartialStyle[]; // named styles (each covers its weapons + unarmed, up to fok 2)
  weapons: string[]; // explicitly named weapons (normalized) — the fok-3+ commitment
  unarmed: boolean; // the unarmed art was explicitly named — the other fok-3+ commitment
  technique?: MartialTechnique; // Shien-su / Dhala-saa — an add-on, not a weapon or the unarmed art
  bare: boolean; // nothing recognizable (incl. an empty subtype) → treat as an unspecialized style
}

export function parseMartialSubtype(subtype: string | undefined): MartialSubtype {
  const tokens = (subtype ?? "").split(SEP).map((t) => t.trim()).filter(Boolean);
  const styles: MartialStyle[] = [];
  const weapons: string[] = [];
  let unarmed = false;
  let technique: MartialTechnique | undefined;
  for (const t of tokens) {
    const n = norm(t);
    const style = MARTIAL_STYLES.find((s) => norm(s.name) === n);
    if (style) { styles.push(style); continue; }
    const tech = TECHNIQUES.find((x) => norm(x.name) === n);
    if (tech) { technique = tech; continue; }
    if (UNARMED_WORDS.includes(n)) { unarmed = true; continue; }
    if (WEAPON_NAMES.has(n)) weapons.push(n);
  }
  return { styles, weapons, unarmed, technique, bare: !technique && styles.length === 0 && weapons.length === 0 && !unarmed };
}

export interface SkillLike { skill: string; subtype?: string; fok: number }

const martialFok = (skills: SkillLike[], match: (s: MartialSubtype) => boolean) =>
  skills.reduce((best, s) => (s.skill === "Harcművészet" && match(parseMartialSubtype(s.subtype)) ? Math.max(best, s.fok) : best), 0);

// The technique add-ons active for the blade in hand: each technique's own fok, capped by the blade
// instances it builds on (missing any ⇒ the prerequisite fails and it grants nothing).
export function techniquesFor(weapon: string, skills: SkillLike[]): { tech: MartialTechnique; fok: number }[] {
  const out: { tech: MartialTechnique; fok: number }[] = [];
  for (const tech of TECHNIQUES) {
    if (!tech.weapons.some((w) => norm(w) === norm(weapon))) continue;
    const own = martialFok(skills, (sub) => sub.technique?.name === tech.name);
    if (own === 0) continue;
    const bases = tech.requires.map((b) => martialFok(skills, (sub) => sub.weapons.includes(norm(b))));
    const fok = Math.min(own, ...bases);
    if (fok > 0) out.push({ tech, fok });
  }
  return out;
}

// Kp multiplier for a Harcművészet instance — Dhala-saa is taught for half the usual price (ch.9).
export const martialCostFactor = (subtype: string | undefined): number =>
  parseMartialSubtype(subtype).technique?.costFactor ?? 1;

// Does a style-level instance (or a bare one) cover this weapon? Every style teaches the traditional
// ten; a style's signature weapon (Nisen-kard) only counts for that style.
export function styleTeachesWeapon(sub: MartialSubtype, weapon: string): boolean {
  const n = norm(weapon);
  if (TRADITIONAL_WEAPONS.some((w) => norm(w) === n)) return true;
  return sub.styles.some((s) => s.signature != null && norm(s.signature) === n);
}

// The style whose values the unarmed row should use (the first named one) — undefined if the subtype
// names no style, in which case the plain fist progression stands in.
export const unarmedStyle = (sub: MartialSubtype): MartialStyle | undefined => sub.styles[0];

// Datalist suggestions for the Harcművészet subtype field. Styles first (the fok 1–2 form), then the
// fok-3+ commitments: the unarmed art, the traditional ten + the kardművész and signature blades, and
// finally every other weapon — a KM's style may teach anything, and a typo would silently cost the
// character its bonuses. Free text remains allowed.
export const martialSuggestions = (): string[] => {
  const styles = [...MARTIAL_STYLES.map((s) => s.name), ...TECHNIQUES.map((t) => t.name)];
  const martial = [...TRADITIONAL_WEAPONS, ...SWORDMASTER_WEAPONS, ...MARTIAL_STYLES.map((s) => s.signature).filter((w): w is string => w != null)];
  const rest = WeaponValues.map((w) => baseWeaponName(w.name)).filter((w) => !martial.some((m) => norm(m) === norm(w)));
  return Array.from(new Set([...styles, "fegyvertelen", ...martial, ...rest]));
};
