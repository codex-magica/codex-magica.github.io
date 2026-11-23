// The character roster as one store outside React: the single source of truth for the UI, for import
// and for the Drive sync. Every change is saved to localStorage synchronously, so what the sync reads
// is always exactly what's on the device, and another tab's changes arrive through the `storage` event.
//
// Each local edit is stamped twice:
//   - `updatedAt`, the edit time (for ordering parallel edits and dating backups),
//   - `syncVc`, the version vector, bumped for this device (for telling replaced from parallel versions).
// Deleting a character keeps a small marker (time + vector), so the deletion can travel to other devices
// and an old copy elsewhere can't bring the character back. Until the deletion has reached Drive, the
// marker also keeps the character's last state, so it can still be backed up there.
//
// Safety rules:
//   - every change starts from what's saved now (another tab may have changed it), never from a stale
//     copy in memory;
//   - an edit made from an older version than the one stored now (an editor stayed open while a sync or
//     another tab changed the character) is saved next to the newer version, not over it;
//   - while saving fails (storage full), memory is never replaced by the older saved state: it's the
//     only copy of the latest edits, and the sync uploads from it.

import { CharacterRecord } from "../model/character";
import { clone, genId, loadRoster, saveRoster } from "./storage";
import { contentHash, nextStamp } from "./recordHash";
import { VersionVector, bump, deviceId, dominatedBy, isVersionVector, join, vcKey } from "./versions";

// The name a parallel version gets when both are kept. Neutral, so it reads right on every device.
export const conflictCopyName = (name: string): string => `${name} (másik változat)`;

