// Compendium content adapters. Maps the (duplicated, book-faithful) reference data into table blocks
// whose columns mirror the old app's screens. Skills (tab 0) are handled in Compendium.tsx from the
// new model.
import { SpellLike } from "../data/types";
import { BardMagicValues } from "../data/bardMagic";
import { PrayerValues } from "../data/prayers";
import { PsiValues } from "../data/psi";
import { WitchMagicValues } from "../data/witchMagic";
import { WarlockMagicValues } from "../data/warlockMagic";
import { FireMagicValues } from "../data/fireMagic";
import { WeaponValues } from "../data/weapons";
import { ArmorValues, ShieldValues } from "../data/armor";
import { SkillInfo, SkillValues } from "../data/skillsText";
import { MagasMagiaValues } from "../data/magasMagia";
import { CombatSituations } from "../data/combatSituations";
import { MundaneItems } from "../data/mundaneItems";
import { PoisonValues, PoisonEffects, PoisonCraftCosts, PoisonCraftPrices, ONSET_TIMES, DURATION_TIMES, poisonsIntro, poisonRules } from "../data/poisons";
import { combatSituationsIntro } from "../data/combatSituations";
import { mundaneItemsIntro } from "../data/mundaneItems";
import { skillsRules } from "../data/skillsRules";
import { SchoolRules } from "../data/magicRules";
import { magicRules1 } from "../data/magicRules1";
import { magicRules2 } from "../data/magicRules2";
import { magicRules3 } from "../data/magicRules3";
import { magicRules4 } from "../data/magicRules4";
import { magicRules5 } from "../data/magicRules5";
import { magicRules6 } from "../data/magicRules6";
import { magicRules7 } from "../data/magicRules7";
import { SKILLS, SkillDef } from "../model/skills";
import { homebrewProse, rulesHomebrew } from "../model/rulesVariants";
import { creationBlocks, creationIntro } from "./compendiumCharacter";

export interface TableCol { label: string; align?: "left" | "center" | "right"; grow?: number /* fr share of the width (default 1) */ }
export interface TableRow {
  name: string;
  cells: string[];
  open: "modal" | "weapon";
  body?: string[];
  modalSub?: string;
  note?: string; // no per-column values — this note spans the value columns instead ("Lásd a leírást!")
  weapon?: { kind: "melee" | "ranged"; damage: string; range?: string; ke?: number; te?: number; ve?: number; ce?: number };
}
export interface TableBlock {
  title: string;
  nameLabel: string;
  columns: TableCol[];
  rows: TableRow[];
  footer?: string;
  dense?: boolean; // cram the columns on desktop (like the weapons tab) instead of scrolling sideways
}

// ── the tab registry ──────────────────────────────────────────────────────────
// ONE entry per compendium tab (the index in this array IS the tab id). Nav grouping, search glyphs,
// rules prose, intros and layout quirks all live here — adding or reordering a tab means editing this
// array only. New tabs go at the END (search results and open tabs refer to the index); `lead` puts a
// tab at the top of the sidebar regardless of its index.
export interface TabDef {
  name: string;
  group: "Harc" | "Mágia" | "Felszerelés" | null; // sidebar section; null = standalone top-level item
  glyph: "book" | "spark" | "sword" | "shield" | "burst" | "coin" | "drop" | "person"; // search-result icon family
  lead?: boolean; // listed first in the sidebar, above the other standalone tabs
  special?: "skills"; // tab 0 renders the skill catalog from the model, not TableBlocks
  rules?: SchoolRules; // magic-school rules prose (chapter-level + per-block)
  headingRules?: string; // chapter-level rules for non-school tabs (skills, poisons)
  intro?: string; // paragraph under the page heading
  layout?: "dense" | "masonry" | "narrow"; // weapons: cram columns; items: two columns; text-ish: 760px
  // small right-aligned context in search results (spell cost, price, damage…)
  searchValue?: (row: TableRow, blockTitle: string) => string | undefined;
}

