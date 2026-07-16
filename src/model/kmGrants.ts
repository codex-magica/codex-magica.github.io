// KM (game-master) custom overrides — the editable vocabulary behind the builder's KM-kiigazítások
// rows. Each row maps to a single Effect stored on an Adjustment (see character.ts, derive.ts).
// The Core set: raw KAP, the three magic pools, a granted skill at a fok, and a teacher.

import { Effect, Pool } from "./effects";
import { SkillFok } from "./common";

export type KmGrantKind = "kap" | "kegy" | "mana" | "pszi" | "skill" | "teacher" | "tag";

// The selectable kinds, in dropdown order, with their Hungarian labels.
export const KM_GRANT_KINDS: { key: KmGrantKind; label: string }[] = [
  { key: "kap", label: "KAP" },
  { key: "kegy", label: "Kegy" },
  { key: "mana", label: "Mana" },
  { key: "pszi", label: "Pszi" },
  { key: "skill", label: "Képzettség" },
  { key: "teacher", label: "Oktató" },
  { key: "tag", label: "Képesség" },
];

const POOL_OF: Record<"kegy" | "mana" | "pszi", Pool> = { kegy: "Kegy", mana: "Mana", pszi: "Psi" };
const POOL_LABEL: Record<Pool, string> = { Kegy: "Kegy", Mana: "Mana", Psi: "Pszi" };
const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));

// The editable state of one KM row. A single shared `amount` covers KAP and the pools; `skill`/`fok`
// serve the skill grant; `skill`/`uptoLevel` serve the teacher; `text` (the name) and `rulesText`
// (optional player-readable description — makes the ability clickable on the sheet) serve the tag grant.
export interface KmRow {
  kind: KmGrantKind;
  amount: number;
  skill: string;
  fok: SkillFok;
  uptoLevel: SkillFok;
  text: string;
  rulesText: string;
}

export const blankKmRow = (): KmRow => ({ kind: "kap", amount: 0, skill: "", fok: 1, uptoLevel: 4, text: "", rulesText: "" });

// Row → the single Effect stored on the Adjustment. Incomplete rows stay benign: an empty-skill grant
// and a 0-amount pool/KAP grant are no-ops in the derive interpreter, so a half-filled row is harmless.
export const buildKmEffect = (row: KmRow): Effect => {
  switch (row.kind) {
    case "kap": return { kind: "grantKap", amount: row.amount };
    case "kegy":
    case "mana":
    case "pszi": return { kind: "grantPoolPoints", pool: POOL_OF[row.kind], amount: row.amount };
    case "skill": return { kind: "grantSkill", skill: row.skill, level: row.fok };
    case "teacher": return { kind: "teachingDiscount", skill: row.skill, uptoLevel: row.uptoLevel };
    // Store the raw text (NOT trimmed): the input is controlled off this round-trip, so trimming here on
    // every keystroke would eat spaces and block multi-word names. Trimming happens in the derive guard.
    // The rules-text key is spread in only when present — a persisted `text: undefined` would make the
    // in-memory record structurally differ from its JSON round-trip (serialization strips undefined).
    case "tag": return { kind: "tag", tag: row.text, ...(row.rulesText ? { text: row.rulesText } : {}) };
  }
};

// The inverse: read a stored Effect back into row state so the editor can display/edit it.
export const readKmRow = (e: Effect): KmRow => {
  const base = blankKmRow();
  switch (e.kind) {
    case "grantKap": return { ...base, kind: "kap", amount: e.amount };
    case "grantPoolPoints":
      return { ...base, kind: e.pool === "Kegy" ? "kegy" : e.pool === "Mana" ? "mana" : "pszi", amount: e.amount };
    case "grantSkill": return { ...base, kind: "skill", skill: e.skill, fok: e.level };
    case "teachingDiscount": return { ...base, kind: "teacher", skill: e.skill ?? "", uptoLevel: e.uptoLevel };
    case "tag": return { ...base, kind: "tag", text: e.tag, rulesText: e.text ?? "" };
    default: return base;
  }
};

// Is this an effect the KM-override panel authors and can round-trip? (Guards which adjustments the
// panel renders as editable rows — a foreign effect must not be shown as a bogus "KAP 0" row.)
export const isKmGrantEffect = (e: Effect): boolean =>
  e.kind === "grantKap" || e.kind === "grantPoolPoints" || e.kind === "grantSkill" || e.kind === "teachingDiscount" || e.kind === "tag";

// An adjustment is an editable KM-override row iff it carries exactly one effect from that vocabulary.
export const isEditableKmAdjustment = (a: { effects: Effect[] }): boolean =>
  a.effects.length === 1 && isKmGrantEffect(a.effects[0]);

// A compact Hungarian summary of one effect, for the ledger and the row's read-only preview. Core KM
// grants get a rich label; other kinds (a foreign/legacy adjustment might carry them) get a plain one.
export const kmGrantSummary = (e: Effect): string => {
  switch (e.kind) {
    case "grantKap": return `${signed(e.amount)} KAP`;
    case "grantPoolPoints": return `${signed(e.amount)} ${POOL_LABEL[e.pool]}`;
    case "grantSkill": return e.skill ? `${e.skill} — ${e.level}. fok` : "Képzettség…";
    case "teachingDiscount": return e.skill ? `Oktató: ${e.skill} (${e.uptoLevel}. fokig)` : "Oktató…";
    case "tag": return e.tag.trim() ? `„${e.tag.trim()}”` : "Képesség…";
    case "statBonus": return `${e.stat} ${signed(e.amount)}`;
    case "combatBonus": return `${e.channel} ${signed(e.amount)}`;
    case "derivedBonus": return `${e.target} ${signed(e.amount)}`;
    case "note": return e.text;
    case "restriction": return e.text;
    default: return e.kind;
  }
};
