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
const TOMB_KEY = "magus.tombstones.v1";
const TOMB_MAX_AGE_MS = 180 * 24 * 3600 * 1000; // prune half-year-old tombstones on load

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

// ── deletion tombstones (id → deletion timestamp) ─────────────────────────────────────────────────
// Kept so Google sync can tell "deleted here" apart from "never seen here": without them a character
// deleted on this device would be resurrected by the cloud copy on the next merge.

export type Tombstones = Record<string, number>;

export const loadTombstones = (): Tombstones => {
  try {
    const parsed = JSON.parse(localStorage.getItem(TOMB_KEY) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const now = Date.now();
    const fresh: Tombstones = {};
    for (const [id, ts] of Object.entries(parsed)) {
      if (typeof ts === "number" && now - ts < TOMB_MAX_AGE_MS) fresh[id] = ts;
    }
    return fresh;
  } catch {
    return {};
  }
};

export const saveTombstones = (t: Tombstones): void => {
  try {
    localStorage.setItem(TOMB_KEY, JSON.stringify(t));
  } catch {
    /* storage full / unavailable — ignore, same policy as saveRoster */
  }
};

export const addTombstone = (id: string): void => {
  const t = loadTombstones();
  t[id] = Date.now();
  saveTombstones(t);
};

// ── sync base (id → the updatedAt this device last agreed with the cloud on) ─────────────────────
// The "common ancestor" for three-way merging: it lets the merge tell a safe fast-forward ("only
// the cloud moved") apart from a true conflict ("both sides moved"). Entries are written only
// after a successful pull or push — never optimistically — so a failed push can't masquerade as
// "in sync" and let the cloud overwrite an unpushed local edit.

export type SyncBase = Record<string, number>;

const readMap = (key: string): Record<string, number> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) if (typeof ts === "number") out[id] = ts;
    return out;
  } catch {
    return {};
  }
};

const BASE_KEY = "magus.syncbase.v1";

export const loadSyncBase = (): SyncBase => readMap(BASE_KEY);

export const saveSyncBase = (b: SyncBase): void => {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
};

export const bumpSyncBase = (entries: SyncBase): void => {
  const b = loadSyncBase();
  Object.assign(b, entries);
  saveSyncBase(b);
};

export const clearTombstone = (id: string): void => {
  const t = loadTombstones();
  if (id in t) {
    delete t[id];
    saveTombstones(t);
  }
};

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