const spellCost = (r: TableRow) => r.modalSub?.split("·")[1]?.trim();

export const TABS: TabDef[] = [
  { name: "Képzettségek", group: null, glyph: "book", special: "skills", headingRules: skillsRules },
  { name: "Bárdmágia", group: "Mágia", glyph: "spark", rules: magicRules1, searchValue: spellCost },
  { name: "Szakrális Mágia", group: "Mágia", glyph: "spark", rules: magicRules2, searchValue: spellCost },
  { name: "Boszorkánymágia", group: "Mágia", glyph: "spark", rules: magicRules3, searchValue: spellCost },
  { name: "Boszorkánymesteri mágia", group: "Mágia", glyph: "spark", rules: magicRules4, searchValue: spellCost },
  { name: "Tűzmágia", group: "Mágia", glyph: "spark", rules: magicRules5, searchValue: spellCost },
  { name: "Pszi", group: "Mágia", glyph: "spark", rules: magicRules6, searchValue: spellCost },
  { name: "Magasmágia", group: "Mágia", glyph: "spark", rules: magicRules7, searchValue: spellCost },
  { name: "Fegyverek", group: "Felszerelés", glyph: "sword", layout: "dense", searchValue: (r) => r.cells[1] },
  { name: "Páncélok", group: "Felszerelés", glyph: "shield", searchValue: (r) => r.modalSub?.split("·")[0]?.trim() },
  { name: "Harci helyzetek", group: "Harc", glyph: "burst", layout: "narrow", intro: combatSituationsIntro },
  { name: "Tárgyak és árak", group: "Felszerelés", glyph: "coin", layout: "masonry", intro: mundaneItemsIntro, searchValue: (r) => r.cells[0] },
  { name: "Mérgek", group: "Felszerelés", glyph: "drop", layout: "narrow", intro: poisonsIntro, headingRules: poisonRules, searchValue: (r, block) => (block === "Példamérgek" ? r.cells[4] : undefined) },
  { name: "Karakteralkotás", group: null, lead: true, glyph: "person", intro: creationIntro },
];

const arr = (d: string | string[]): string[] => (Array.isArray(d) ? d : [d]);
const dash = (v: unknown): string => (v === undefined || v === null || v === "" || v === "-" ? "—" : String(v));
const join = (v: unknown): string => (Array.isArray(v) ? (v.length ? v.join(", ") : "—") : dash(v));

function group<T>(items: T[], getGroup: (t: T) => string): { name: string; items: T[] }[] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const g = getGroup(it);
    if (!m.has(g)) m.set(g, []);
    m.get(g)!.push(it);
  }
  return Array.from(m, ([name, items]) => ({ name, items }));
}

const statsBody = (desc: string | string[], pairs: [string, unknown][]): string[] => {
  const line = pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "-")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join(" · ");
  // tag with "stats:" so the modal renders it as an accentuated stat block (label/value chips)
  return line ? [`stats:${line}`, ...arr(desc)] : arr(desc);
};

type Field = [string, (s: SpellLike) => string, ("center" | "right")?];

