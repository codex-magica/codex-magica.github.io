// The character roster as one store outside React: the single source of truth for the UI, for import
// and for the Drive sync. Every change is saved to localStorage synchronously, so what the sync reads
// is always exactly what's on the device, and another tab's changes arrive through the `storage` event.
//
// Each local edit is stamped twice:
//   - `updatedAt`, a time that never goes behind the version it was made from (for "newest" and dates),
//   - `syncVc`, the version vector, bumped for this device (for telling replaced from parallel versions).
// Deleting a character keeps a small marker (time + vector), so the deletion can travel to other devices
// and an old copy elsewhere can't bring the character back.

import { CharacterRecord } from "../model/character";
import { clone, genId, loadRoster, saveRoster } from "./storage";
import { contentHash, nextStamp } from "./recordHash";
import { VersionVector, bump, deviceId, dominatedBy, isVersionVector, join, vcKey } from "./versions";

// The name a parallel version gets when both are kept. Neutral, so it reads right on every device.
export const conflictCopyName = (name: string): string => `${name} (másik változat)`;

export interface Deletion {
  t: number;
  vc: VersionVector;
}
export type Deletions = Record<string, Deletion>;

export interface RosterState {
  records: CharacterRecord[];
  deletions: Deletions;
  revision: number; // counts local edits (not sync results or other tabs' changes)
  saveFailed: boolean; // the last save to this device failed (storage full or blocked)
}

const ROSTER_KEY = "magus.roster.v1";
const DELETIONS_KEY = "magus.deletions.v1";
const LEGACY_TOMBSTONES_KEY = "magus.tombstones.v1"; // id → time, from the first version of the Drive sync

const readDeletions = (): Deletions => {
  const out: Deletions = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETIONS_KEY) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      for (const [id, d] of Object.entries(parsed as Record<string, Deletion>))
        if (d && typeof d.t === "number" && isVersionVector(d.vc)) out[id] = { t: d.t, vc: d.vc };
    const legacy = JSON.parse(localStorage.getItem(LEGACY_TOMBSTONES_KEY) ?? "{}");
    if (legacy && typeof legacy === "object" && !Array.isArray(legacy))
      for (const [id, t] of Object.entries(legacy as Record<string, number>)) if (typeof t === "number" && !out[id]) out[id] = { t, vc: { [deviceId()]: 1 } };
  } catch {
    /* unreadable: no deletions known */
  }
  return out;
};

// A record without a vector (made before the sync existed, or imported) gets this device's lineage, and
// one without an edit time gets the time it was first seen here (so backups get a real date).
const withVector = (r: CharacterRecord): CharacterRecord => {
  const out = isVersionVector(r.syncVc) && Object.keys(r.syncVc).length > 0 ? r : { ...r, syncVc: { [deviceId()]: 1 } };
  return typeof out.updatedAt === "number" && out.updatedAt > 0 ? out : { ...out, updatedAt: Date.now() };
};

// A character that is both present and deleted (a crash between the two writes): the later one wins.
const consistent = (records: CharacterRecord[], deletions: Deletions): { records: CharacterRecord[]; deletions: Deletions } => {
  const del = { ...deletions };
  const recs = records.filter((r) => {
    const d = del[r.id];
    if (!d) return true;
    if (dominatedBy(r.syncVc ?? {}, d.vc)) return false;
    delete del[r.id];
    return true;
  });
  return { records: recs, deletions: del };
};

const load = (): Pick<RosterState, "records" | "deletions"> => consistent(loadRoster().map(withVector), readDeletions());

type Listener = () => void;

export const createRosterStore = () => {
  let state: RosterState = { ...load(), revision: 0, saveFailed: false };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());

  const persist = (records: CharacterRecord[], deletions: Deletions): boolean => {
    let ok = true;
    try {
      localStorage.setItem(DELETIONS_KEY, JSON.stringify(deletions));
      localStorage.removeItem(LEGACY_TOMBSTONES_KEY);
    } catch {
      ok = false;
    }
    return saveRoster(records) && ok;
  };

  const commit = (records: CharacterRecord[], deletions: Deletions, local: boolean) => {
    const saved = persist(records, deletions);
    state = { records, deletions, revision: state.revision + (local ? 1 : 0), saveFailed: !saved };
    emit();
  };

  const find = (id: string) => state.records.find((r) => r.id === id);

  const store = {
    getState: (): RosterState => state,
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    // create or replace by id (a local edit)
    upsert(record: CharacterRecord): void {
      const prev = find(record.id);
      const deletion = state.deletions[record.id];
      // Re-creating a deleted id (restoring a backup) must outrank the deletion.
      const base = join(prev?.syncVc ?? record.syncVc ?? {}, deletion?.vc ?? {});
      const stamped: CharacterRecord = { ...record, updatedAt: nextStamp(Math.max(prev?.updatedAt ?? 0, deletion?.t ?? 0, record.updatedAt ?? 0)), syncVc: bump(base, deviceId()) };
      const i = state.records.findIndex((r) => r.id === record.id);
      let records = i < 0 ? [...state.records, stamped] : state.records.map((r, j) => (j === i ? stamped : r));
      // The edit was made from an older version than the one stored now (the creator stayed open while a
      // sync or another tab changed the character): keep the stored version as a separate copy rather
      // than replace changes the edit never saw.
      if (prev && record.syncVc && vcKey(record.syncVc) !== vcKey(prev.syncVc ?? {}) && contentHash(prev) !== contentHash(stamped))
        records = [...records, { ...prev, id: genId(), name: conflictCopyName(prev.name), updatedAt: nextStamp(prev.updatedAt), syncVc: { [deviceId()]: 1 } }];
      const deletions = { ...state.deletions };
      delete deletions[record.id];
      commit(records, deletions, true);
    },

    remove(id: string): void {
      const prev = find(id);
      if (!prev) return;
      const deletions = { ...state.deletions, [id]: { t: nextStamp(prev.updatedAt), vc: bump(prev.syncVc, deviceId()) } };
      commit(
        state.records.filter((r) => r.id !== id),
        deletions,
        true
      );
    },

    duplicate(id: string): void {
      const r = find(id);
      if (!r) return;
      const copy: CharacterRecord = { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now(), syncVc: { [deviceId()]: 1 } };
      commit([...state.records, copy], state.deletions, true);
    },

    // the result of a sync round (not a local edit)
    applySync(records: CharacterRecord[], deletions: Deletions): void {
      commit(records, deletions, false);
    },

    // re-read what's saved (another tab changed it, or right before a sync round)
    reload(): void {
      const fresh = load();
      state = { ...state, ...fresh };
      emit();
    },
  };

  if (typeof window !== "undefined")
    window.addEventListener("storage", (e) => {
      if (e.key === ROSTER_KEY || e.key === DELETIONS_KEY || e.key === null) store.reload();
    });

  return store;
};

export type RosterStore = ReturnType<typeof createRosterStore>;

let defaultStore: RosterStore | null = null;
export const rosterStore = (): RosterStore => (defaultStore ??= createRosterStore());
