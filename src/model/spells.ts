// Spells (varázslatok / imák / pszi diszciplínák), GENERATED from the book-faithful compendium data.
// Each spell lists the requirement(s) that unlock it (ALL must be met — AND) and the pool it spends from.
//   known   = every requirement's skill is owned at its fok AND the spell's pool exists (the pool is the
//             background proxy: Mágikus fogékonyság / Pszi érzékenység / Kegyelt háttér gate the pool).
//   castable = known AND the pool currently holds >= cost.
import { Pool } from "./effects";
import { DEITIES, SkillFok } from "./common";
import { SpellLike } from "../data/types";
import { BardMagicValues } from "../data/bardMagic";
import { FireMagicValues } from "../data/fireMagic";
import { WitchMagicValues } from "../data/witchMagic";
import { WarlockMagicValues } from "../data/warlockMagic";
import { PsiValues } from "../data/psi";
import { MagasMagiaValues } from "../data/magasMagia";
import { PrayerValues } from "../data/prayers";
import { FOK_BY_GOV } from "../data/magasFokOverrides";

// `path`: the owning skill instance must have COMMITTED to this fokTrigger path (Pszi tudat/test at fok 3)
// — fok 1–2 disciplines are common, fok 3+ only come from the chosen ág (book ch.16).
export type SpellReq = { skill: string; subtype?: string; fok: SkillFok; path?: string };

export interface SpellDef {
  name: string;
  school: string; // the spell list it belongs to → one panel per school on the sheet
  category: string; // subcategory within the school (e.g. Dalmágia) → a subhead group on the sheet
  pool: Pool;
  cost: number;
  castingTime: string; // Időigény column
  requires: SpellReq[]; // ALL must be satisfied (AND), e.g. Magasmágia 3 AND the governing skill 3
}

// cost may be "3", "3/E", "Lásd a leírást!", "12 + 10/szint" — take the leading integer, else 0 (variable).
const num = (c: unknown): number => {
  const m = String(c).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};
const clampFok = (n: number): SkillFok => Math.min(5, Math.max(1, n)) as SkillFok;

const ct = (s: SpellLike): string => {
  const v = String(s.castingTime ?? "").trim();
  return v || "—";
};
const build = (values: SpellLike[], school: string, pool: Pool, req: (s: SpellLike) => SpellReq[], cat: (s: SpellLike) => string = (s) => s.type || "—"): SpellDef[] =>
  values.map((s) => ({ name: s.name, school, category: cat(s) || "—", pool, cost: num(s.cost), castingTime: ct(s), requires: req(s) }));

// ── A. Tapasztalati mágia — one subtype per tradition; the whole list casts at fok 3 ──
const tap = (subtype: string): SpellReq[] => [{ skill: "Tapasztalati mágia", subtype, fok: 3 }];
const bard = build(BardMagicValues, "Bárdmágia", "Mana", () => tap("bárd"));
const fire = build(FireMagicValues, "Tűzmágia", "Mana", () => tap("tűzmágia"));
const witch = build(WitchMagicValues, "Boszorkánymágia", "Mana", () => tap("boszorkány"));
const warlock = build(WarlockMagicValues, "Boszorkánymesteri", "Mana", () => tap("boszorkánymester"));

// ── B. Pszi — subtype = tradition, fok = discipline level ──
const PSI_TRAD: Record<string, string> = {
  "Pyarroni módszer": "pyarroni",
  "Kyr Metódus": "kyr",
  "Godoni örökség": "godoni",
  "Slan útja": "slan",
};
// Every tradition builds on the Pyarroni base: a kyr/godoni/slan practitioner also masters the Pyarroni
// disciplines up to their fok (book ch.22) — so Pyarroni spells carry NO tradition requirement.
// Fok 1–2 disciplines are common; fok 3+ additionally require the instance's committed tudat/test ág
// to match the discipline's domain (book ch.16: the fok-3 path choice).
const psi = build(PsiValues, "Pszi", "Psi", (s) => {
  const fok = clampFok(s.level ?? 1);
  const trad = PSI_TRAD[s.type ?? ""];
  return [{
    skill: "Pszi",
    subtype: trad === "pyarroni" ? undefined : trad,
    fok,
    path: fok >= 3 && s.domain ? s.domain.toLowerCase() : undefined,
  }];
});

// ── C. Magasmágia — the book gates each category on Magasmágia 3 AND its governing skill 3. The AND
//        condition is what keeps a non-mage (e.g. someone with Alkímia 3 + a Mana pool) out of high magic. ──
const MAGAS_GOV: Record<string, string | null> = {
  "Elemi mágia": "Őselemi mágia",
  "Formázás": "Őselemi mágia",
  "Természetes Anyagok Mágiája": "Alkímia",
  "Asztrálmágia": "Lélektan",
  "Mentálmágia": "Lélektan",
  "Rúnamágia": "Rúnamágia",
  "Nekromancia": "Nekromancia",
  "Démonológia": "Démonológia",
  "Időmágia": "Számtan/Mértan",
  "Térmágia": "Számtan/Mértan",
  "Szimpatikus mágia": null, // general Magasmágia only
  "Egyéb Mágikus Módszerek": null,
};
const magas = build(MagasMagiaValues, "Magasmágia", "Mana", (s) => {
  const reqs: SpellReq[] = [{ skill: "Magasmágia", fok: 3 }]; // umbrella stays at the casting threshold
  const gov = MAGAS_GOV[s.type ?? ""];
  if (gov) reqs.push({ skill: gov, fok: clampFok(FOK_BY_GOV[gov]?.[s.name] ?? 3) });
  return reqs;
});

// ── E. Prayers — deity-specific need Vallásismeret(deity); Általános/Kis Arkánum at fok 3, Nagy Arkánum at fok 5 ──
const DEITY_SET = new Set<string>(DEITIES);
const prayerReq = (s: SpellLike): SpellReq[] => {
  const src = s.source as string;
  if (DEITY_SET.has(src)) return [{ skill: "Vallásismeret", subtype: src, fok: 3 }];
  if (src === "Nagy Arkánum") return [{ skill: "Vallásismeret", fok: 5 }];
  return [{ skill: "Vallásismeret", fok: 3 }]; // Általános, Kis Arkánum
};
const prayers = build(PrayerValues, "Szakrális", "Kegy", prayerReq, (s) => s.source || "—");

export const SPELLS: SpellDef[] = [...bard, ...fire, ...witch, ...warlock, ...psi, ...magas, ...prayers];
