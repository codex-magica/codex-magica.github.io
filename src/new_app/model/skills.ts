// The skill catalog (képzettségek). Mechanical layer only — prose lives in the book/compendium.
// Costs, difficulties, governing attributes and prerequisites are transcribed verbatim from
// chapter 16 (the cost table at lines ~146–267). Per-skill cost arrays are stored explicitly
// because the book deviates from the difficulty curve for a few skills (Mechanika, Kultúra,
// Nyelvtudás), so the table — not the difficulty letter — is authoritative for Kp cost.

import { Stat, STAT_BY_SHORT } from "./attributes";
import { Effect, GrantEntry, grant } from "./effects";
import { SkillCategory, SkillDifficulty, SkillFok, SkillRef } from "./common";
import { WeaponValues } from "../data/weapons";

export type SkillCost = number[] | "percentage"; // cumulative Kp per fok (length 5), or %-based

// How a skill specializes (branches). A skill instance is identified by a path of subtype segments; each
// BranchLevel describes one depth of that path. No `branch` at all ⇒ the skill can't specialize
// (Futás, Úszás, every percentage skill).
export interface BranchOption {
  name: string;
  attrs?: Stat[]; // this branch's own attribute requirements (e.g. a Fegyverhasználat weapon category)
  children?: string[]; // suggested next-level specifics under this option (e.g. the weapons in a category)
}
export interface BranchLevel {
  label: string; // "tradíció" | "kategória" | "fegyver" | "ág" — shown in the branch UI
  source: "fixed" | "open"; // enumerated dropdown vs free-form (player-typed)
  options?: BranchOption[]; // for "fixed"
  chooseAttrs?: boolean; // "open": the player sets this branch's attribute requirements (Művészetek)
  capFok?: SkillFok; // a node at this depth can't exceed this fok directly (Fegyverhasználat kategória = 2)
  branchAbove?: SkillFok; // to exceed `branchAbove`, you MUST branch to the next depth (forced branching)
}
// A choice forced when an instance reaches a fok. attrBonus = the existing fok-4 +1 attribute pick;
// path = a committing choice that gates later progress (Pszi tudat/test at fok 3).
export type FokTrigger =
  | { kind: "attrBonus"; atFok: SkillFok }
  | { kind: "path"; atFok: SkillFok; label: string; options: string[] };

export interface SkillDef {
  name: string;
  category: SkillCategory;
  difficulty: SkillDifficulty;
  cost: SkillCost;
  attrs: Stat[]; // default required/governing attributes (a branch may override via BranchOption/chooseAttrs)
  hardReq: SkillRef[]; // strong prereq — must be owned at >= target fok
  softReq: SkillRef[]; // weak prereq   — must be owned at >= target fok − 1
  perFokEffects?: Partial<Record<SkillFok, Effect[]>>;
  branch?: BranchLevel[]; // branching structure; absent ⇒ non-branchable
  fokTriggers?: FokTrigger[]; // choices forced at a fok
  subtypes?: string[]; // DEPRECATED (kept for the not-yet-migrated UI/engine); derived from branch[0]
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
  subtypes?: string[]; // shorthand: a single fixed branch level with these options
  branch?: BranchLevel[]; // explicit branching (categories, open, multi-level)
  fokTriggers?: FokTrigger[];
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
  // Explicit branch wins; else a fixed level from `subtypes`; else non-branchable.
  branch: r.branch ?? (r.subtypes ? [{ label: "altípus", source: "fixed", options: r.subtypes.map((name) => ({ name })) }] : undefined),
  fokTriggers: r.fokTriggers,
  subtypes: r.subtypes ?? (r.branch?.[0]?.source === "fixed" ? r.branch[0].options?.map((o) => o.name) : undefined),
});