// generic spell table: grouped by `groupKey`; columns from `fields` but trimmed PER TABLE to the
// ones that actually carry data in that group (so a school's table shows only its real columns,
// like the book — no padded-empty columns). Click → detail modal.
function spellBlocks(values: SpellLike[], groupKey: "type" | "source", nameLabel: string, school: string, unit: string, fields: Field[]): TableBlock[] {
  return group(values, (s) => s[groupKey] ?? "").map((g) => {
    const items = g.items.map((s) => ({
      name: s.name,
      cellsAll: fields.map(([, acc]) => acc(s)),
      modalSub: `${school} · ${/^\d+$/.test(String(s.cost)) ? `${s.cost} ${unit}` : s.cost}`,
      body: statsBody(s.description, [
        ["Szféra", s.domains?.length ? s.domains : undefined],
        ["Erősség", s.erosseg],
        ["Időigény", s.castingTime],
        ["Hatótáv", s.range],
        ["Lappangás", s.incubationPeriod],
        ["Időtartam", s.duration],
        ["Égés időtartam", s.burnDuration],
        ["Méret", s.size],
        ["Harci módosító", s.combatModifier],
        ["Készítési ár", s.ingredientsCost],
        ["Eladási ár", s.sellPrice],
        ["Mágiaellenállás", Array.isArray(s.save) ? s.save.join(", ") : s.save],
      ]),
    }));
    const keep = fields.map((_, ci) => items.some((it) => it.cellsAll[ci] !== "—" && it.cellsAll[ci] !== ""));
    const columns: TableCol[] = fields.filter((_, ci) => keep[ci]).map(([label, , align]) => ({ label, align: align || "center" }));
    return {
      title: g.name,
      nameLabel,
      columns,
      rows: items.map((it) => ({ name: it.name, cells: it.cellsAll.filter((_, ci) => keep[ci]), open: "modal" as const, modalSub: it.modalSub, body: it.body })),
    };
  });
}

const mana = (s: SpellLike) => `${s.cost} Mp`;
const COMMON: Field[] = [["Mana", mana], ["Idő", (s) => dash(s.castingTime)], ["Hatótáv", (s) => dash(s.range)], ["Időtartam", (s) => dash(s.duration)], ["ME", (s) => join(s.save)]];

// Magasmágia costs come as "3/E", a bare number, "Lásd a leírást!", or "-" — only append "Mp" when numeric.
const magasCost = (s: SpellLike) => {
  const c = dash(s.cost);
  if (c === "—") return "—";
  return /\d/.test(c) && !/mp/i.test(c) ? `${c} Mp` : c;
};
const MAGAS: Field[] = [["Mana", magasCost], ["Erősség", (s) => dash(s.erosseg)], ["Idő", (s) => dash(s.castingTime)], ["Hatótáv", (s) => dash(s.range)], ["Időtartam", (s) => dash(s.duration)], ["ME", (s) => join(s.save)]];

// The blocks are pure functions of static data — build each tab once, on first visit, and reuse
// (Compendium re-renders per keystroke in search; rebuilding hundreds of rows each time is waste).
// Only the Karakteralkotás tab differs between the rules variants (the house rules reshape class and
// race skill packages), so the cache key carries the variant for that tab alone.
const tabBlocksCache = new Map<string, TableBlock[]>();
export function tabBlocks(tab: number, homebrew = false): TableBlock[] {
  const hb = homebrew && tab === 13;
  const key = `${tab}:${hb ? "hb" : "base"}`;
  let blocks = tabBlocksCache.get(key);
  if (!blocks) {
    blocks = buildTabBlocks(tab, hb);
    tabBlocksCache.set(key, blocks);
  }
  return blocks;
}

