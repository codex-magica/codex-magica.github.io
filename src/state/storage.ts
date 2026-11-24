// Local-storage persistence for the character roster. Each character is a CharacterRecord; the
// roster is the list of them. Play-state (vitals, conditions, inventory) lives in the record too, so
// saving the record persists everything.

import { CharacterRecord, SCHEMA_VERSION, emptyLevel } from "../model/character";
import { makeStats } from "../model/attributes";
import { CLASSES, CLASS_NAMES } from "../model/classes";
import { RACE_NAMES } from "../model/races";
import { defaultSelections } from "../model/choices";
import { getRulesPreference } from "./rulesPreference";
import { derive } from "../engine/derive";
import { rulesFor } from "../model/rulesVariants";

const KEY = "magus.roster.v1";

// Collision-resistant id. `prefix` distinguishes id kinds (e.g. "c" characters, "v" skill variants).
// (64 random bits after the time: a bulk import makes many ids within one millisecond)
const randomPart = (): string => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.getRandomValues) return Array.from(c.getRandomValues(new Uint32Array(2)), (n) => n.toString(36).padStart(7, "0")).join("");
  return Math.random().toString(36).slice(2, 9).padEnd(7, "0") + Math.random().toString(36).slice(2, 9).padEnd(7, "0");
};
export const genId = (prefix = "c"): string => `${prefix}_${Date.now().toString(36)}${randomPart()}`;

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

// Legacy migrations applied on load. A new migration changes stored content without an edit, so it must
// come with a new Drive sync file version (driveMerge.SYNC_VERSION): older app versions then stop syncing
// until they update, instead of seeing every migrated character as a parallel edit.
//
// Path choices are matched by the trigger LABEL, so a renamed
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
// If the saved roster can't be read, it's kept aside under another key before anything new is saved
// over it, so a bug or a damaged write never costs the characters. The roster screen offers these for
// download. At most a few are kept (they count against the browser's storage limit).
const UNREADABLE_PREFIX = `${KEY}.unreadable.`;
const UNREADABLE_MAX = 3;
const asideKeys = (): string[] => {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(UNREADABLE_PREFIX)) out.push(k);
    }
  } catch {
    /* storage unavailable */
  }
  return out.sort();
};
export const unreadableKeys = (): string[] => (stillHeld() ? [...asideKeys(), KEY] : asideKeys());
// The saved roster couldn't be read and there was no room to keep it aside: it stays where it is, nothing
// is saved over it (saving reports failure, so the app says so), and it's offered for download like the
// ones kept aside. Once it's gone from there (downloaded and discarded, or replaced by another tab),
// saving works again.
let held: string | null = null;
const stillHeld = (): boolean => {
  if (held === null) return false;
  try {
    if (localStorage.getItem(KEY) === held) return true;
  } catch {
    return true;
  }
  held = null;
  return false;
};
// After the player saved the held roster to a file and chose to drop it from the device: saving works
// again (the caller saves what's in memory over it).
export const ROSTER_KEY = KEY;
export const releaseHeldRoster = (): void => {
  held = null;
};
const keepUnreadable = (raw: string): boolean => {
  try {
    const existing = asideKeys();
    if (existing.some((k) => localStorage.getItem(k) === raw)) return true; // already kept
    for (const k of existing.slice(0, Math.max(0, existing.length - UNREADABLE_MAX + 1))) localStorage.removeItem(k);
    localStorage.setItem(`${UNREADABLE_PREFIX}${Date.now()}`, raw);
    return true;
  } catch {
    return false;
  }
};
const keepOrHold = (raw: string) => {
  if (!keepUnreadable(raw)) held = raw;
};

export const loadRoster = (): CharacterRecord[] => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not a list");
    const records: CharacterRecord[] = [];
    let dropped = false;
    for (const r of parsed) {
      const rec = r && typeof r === "object" && typeof (r as CharacterRecord).id === "string" ? repairRecord(r) : null;
      if (rec) records.push(rec);
      else dropped = true;
    }
    if (dropped) keepOrHold(raw);
    return records;
  } catch {
    keepOrHold(raw);
    return [];
  }
};

// Returns false if the save failed (storage full or blocked), so the app can say so.
export const saveRoster = (records: CharacterRecord[]): boolean => {
  if (stillHeld()) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
};

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// Record ids travel into Drive file names and properties: keep them short and plain.
export const isSafeId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_~-]{1,64}$/.test(id);

// Brings a record from storage or Drive into a shape the app can work with: legacy migrations and
// defaults for missing required fields. It never rejects a record just because the rules engine can't
// compute it today (that may be a bug fixed tomorrow); the screens guard against that instead. Returns
// null only for something that isn't a character at all.
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const repairRecord = (raw: unknown): CharacterRecord | null => {
  if (!isObj(raw) || typeof raw.name !== "string" || !Array.isArray(raw.levels) || raw.levels.length === 0) return null;
  const blank = createBlankRecord(typeof raw.id === "string" && raw.id ? raw.id : genId(), raw.name);
  const r = raw as unknown as CharacterRecord;
  const filled: CharacterRecord = {
    ...r,
    schemaVersion: typeof r.schemaVersion === "number" ? r.schemaVersion : SCHEMA_VERSION,
    id: blank.id,
    identity: isObj(r.identity) ? r.identity : blank.identity,
    race: typeof r.race === "string" ? r.race : blank.race,
    class: typeof r.class === "string" ? r.class : blank.class,
    selections: isObj(r.selections) ? (r.selections as Record<string, string>) : blank.selections,
    backgrounds: Array.isArray(r.backgrounds) ? r.backgrounds : [],
    pointBuy: isObj(r.pointBuy) ? r.pointBuy : blank.pointBuy,
    kmAdjustments: Array.isArray(r.kmAdjustments) ? r.kmAdjustments : [],
    inventory: Array.isArray(r.inventory) ? r.inventory : [],
    vitalsState: isObj(r.vitalsState) ? r.vitalsState : {},
  };
  try {
    return migrateRecord(filled);
  } catch {
    return filled;
  }
};

// Can the rules engine compute this record?
export const derivable = (rec: CharacterRecord): boolean => {
  try {
    derive(rulesFor(rec), rec);
    return true;
  } catch {
    return false;
  }
};

// For records coming in from a file: repaired, and accepted only if the app can actually show them
// (the file stays with the user either way).
export const normalizeRecord = (raw: unknown): CharacterRecord | null => {
  const rec = repairRecord(raw);
  return rec && derivable(rec) ? rec : null;
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
