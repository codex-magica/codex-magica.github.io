// The character roster as one store outside React: the single source of truth for the UI, for import
// and for the Drive sync. Every change is saved to localStorage synchronously, so what the sync reads
// is always exactly what's on the device.
//
// Each local edit is stamped twice:
//   - `updatedAt`, the edit time (for ordering parallel edits and dating backups),
//   - `syncVc`, the version vector, bumped for this device (for telling replaced from parallel versions).
// Deleting a character keeps a small marker (time + vector), so the deletion can travel to other devices
// and an old copy elsewhere can't bring the character back. Until the deletion has reached Drive, the
// marker also keeps the character's last state, so it can still be backed up there.
//
// Safety rules:
//   - every change starts from what's saved now, never from a stale copy in memory (the app runs in one
//     tab, see activeTab.ts, but a page brought back from the browser's cache or an older copy of the
//     app could still have saved meanwhile: re-reading is cheap insurance);
//   - an edit made from an older version than the one stored now (an editor stayed open while a sync
//     changed the character) is saved next to the newer version, not over it;
//   - memory is always what's saved: a change that can't be saved (storage full or blocked) isn't made,
//     and `saveFailed` says so until a save works again. (Characters take a few kilobytes and browsers
//     give the app megabytes, so this is for blocked storage and the unexpected, not for everyday use.)

import { CharacterRecord } from "../model/character";
import { ROSTER_KEY, clone, genId, loadRoster, releaseHeldRoster, saveRoster } from "./storage";
import { contentHash, nextStamp } from "./recordHash";
import { DELETED_HASH, VersionVector, bump, deviceId, dominatedBy, isVersionVector, join, vcKey, versionKeyOf } from "./versions";
import { conflictCopyName, reconcile } from "./driveMerge";
import { deletionAwaitsDrive } from "./syncState";

export interface Deletion {
  t: number;
  vc: VersionVector;
  last?: CharacterRecord; // the state before deleting, until the deletion has reached Drive
}
export type Deletions = Record<string, Deletion>;

export interface RosterState {
  records: CharacterRecord[];
  deletions: Deletions;
  revision: number; // counts local edits (not sync results)
  saveFailed: boolean; // the last save to this device failed (storage full or blocked)
}


const DELETIONS_KEY = "magus.deletions.v1";
const KEEP_LAST_MS = 60 * 24 * 3600_000; // a deleted character's last state is kept this long (with sync, until it's in Drive)