function buildTabBlocks(tab: number, homebrew = false): TableBlock[] {
  switch (tab) {
    case 1: // Bárdmágia
      return spellBlocks(BardMagicValues, "type", "Varázslat", "Bárdmágia", "Mp", COMMON);
    case 2: // Szakrális
      return spellBlocks(PrayerValues, "source", "Fohász", "Szakrális", "Kegy", [
        ["Szféra", (s) => join(s.domains)],
        ["Kegy", (s) => `${s.cost} Kegy`],
        ["Idő", (s) => dash(s.castingTime)],
        ["Hatótáv", (s) => dash(s.range)],
        ["Időtartam", (s) => dash(s.duration)],
        ["ME", (s) => join(s.save)],
      ]);
    case 3: // Boszorkánymágia
      return spellBlocks(WitchMagicValues, "type", "Varázslat", "Boszorkánymágia", "Mp", COMMON);
    case 4: // Boszorkánymesteri
      return spellBlocks(WarlockMagicValues, "type", "Varázslat", "Boszorkánymesteri", "Mp", [
        ["Mana", mana],
        ["Idő", (s) => dash(s.castingTime)],
        ["Hatótáv", (s) => dash(s.range)],
        ["Lappangás", (s) => dash(s.incubationPeriod)],
        ["Időtartam", (s) => dash(s.duration)],
        ["ME", (s) => join(s.save)],
      ]);
    case 5: // Tűzmágia
      return spellBlocks(FireMagicValues, "type", "Varázslat", "Tűzmágia", "Mp", [
        ["Mana", mana],
        ["Idő", (s) => dash(s.castingTime)],
        ["Időtartam", (s) => dash(s.duration)],
        ["Harci mód.", (s) => dash(s.combatModifier)],
      ]);
    case 6: // Pszi
      return spellBlocks(PsiValues, "type", "Diszciplína", "Pszi", "Ψp", [
        ["Szint", (s) => String(s.level)],
        ["Pszi", (s) => `${s.cost} Ψp`],
        ["Idő", (s) => dash(s.castingTime)],
        ["Időtartam", (s) => dash(s.duration)],
        ["ME", (s) => join(s.save)],
      ]);
    case 7: // Magasmágia
      return spellBlocks(MagasMagiaValues, "type", "Varázslat", "Magasmágia", "Mp", MAGAS);
    case 8: // Fegyverek → calculator (full column set, like the old app — scrolls if cramped)
      return group(WeaponValues, (w) => w.subType).map((g) => ({
        title: g.name,
        nameLabel: "Fegyver",
        columns: [
          { label: "Időig." }, { label: "Sebz." }, { label: "KÉ" }, { label: "TÉ" }, { label: "CÉ" }, { label: "VÉ" },
          { label: "Táv" }, { label: "Súly" }, { label: "Ár" }, { label: "Lf" }, { label: "Ft" }, { label: "Át" }, { label: "STP" },
        ],
        rows: g.items.map((w) => ({
          name: w.name,
          cells: [
            dash(w.attackDuration), dash(w.damage), dash(w.KÉ), dash(w.TÉ), dash(w.CÉ), dash(w.VÉ),
            dash(w.range), dash(w.weight), dash(w.cost), w.canDisarm ? "✓" : "—", w.canDestroyWeapons ? "✓" : "—", w.canPierce ? "✓" : "—", String(w.STP),
          ],
          open: "modal" as const,
          modalSub: w.subType,
          body: statsBody(w.description, [
            ["Sebzés", w.damage], ["Időigény", w.attackDuration],
            ["KÉ", w.KÉ], ["TÉ", w.TÉ], ["CÉ", w.CÉ], ["VÉ", w.VÉ],
            ["Hatótáv", w.range], ["Súly", w.weight], ["Ár", w.cost], ["STP", w.STP],
            ["Lefegyverzés", w.canDisarm ? "igen" : undefined],
            ["Fegyvertörés", w.canDestroyWeapons ? "igen" : undefined],
            ["Átütés", w.canPierce ? "igen" : undefined],
          ]),
        })),
      }));
    case 9: // Páncélok
      return [
        {
          title: "Páncélok",
          nameLabel: "Vértezet",
          columns: [{ label: "SFÉ" }, { label: "MGT" }, { label: "STP" }, { label: "Súly" }, { label: "Ár" }],
          rows: ArmorValues.map((a) => ({
            name: a.name,
            cells: [String(a.SFÉ), String(a.MGT), dash(a.STP), dash(a.weight), dash(a.cost)],
            open: "modal" as const,
            modalSub: `SFÉ ${a.SFÉ} · MGT ${a.MGT}`,
            body: arr(a.description),
          })),
        },
        {
          title: "Pajzsok",
          nameLabel: "Pajzs",
          columns: [{ label: "VÉ" }, { label: "KÉ" }, { label: "TÉ" }, { label: "Sebzés" }, { label: "MGT" }, { label: "Súly" }, { label: "Ár" }],
          rows: ShieldValues.map((s) => ({
            name: s.name,
            cells: [dash(s.VÉ), dash(s.KÉ), dash(s.TÉ), dash(s.damage), String(s.MGT), dash(s.weight), dash(s.cost)],
            open: "modal" as const,
            modalSub: `VÉ ${s.VÉ} · MGT ${s.MGT}`,
            body: arr(s.description),
          })),
        },
      ];
    case 10: // Harci helyzetek (Harcrendszer fejezet)
      return [
        {
          title: "Harci helyzetek",
          nameLabel: "Harci helyzet",
          columns: [{ label: "KÉ" }, { label: "TÉ" }, { label: "VÉ" }, { label: "CÉ" }],
          rows: CombatSituations.map((c) => ({
            name: c.name,
            cells: [c.ke, c.te, c.ve, c.ce],
            note: c.note,
            open: "modal" as const,
            modalSub: "Harci helyzet",
            body: c.note
              ? c.description
              : [`stats:KÉ: ${c.ke} · TÉ: ${c.te} · VÉ: ${c.ve} · CÉ: ${c.ce}`, ...c.description],
          })),
        },
      ];
    case 11: // Tárgyak és árak (Pénz, felszerelés fejezet) — price list only, rows are not clickable
      return MundaneItems.map((g) => ({
        title: g.group,
        nameLabel: g.nameLabel,
        footer: g.footer,
        columns: [{ label: "Ár", align: "right" as const }],
        rows: g.items.map((it) => ({ name: it.name, cells: [it.price], open: "modal" as const })),
      }));
    case 12: // Mérgek és mérgezés (példamérgek + a mérgezés kis szabálytáblázatai)
      return [
        {
          title: "Méregkeverés — egyedi méreg összeállítása",
          nameLabel: "Ip / képesség",
          columns: [{ label: "Méregtípus" }, { label: "Hatás" }, { label: "Időtartam" }, { label: "Hatóidő" }],
          footer:
            "A 0. szintű méreg Ip költsége a négy képesség Ip értékének összege; minden további szint +3 Ip. A KM engedélyével különleges, ritka alapanyagokkal a szint legfeljebb hárommal növelhető Ip költség nélkül. Sikeres Egészségpróba esetén a méregkeverő által választott, legalább egy kategóriával gyengébb hatás érvényesül, egy kategóriával rövidebb időtartammal.",
          rows: PoisonCraftCosts.map((c) => ({
            name: c.ip,
            cells: [c.type, c.effect, c.duration, c.onset],
            open: "modal" as const,
          })),
        },
        {
          title: "A kikevert méreg ára (1 adag)",
          nameLabel: "Szükséges Ip",
          columns: [{ label: "Ár" }],
          footer:
            "Saját laboratóriumban, a Herbalizmus, illetve az Alkímia képzettség birtokában előállítva az ár a fentiek harmada. A Fájdalom hatású mérgek sebzése a méregkeverő minden képzettségi foka után 1k6 Sp.",
          rows: PoisonCraftPrices.map((p) => ({ name: p.ip, cells: [p.price], open: "modal" as const })),
        },
        {
          title: "A mérgek hatásai",
          nameLabel: "Hatás",
          columns: [{ label: "Erő" }, { label: "Gy" }, { label: "Ügy" }, { label: "Áks" }, { label: "Akr" }, { label: "Érz" }],
          footer:
            "A méreg hatásának múlásával az áldozat a méreg típusához tartozó összes enyhébb hatáson keresztülmegy.",
          rows: PoisonEffects.map((e) => ({
            name: e.name,
            cells: e.mods ? [e.mods.ero, e.mods.gy, e.mods.ugy, e.mods.aks, e.mods.akr, e.mods.erz] : ["—", "—", "—", "—", "—", "—"],
            open: "modal" as const,
            modalSub: "Méreghatás",
            body: e.mods
              ? [`stats:Erő: ${e.mods.ero} · Gyorsaság: ${e.mods.gy} · Ügyesség: ${e.mods.ugy} · Állóképesség: ${e.mods.aks} · Akaraterő: ${e.mods.akr} · Érzékelés: ${e.mods.erz}`, e.meaning]
              : [e.meaning],
          })),
        },
        {
          title: "Egészségpróba módosítók",
          nameLabel: "Feltétel",
          columns: [{ label: "Módosító" }],
          footer:
            "Sikeres Egészségpróba esetén csak a méreg enyhébb hatása érvényesül, sikertelen próbánál a súlyosabb.",
          rows: [
            { name: "A méreg szintje (0–5.)", cells: ["-0 … -5"] },
            { name: "Az áldozat csak a méreg eltávolításával foglalkozik", cells: ["+2"] },
            { name: "Pszi Képességjavítás diszciplína", cells: ["az Egészségjavítás szerint"] },
            { name: "A szervezet hozzá volt szoktatva az adott méreghez", cells: ["+1-5"] },
            { name: "Mérgezéstől óvó varázstárgyak", cells: ["a tárgy E-jétől függően"] },
            { name: "Ellenméreg", cells: ["+5"] },
            { name: "Minden további adag méreg", cells: ["-1"] },
          ].map((r) => ({ ...r, open: "modal" as const })),
        },
        {
          title: "Fegyverméreg — szükséges adag",
          nameLabel: "Fegyver",
          columns: [{ label: "Adag" }],
          footer:
            "A feltüntetett adagnak legfeljebb a kétszerese kenhető egy fegyverre; ennél kevesebbet használva a méreg hatása egy osztályt esik minden hiányzó adag után.",
          rows: [
            { name: "Tű", cells: ["1"] },
            { name: "Nyílvessző", cells: ["1"] },
            { name: "Tőr", cells: ["2"] },
            { name: "Rövidkard", cells: ["4"] },
            { name: "Hosszúkard", cells: ["6"] },
            { name: "Lovagkard", cells: ["7"] },
          ].map((r) => ({ ...r, open: "modal" as const })),
        },
        {
          title: "Példamérgek",
          nameLabel: "Méreg",
          columns: [{ label: "Szint" }, { label: "Hatás" }, { label: "Hatóidő" }, { label: "Időtartam" }, { label: "Ár", align: "right" as const }],
          rows: PoisonValues.map((p) => ({
            name: p.name,
            cells: [`${p.level}.`, p.effect, p.onset, p.duration, p.price],
            open: "modal" as const,
            modalSub: `${p.level}. szintű ${p.kind}`,
            body: statsBody(p.description, [
              ["Hatás (siker / kudarc)", p.effect],
              ["Támadott rendszer", p.system],
              ["Hatóidő", `${p.onset} (${ONSET_TIMES[p.onset]})`],
              ["Időtartam", `${p.duration} (${DURATION_TIMES[p.duration]})`],
              ["Ár (adagonként)", p.price],
            ]),
          })),
        },
      ];
    case 13: // Karakteralkotás (tulajdonságok, fajok, kasztok, hátterek, pontelosztás) — generated from the rules model
      return creationBlocks(homebrew);
    default:
      return [];
  }
}

