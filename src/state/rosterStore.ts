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
//     only copy of the latest edits, and the sync uploads from it. Those edits get a lineage of their own
//     (not this device's id), so an edit made later from the older saved state (after a reload, or in
//     another tab) counts as parallel to them, never as their successor; and another tab's saved changes
//     are merged into memory rather than overwritten.

import { CharacterRecord } from "../model/character";
import { ROSTER_KEY, clone, genId, loadRoster, releaseHeldRoster, saveRoster } from "./storage";
import { contentHash, nextStamp } from "./recordHash";
import { DELETED_HASH, VersionVector, bump, deviceId, dominatedBy, isVersionVector, join, vcKey, versionKeyOf } from "./versions";
import { conflictCopyName, mergeLocal, reconcile } from "./driveMerge";

export { conflictCopyName };

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

  const writeDeletions = (deletions: Deletions): boolean => {
    try {
      localStorage.setItem(DELETIONS_KEY, JSON.stringify(deletions));
      localStorage.removeItem(LEGACY_TOMBSTONES_KEY);
      return true;
    } catch {
      return false;
    }
  };
  const writeRaw = (key: string, raw: string | null): boolean => {
    try {
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
      return true;
    } catch {
      return false;
    }
  };
  const withoutLastStates = (deletions: Deletions): Deletions => Object.fromEntries(Object.entries(deletions).map(([id, { t, vc }]) => [id, { t, vc }]));

  // Saves the roster and the deletion markers so that what's saved always fits together: never a roster
  // without a character whose deletion marker isn't saved (it would come back from Drive after a reload),
  // never a marker saved for a change whose roster isn't. When storage is full, the order matters (a
  // deletion shrinks the roster but grows the markers), so both orders are tried; then the markers without
  // the deleted characters' last states (those stay in memory, and saving counts as failed); and if
  // nothing fits, what was saved before is put back.
  const persist = (records: CharacterRecord[], deletions: Deletions): boolean => {
    const before = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    let ok = (writeDeletions(deletions) && saveRoster(records)) || (saveRoster(records) && writeDeletions(deletions));
    if (!ok && !(saveRoster(records) && writeDeletions(withoutLastStates(deletions)))) {
      for (let i = 0; i < 2; i++) {
        const back = i === 0 ? writeRaw(ROSTER_KEY, before.roster) && writeRaw(DELETIONS_KEY, before.deletions) : writeRaw(DELETIONS_KEY, before.deletions) && writeRaw(ROSTER_KEY, before.roster);
        if (back) break;
      }
    }
    seen = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    return ok;
  };

  const commit = (records: CharacterRecord[], deletions: Deletions, local: boolean) => {
    const saved = persist(records, deletions);
    state = { records, deletions, revision: state.revision + (local ? 1 : 0), saveFailed: !saved };
    emit();
  };

  // The lineage of edits that exist only in memory (saving failed): one per session, never this device's
  // id, see the header.
  let unsavedLineage: string | null = null;
  const lineageFor = (failing: boolean) => (failing ? (unsavedLineage ??= `${deviceId()}.u${Math.random().toString(36).slice(2, 8)}`) : deviceId());

  // A local edit: built against the current state with this device's lineage; if it can't be saved, it's
  // rebuilt with the unsaved lineage before it's kept in memory.
  const mutate = (build: (lineage: string) => { records: CharacterRecord[]; deletions: Deletions } | null) => {
    let next = build(lineageFor(state.saveFailed));
    if (!next) return;
    let saved = persist(next.records, next.deletions);
    if (!saved && !state.saveFailed) {
      next = build(lineageFor(true)) ?? next;
      saved = persist(next.records, next.deletions);
    }
    state = { records: next.records, deletions: next.deletions, revision: state.revision + 1, saveFailed: !saved };
    emit();
  };

  // Re-read what's saved if another tab changed it. While saving fails, memory holds edits that aren't
  // saved anywhere: it's merged with the saved state instead of replaced, and saved if that works now.
  const refresh = (): boolean => {
    const now = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    if (now.roster === seen.roster && now.deletions === seen.deletions) return false;
    if (state.saveFailed) {
      const merged = mergeLocal(state, load());
      const saved = persist(merged.records, merged.deletions);
      state = { ...state, records: merged.records, deletions: merged.deletions, saveFailed: !saved };
      return true;
    }
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
      mutate((lineage) => {
        const stamped: CharacterRecord = {
          ...record,
          updatedAt: nextStamp(Math.max(prev?.updatedAt ?? 0, deletion?.t ?? 0, record.updatedAt ?? 0)),
          syncVc: bump(vc, lineage),
          syncCvc: undefined, // new content
        };
        const i = state.records.findIndex((r) => r.id === record.id);
        let records = i < 0 ? [...state.records, stamped] : state.records.map((r, j) => (j === i ? stamped : r));
        if (prev && base && contentHash(prev) !== contentHash(base) && contentHash(prev) !== contentHash(stamped))
          records = [...records, { ...prev, id: genId(), name: conflictCopyName(prev.name), updatedAt: nextStamp(prev.updatedAt), syncVc: bump({}, lineage), syncCvc: undefined }];
        const deletions = { ...state.deletions };
        delete deletions[record.id];
        return { records, deletions };
      });
    },

    // `base`: the version the player confirmed deleting (what the dialog showed). If it changed since (a
    // sync brought another device's edit, or another tab edited it), nothing is deleted and false is
    // returned: a deletion must never swallow an edit the player hasn't seen.
    remove(id: string, base?: CharacterRecord): boolean {
      refresh();
      const prev = find(id);
      if (!prev) return true;
      if (base && contentHash(prev) !== contentHash(base)) return false;
      mutate((lineage) => ({
        records: state.records.filter((r) => r.id !== id),
        deletions: { ...state.deletions, [id]: { t: nextStamp(prev.updatedAt), vc: bump(prev.syncVc, lineage), last: prev } },
      }));
      return true;
    },

    duplicate(id: string): void {
      refresh();
      const r = find(id);
      if (!r) return;
      mutate((lineage) => ({
        records: [...state.records, { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now(), syncVc: bump({}, lineage), syncCvc: undefined }],
        deletions: state.deletions,
      }));
    },

    // After this device got a fresh id because another device was using the old one: the versions made
    // here under the old id that were never published (`published`: the version keys Drive holds now plus
    // what this device last published, both shared history with the other device) get the new id
    // instead, so they count as this device's own parallel edits (and are kept next to the other
    // device's) rather than as steps of the other device's history.
    relabelDevice(oldId: string, newId: string, published: Set<string> = new Set()): void {
      refresh();
      const move = (vc: VersionVector, h: string): VersionVector => {
        if (vc[oldId] === undefined || published.has(versionKeyOf(vc, h))) return vc;
        const { [oldId]: n, ...rest } = vc;
        return { ...rest, [newId]: n };
      };
      const records = state.records.map((r) => {
        const vc = move(r.syncVc ?? {}, contentHash(r));
        return vc === r.syncVc ? r : { ...r, syncVc: vc, syncCvc: undefined };
      });
      const deletions = Object.fromEntries(Object.entries(state.deletions).map(([id, d]) => [id, { ...d, vc: move(d.vc, DELETED_HASH) }]));
      commit(records, deletions, false);
    },

    // The result of a sync round (not a local edit), applied to the roster as saved NOW: what changed
    // since the round started (here or in another tab) is kept, see driveMerge.reconcile.
    applyRound(snapshot: { records: CharacterRecord[]; deletions: Deletions }, merged: { records: CharacterRecord[]; deletions: Deletions }): void {
      refresh();
      const next = reconcile(snapshot, state, merged);
      commit(next.records, next.deletions, false);
    },

    // The player downloaded the saved data that couldn't be read (storage.unreadableKeys) and dropped it.
    // The unreadable roster itself, if it's among them (there was no room to keep it aside), is replaced
    // by what's in memory: what could be read of it, plus any edits since.
    dropUnreadable(keys: string[]): void {
      for (const k of keys) {
        if (k === ROSTER_KEY) {
          releaseHeldRoster();
          commit(state.records, state.deletions, false);
        } else
          try {
            localStorage.removeItem(k);
          } catch {
            /* ignore */
          }
      }
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
