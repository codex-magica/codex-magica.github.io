// Compendium content adapters. Maps the (duplicated, book-faithful) reference data into table blocks
// whose columns mirror the old app's screens. Skills (tab 0) are handled in Compendium.tsx from the
// new model.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BardMagicValues } from "../data/bardMagic";
import { PrayerValues } from "../data/prayers";
import { PsiValues } from "../data/psi";
import { WitchMagicValues } from "../data/witchMagic";
import { WarlockMagicValues } from "../data/warlockMagic";
import { FireMagicValues } from "../data/fireMagic";
import { WeaponValues } from "../data/weapons";
import { ArmorValues, ShieldValues } from "../data/armor";
import { SkillValues } from "../data/skillsText";
import { MagasMagiaValues } from "../data/magasMagia";
import { SKILLS } from "../model/skills";

export interface TableCol { label: string; align?: "center" | "right" }
export interface TableRow {
  name: string;
  cells: string[];
  open: "modal" | "weapon";
  body?: string[];
  modalSub?: string;
  weapon?: { kind: "melee" | "ranged"; damage: string; range?: string; ke?: number; te?: number; ve?: number; ce?: number };
}
export interface TableBlock { title: string; nameLabel: string; columns: TableCol[]; rows: TableRow[] }

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

type Field = [string, (s: any) => string, ("center" | "right")?];

// generic spell table: grouped by `groupKey`; columns from `fields` but trimmed PER TABLE to the
// ones that actually carry data in that group (so a school's table shows only its real columns,
// like the book — no padded-empty columns). Click → detail modal.
function spellBlocks(values: any[], groupKey: string, nameLabel: string, school: string, unit: string, fields: Field[]): TableBlock[] {
  return group(values, (s) => s[groupKey]).map((g) => {
    const items = g.items.map((s) => ({
      name: s.name,
      cellsAll: fields.map(([, acc]) => acc(s)),
      modalSub: `${school} · ${/^\d+$/.test(String(s.cost)) ? `${s.cost} ${unit}` : s.cost}`,
      body: statsBody(s.description, [
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

const mana = (s: any) => `${s.cost} Mp`;
const COMMON: Field[] = [["Mana", mana], ["Idő", (s) => dash(s.castingTime)], ["Hatótáv", (s) => dash(s.range)], ["Időtartam", (s) => dash(s.duration)], ["ME", (s) => join(s.save)]];

// Magasmágia costs come as "3/E", a bare number, "Lásd a leírást!", or "-" — only append "Mp" when numeric.
const magasCost = (s: any) => {
  const c = dash(s.cost);
  if (c === "—") return "—";
  return /\d/.test(c) && !/mp/i.test(c) ? `${c} Mp` : c;
};
const MAGAS: Field[] = [["Mana", magasCost], ["Erősség", (s) => dash(s.erosseg)], ["Idő", (s) => dash(s.castingTime)], ["Hatótáv", (s) => dash(s.range)], ["Időtartam", (s) => dash(s.duration)], ["ME", (s) => join(s.save)]];

export function tabBlocks(tab: number): TableBlock[] {
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
    default:
      return [];
  }
}

// ── full skill descriptions (with per-fok text) for the skill modal ──
const PCT_SKILLS = new Set(SKILLS.filter((s) => s.cost === "percentage").map((s) => s.name));
const skillByName = new Map(SkillValues.map((s) => [s.name as string, s]));

const skillModel = new Map(SKILLS.map((s) => [s.name as string, s]));
// the compendium skill modal's sub-line — "(difficulty – attrs)" — reused by the character sheet
export function skillModalSub(name: string): string {
  const s = skillModel.get(name);
  if (!s) return "";
  const diff = s.cost === "percentage" ? "%" : s.difficulty;
  return `(${diff} – ${s.attrs.join(", ") || "–"})`;
}

// Every spell row (tabs 1–7) indexed by name → the SAME modalSub + body the compendium renders, so
// the character sheet can open an identical modal just from a spell name.
const spellIndex = (() => {
  const m = new Map<string, { sub: string; body: string[] }>();
  for (const tab of [1, 2, 3, 4, 5, 6, 7]) {
    for (const block of tabBlocks(tab)) {
      for (const r of block.rows) if (!m.has(r.name)) m.set(r.name, { sub: r.modalSub || "", body: r.body || [] });
    }
  }
  return m;
})();
export function spellModalByName(name: string): { sub: string; body: string[] } | null {
  return spellIndex.get(name) || null;
}

export function skillModalBody(name: string): string[] {
  const s = skillByName.get(name);
  if (!s) return ["A képzettség részletes leírása a kompendiumban hamarosan elérhető."];
  // keep `table:` entries verbatim — the modal renders them as real tables
  const desc = Array.isArray(s.description) ? s.description : [s.description];
  const foks: string[] = [];
  // Percentage skills have no discrete foks in the book — show only the general description.
  if (!PCT_SKILLS.has(name)) {
    for (let i = 1; i <= 5; i++) {
      const t = (s as any)[`lvl_${i}`];
      if (t) foks.push(`${i}. fok — ${t}`);
    }
  }
  const special = s.special ? [`Különleges: ${s.special}`] : [];
  return [...desc, ...foks, ...special];
}