// ── full skill descriptions (with per-fok text) for the skill modal ──
// Two (model, prose) table sets: the base catalog (eager — the compendium always shows it) and the
// homebrew skill-rework variant (lazy — only characters created with the house rule open it).
type SkillTables = { model: Map<string, SkillDef>; prose: Map<string, SkillInfo>; pct: Set<string> };
const mkTables = (defs: SkillDef[], prose: SkillInfo[]): SkillTables => ({
  model: new Map(defs.map((s) => [s.name as string, s])),
  prose: new Map(prose.map((s) => [s.name as string, s])),
  pct: new Set(defs.filter((s) => s.cost === "percentage").map((s) => s.name)),
});
const baseTables = mkTables(SKILLS, SkillValues);
let hbTables: SkillTables | null = null;
const tablesFor = (homebrew: boolean | undefined): SkillTables => {
  if (!homebrew) return baseTables;
  if (!hbTables) {
    const db = rulesHomebrew();
    hbTables = mkTables(Object.keys(db.skills).map((n) => db.skills[n]), homebrewProse());
  }
  return hbTables;
};

// the compendium skill modal's sub-line — "(difficulty – attrs)" — reused by the character sheet
export function skillModalSub(name: string, homebrew?: boolean): string {
  const s = tablesFor(homebrew).model.get(name);
  if (!s) return "";
  const diff = s.cost === "percentage" ? "%" : s.difficulty;
  return `(${diff} – ${s.attrs.join(s.attrsAny ? " vagy " : ", ") || "–"})`;
}

