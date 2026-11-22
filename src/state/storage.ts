// Local-storage persistence for the character roster. Each character is a CharacterRecord; the
// roster is the list of them. Play-state (vitals, conditions, inventory) lives in the record too, so
// saving the record persists everything.

import { CharacterRecord, SCHEMA_VERSION, emptyLevel } from "../model/character";
import { makeStats } from "../model/attributes";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { RACE_NAMES } from "../model/races";
import { defaultSelections } from "../model/choices";
import { getRulesPreference } from "./rulesPreference";

const KEY = "magus.roster.v1";

// Collision-resistant id. `prefix` distinguishes id kinds (e.g. "c" characters, "v" skill variants).
export const genId = (prefix = "c"): string => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Renamed class-specialization options (2026-07): the general variants are all plain "Általános" now.
// Selections store the option NAME, and a stale name silently drops the whole skill package on an
// override choice — so old records must be remapped. Keyed by old name (values were globally unique).
const RENAMED_OPTIONS: Record<string, string> = {
  "Általános (iskolázatlan)": "Általános", // Harcos
  "Általános lovag": "Általános", // Lovag
};

// Renamed granted subtypes / weaponChoice labels (2026-07). These are STABLE instance identities —
// purchases, subtype-override keys and per-instance choices (fok-4, path, attrs) all reference them,
// so a rename must walk the whole record. Keyed by `skill|oldSubtype` → new subtype.
const RENAMED_SUBTYPES: Record<string, string> = {
  "Fegyverhasználat|fő fegyver": "főfegyver",
  "Vadonjárás|adott terep": "választott terep",
  "Taktika|kisebb egységes formációk": "kisebb egységek, formációk",
};
const subKeyOf = (skill: string, subtype?: string): string => (subtype ? `${skill}|${subtype}` : skill);
const renameSub = <T extends { skill: string; subtype?: string }>(x: T): T => {
  const next = RENAMED_SUBTYPES[subKeyOf(x.skill, x.subtype)];
  return next ? { ...x, subtype: next } : x;
};

// Legacy migrations applied on load. Path choices are matched by the trigger LABEL, so a renamed
// trigger ("Pszi út" → "Pszi fa") must be remapped or old records lose their committed choice.
export const migrateRecord = (r: CharacterRecord): CharacterRecord => {
  let out = r;
  if (out.pathChoices?.some((c) => c.trigger === "Pszi út"))
    out = { ...out, pathChoices: out.pathChoices.map((c) => (c.trigger === "Pszi út" ? { ...c, trigger: "Pszi fa" } : c)) };
  if (out.selections && Object.values(out.selections).some((v) => RENAMED_OPTIONS[v]))
    out = { ...out, selections: Object.fromEntries(Object.entries(out.selections).map(([id, v]) => [id, RENAMED_OPTIONS[v] ?? v])) };
  // Tűzvarázsló Renegátok moved from the irányzat choice to the rend (school) axis (2026-07) —
  // an unmoved selection would silently lose its −1 KAP cost delta. ("Renegátok" only ever existed there.)
  if (out.selections?.iranyzat === "Renegátok")
    out = { ...out, selections: { ...out.selections, iranyzat: "Nincs külön irányzat", rend: "Renegátok" } };
  // Renamed granted subtypes: remap every reference (purchases, override keys, per-instance choices).
  const hasSubRename =
    Object.keys(out.subtypeOverrides ?? {}).some((k) => RENAMED_SUBTYPES[k]) ||
    (out.levels ?? []).some((l) => l.skillPurchases?.some((p) => RENAMED_SUBTYPES[subKeyOf(p.skill, p.subtype)])) ||
    [...(out.fok4Bonuses ?? []), ...(out.pathChoices ?? []), ...(out.skillAttrChoices ?? [])].some((c) => RENAMED_SUBTYPES[subKeyOf(c.skill, c.subtype)]);
  if (hasSubRename)
    out = {
      ...out,
      subtypeOverrides: out.subtypeOverrides
        ? Object.fromEntries(Object.entries(out.subtypeOverrides).map(([k, v]) => (RENAMED_SUBTYPES[k] ? [subKeyOf(k.slice(0, k.indexOf("|")), RENAMED_SUBTYPES[k]), v] : [k, v])))
        : undefined,
      levels: out.levels.map((l) => ({ ...l, skillPurchases: l.skillPurchases.map(renameSub) })),
      fok4Bonuses: out.fok4Bonuses?.map(renameSub),
      pathChoices: out.pathChoices?.map(renameSub),
      skillAttrChoices: out.skillAttrChoices?.map(renameSub),
    };
  return out;
};

// First run starts empty (the demo seed lives on only as the derive.test.ts golden fixture);
// the welcome screen's empty state points at "Új karakter".
export const loadRoster = (): CharacterRecord[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CharacterRecord[]).map(migrateRecord) : [];
  } catch {
    return [];
  }
};

export const saveRoster = (records: CharacterRecord[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    /* storage full / unavailable — ignore for now */
  }
};

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// A fresh, valid level-1 character to start a "create" flow from. The house-rules flag is seeded
// from the app-level preference (the creator's toggle can still change it before saving).
export const createBlankRecord = (id = genId(), name = "Új karakter"): CharacterRecord => {
  const cls = CLASS_NAMES.indexOf("Harcos") >= 0 ? "Harcos" : CLASS_NAMES[0];
  const allowed = CLASSES[cls]?.allowedRaces ?? [];
  const race = allowed.indexOf("Ember") >= 0 ? "Ember" : allowed[0] ?? RACE_NAMES[0];
  const pref = getRulesPreference();
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    identity: { ageCategory: "Ifjúkor", sex: "male" },
    race,
    class: cls,
    houseRules: pref.skillRework ? { skillRework: true } : undefined,
    selections: defaultSelections(CLASSES[cls].choices),
    backgrounds: [],
    pointBuy: makeStats(13),
    levels: [emptyLevel(1)],
    kmAdjustments: [],
    inventory: [],
    vitalsState: {},
    conditions: [],
  };
};