const readRaw = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readDeletions = (): Deletions => {
  const out: Deletions = {};
  const now = Date.now();
  try {
    const parsed = JSON.parse(readRaw(DELETIONS_KEY) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      for (const [id, d] of Object.entries(parsed as Record<string, Deletion>))
        if (d && typeof d.t === "number" && isVersionVector(d.vc)) {
          const keepLast = d.last && typeof d.last === "object" && (now - d.t < KEEP_LAST_MS || deletionAwaitsDrive(id, d));
          out[id] = keepLast ? { t: d.t, vc: d.vc, last: d.last } : { t: d.t, vc: d.vc };
        }
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
  return consistent(records, readDeletions());
};

type Listener = () => void;

export const createRosterStore = () => {
  let state: RosterState = { ...load(), revision: 0, saveFailed: false };
  // what's saved, as last read or written here: a change from elsewhere shows up as a difference
  let seen = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l());

  const writeDeletions = (deletions: Deletions): boolean => {
    try {
      localStorage.setItem(DELETIONS_KEY, JSON.stringify(deletions));
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

  // Saves the roster and the deletion markers together: never a roster without a character whose
  // deletion marker isn't saved (it would come back from Drive after a reload), never a marker for a
  // change whose roster isn't. With storage (nearly) full the order matters, because deleting a character
  // shrinks the roster but grows the markers (deleting is how the player makes room, so it must work):
  // both orders are tried, then the markers without the deleted characters' last states (kept only for
  // a Drive backup). If nothing fits, what was saved before is put back and false is returned.
  const persist = (records: CharacterRecord[], deletions: Deletions): boolean => {
    const before = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    const ok =
      (writeDeletions(deletions) && saveRoster(records)) ||
      (saveRoster(records) && writeDeletions(deletions)) ||
      (saveRoster(records) && writeDeletions(withoutLastStates(deletions)));
    if (!ok)
      for (let i = 0; i < 2; i++) {
        const back = i === 0 ? writeRaw(ROSTER_KEY, before.roster) && writeRaw(DELETIONS_KEY, before.deletions) : writeRaw(DELETIONS_KEY, before.deletions) && writeRaw(ROSTER_KEY, before.roster);
        if (back) break;
      }
    seen = { roster: readRaw(ROSTER_KEY), deletions: readRaw(DELETIONS_KEY) };
    return ok;
  };

  // A change, kept only if it's saved; `local`: the player's own edit (counted in `revision`, which
  // starts a sync round). False if it couldn't be saved: nothing changed, and `saveFailed` says so.
  const commit = (records: CharacterRecord[], deletions: Deletions, local: boolean): boolean => {
    const saved = persist(records, deletions);
    state = saved ? { records, deletions, revision: state.revision + (local ? 1 : 0), saveFailed: false } : { ...state, saveFailed: true };
    emit();
    return saved;
  };

  // Re-read what's saved if it changed elsewhere.
  const refresh = (): boolean => {
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
      const me = deviceId();
      const stamped: CharacterRecord = {
        ...record,
        updatedAt: nextStamp(Math.max(prev?.updatedAt ?? 0, deletion?.t ?? 0, record.updatedAt ?? 0)),
        syncVc: bump(vc, me),
        syncCvc: undefined, // new content
      };
      const i = state.records.findIndex((r) => r.id === record.id);
      let records = i < 0 ? [...state.records, stamped] : state.records.map((r, j) => (j === i ? stamped : r));
      if (prev && base && contentHash(prev) !== contentHash(base) && contentHash(prev) !== contentHash(stamped))
        records = [...records, { ...prev, id: genId(), name: conflictCopyName(prev.name), updatedAt: nextStamp(prev.updatedAt), syncVc: bump({}, me), syncCvc: undefined }];
      const deletions = { ...state.deletions };
      delete deletions[record.id];
      commit(records, deletions, true);
    },

    // `base`: the version the player confirmed deleting (what the dialog showed). If it changed since (a
    // sync brought another device's edit), nothing is deleted and false is
    // returned: a deletion must never swallow an edit the player hasn't seen.
    remove(id: string, base?: CharacterRecord): boolean {
      refresh();
      const prev = find(id);
      if (!prev) return true;
      if (base && contentHash(prev) !== contentHash(base)) return false;
      commit(state.records.filter((r) => r.id !== id), { ...state.deletions, [id]: { t: nextStamp(prev.updatedAt), vc: bump(prev.syncVc, deviceId()), last: prev } }, true);
      return true;
    },

    duplicate(id: string): void {
      refresh();
      const r = find(id);
      if (!r) return;
      commit([...state.records, { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now(), syncVc: bump({}, deviceId()), syncCvc: undefined }], state.deletions, true);
    },

    // After this device got a fresh id because another device was using the old one: the versions made
    // here under the old id that were never published (`published`: the version keys Drive holds now plus
    // what this device last published, both shared history with the other device) get the new id
    // instead, so they count as this device's own parallel edits (and are kept next to the other
    // device's) rather than as steps of the other device's history. They keep the part of the old id's
    // count they were built on (the highest one of that character's versions in Drive, `ancestry`, that
    // they contain): an edit or deletion made here on top of a published version still replaces that
    // version, instead of looking parallel to its own ancestor.
    relabelDevice(oldId: string, newId: string, published: Set<string> = new Set(), ancestry: Map<string, VersionVector[]> = new Map()): boolean {
      refresh();
      const move = (id: string, vc: VersionVector, h: string): VersionVector => {
        if (vc[oldId] === undefined || published.has(versionKeyOf(vc, h))) return vc;
        const { [oldId]: n, ...rest } = vc;
        const base = Math.max(0, ...(ancestry.get(id) ?? []).filter((a) => dominatedBy(a, vc)).map((a) => a[oldId] ?? 0));
        if (base >= n) return vc; // nothing of the old id's count is unpublished
        return { ...rest, ...(base > 0 ? { [oldId]: base } : {}), [newId]: n };
      };
      const records = state.records.map((r) => {
        const vc = move(r.id, r.syncVc ?? {}, contentHash(r));
        return vc === r.syncVc ? r : { ...r, syncVc: vc, syncCvc: undefined };
      });
      const deletions = Object.fromEntries(Object.entries(state.deletions).map(([id, d]) => [id, { ...d, vc: move(id, d.vc, DELETED_HASH) }]));
      return commit(records, deletions, false);
    },

    // The result of a sync round (not a local edit), applied to the roster as saved NOW: what changed
    // since the round started is kept, see driveMerge.reconcile. False if it
    // couldn't be saved (the round then counts as failed, and is tried again).
    applyRound(snapshot: { records: CharacterRecord[]; deletions: Deletions }, merged: { records: CharacterRecord[]; deletions: Deletions }): boolean {
      refresh();
      const next = reconcile(snapshot, state, merged);
      return commit(next.records, next.deletions, false);
    },

    // The player downloaded the saved data that couldn't be read (storage.unreadableKeys) and dropped it.
    // The unreadable roster itself, if it's among them (there was no room to keep it aside), is replaced
    // by what could be read of it.
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

    // re-read what's saved (right before a sync round, or when it changed elsewhere)
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