// Every spell row (tabs 1–7) indexed by school + name → the SAME modalSub + body the compendium
// renders, so the character sheet can open an identical modal from a spell's school and name. The
// school is part of the key because a dozen names are shared across schools (Transz is both a prayer
// and a psi discipline; Láthatatlanság is both bard and witch magic). Built lazily on the first
// lookup — the app shouldn't pay for all seven spell tabs at startup.
type SpellModal = { sub: string; body: string[] };
const SPELL_TAB_SCHOOL: Record<number, string> = {
  1: "Bárdmágia", 2: "Szakrális", 3: "Boszorkánymágia", 4: "Boszorkánymesteri",
  5: "Tűzmágia", 6: "Pszi", 7: "Magasmágia",
}; // the school names SpellDef uses (model/spells.ts) — the sheet passes them straight through
let spellIndex: Map<string, SpellModal> | null = null;
export function spellModalByName(name: string, school?: string): SpellModal | null {
  if (!spellIndex) {
    spellIndex = new Map();
    for (const tab of [1, 2, 3, 4, 5, 6, 7]) {
      for (const block of tabBlocks(tab)) {
        for (const r of block.rows) {
          const entry = { sub: r.modalSub || "", body: r.body || [] };
          const key = `${SPELL_TAB_SCHOOL[tab]}|${r.name}`;
          if (!spellIndex.has(key)) spellIndex.set(key, entry);
          if (!spellIndex.has(r.name)) spellIndex.set(r.name, entry); // fallback for callers with no school
        }
      }
    }
  }
  return (school ? spellIndex.get(`${school}|${name}`) : undefined) || spellIndex.get(name) || null;
}

