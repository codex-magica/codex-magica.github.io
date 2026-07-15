// Társ állatok — companion creatures (horses, dogs, wolves…) a character keeps. Pure play-state: a
// companion is an independent creature with its own stat block and live Ép/Fp, so NOTHING here feeds
// the character's derive engine. Presets are transcribed from the bestiary (book ch.33 "ÁLLATOK");
// their numbers are explicitly only guidelines ("a táblázatban szereplő értékek csak tájékoztatóul
// szolgálnak"), so every field stays editable and a fully custom animal can be entered from scratch.

// The full animal stat block. Numeric where the game treats it as a number (combat values, Ép/Fp
// max, resistances, the three movement speeds); free text where the book is textual (Sebzés "1k10+2",
// Időigény "3 (harapás, karmolás)").
// Movement is split by medium (the book gives some creatures more than one): szárazföld/víz/levegő.
// 0 means "can't move that way" and is hidden in the read-only view.
export interface CompanionStats {
  termet: string; // size class letter (K/E/N…)
  meret: string; // Méretkategória
  sebSzaraz: number; // szárazföldi sebesség (SZ)
  sebViz: number; // vízi sebesség (V)
  sebLevego: number; // légi sebesség (L)
  idoigeny: string; // Időigény
  ke: number; // Kezdeményező érték
  te: number; // Támadó érték
  ve: number; // Védő érték
  sebzes: string; // Sebzés (dice string)
  epMax: number;
  fpMax: number;
  asztralME: number;
  mentalME: number;
  meregEllenallas: number;
  tp: string; // Tapasztalati pont (string — some blocks give a range)
}

export interface Companion {
  id: string;
  name: string; // the pet's given name ("Bársony")
  species: string; // the display label ("Ló — Könnyű harci", "Kutya — Harci (Hastin)")
  preset?: string; // the CompanionPreset key it came from (undefined = custom)
  breed?: string; // the chosen breed key, if any
  icon?: string; // player-chosen icon key (see ui/sheet/animalIcons); falls back to the species default
  emoji?: string; // legacy emoji override — kept for the emoji fallback path (see companionEmoji)
  stats: CompanionStats;
  ep: number; // current Ép
  fp: number; // current Fp
  note?: string;
}

// A breed refines a base type with ± modifiers on the six combat fields (book: the per-fajta tables).
// `sebzes` shifts the base damage's flat bonus (Harci 1k10+2 + Hastin +2 → 1k10+4).
export interface CompanionBreed {
  key: string;
  name: string;
  base: string; // which base variant it belongs to (must match a preset key)
  mods: { ke?: number; te?: number; ve?: number; sebzes?: number; ep?: number; fp?: number };
}

export interface CompanionPreset {
  key: string;
  name: string; // variant label ("Harci", "Könnyű harci") — the group is the species
  group: string; // "Kutya" | "Ló" | "Vad állat"
  stats: CompanionStats;
}

const S = (o: Partial<CompanionStats>): CompanionStats => ({
  termet: "", meret: "", sebSzaraz: 0, sebViz: 0, sebLevego: 0, idoigeny: "", ke: 0, te: 0, ve: 0, sebzes: "",
  epMax: 0, fpMax: 0, asztralME: 0, mentalME: 0, meregEllenallas: 0, tp: "", ...o,
});

