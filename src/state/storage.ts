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

// Collision-resistant id. `prefix` distinguishes id kinds (e.g. "c" characters, "v" skill variants).
export const genId = (prefix = "c"): string => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Deep clone the demo seed — a shallow spread would share `levels`/`pointBuy`/... with the module constant.
const seedRoster = (): CharacterRecord[] => [JSON.parse(JSON.stringify(defaultRecord)) as CharacterRecord];

// Legacy migrations applied on load. Path choices are matched by the trigger LABEL, so a renamed
// trigger ("Pszi út" → "Pszi fa") must be remapped or old records lose their committed choice.
const migrateRecord = (r: CharacterRecord): CharacterRecord =>
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
