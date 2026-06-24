// The skill catalog (képzettségek). Mechanical layer only — prose lives in the book/compendium.
// Costs, difficulties, governing attributes and prerequisites are transcribed verbatim from
// chapter 16 (the cost table at lines ~146–267). Per-skill cost arrays are stored explicitly
// because the book deviates from the difficulty curve for a few skills (Mechanika, Kultúra,
// Nyelvtudás), so the table — not the difficulty letter — is authoritative for Kp cost.

import { Stat, STAT_BY_SHORT } from "./attributes";
import { Effect, GrantEntry, grant } from "./effects";
import { SkillCategory, SkillDifficulty, SkillFok, SkillRef } from "./common";

export type SkillCost = number[] | "percentage"; // cumulative Kp per fok (length 5), or %-based

export interface SkillDef {
  name: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  cost: SkillCost;
  attrs: Stat[]; // required/governing attributes (checks, fok-4 bonus, unmet-req penalty)
  hardReq: SkillRef[]; // strong prereq — must be owned at >= target fok
  softReq: SkillRef[]; // weak prereq   — must be owned at >= target fok − 1
  perFokEffects?: Partial<Record<SkillFok, Effect[]>>;
}

// Default cumulative cost curves by difficulty (book ch.16). Used unless a skill overrides.
export const TIER_COST: Record<SkillDifficulty, number[]> = {
  I: [1, 3, 8, 15, 25],
  II: [1, 5, 10, 20, 30],
  III: [2, 8, 15, 30, 45],
  IV: [3, 10, 20, 35, 55],
};

export const PERCENT_KP_RATE = 3; // 1 Kp = 3%
export const PERCENT_KP_RATE_TAUGHT = 5; // 1 Kp = 5% with oktatás

type Raw = {
  name: string;
  cat: SkillCategory;
  diff: SkillDifficulty;
  attrs?: (keyof typeof STAT_BY_SHORT)[];
  pct?: boolean; // percentage skill
  cost?: number[]; // explicit cost override (book deviation)
  hard?: string[];
  soft?: string[];
  perFok?: Partial<Record<SkillFok, Effect[]>>;
};

const ref = (s: string): SkillRef => ({ skill: s });

const build = (r: Raw): SkillDef => ({
  name: r.name,
  category: r.cat,
  difficulty: r.diff,
  cost: r.pct ? "percentage" : r.cost ?? TIER_COST[r.diff],
  attrs: (r.attrs ?? []).map((a) => STAT_BY_SHORT[a]),
  hardReq: (r.hard ?? []).map(ref),
  softReq: (r.soft ?? []).map(ref),
  perFokEffects: r.perFok,
});

