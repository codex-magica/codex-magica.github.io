// KM-authored custom classes. A custom class is a full ClassDef carried on the record
// (record.customClass); the derive engine and builder prefer it when record.class === customClass.name.
// v1 scope: name + KAP cost + a flat list of grant rows (granted skill / teacher / may-learn), each
// optionally level-gated (atLevel). No specialization tree (choices: []), which derives cleanly.

import { ClassDef } from "./classes/def";
import { GrantEntry, grant } from "./effects";
import { taughtSkill } from "./skills";
import { SkillFok } from "./common";
import { RACE_NAMES } from "./races";

// Is the record currently using its embedded custom class? (name must match the selected class).
export const customClassActive = (rec: { class: string; customClass?: ClassDef }): ClassDef | undefined =>
  rec.customClass && rec.customClass.name === rec.class ? rec.customClass : undefined;

export type ClassGrantKind = "skill" | "teacher";

export const CLASS_GRANT_KINDS: { key: ClassGrantKind; label: string }[] = [
  { key: "skill", label: "Kapott képzettség" },
  { key: "teacher", label: "Oktatás" },
];

// One editable grant row of the custom-class builder.
export interface ClassGrantRow {
  id: string;
  kind: ClassGrantKind;
  skill: string;
  fok: SkillFok; // granted fok (skill) / teacher's up-to fok
  atLevel: number; // 1 = at creation; >1 = level-gated
}

export const blankClassRow = (id: string): ClassGrantRow => ({ id, kind: "skill", skill: "", fok: 1, atLevel: 1 });

const lvl = (n: number): number | undefined => (n > 1 ? n : undefined);

// Row → GrantEntry. Empty-skill rows are filtered out by buildCustomClass, so `skill` is present here.
export const buildClassGrant = (row: ClassGrantRow): GrantEntry => {
  switch (row.kind) {
    case "skill": return taughtSkill(row.skill, row.fok, undefined, lvl(row.atLevel));
    case "teacher": return grant({ kind: "teachingDiscount", skill: row.skill, uptoLevel: row.fok }, lvl(row.atLevel));
  }
};

// The inverse: read a ClassDef's grants back into editable rows (for re-opening the builder).
export const readClassRows = (def: ClassDef, freshId: (i: number) => string): ClassGrantRow[] => {
  const rows: ClassGrantRow[] = [];
  def.grants.forEach(({ effect: e, atLevel }, i) => {
    const at = atLevel ?? 1;
    if (e.kind === "grantSkill") rows.push({ id: freshId(i), kind: "skill", skill: e.skill, fok: e.level, atLevel: at });
    else if (e.kind === "teachingDiscount" && e.skill) rows.push({ id: freshId(i), kind: "teacher", skill: e.skill, fok: e.uptoLevel, atLevel: at });
  });
  return rows;
};

// Assemble a serializable ClassDef from the builder form. Custom classes allow every race and carry no
// specialization tree, so they derive as a plain grant list.
export const buildCustomClass = (name: string, cost: number, rows: ClassGrantRow[]): ClassDef => ({
  name: name.trim() || "Egyedi kaszt",
  cost: Math.max(0, cost),
  allowedRaces: [...RACE_NAMES],
  grants: rows.filter((r) => r.skill).map(buildClassGrant),
  choices: [],
});
