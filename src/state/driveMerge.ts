// Merging this device's roster with the copy in Google Drive. Pure functions, no I/O.
//
// Drive holds ONE file: every character with its `updatedAt`, plus deletions (tombstones). The merge
// is three-way per character, against the version both sides last agreed on (the sync base):
//   - only Drive changed      → take Drive's version (another device edited or deleted it)
//   - only this device changed → keep ours, it goes up with the next upload
//   - both changed            → edit beats delete; edit vs edit keeps BOTH: ours stays, and Drive's
//                               becomes a separate copy, so nothing is ever lost
//   - no base yet (first sync on this device) → the newer timestamp wins
// The result is the merged roster for this device and the merged file to upload.

import { CharacterRecord } from "../model/character";
import { genId, migrateRecord } from "./storage";
import { SyncBase, Tombstones } from "./syncState";

export const SYNC_FORMAT = "codex-magica-sync";
const CLOUD_TOMB_MAX_AGE_MS = 180 * 24 * 3600 * 1000;

export interface CloudEntry {
  updatedAt: number;
  deleted?: true;
  record?: CharacterRecord;
}
export interface CloudFile {
  format: typeof SYNC_FORMAT;
  version: 1;
  savedAt: number;
  characters: Record<string, CloudEntry>;
}

export interface MergeResult {
  roster: CharacterRecord[];
  file: CloudFile;
  base: SyncBase;
  uploadNeeded: boolean;
  pulled: number; // characters added, changed or removed here because of Drive
  conflictCopies: number; // "both changed" cases kept as a second copy
}

export const emptyCloudFile = (): CloudFile => ({ format: SYNC_FORMAT, version: 1, savedAt: 0, characters: {} });

export const parseCloudFile = (raw: unknown): CloudFile | null => {
  const f = raw as CloudFile | null;
  if (!f || typeof f !== "object" || f.format !== SYNC_FORMAT || typeof f.characters !== "object" || f.characters === null) return null;
  return f;
};

const validRecord = (r: unknown): r is CharacterRecord => {
  const x = r as CharacterRecord | null;
  return !!x && typeof x === "object" && typeof x.name === "string" && Array.isArray(x.levels);
};

export const conflictCopyName = (name: string): string => `${name} (másik eszközről)`;