// Weapon-group categories for Fegyverhasználat: fok 1–2 at the group, then branch to a specific weapon
// (fok 3+). The group defines the attribute requirements (ranged needs only Ügy+Érz).
// Specific weapons per category, pulled from the weapon table (data/weapons.ts) by its subType groups.
// A trailing "(...)" variant (e.g. "elf íj (lélektelen)") collapses to the base weapon and is de-duped —
// for training purposes it's the same weapon.
const wpn = (...subTypes: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of WeaponValues) {
    if (!subTypes.includes(w.subType)) continue;
    const name = w.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (!seen.has(name)) { seen.add(name); out.push(name); }
  }
  return out;
};
const WEAPON_CATEGORIES: BranchOption[] = [
  { name: "egykezes kardok", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: wpn("Egykezes kardok") },
  { name: "kétkezes kardok", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: wpn("Nehézkardok") },
  { name: "csatabárdok", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: wpn("Csatabárdok", "Nehéz csatabárdok") },
  { name: "buzogányok", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: wpn("Buzogányok") },
  { name: "botok", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: wpn("Botok") },
  { name: "nyeles fegyverek", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: wpn("Nyeles fegyverek") },
  { name: "tőr jellegű fegyverek", attrs: ["Gyorsaság", "Ügyesség"], children: wpn("Tőr jellegű fegyverek") },
  { name: "íjak", attrs: ["Ügyesség", "Érzékelés"], children: wpn("Íjak") },
  { name: "számszeríjak", attrs: ["Ügyesség", "Érzékelés"], children: wpn("Nyílpuskák") },
  { name: "hajítófegyverek", attrs: ["Erő", "Ügyesség", "Érzékelés"], children: wpn("Hajítófegyverek") },
  { name: "dobófegyverek", attrs: ["Erő", "Ügyesség", "Érzékelés"], children: wpn("Egyéb célzófegyverek") },
  { name: "pajzsok", attrs: ["Erő", "Gyorsaság", "Ügyesség"], children: [] },
];

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
  { name: "Fegyverhasználat", cat: "Harci", diff: "III", attrs: ["Erő", "Gy", "Ügy", "Érz"], branch: [{ label: "kategória", source: "fixed", options: WEAPON_CATEGORIES, capFok: 2, branchAbove: 2 }, { label: "fegyver", source: "open" }] },
  { name: "Fegyverismeret", cat: "Harci", diff: "II", attrs: ["Int", "Érz"] },
  { name: "Hadvezetés", cat: "Harci", diff: "III", attrs: ["Int", "Krz"], soft: ["Lélektan", "Térképészet"] },
  { name: "Harci láz", cat: "Harci", diff: "II", attrs: ["Áks", "Egs"] },
  { name: "Harcművészet", cat: "Harci", diff: "IV", attrs: ["Erő", "Gy", "Ügy", "Akr"], branch: [{ label: "stílus", source: "open" }] },
  {
    name: "Harctéri gyakorlat", cat: "Harci", diff: "II", attrs: ["Gy", "Ügy", "Érz"],
    // Fok 3+ grants HM per level (book ch.16, line 470/474/480).
    perFok: {
      3: [{ kind: "resourcePerLevel", resource: "HM", amount: 1 }],
      4: [{ kind: "resourcePerLevel", resource: "HM", amount: 2 }],
      5: [{ kind: "resourcePerLevel", resource: "HM", amount: 3 }],
    },
  },
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
  { name: "Állatismeret", cat: "Világi", diff: "I", branch: [{ label: "fajta", source: "open" }] },
  { name: "Csapdaállítás", cat: "Világi", diff: "II", attrs: ["Ügy"], soft: ["Mechanika", "Csomózás"] },
  { name: "Csomózás", cat: "Világi", diff: "II", attrs: ["Ügy"] },
  { name: "Értékbecslés", cat: "Világi", diff: "I", attrs: ["Int", "Érz"] },
  { name: "Futás", cat: "Világi", diff: "I", attrs: ["Áks", "Egs"] },
  { name: "Hajózás", cat: "Világi", diff: "II", attrs: ["Érz"] },
  { name: "Hangutánzás", cat: "Világi", diff: "II", attrs: ["Érz"], cost: [2, 5, 10, 20, 30], soft: ["Állatismeret"] },
  { name: "Helyismeret", cat: "Világi", diff: "I", branch: [{ label: "hely", source: "open" }] },
  { name: "Idomítás", cat: "Világi", diff: "II", attrs: ["Aszt"], hard: ["Állatismeret"] },
  { name: "Időjóslás", cat: "Világi", diff: "II", attrs: ["Érz", "Int"] },
  { name: "Kocsihajtás", cat: "Világi", diff: "I", attrs: ["Ügy"], soft: ["Állatismeret"] },
  { name: "Lovaglás", cat: "Világi", diff: "I", attrs: ["Ügy"], soft: ["Állatismeret"] },
  { name: "Nyomolvasás", cat: "Világi", diff: "II", attrs: ["Érz"] },
  { name: "Szakma", cat: "Világi", diff: "II", branch: [{ label: "szakma", source: "open" }] },
  { name: "Úszás", cat: "Világi", diff: "I", attrs: ["Erő", "Áks", "Egs"] },
  { name: "Vadonjárás", cat: "Világi", diff: "II", attrs: ["Érz"], soft: ["Állatismeret", "Herbalizmus"], branch: [{ label: "terep", source: "open" }] },
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
  { name: "Ősi nyelv", cat: "Tudományos", diff: "IV", attrs: ["Int"], soft: ["Írás/olvasás"], branch: [{ label: "nyelv", source: "fixed", options: [{ name: "aquir" }, { name: "kyr" }, { name: "godoni" }, { name: "crantai" }, { name: "óelf" }, { name: "lingua domini" }, { name: "toroni" }] }] },
  { name: "Számtan/Mértan", cat: "Tudományos", diff: "III", attrs: ["Int"], soft: ["Írás/olvasás"] },
  { name: "Térképészet", cat: "Tudományos", diff: "III", attrs: ["Int"], hard: ["Számtan/Mértan"], soft: ["Művészetek"] },
  { name: "Történelem", cat: "Tudományos", diff: "II", attrs: ["Int"], soft: ["Írás/olvasás"] },
  {
    name: "Vallásismeret", cat: "Tudományos", diff: "II", attrs: ["Int", "Aszt"], hard: ["Kultúra"],
    // Subtype = the deity; a priest's Vallásismeret(deity) opens that god's szakrális prayers.
    subtypes: ["Arel", "Darton", "Domvik", "Dreina", "Krad", "Kyel", "Ranagol", "Sogron", "Tharr", "Uwel"],
    // Fok 3+ grants Kegy per level (needs the Kegyelt pool), plus per-level TME from faith.
    perFok: {
      3: [
        { kind: "resourcePerLevel", resource: "Kegy", amount: 1 },
        { kind: "derivedPerLevel", target: "MME", amount: 1 },
        { kind: "derivedPerLevel", target: "AME", amount: 1 },
      ],
      4: [
        { kind: "resourcePerLevel", resource: "Kegy", amount: 2 },
        { kind: "derivedPerLevel", target: "MME", amount: 2 },
        { kind: "derivedPerLevel", target: "AME", amount: 2 },
      ],
      5: [
        { kind: "resourcePerLevel", resource: "Kegy", amount: 3 },
        { kind: "derivedPerLevel", target: "MME", amount: 3 },
        { kind: "derivedPerLevel", target: "AME", amount: 3 },
      ],
    },
  },

  // ── Szociális ──────────────────────────────────────────────────────────────
  { name: "Ékesszólás", cat: "Szociális", diff: "II", attrs: ["Int", "Aszt", "Krz"], hard: ["Kultúra"], soft: ["Lélektan"] },
  { name: "Heraldika", cat: "Szociális", diff: "II", attrs: ["Int"], hard: ["Kultúra"] },
  { name: "Kultúra", cat: "Szociális", diff: "I", cost: [3, 8, 15, 25, 40], hard: ["Nyelvtudás"] },
  { name: "Lélektan", cat: "Szociális", diff: "III", attrs: ["Int", "Aszt", "Érz"] },
  { name: "Művészetek", cat: "Szociális", diff: "II", branch: [{ label: "ág", source: "open", chooseAttrs: true }] },
  { name: "Nyelvtudás", cat: "Szociális", diff: "I", cost: [2, 8, 15, 25, 40], branch: [{ label: "nyelv", source: "open" }] },
  { name: "Párbaj", cat: "Szociális", diff: "II", attrs: ["Int", "Aszt", "Krz"], hard: ["Udvari etikett/intrika"] },
  { name: "Politika/diplomácia", cat: "Szociális", diff: "III", attrs: ["Int", "Aszt", "Krz"], hard: ["Udvari etikett/intrika"], soft: ["Történelem"] },
  { name: "Szexuális kultúra", cat: "Szociális", diff: "I", attrs: ["Aszt", "Krz"] },
  { name: "Színészet", cat: "Szociális", diff: "III", attrs: ["Aszt", "Krz"], hard: ["Lélektan"] },
  { name: "Udvari etikett/intrika", cat: "Szociális", diff: "II", attrs: ["Int", "Aszt", "Krz"], hard: ["Kultúra"] },

  // ── Misztikus (magic-system skills — spells point back to these) ────────────
  { name: "Démonológia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Ősi nyelv"] },
  { name: "Drágakőmágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Szakma"] },
  {
    name: "Magasmágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Ősi nyelv"],
    perFok: {
      3: [{ kind: "resourcePerLevel", resource: "Mana", amount: 1 }],
      4: [{ kind: "resourcePerLevel", resource: "Mana", amount: 2 }],
      5: [{ kind: "resourcePerLevel", resource: "Mana", amount: 3 }],
    },
  },
  { name: "Nekromancia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Élettan"] },
  { name: "Őselemi mágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Ősi nyelv"] },
  { name: "Pszi", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr", "Aszt"], subtypes: ["pyarroni", "kyr", "godoni", "slan"], fokTriggers: [{ kind: "path", atFok: 3, label: "Pszi út", options: ["tudat", "test"] }] },
  { name: "Rúnamágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"], hard: ["Ősi nyelv"] },
  {
    name: "Tapasztalati mágia", cat: "Misztikus", diff: "IV", attrs: ["Int", "Akr"],
    // Empirical magic — one skill, one tradition per subtype. Each (at fok 3) unlocks its whole list.
    subtypes: ["bárd", "tűzmágia", "boszorkány", "boszorkánymester"],
    // The empirical-magic skill grants Mana per level from fok 3 (the casting threshold).
    perFok: {
      3: [{ kind: "resourcePerLevel", resource: "Mana", amount: 1 }],
      4: [{ kind: "resourcePerLevel", resource: "Mana", amount: 2 }],
      5: [{ kind: "resourcePerLevel", resource: "Mana", amount: 3 }],
    },
  },
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