// Movement speeds are per-medium (SZ szárazföld / V víz / L levegő). The book gives only the media a
// creature actually uses; víz here is filled with a sensible default (~⅓ of the land pace, more for
// strong swimmers like wolves and bears) since almost any land animal can swim — the falcon, a pure
// flyer, is the exception and keeps víz 0. Horses' szárazföld is the Vágta (gallop) from the gait table.
export const COMPANION_PRESETS: CompanionPreset[] = [
  // ── Kutyák (ch.33) — base table ─────────────────────────────────────────────
  { key: "kutya-kozonseges", name: "Közönséges", group: "Kutya",
    stats: S({ termet: "K", meret: "1", sebSzaraz: 120, sebViz: 30, idoigeny: "5", ke: 40, te: 50, ve: 70, sebzes: "1k10", epMax: 8, fpMax: 20, mentalME: 4, meregEllenallas: 3, tp: "3" }) },
  { key: "kutya-harci", name: "Harci", group: "Kutya",
    stats: S({ termet: "E", meret: "2", sebSzaraz: 120, sebViz: 30, idoigeny: "3", ke: 45, te: 65, ve: 100, sebzes: "1k10+2", epMax: 10, fpMax: 32, mentalME: 4, meregEllenallas: 3, tp: "8" }) },
  { key: "kutya-vad", name: "Vad", group: "Kutya",
    stats: S({ termet: "E", meret: "2", sebSzaraz: 130, sebViz: 35, idoigeny: "3", ke: 40, te: 60, ve: 80, sebzes: "1k10", epMax: 10, fpMax: 28, mentalME: 0, meregEllenallas: 3, tp: "6" }) },

  // ── Lovak (ch.33) ───────────────────────────────────────────────────────────
  { key: "lo-konnyu-harci", name: "Könnyű harci", group: "Ló",
    stats: S({ termet: "N", meret: "3", sebSzaraz: 54, sebViz: 20, idoigeny: "5", ke: 20, te: 45, ve: 80, sebzes: "2k6", epMax: 20, fpMax: 40, meregEllenallas: 4, tp: "" }) },
  { key: "lo-nehez-harci", name: "Nehéz harci", group: "Ló",
    stats: S({ termet: "N", meret: "3", sebSzaraz: 32, sebViz: 18, idoigeny: "5", ke: 18, te: 55, ve: 75, sebzes: "2k6+1", epMax: 25, fpMax: 50, meregEllenallas: 5, tp: "" }) },
  { key: "lo-utazo", name: "Utazó / egyéb", group: "Ló",
    stats: S({ termet: "N", meret: "3", sebSzaraz: 60, sebViz: 20, idoigeny: "4", ke: 16, te: 25, ve: 50, sebzes: "1k10", epMax: 25, fpMax: 35, meregEllenallas: 3, tp: "" }) },

  // ── Egyéb állatok (ch.33) ───────────────────────────────────────────────────
  { key: "farkas", name: "Farkas", group: "Vad állat",
    stats: S({ termet: "E", meret: "2", sebSzaraz: 120, sebViz: 40, idoigeny: "3 (harapás, karmolás, karmolás)", ke: 35, te: 50, ve: 80, sebzes: "1k6+2, 1k6, 1k6", epMax: 10, fpMax: 30, meregEllenallas: 4, tp: "5" }) },
  { key: "medve", name: "Medve", group: "Vad állat",
    stats: S({ termet: "N", meret: "3", sebSzaraz: 50, sebViz: 40, idoigeny: "3 (harapás, mancs, mancs)", ke: 30, te: 80, ve: 75, sebzes: "2k6", epMax: 28, fpMax: 50, meregEllenallas: 8, tp: "18" }) },
  { key: "solyom", name: "Sólyom", group: "Vad állat",
    stats: S({ termet: "K", meret: "1", sebSzaraz: 5, sebLevego: 180, idoigeny: "1 kör (csőr)", ke: 50, te: 40, ve: 90, sebzes: "1k10", epMax: 5, fpMax: 12, meregEllenallas: 3, tp: "2" }) },
  { key: "patkany", name: "Patkány", group: "Vad állat",
    stats: S({ termet: "K", meret: "0", sebSzaraz: 60, sebViz: 12, idoigeny: "3", ke: 10, te: 30, ve: 50, sebzes: "1k2", epMax: 2, fpMax: 8, meregEllenallas: 2, tp: "1" }) },
];

// Dog breeds (ch.33) — each refines its base column. Vad has no breeds; horses/other animals none.
export const COMPANION_BREEDS: CompanionBreed[] = [
  { key: "pittaros", name: "Pittaros", base: "kutya-harci", mods: { ke: -5, te: 20, ve: -15, sebzes: 1, ep: 2, fp: 6 } },
  { key: "hastin", name: "Hastin", base: "kutya-harci", mods: { ke: -2, te: 25, ve: -15, sebzes: 2, ep: 5, fp: 10 } },
  { key: "acternam", name: "Acternam", base: "kutya-kozonseges", mods: { ke: 3, ve: 5, sebzes: -1, ep: -1, fp: -3 } },
  { key: "cirnecos", name: "Cirnecos", base: "kutya-kozonseges", mods: { te: -10, ve: -5, sebzes: -2, ep: -3, fp: -5 } },
  { key: "blegront", name: "Blegront", base: "kutya-kozonseges", mods: { ke: -3, te: 15, ve: -10, sebzes: 1, ep: 4, fp: 5 } },
  { key: "robardoar", name: "Robardoar", base: "kutya-kozonseges", mods: { ke: -1, ve: 5, sebzes: -1, ep: -1 } },
];

export const breedsForBase = (presetKey: string): CompanionBreed[] => COMPANION_BREEDS.filter((b) => b.base === presetKey);

// Shift the flat bonus of a dice string ("1k10+2" +2 → "1k10+4", "1k10" -1 → "1k10-1"). Non-dice or
// multi-part strings (the wolf's "1k6+2, 1k6, 1k6") are left as-is — breeds only apply to single-die dogs.
export const shiftDamage = (dmg: string, delta: number): string => {
  if (!delta) return dmg;
  const m = dmg.trim().match(/^(\d+k\d+)\s*([+-]\s*\d+)?$/);
  if (!m) return dmg;
  const flat = (m[2] ? parseInt(m[2].replace(/\s/g, ""), 10) : 0) + delta;
  return `${m[1]}${flat > 0 ? `+${flat}` : flat < 0 ? `${flat}` : ""}`;
};

// Apply a breed's modifiers to a base preset's stats.
export const applyBreed = (base: CompanionStats, breed: CompanionBreed): CompanionStats => ({
  ...base,
  ke: base.ke + (breed.mods.ke ?? 0),
  te: base.te + (breed.mods.te ?? 0),
  ve: base.ve + (breed.mods.ve ?? 0),
  sebzes: shiftDamage(base.sebzes, breed.mods.sebzes ?? 0),
  epMax: base.epMax + (breed.mods.ep ?? 0),
  fpMax: base.fpMax + (breed.mods.fp ?? 0),
});

