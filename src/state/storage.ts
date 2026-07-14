// Local-storage persistence for the character roster. Each character is a CharacterRecord; the
// roster is the list of them. Play-state (vitals, conditions, inventory) lives in the record too, so
// saving the record persists everything.

import { CharacterRecord, SCHEMA_VERSION, emptyLevel } from "../model/character";
import { makeStats } from "../model/attributes";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { RACE_NAMES } from "../model/races";
import { defaultSelections } from "../model/choices";
import { defaultRecord } from "./defaultRecord";

const KEY = "magus.roster.v1";
const TOMB_KEY = "magus.tombstones.v1";
const TOMB_MAX_AGE_MS = 180 * 24 * 3600 * 1000; // prune half-year-old tombstones on load

// Collision-resistant id. `prefix` distinguishes id kinds (e.g. "c" characters, "v" skill variants).
export const genId = (prefix = "c"): string => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Deep clone the demo seed — a shallow spread would share `levels`/`pointBuy`/... with the module constant.
const seedRoster = (): CharacterRecord[] => [JSON.parse(JSON.stringify(defaultRecord)) as CharacterRecord];

// Legacy migrations applied on load. Path choices are matched by the trigger LABEL, so a renamed
// trigger ("Pszi út" → "Pszi fa") must be remapped or old records lose their committed choice.
export const migrateRecord = (r: CharacterRecord): CharacterRecord =>
  r.pathChoices?.some((c) => c.trigger === "Pszi út")
    ? { ...r, pathChoices: r.pathChoices.map((c) => (c.trigger === "Pszi út" ? { ...c, trigger: "Pszi fa" } : c)) }
    : r;

export const loadRoster = (): CharacterRecord[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seedRoster(); // first run → seed with the demo character
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length ? (parsed as CharacterRecord[]).map(migrateRecord) : []; // [] = user deleted all
    return seedRoster(); // corrupt (non-array) payload → fall back to the seed, same as the catch branch
  } catch {
    return seedRoster();
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

// A fresh, valid level-1 character to start a "create" flow from.
export const createBlankRecord = (id = genId(), name = "Új karakter"): CharacterRecord => {
  const cls = CLASS_NAMES.indexOf("Harcos") >= 0 ? "Harcos" : CLASS_NAMES[0];
  const allowed = CLASSES[cls]?.allowedRaces ?? [];
  const race = allowed.indexOf("Ember") >= 0 ? "Ember" : allowed[0] ?? RACE_NAMES[0];
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    name,
    identity: { ageCategory: "Ifjúkor", sex: "male" },
    race,
    class: cls,
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
