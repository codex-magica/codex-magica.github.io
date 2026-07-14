// Állapotok — transient status effects applied at the table (play-state, never part of the build
// ledger). A condition is just a named bag of Effects, exactly like a KM adjustment: the derive engine
// folds them in as a final pass, so a condition that lowers an ATTRIBUTE cascades correctly into the
// combat values, MME/AME, Ép/Fp max and Mozgás — and every modifier shows up, itemized and labelled,
// in the value's breakdown modal.
//
// The presets below are transcribed from the book; anything not listed can be entered as a custom
// condition with hand-picked modifiers.

import { Stat, STAT_SHORT } from "./attributes";
import { CombatChannel, DerivedKey, Effect } from "./effects";

// Combat situations (ch.17: roham, harc fekve, túlerő…) deliberately have NO presets here — they are
// per-attack, and the weapon calculator modals already apply them.
export type ConditionGroup = "Sérülés" | "Mérgezés" | "Pszi" | "Egyéb";

export interface ConditionPreset {
  key: string;
  name: string;
  group: ConditionGroup;
  note: string; // the rule, in one line — shown under the name in the picker
  // Presets whose strength the player sets (a shield's E, the number of extra opponents, Ψ-points
  // spent). `magnitude` labels that number; `effects` is then a function of it.
  magnitude?: { label: string; default: number; min?: number; step?: number };
  effects: (n: number) => Effect[];
}

const combat = (mods: Partial<Record<CombatChannel, number>>): Effect[] =>
  (Object.keys(mods) as CombatChannel[]).map((channel) => ({ kind: "combatBonus", channel, amount: mods[channel]! }));
const stats = (mods: Partial<Record<Stat, number>>): Effect[] =>
  (Object.keys(mods) as Stat[]).map((stat) => ({ kind: "statBonus", stat, amount: mods[stat]! }));
const derived = (mods: Partial<Record<DerivedKey, number>>): Effect[] =>
  (Object.keys(mods) as DerivedKey[]).map((target) => ({ kind: "derivedBonus", target, amount: mods[target]! }));

// The dazed state (ch.18 "Kábultság"): attributes AND combat values, and no psi/magic while it lasts.
// The same modifiers are what a character at 3/4 Ép lost suffers, and what "Harc kábultan" (ch.17) uses.
const KABULT: Effect[] = [
  ...stats({ Erő: -2, Állóképesség: -2, Gyorsaság: -2, Ügyesség: -2, Intelligencia: -5, Akaraterő: -5, Asztrál: -5 }),
  ...combat({ KÉ: -10, TÉ: -20, VÉ: -10, CÉ: -30 }),
  { kind: "note", text: "Pszit vagy mágiát használni képtelen." },
];