// The full skill-modal content, identical everywhere it opens (compendium, creator panel, sheet).
// With `own`, adds the character-aware strip ("A te fokod…") and the current-fok gating.
export function skillModalContent(name: string, own?: { fok: number; percent?: number | null }, homebrew?: boolean) {
  const percent = own?.percent;
  const fok = own?.fok ?? 0;
  return {
    kind: "skill" as const,
    name,
    sub: skillModalSub(name, homebrew),
    body: skillModalBody(name, homebrew),
    levelStrip: percent != null ? `A te értéked: ${percent}%` : fok > 0 ? `A te fokod: ${fok}.` : undefined,
    currentFok: percent == null && fok > 0 ? fok : undefined,
  };
}

export function skillModalBody(name: string, homebrew?: boolean): string[] {
  const s = tablesFor(homebrew).prose.get(name);
  if (!s) return ["A képzettség részletes leírása a kompendiumban hamarosan elérhető."];
  // keep `table:` entries verbatim — the modal renders them as real tables
  const desc = Array.isArray(s.description) ? s.description : [s.description];
  const foks: string[] = [];
  // Percentage skills have no discrete foks in the book — show only the general description.
  if (!tablesFor(homebrew).pct.has(name)) {
    for (let i = 1; i <= 5; i++) {
      const t = s[`lvl_${i}` as "lvl_1" | "lvl_2" | "lvl_3" | "lvl_4" | "lvl_5"];
      if (t) foks.push(`${i}. fok — ${t}`);
    }
  }
  const special = s.special ? [`Különleges: ${s.special}`] : [];
  return [...desc, ...foks, ...special];
}