export function mergeWithCloud(local: CharacterRecord[], tombstones: Tombstones, cloud: CloudFile | null, base: SyncBase, now = Date.now()): MergeResult {
  const cloudChars = cloud?.characters ?? {};
  const localById = new Map(local.map((r) => [r.id, r]));
  const ids = new Set<string>([...localById.keys(), ...Object.keys(tombstones), ...Object.keys(cloudChars)]);

  const roster: CharacterRecord[] = [];
  const out: Record<string, CloudEntry> = {};
  const nextBase: SyncBase = {};
  let pulled = 0;
  let conflictCopies = 0;

  const keepLocal = (rec: CharacterRecord) => {
    roster.push(rec);
    out[rec.id] = { updatedAt: rec.updatedAt ?? 0, record: rec };
    nextBase[rec.id] = rec.updatedAt ?? 0;
  };
  const keepDeleted = (id: string, ts: number) => {
    out[id] = { updatedAt: ts, deleted: true };
    nextBase[id] = ts;
  };
  const takeCloud = (id: string, entry: CloudEntry, rec: CharacterRecord | null) => {
    if (rec) roster.push(rec);
    out[id] = entry;
    nextBase[id] = entry.updatedAt;
  };

  ids.forEach((id) => {
    const rec = localById.get(id);
    const localTs = rec ? rec.updatedAt ?? 0 : tombstones[id];
    const entry = cloudChars[id];
    const b = base[id];

    if (!entry) {
      if (rec) keepLocal(rec);
      else if (localTs !== undefined) keepDeleted(id, localTs); // deleted here, Drive never had it: record the deletion anyway
      return;
    }

    const cloudRec = entry.deleted ? null : validRecord(entry.record) ? migrateRecord({ ...entry.record, id, updatedAt: entry.updatedAt }) : undefined;
    if (cloudRec === undefined) {
      // unreadable Drive entry: never let it delete anything here; ours replaces it
      if (rec) keepLocal(rec);
      else if (localTs !== undefined) keepDeleted(id, localTs);
      return;
    }

    if (localTs === undefined) {
      // never seen on this device
      if (cloudRec) pulled++;
      takeCloud(id, entry, cloudRec);
      return;
    }

    const cloudTs = entry.updatedAt;
    if (b === undefined) {
      // no common ancestor (first sync here): newer wins, ties go to Drive
      if (cloudTs >= localTs) {
        if (rec ? cloudTs !== localTs || entry.deleted : cloudRec) pulled++;
        takeCloud(id, entry, cloudRec);
      } else if (rec) keepLocal(rec);
      else keepDeleted(id, localTs);
      return;
    }

    const localChanged = localTs !== b;
    const cloudChanged = cloudTs !== b;
    if (!cloudChanged) {
      if (rec) keepLocal(rec);
      else keepDeleted(id, localTs);
      return;
    }
    if (!localChanged) {
      pulled++;
      takeCloud(id, entry, cloudRec);
      return;
    }

    // both sides changed since the last sync
    if (!rec && !cloudRec) return keepDeleted(id, Math.max(localTs, cloudTs)); // deleted on both
    if (!rec) {
      pulled++;
      return takeCloud(id, entry, cloudRec); // deleted here, edited there: the edit wins
    }
    if (!cloudRec) return keepLocal(rec); // edited here, deleted there: the edit wins
    if (localTs === cloudTs) return keepLocal(rec); // the same version on both sides
    // edit vs edit: keep ours under its id, and Drive's version as a separate character
    keepLocal(rec);
    const copy: CharacterRecord = { ...cloudRec, id: genId(), name: conflictCopyName(cloudRec.name), updatedAt: now };
    roster.push(copy);
    out[copy.id] = { updatedAt: now, record: copy };
    nextBase[copy.id] = now;
    conflictCopies++;
  });

  // forget very old deletions in the file too
  for (const [id, e] of Object.entries(out)) if (e.deleted && now - e.updatedAt > CLOUD_TOMB_MAX_AGE_MS) delete out[id];

  // keep this device's order; characters new from Drive go to the end
  const order = new Map(local.map((r, i) => [r.id, i]));
  roster.sort((a, c) => (order.get(a.id) ?? 1e9) - (order.get(c.id) ?? 1e9));

  const uploadNeeded = JSON.stringify(sortKeys(out)) !== JSON.stringify(sortKeys(cloudChars));
  return { roster, file: { format: SYNC_FORMAT, version: 1, savedAt: now, characters: out }, base: nextBase, uploadNeeded, pulled, conflictCopies };
}

const sortKeys = (o: Record<string, CloudEntry>) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

// Apply a finished merge to the roster as it is NOW. Anything the user changed while the sync was
// running (edited, created or deleted after `startedAt`) wins over the merge result; those changes
// are still ahead of the base, so the next sync uploads them.
export function applyMerge(current: CharacterRecord[], merged: CharacterRecord[], tombstones: Tombstones, startedAt: number): CharacterRecord[] {
  const curById = new Map(current.map((r) => [r.id, r]));
  const deletedSince = (id: string) => (tombstones[id] ?? 0) >= startedAt;
  const result: CharacterRecord[] = [];
  const seen = new Set<string>();
  for (const m of merged) {
    seen.add(m.id);
    if (deletedSince(m.id)) continue;
    const cur = curById.get(m.id);
    result.push(cur && (cur.updatedAt ?? 0) >= startedAt ? cur : m);
  }
  for (const c of current) if (!seen.has(c.id) && (c.updatedAt ?? 0) >= startedAt) result.push(c);
  return result;
}