export const CONDITION_PRESETS: ConditionPreset[] = [
  // ── Sérülés (ch.18 Életerő) ────────────────────────────────────────────────
  {
    key: "serulesi-modosito",
    name: "Sérülési módosító",
    group: "Sérülés",
    note: "Max. Fp több mint 90%-át, vagy max. Ép felét elvesztette: −10 minden harcértékre.",
    effects: () => combat({ KÉ: -10, TÉ: -10, VÉ: -10, CÉ: -10 }),
  },
  {
    key: "kabultsag",
    name: "Kábultság",
    group: "Sérülés",
    note: "Max. Ép 3/4-ét elvesztette, vagy kábító hatás alatt áll (ch.18).",
    effects: () => KABULT,
  },
  {
    key: "hatrany-zavaro",
    name: "Hátrány — Zavaró",
    group: "Sérülés",
    note: "KM által adott sérülés-hátrány: −10 minden harcértékre.",
    effects: () => combat({ KÉ: -10, TÉ: -10, VÉ: -10, CÉ: -10 }),
  },
  {
    key: "hatrany-jelentos",
    name: "Hátrány — Jelentős",
    group: "Sérülés",
    note: "KM által adott sérülés-hátrány: −25 minden harcértékre.",
    effects: () => combat({ KÉ: -25, TÉ: -25, VÉ: -25, CÉ: -25 }),
  },
  {
    key: "hatrany-vegzetes",
    name: "Hátrány — Végzetes",
    group: "Sérülés",
    note: "KM által adott sérülés-hátrány: −50 minden harcértékre.",
    effects: () => combat({ KÉ: -50, TÉ: -50, VÉ: -50, CÉ: -50 }),
  },
  {
    key: "magikus-kifaradas",
    name: "Mágikus kifáradás",
    group: "Sérülés",
    note: "A szintenkénti 25 Mp felett minden további Mp 1 max. Fp-be kerül, míg ki nem pihened.",
    magnitude: { label: "Elvesztett max. Fp", default: 1, min: 1 },
    effects: (n) => derived({ Fp: -n }),
  },

  // ── Mérgezés (ch.20, a méreghatások tulajdonság-táblázata) ─────────────────
  {
    key: "mereg-rosszullet",
    name: "Méreg — Rosszullét",
    group: "Mérgezés",
    note: "Minden fizikai és szellemi tulajdonság −1.",
    effects: () => stats({ Erő: -1, Gyorsaság: -1, Ügyesség: -1, Állóképesség: -1, Akaraterő: -1, Érzékelés: -1 }),
  },
  {
    key: "mereg-gyengeseg",
    name: "Méreg — Gyengeség",
    group: "Mérgezés",
    note: "Erő −2, Gyorsaság −2, Ügyesség −2, Állóképesség −1.",
    effects: () => stats({ Erő: -2, Gyorsaság: -2, Ügyesség: -2, Állóképesség: -1 }),
  },
  {
    key: "mereg-kabulat",
    name: "Méreg — Kábulat / Bódulat",
    group: "Mérgezés",
    note: "Erő −1, Gyorsaság −1, Ügyesség −1, Akaraterő −3, Érzékelés −3.",
    effects: () => stats({ Erő: -1, Gyorsaság: -1, Ügyesség: -1, Akaraterő: -3, Érzékelés: -3 }),
  },
  {
    key: "mereg-gorcs",
    name: "Méreg — Görcs",
    group: "Mérgezés",
    note: "Erő −4, Gyorsaság −4, Ügyesség −4, Érzékelés −1.",
    effects: () => stats({ Erő: -4, Gyorsaság: -4, Ügyesség: -4, Érzékelés: -1 }),
  },

  // ── Pszi (ch.22) — a shield raised on you by ANOTHER psi user is the point here ─
  {
    key: "statikus-pajzs-mentalis",
    name: "Statikus Ψ-pajzs (Mentális)",
    group: "Pszi",
    note: "A pajzs Erőssége hozzáadódik a Mentális ME-hez. 4. fokú pszivel másra is emelhető.",
    magnitude: { label: "A pajzs Erőssége (E)", default: 5, min: 1 },
    effects: (n) => derived({ MME: n }),
  },
  {
    key: "statikus-pajzs-asztralis",
    name: "Statikus Ψ-pajzs (Asztrális)",
    group: "Pszi",
    note: "A pajzs Erőssége hozzáadódik az Asztrális ME-hez. 4. fokú pszivel másra is emelhető.",
    magnitude: { label: "A pajzs Erőssége (E)", default: 5, min: 1 },
    effects: (n) => derived({ AME: n }),
  },
  {
    key: "dinamikus-pajzs-mentalis",
    name: "Dinamikus pajzs (Mentális)",
    group: "Pszi",
    note: "Erőssége a beléfoglalt Ψp; csak önmagára építhető, alvásnál/sokknál összeomlik.",
    magnitude: { label: "A pajzs Erőssége (E)", default: 5, min: 1 },
    effects: (n) => derived({ MME: n }),
  },
  {
    key: "dinamikus-pajzs-asztralis",
    name: "Dinamikus pajzs (Asztrális)",
    group: "Pszi",
    note: "Erőssége a beléfoglalt Ψp; csak önmagára építhető, alvásnál/sokknál összeomlik.",
    magnitude: { label: "A pajzs Erőssége (E)", default: 5, min: 1 },
    effects: (n) => derived({ AME: n }),
  },
  {
    key: "tiszta-elme",
    name: "Tiszta elme",
    group: "Pszi",
    note: "Körönként 1 Ψp = +5 Mentális ME. Folyamatos összpontosítás.",
    magnitude: { label: "Ψ-pont / kör", default: 1, min: 1 },
    effects: (n) => derived({ MME: 5 * n }),
  },
  {
    key: "pszi-roham",
    name: "Pszi Roham",
    group: "Pszi",
    note: "A felhasznált Ψ-pontok kétszerese adódik a TÉ-hez.",
    magnitude: { label: "Felhasznált Ψ-pont", default: 1, min: 1 },
    effects: (n) => combat({ TÉ: 2 * n }),
  },
  {
    key: "energia-felszabaditas",
    name: "Energia felszabadítás",
    group: "Pszi",
    note: "Közelharcban minden 1 E után TÉ +10, Sebzés +2.",
    magnitude: { label: "Erősség (E)", default: 1, min: 1 },
    effects: (n) => [...combat({ TÉ: 10 * n }), ...derived({ Sebzésbónusz: 2 * n })],
  },
  {
    key: "sarkany-tanca",
    name: "Sárkány tánca (Slan)",
    group: "Pszi",
    // The book's odd application levels (1., 3., 5.…) map to the ordinal n = 1, 2, 3…: KÉ +2n, TÉ/VÉ +5n.
    // Phrasing it as the ordinal keeps the bonuses whole for any input (the raw /2 form went fractional).
    note: "Alkalmazásonként KÉ +2, TÉ/VÉ +5 (a könyv 1./3./5.… szintjei).",
    magnitude: { label: "Hányadik alkalmazás", default: 1, min: 1 },
    effects: (n) => combat({ KÉ: 2 * n, TÉ: 5 * n, VÉ: 5 * n }),
  },
  {
    key: "sarkany-duhe",
    name: "Sárkány dühe (Slan)",
    group: "Pszi",
    note: "Alkalmazási szintenként +1 Sp közelharci sebzés.",
    magnitude: { label: "Alkalmazási szint", default: 1, min: 1 },
    effects: (n) => derived({ Sebzésbónusz: n }),
  },
];