// The species label shown on the card: "Kutya — Harci (Hastin)" / "Ló — Könnyű harci".
export const speciesLabel = (preset: CompanionPreset, breed?: CompanionBreed): string =>
  `${preset.group} — ${preset.name}${breed ? ` (${breed.name})` : ""}`;

// Blank stats for a custom animal.
export const blankStats = (): CompanionStats => S({});

export const COMPANION_GROUPS = ["Kutya", "Ló", "Vad állat"];

// ── SVG icons (the active system) ────────────────────────────────────────────
// The icon shown on the card/modal — the player's chosen icon key wins; else keyed off the preset, then
// the group, else a generic paw. Keys match ui/sheet/animalIcons.
// Wolf has no free library glyph, so it falls back to the nearest one (dog, the closest canine); the
// player can pick any icon from the palette. `bear` is a custom edit of Lucide's panda (see animalIcons).
const SPECIES_ICON: Record<string, string> = {
  farkas: "dog", medve: "bear", solyom: "bird", patkany: "rat",
};
const GROUP_ICON: Record<string, string> = { "Kutya": "dog", "Ló": "horse", "Vad állat": "paw" };
export const companionIconKey = (c: { icon?: string; preset?: string; species: string }): string => {
  if (c.icon) return c.icon;
  if (c.preset && SPECIES_ICON[c.preset]) return SPECIES_ICON[c.preset];
  const group = COMPANION_GROUPS.find((g) => c.species.startsWith(g));
  return (group && GROUP_ICON[group]) || "paw";
};

// The icon palette, in picker order — every one is a real Lucide/Tabler animal, found by searching each
// library's Animals category + tag metadata (see ui/sheet/animalIcons).
export const COMPANION_ICON_KEYS = [
  "paw", "horseshoe", "dog", "cat", "horse", "rabbit", "rat", "squirrel", "deer", "pig", "panda", "bear", "bat",
  "bird", "canary", "fish", "turtle", "snail", "shell", "shrimp", "spider", "butterfly", "bug", "worm",
  "feather", "leaf", "sprout",
];

// ── Emoji fallback (kept for an easy switch-back to the emoji look) ───────────
// A species glyph for the card/modal — the player's chosen emoji wins; else keyed off the preset, then
// the group, else a generic paw.
const SPECIES_EMOJI: Record<string, string> = {
  farkas: "🐺", medve: "🐻", solyom: "🦅", patkany: "🐀",
};
const GROUP_EMOJI: Record<string, string> = { "Kutya": "🐕", "Ló": "🐎", "Vad állat": "🐾" };
export const companionEmoji = (c: { emoji?: string; preset?: string; species: string }): string => {
  if (c.emoji) return c.emoji;
  if (c.preset && SPECIES_EMOJI[c.preset]) return SPECIES_EMOJI[c.preset];
  const group = COMPANION_GROUPS.find((g) => c.species.startsWith(g));
  return (group && GROUP_EMOJI[group]) || "🐾";
};

// Quick-pick palette for the icon editor. Free text is still allowed for anything not here.
export const ANIMAL_EMOJI = [
  "🐎", "🐕", "🐺", "🐈", "🐻", "🦁", "🐅", "🐆", "🦊", "🐗", "🦌", "🐐", "🐏", "🐇",
  "🐀", "🦇", "🐒", "🦅", "🦉", "🐦", "🦜", "🐍", "🦎", "🐉", "🦂", "🕷️", "🐢", "🦄",
];

// Normalise a typed icon to a short emoji-sized string (a couple of code points), so a stray word can't
// land in the field.
export const cleanEmoji = (v: string): string => Array.from(v).slice(0, 4).join("");

// The editable fields of the custom-animal builder (AddCompanionModal), grouped. `kind` drives the
// input (number vs free text); Ép/Fp maxes are handled separately (they pair with the live current
// values). Termet and Tp are intentionally not surfaced.
export interface CompanionField { key: keyof CompanionStats; label: string; kind: "num" | "text" }
export const COMPANION_FIELDS: { group: string; fields: CompanionField[] }[] = [
  { group: "Sebesség", fields: [
    { key: "sebSzaraz", label: "Szárazföld", kind: "num" }, { key: "sebViz", label: "Víz", kind: "num" }, { key: "sebLevego", label: "Levegő", kind: "num" },
  ] },
  { group: "Ellenállások", fields: [
    { key: "mentalME", label: "Mentál ME", kind: "num" }, { key: "asztralME", label: "Asztrál ME", kind: "num" },
    { key: "meregEllenallas", label: "Méreg", kind: "num" },
  ] },
  { group: "Támadás", fields: [
    { key: "idoigeny", label: "Időigény", kind: "text" },
    { key: "ke", label: "KÉ", kind: "num" }, { key: "te", label: "TÉ", kind: "num" }, { key: "ve", label: "VÉ", kind: "num" },
    { key: "sebzes", label: "Sebzés", kind: "text" }, { key: "meret", label: "Méretkategória", kind: "text" },
  ] },
];