const RAW: Raw[] = [
  // ── Harci ──────────────────────────────────────────────────────────────────
  {
    name: "Fájdalomtűrés", cat: "Harci", diff: "II", attrs: ["Áks", "Akr"],
    perFok: {
      3: [{ kind: "resourcePerLevel", resource: "Fp", amount: 1 }],
      4: [{ kind: "resourcePerLevel", resource: "Fp", amount: 2 }],
      5: [{ kind: "resourcePerLevel", resource: "Fp", amount: 3 }],
    },
  },
  { name: "Fegyverhasználat", cat: "Harci", diff: "III", attrs: ["Erő", "Gy", "Ügy", "Érz"] },
  { name: "Fegyverismeret", cat: "Harci", diff: "II", attrs: ["Int", "Érz"] },
  { name: "Hadvezetés", cat: "Harci", diff: "III", attrs: ["Int", "Krz"], soft: ["Lélektan", "Térképészet"] },
  { name: "Harci láz", cat: "Harci", diff: "II", attrs: ["Áks", "Egs"] },
  { name: "Harcművészet", cat: "Harci", diff: "IV", attrs: ["Erő", "Gy", "Ügy", "Akr"] },
  { name: "Harctéri gyakorlat", cat: "Harci", diff: "II", attrs: ["Gy", "Ügy", "Érz"] },
  { name: "Kétkezesharc", cat: "Harci", diff: "III", attrs: ["Gy", "Ügy"], hard: ["Fegyverhasználat"] },
  { name: "Pajzshasználat", cat: "Harci", diff: "II", attrs: ["Erő", "Ügy"] },
  { name: "Pusztakezes harc", cat: "Harci", diff: "II", attrs: ["Erő", "Ügy", "Áks"] },
  { name: "Pusztítás", cat: "Harci", diff: "III", attrs: ["Erő"], hard: ["Fegyverhasználat"], soft: ["Élettan"] },
  { name: "Taktika", cat: "Harci", diff: "II", attrs: ["Érz"] },
  { name: "Vakharc", cat: "Harci", diff: "III", attrs: ["Érz"] },
  { name: "Vértviselet", cat: "Harci", diff: "II", attrs: ["Erő"] },

  // ── Alvilági ───────────────────────────────────────────────────────────────
  { name: "Álcázás/álruha", cat: "Alvilági", diff: "II", attrs: ["Ügy", "Érz"], hard: ["Kultúra"] },
  { name: "Hamisítás", cat: "Alvilági", diff: "III", attrs: ["Ügy", "Int"] },
  { name: "Jelbeszéd", cat: "Alvilági", diff: "II", attrs: ["Érz", "Int"] },
  { name: "Kocsmai verekedés", cat: "Alvilági", diff: "I", attrs: ["Erő", "Gy", "Ügy"] },
  { name: "Méregkeverés/semlegesítés", cat: "Alvilági", diff: "II", attrs: ["Int"], hard: ["Herbalizmus"], soft: ["Alkímia"] },
  { name: "Orvtámadás", cat: "Alvilági", diff: "II", attrs: ["Ügy"], hard: ["Fegyverhasználat"], soft: ["Élettan"] },
  { name: "Kínzás", cat: "Alvilági", diff: "II", attrs: ["Ügy", "Int"] },
  { name: "Szabadulóművészet", cat: "Alvilági", diff: "III", attrs: ["Ügy"], hard: ["Csomózás"], soft: ["Zárnyitás"] },
  { name: "Szerencsejáték", cat: "Alvilági", diff: "II", attrs: ["Ügy", "Int"] },
  { name: "Csapdakeresés", cat: "Alvilági", diff: "I", attrs: ["Érz"], pct: true },
  { name: "Lopódzás", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"], pct: true },
  { name: "Rejtőzködés", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"], pct: true },
  { name: "Rejtekhely kutatás", cat: "Alvilági", diff: "I", attrs: ["Érz"], pct: true },
  { name: "Zárnyitás", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"], pct: true },
  { name: "Zsebmetszés", cat: "Alvilági", diff: "I", attrs: ["Ügy", "Érz"], pct: true },
  { name: "Veszélyérzék", cat: "Alvilági", diff: "I", attrs: ["Érz"], pct: true },

  // ── Világi ─────────────────────────────────────────────────────────────────
  { name: "Állatismeret", cat: "Világi", diff: "I" },
  { name: "Csapdaállítás", cat: "Világi", diff: "II", attrs: ["Ügy"], soft: ["Mechanika", "Csomózás"] },
  { name: "Csomózás", cat: "Világi", diff: "II", attrs: ["Ügy"] },
  { name: "Értékbecslés", cat: "Világi", diff: "I", attrs: ["Int", "Érz"] },
  { name: "Futás", cat: "Világi", diff: "I", attrs: ["Áks", "Egs"] },
  { name: "Hajózás", cat: "Világi", diff: "II", attrs: ["Érz"] },
  { name: "Hangutánzás", cat: "Világi", diff: "II", attrs: ["Érz"], cost: [2, 5, 10, 20, 30], soft: ["Állatismeret"] },
  { name: "Helyismeret", cat: "Világi", diff: "I" },
  { name: "Idomítás", cat: "Világi", diff: "II", attrs: ["Aszt"], hard: ["Állatismeret"] },
  { name: "Időjóslás", cat: "Világi", diff: "II", attrs: ["Érz", "Int"] },
  { name: "Kocsihajtás", cat: "Világi", diff: "I", attrs: ["Ügy"], soft: ["Állatismeret"] },
  { name: "Lovaglás", cat: "Világi", diff: "I", attrs: ["Ügy"], soft: ["Állatismeret"] },
  { name: "Nyomolvasás", cat: "Világi", diff: "II", attrs: ["Érz"] },
  { name: "Szakma", cat: "Világi", diff: "II" },
  { name: "Úszás", cat: "Világi", diff: "I", attrs: ["Erő", "Áks", "Egs"] },
  { name: "Vadonjárás", cat: "Világi", diff: "II", attrs: ["Érz"], soft: ["Állatismeret", "Herbalizmus"] },
  { name: "Akrobatika", cat: "Világi", diff: "I", attrs: ["Ügy"], pct: true },
  { name: "Esés", cat: "Világi", diff: "I", attrs: ["Ügy"], pct: true },
  { name: "Mászás", cat: "Világi", diff: "I", attrs: ["Erő", "Ügy"], pct: true },

  // ── Tudományos ─────────────────────────────────────────────────────────────
  { name: "Alkímia", cat: "Tudományos", diff: "III", attrs: ["Int"], hard: ["Számtan/Mértan"] },
  { name: "Élettan", cat: "Tudományos", diff: "III", attrs: ["Int"], soft: ["Írás/olvasás"] },
  { name: "Építészet", cat: "Tudományos", diff: "III", attrs: ["Int"], hard: ["Számtan/Mértan"], soft: ["Írás/olvasás"] },
  { name: "Herbalizmus", cat: "Tudományos", diff: "II", attrs: ["Int"] },
  { name: "Írás/olvasás", cat: "Tudományos", diff: "III", attrs: ["Int"], hard: ["Nyelvtudás"] },
  { name: "Jog/Törvénykezés", cat: "Tudományos", diff: "III", attrs: ["Int", "Aszt"], hard: ["Kultúra"], soft: ["Írás/olvasás"] },
  { name: "Legendaismeret", cat: "Tudományos", diff: "II", attrs: ["Int"], hard: ["Kultúra"] },
  { name: "Mechanika", cat: "Tudományos", diff: "III", attrs: ["Ügy", "Int"], cost: [2, 8, 15, 25, 40], hard: ["Számtan/Mértan"] },
  { name: "Oktatás", cat: "Tudományos", diff: "III", attrs: ["Int", "Aszt"], soft: ["Lélektan"] },
  { name: "Orvoslás", cat: "Tudományos", diff: "III", attrs: ["Int"], hard: ["Élettan", "Herbalizmus"] },
  { name: "Ősi nyelv", cat: "Tudományos", diff: "IV", attrs: ["Int"], soft: ["Írás/olvasás"] },
  { name: "Számtan/Mértan", cat: "Tudományos", diff: "III", attrs: ["Int"], soft: ["Írás/olvasás"] },
  { name: "Térképészet", cat: "Tudományos", diff: "III", attrs: ["Int"], hard: ["Számtan/Mértan"], soft: ["Művészetek"] },
  { name: "Történelem", cat: "Tudományos", diff: "II", attrs: ["Int"], soft: ["Írás/olvasás"] },
  { name: "Vallásismeret", cat: "Tudományos", diff: "II", attrs: ["Int", "Aszt"], hard: ["Kultúra"] },

  // ── Szociális ──────────────────────────────────────────────────────────────
  { name: "Ékesszólás", cat: "Szociális", diff: "II", attrs: ["Int", "Aszt", "Krz"], hard: ["Kultúra"], soft: ["Lélektan"] },
  { name: "Heraldika", cat: "Szociális", diff: "II", attrs: ["Int"], hard: ["Kultúra"] },
  { name: "Kultúra", cat: "Szociális", diff: "I", cost: [3, 8, 15, 25, 40], hard: ["Nyelvtudás"] },
  { name: "Lélektan", cat: "Szociális", diff: "III", attrs: ["Int", "Aszt", "Érz"] },
  { name: "Művészetek", cat: "Szociális", diff: "II" },
  { name: "Nyelvtudás", cat: "Szociális", diff: "I", cost: [2, 8, 15, 25, 40] },
  { name: "Párbaj", cat: "Szociális", diff: "II", attrs: ["Int", "Aszt", "Krz"], hard: ["Udvari etikett/intrika"] },
  { name: "Politika/diplomácia", cat: "Szociális", diff: "III", attrs: ["Int", "Aszt", "Krz"], hard: ["Udvari etikett/intrika"], soft: ["Történelem"] },
  { name: "Szexuális kultúra", cat: "Szociális", diff: "I", attrs: ["Aszt", "Krz"] },
  { name: "Színészet", cat: "Szociális", diff: "III", attrs: ["Aszt", "Krz"], hard: ["Lélektan"] },
  { name: "Udvari etikett/intrika", cat: "Szociális", diff: "II", attrs: ["Int", "Aszt", "Krz"], hard: ["Kultúra"] },

  // ── Misztikus (magic-system skills — spells point back to these) ────────────
  { name: "Démonológia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Ősi nyelv"] },
  { name: "Drágakőmágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"], hard: ["Szakma"] },
  { name: "Magasmágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"], hard: ["Ősi nyelv"] },
  { name: "Nekromancia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"], hard: ["Élettan"] },
  { name: "Őselemi mágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"], hard: ["Ősi nyelv"] },
  { name: "Pszi", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"] },
  { name: "Rúnamágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"], hard: ["Ősi nyelv"] },
  { name: "Tapasztalati mágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"] },
];

export const SKILLS: SkillDef[] = RAW.map(build);

export const SKILL_BY_NAME: Record<string, SkillDef> = SKILLS.reduce(
  (acc, s) => {
    acc[s.name] = s;
    return acc;
  },
  {} as Record<string, SkillDef>
);

export const isPercentageSkill = (name: string): boolean =>
  SKILL_BY_NAME[name]?.cost === "percentage";

// Convenience used by grants when a class/race teaches a starting skill.
export const taughtSkill = (
  skill: string,
  level: SkillFok,
  subtype?: string,
  atLevel?: number
): GrantEntry => grant({ kind: "grantSkill", skill, subtype, level }, atLevel);