export const CONDITION_GROUPS: ConditionGroup[] = ["Sérülés", "Mérgezés", "Pszi", "Egyéb"];

// Every target a custom condition can modify, in the order the editor lists them.
export const CUSTOM_COMBAT: CombatChannel[] = ["KÉ", "TÉ", "VÉ", "CÉ"];
export const CUSTOM_DERIVED: DerivedKey[] = ["MME", "AME", "Ép", "Fp", "Sebzésbónusz"];
export const STAT_KEYS: Stat[] = [
  "Erő", "Gyorsaság", "Ügyesség", "Állóképesség", "Egészség", "Karizma", "Intelligencia", "Akaraterő", "Asztrál", "Érzékelés",
];

// The pickable targets for a custom-condition row: its storage key (what buildCustomEffects routes on),
// the label shown in the dropdown, its group, and the step size (combat values move in fives, the rest
// in ones). The custom editor lists one row per chosen target, each target usable only once.
export interface ConditionTarget { key: string; label: string; group: string; step: number }
export const CONDITION_TARGETS: ConditionTarget[] = [
  ...CUSTOM_COMBAT.map((k) => ({ key: k, label: k, group: "Harcértékek", step: 5 })),
  ...CUSTOM_DERIVED.map((k) => ({ key: k, label: k, group: "Származtatott", step: 1 })),
  ...STAT_KEYS.map((k) => ({ key: k, label: STAT_SHORT[k], group: "Tulajdonságok", step: 1 })),
];
export const CONDITION_TARGET_GROUPS = ["Harcértékek", "Származtatott", "Tulajdonságok"];

export const buildCustomEffects = (mods: Record<string, number>): Effect[] => [
  ...combat(Object.fromEntries(CUSTOM_COMBAT.filter((c) => mods[c]).map((c) => [c, mods[c]]))),
  ...derived(Object.fromEntries(CUSTOM_DERIVED.filter((d) => mods[d]).map((d) => [d, mods[d]]))),
  ...stats(Object.fromEntries(Object.keys(mods).filter((k) => isStat(k) && mods[k]).map((k) => [k, mods[k]]))),
];
const isStat = (k: string): k is Stat => STAT_KEYS.includes(k as Stat);

// A one-line summary of what a condition does — the sheet lists this under the condition's name.
export const conditionSummary = (effects: Effect[]): string => {
  const parts: string[] = [];
  for (const e of effects) {
    if (e.kind === "combatBonus") parts.push(`${e.channel} ${sign(e.amount)}`);
    else if (e.kind === "derivedBonus") parts.push(`${e.target} ${sign(e.amount)}`);
    else if (e.kind === "statBonus") parts.push(`${STAT_SHORT[e.stat]} ${sign(e.amount)}`);
  }
  return parts.join(" · ");
};
const sign = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
