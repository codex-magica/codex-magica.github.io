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

export const genId = (): string => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const loadRoster = (): CharacterRecord[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [{ ...defaultRecord }]; // first run → seed with the demo character
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed as CharacterRecord[];
    return [];
  } catch {
    return [{ ...defaultRecord }];
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