export interface Deletion {
  t: number;
  vc: VersionVector;
  last?: CharacterRecord; // the state before deleting, until the deletion has reached Drive
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
const KEEP_LAST_MS = 60 * 24 * 3600_000; // without sync, a deleted character's last state is kept this long

const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readDeletions = (liveIds: Set<string>): Deletions => {
  const out: Deletions = {};
  const now = Date.now();
  try {
    const parsed = JSON.parse(readRaw(DELETIONS_KEY) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      for (const [id, d] of Object.entries(parsed as Record<string, Deletion>))
        if (d && typeof d.t === "number" && isVersionVector(d.vc)) {
          const keepLast = d.last && typeof d.last === "object" && now - d.t < KEEP_LAST_MS;
          out[id] = keepLast ? { t: d.t, vc: d.vc, last: d.last } : { t: d.t, vc: d.vc };
        }
    // The first sync version wrote a time per deleted id and never cleared it while sync was off, so a
    // character restored later under the same id may still have one: those don't count as deletions.
    const legacy = JSON.parse(readRaw(LEGACY_TOMBSTONES_KEY) ?? "{}");
    if (legacy && typeof legacy === "object" && !Array.isArray(legacy))
      for (const [id, t] of Object.entries(legacy as Record<string, number>))
        if (typeof t === "number" && !out[id] && !liveIds.has(id)) out[id] = { t, vc: { [deviceId()]: 1 } };
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

// A character that is both present and deleted (a crash between the two writes): it counts as deleted
// only if the deletion is strictly newer than the record.
const consistent = (records: CharacterRecord[], deletions: Deletions): { records: CharacterRecord[]; deletions: Deletions } => {
  const del = { ...deletions };
  const recs = records.filter((r) => {
    const d = del[r.id];
    if (!d) return true;
    const vc = r.syncVc ?? {};
    if (dominatedBy(vc, d.vc) && vcKey(vc) !== vcKey(d.vc)) return false;
    delete del[r.id];
    return true;
  });
  return { records: recs, deletions: del };
};

const load = () => {
  const records = loadRoster().map(withVector);
  return consistent(records, readDeletions(new Set(records.map((r) => r.id))));
};

type Listener = () => void;

export const createRosterStore = () => {
  let state: RosterState = { ...load(), revision: 0, saveFailed: false };
  // what's saved, as last read or written by this tab: a change elsewhere shows up as a difference
  let seen = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
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
    ok = saveRoster(records) && ok;
    seen = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    return ok;
  };

  const commit = (records: CharacterRecord[], deletions: Deletions, local: boolean) => {
    const saved = persist(records, deletions);
    state = { records, deletions, revision: state.revision + (local ? 1 : 0), saveFailed: !saved };
    emit();
  };

  // Re-read what's saved if another tab changed it; never while saving fails (memory is newer then).
  const refresh = (): boolean => {
    if (state.saveFailed) return false;
    const now = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    if (now.roster === seen.roster && now.deletions === seen.deletions) return false;
    state = { ...state, ...load() };
    seen = now;
    return true;
  };

  const find = (id: string) => state.records.find((r) => r.id === id);

  const store = {
    getState: (): RosterState => state,
    subscribe: (l: Listener): (() => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    // Create or replace by id (a local edit). `base` is the version the edit was made from (what an
    // editor showed when it opened); if the stored version changed since, both are kept.
    upsert(record: CharacterRecord, base?: CharacterRecord): void {
      refresh();
      const prev = find(record.id);
      const deletion = state.deletions[record.id];
      // re-creating a deleted id (restoring a backup) must outrank the deletion
      const vc = join(prev?.syncVc ?? record.syncVc ?? {}, deletion?.vc ?? {});
      const stamped: CharacterRecord = { ...record, updatedAt: nextStamp(Math.max(prev?.updatedAt ?? 0, deletion?.t ?? 0, record.updatedAt ?? 0)), syncVc: bump(vc, deviceId()) };
      const i = state.records.findIndex((r) => r.id === record.id);
      let records = i < 0 ? [...state.records, stamped] : state.records.map((r, j) => (j === i ? stamped : r));
      if (prev && base && contentHash(prev) !== contentHash(base) && contentHash(prev) !== contentHash(stamped))
        records = [...records, { ...prev, id: genId(), name: conflictCopyName(prev.name), updatedAt: nextStamp(prev.updatedAt), syncVc: bump({}, deviceId()) }];
      const deletions = { ...state.deletions };
      delete deletions[record.id];
      commit(records, deletions, true);
    },

    remove(id: string): void {
      refresh();
      const prev = find(id);
      if (!prev) return;
      const deletions = { ...state.deletions, [id]: { t: nextStamp(prev.updatedAt), vc: bump(prev.syncVc, deviceId()), last: prev } };
      commit(
        state.records.filter((r) => r.id !== id),
        deletions,
        true
      );
    },

    duplicate(id: string): void {
      refresh();
      const r = find(id);
      if (!r) return;
      const copy: CharacterRecord = { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now(), syncVc: bump({}, deviceId()) };
      commit([...state.records, copy], state.deletions, true);
    },

    // After this device got a fresh id because another device was using the old one: the versions made
    // here under the old id get the new one instead, so they count as this device's own parallel edits
    // (and are kept next to the other device's) rather than as older steps of the other device's history.
    relabelDevice(oldId: string, newId: string): void {
      const move = (vc: VersionVector): VersionVector => {
        if (vc[oldId] === undefined) return vc;
        const { [oldId]: n, ...rest } = vc;
        return { ...rest, [newId]: n };
      };
      const records = state.records.map((r) => ({ ...r, syncVc: move(r.syncVc ?? {}) }));
      const deletions = Object.fromEntries(Object.entries(state.deletions).map(([id, d]) => [id, { ...d, vc: move(d.vc) }]));
      commit(records, deletions, false);
    },

    // the result of a sync round (not a local edit)
    applySync(records: CharacterRecord[], deletions: Deletions): void {
      commit(records, deletions, false);
    },

    // re-read what's saved (another tab changed it, or right before a sync round); a no-op while
    // saving fails, so the unsaved edits in memory survive and can be synced
    reload(): void {
      if (refresh()) emit();
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
