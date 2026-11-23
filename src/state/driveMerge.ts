// Merging this device's roster with the other devices' copies in Google Drive. Pure functions, no I/O.
//
// Every device keeps ONE file of its own in the hidden app folder and is the only one that ever writes
// it, so two devices can never overwrite each other's work. A round reads every device's file, merges
// them with the roster here, and writes this device's file. The file holds every character this device
// knows, with deletions, each carrying its version vector (see versions.ts) and a content fingerprint.
//
// Merging two versions of one character:
//   - one contains the other (by version vector) → the newer one, with nothing lost
//   - edited in parallel, one of them deleted     → the edit wins (a deletion never beats an edit it
//                                                   didn't see)
//   - edited in parallel, same content            → one version
//   - edited in parallel, different content       → BOTH are kept: the one edited last keeps the
//     character, the other becomes "Név (másik változat)". Every device resolves it the same way (the
//     copy's id comes from its content), so they all end up with the same result and no extra copies.
// Versions that can't be read are never applied and never deleted: they stay in their file.

import { CharacterRecord } from "../model/character";
import { normalizeRecord } from "./storage";
import { contentHash } from "./recordHash";
import { Deletions, conflictCopyName } from "./rosterStore";
import { VersionVector, dominatedBy, isVersionVector, join, vcKey } from "./versions";

export const SYNC_FORMAT = "codex-magica-sync";
export const SYNC_VERSION = 2;
export const DELETED = "deleted";

export interface Version {
  id: string;
  t: number; // when it was made (never behind its ancestors; see recordHash.nextStamp)
  vc: VersionVector;
  h: string; // content fingerprint, or DELETED
  record?: CharacterRecord; // absent for a deletion
}

interface FileEntry {
  t: number;
  vc: VersionVector;
  h: string;
  deleted?: true;
  record?: CharacterRecord;
}
export interface DeviceFile {
  format: typeof SYNC_FORMAT;
  version: typeof SYNC_VERSION;
  device: string;
  savedAt: number;
  characters: Record<string, FileEntry>;
}

export type ParsedFile =
  | { ok: true; device: string; versions: Map<string, Version>; skipped: number }
  | { ok: false; reason: "newer" | "unreadable"; version?: number };

export const versionKey = (v: Pick<Version, "vc" | "h">): string => `${vcKey(v.vc)}|${v.h}`;

const fromRecord = (r: CharacterRecord): Version => ({ id: r.id, t: r.updatedAt ?? 0, vc: r.syncVc ?? {}, h: contentHash(r), record: r });

export const localVersions = (records: CharacterRecord[], deletions: Deletions): Map<string, Version> => {
  const out = new Map<string, Version>();
  for (const [id, d] of Object.entries(deletions)) out.set(id, { id, t: d.t, vc: d.vc, h: DELETED });
  for (const r of records) out.set(r.id, fromRecord(r));
  return out;
};

// Reads one device file. Entries that don't check out are skipped (and left alone in their file).
export const parseDeviceFile = (raw: unknown): ParsedFile => {
  const f = raw as Partial<DeviceFile> | null;
  if (!f || typeof f !== "object" || f.format !== SYNC_FORMAT || typeof f.version !== "number") return { ok: false, reason: "unreadable" };
  if (f.version > SYNC_VERSION) return { ok: false, reason: "newer", version: f.version };
  if (typeof f.device !== "string" || !f.characters || typeof f.characters !== "object") return { ok: false, reason: "unreadable" };
  const versions = new Map<string, Version>();
  let skipped = 0;
  for (const [id, e] of Object.entries(f.characters as Record<string, FileEntry>)) {
    if (!e || typeof e !== "object" || typeof e.t !== "number" || !isVersionVector(e.vc)) {
      skipped++;
      continue;
    }
    if (e.deleted) {
      versions.set(id, { id, t: e.t, vc: e.vc, h: DELETED });
      continue;
    }
    const rec = normalizeRecord({ ...(e.record as object), id });
    if (!rec) {
      skipped++;
      continue;
    }
    const record = { ...rec, id, updatedAt: e.t, syncVc: e.vc };
    versions.set(id, { id, t: e.t, vc: e.vc, h: contentHash(record), record });
  }
  return { ok: true, device: f.device, versions, skipped };
};

export const copyId = (id: string, loser: Version): string => `${id}~${loser.h.slice(0, 10)}`;

// Merges two versions of one character. Deterministic and order-independent, so every device that sees
// the same versions reaches the same result. Returns the version for the id, plus a copy if both kept.
export const combine = (a: Version, b: Version): { version: Version; copy?: Version } => {
  const sameVc = vcKey(a.vc) === vcKey(b.vc);
  if (sameVc && a.h === b.h) return { version: a.t >= b.t ? a : b };
  if (!sameVc && dominatedBy(a.vc, b.vc)) return { version: b };
  if (!sameVc && dominatedBy(b.vc, a.vc)) return { version: a };
  // parallel versions
  const vc = join(a.vc, b.vc);
  const aDel = a.h === DELETED;
  const bDel = b.h === DELETED;
  if (aDel && bDel) return { version: { ...a, t: Math.max(a.t, b.t), vc } };
  if (aDel) return { version: { ...b, vc, record: b.record && { ...b.record, syncVc: vc } } };
  if (bDel) return { version: { ...a, vc, record: a.record && { ...a.record, syncVc: vc } } };
  const [win, lose] = a.t > b.t || (a.t === b.t && a.h > b.h) ? [a, b] : [b, a];
  const version: Version = { ...win, vc, record: win.record && { ...win.record, syncVc: vc } };
  if (a.h === b.h) return { version };
  const id = copyId(a.id, lose);
  const record: CharacterRecord = { ...lose.record!, id, name: conflictCopyName(lose.record!.name), updatedAt: lose.t, syncVc: lose.vc };
  return { version, copy: { id, t: lose.t, vc: lose.vc, h: contentHash(record), record } };
};

export interface BackupCandidate {
  id: string;
  version: Version; // the version to keep (a record, never a deletion)
  reason: "daily" | "deleted";
}

export interface RoundResult {
  records: CharacterRecord[];
  deletions: Deletions;
  file: DeviceFile;
  publishNeeded: boolean;
  pulled: number; // characters changed here because of another device
  conflictCopies: number; // parallel edits kept as a second character
  backups: BackupCandidate[];
}

// The calendar day of a moment, on this device.
export const dayOf = (t: number): string => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const canonical = (m: Map<string, Version>): string =>
  [...m.values()]
    .sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    .map((v) => `${v.id}=${versionKey(v)}@${v.t}`)
    .join("\n");

export function mergeRound(
  local: { records: CharacterRecord[]; deletions: Deletions },
  sources: Map<string, Version>[], // every readable device file, this device's previous one included
  ownPrevious: Map<string, Version> | null,
  device: string,
  now: number,
  backups: boolean
): RoundResult {
  const mine = localVersions(local.records, local.deletions);
  const acc = new Map(mine);
  const queue: Version[] = [];
  const seen = new Map<string, Map<string, Version>>(); // every distinct version of each id, for backups

  const note = (v: Version) => {
    if (!seen.has(v.id)) seen.set(v.id, new Map());
    seen.get(v.id)!.set(versionKey(v), v);
  };
  const add = (v: Version) => {
    note(v);
    const cur = acc.get(v.id);
    if (!cur) return void acc.set(v.id, v);
    const { version, copy } = combine(cur, v);
    acc.set(v.id, version);
    if (copy) queue.push(copy);
  };

  mine.forEach(note);
  for (const src of sources) src.forEach(add);
  // conflict copies are characters too: merge them in the same way (another device may already have one)
  for (let guard = 0; queue.length && guard < 10_000; guard++) add(queue.shift()!);

  // the new roster here: this device's order first, characters new to it after, oldest first
  const order = new Map(local.records.map((r, i) => [r.id, i]));
  const records = [...acc.values()]
    .filter((v) => v.record)
    .sort((x, y) => (order.get(x.id) ?? 1e9) - (order.get(y.id) ?? 1e9) || x.t - y.t || (x.id < y.id ? -1 : 1))
    .map((v) => v.record!);
  const deletions: Deletions = {};
  for (const v of acc.values()) if (v.h === DELETED) deletions[v.id] = { t: v.t, vc: v.vc };

  let pulled = 0;
  let conflictCopies = 0;
  for (const v of acc.values()) {
    const before = mine.get(v.id);
    if (!before) {
      if (v.id.includes("~") && v.record) conflictCopies++;
      else if (v.record) pulled++;
    } else if (before.h !== v.h) pulled++;
  }

  // Daily backups: a version of a character that gets replaced by one from a later day, or by a deletion,
  // is kept (the last state of each day the character was edited, and the last state before deleting it).
  // Only the LAST state counts: older versions still sitting in other devices' files are skipped when a
  // later one (of the same day, for the daily rule) replaced them too.
  const backupList: BackupCandidate[] = [];
  if (backups)
    for (const [id, versions] of seen) {
      const latest = acc.get(id)!;
      const deleted = latest.h === DELETED;
      const replaced = [...versions.values()].filter(
        (v) => v.record && versionKey(v) !== versionKey(latest) && dominatedBy(v.vc, latest.vc) && (deleted || (dayOf(latest.t) > dayOf(v.t) && v.h !== latest.h))
      );
      const lastOfItsDay = (v: Version) =>
        !replaced.some((u) => u !== v && vcKey(u.vc) !== vcKey(v.vc) && dominatedBy(v.vc, u.vc) && (deleted || dayOf(u.t) === dayOf(v.t)));
      for (const v of replaced) if (lastOfItsDay(v)) backupList.push({ id, version: v, reason: deleted ? "deleted" : "daily" });
    }

  const characters: Record<string, FileEntry> = {};
  for (const v of acc.values())
    characters[v.id] = v.h === DELETED ? { t: v.t, vc: v.vc, h: DELETED, deleted: true } : { t: v.t, vc: v.vc, h: v.h, record: stripBookkeeping(v.record!) };
  const publishNeeded = !ownPrevious || canonical(ownPrevious) !== canonical(acc);

  return { records, deletions, file: { format: SYNC_FORMAT, version: SYNC_VERSION, device, savedAt: now, characters }, publishNeeded, pulled, conflictCopies, backups: backupList };
}

export const stripBookkeeping = (r: CharacterRecord): CharacterRecord => {
  const { updatedAt: _t, syncVc: _v, ...rest } = r;
  return rest as CharacterRecord;
};

// Applies a finished round to the roster as it is NOW. Whatever the user changed while the round was
// running (edited, created or deleted) is kept as it is: it continues the version it was made from, so
// the next round merges it properly, as a parallel edit if Drive brought something newer meanwhile.
export function reconcile(
  snapshot: { records: CharacterRecord[]; deletions: Deletions },
  current: { records: CharacterRecord[]; deletions: Deletions },
  merged: { records: CharacterRecord[]; deletions: Deletions }
): { records: CharacterRecord[]; deletions: Deletions } {
  const snap = localVersions(snapshot.records, snapshot.deletions);
  const cur = localVersions(current.records, current.deletions);
  const changed = (id: string) => {
    const a = snap.get(id);
    const b = cur.get(id);
    return !a || !b ? a !== b : versionKey(a) !== versionKey(b);
  };
  const mergedById = new Map(merged.records.map((r) => [r.id, r]));
  const records: CharacterRecord[] = [];
  const deletions: Deletions = {};
  const done = new Set<string>();
  // what the user has now, in their order: kept where they changed it, the merge result elsewhere
  for (const r of current.records) {
    done.add(r.id);
    if (changed(r.id)) records.push(r);
    else if (mergedById.has(r.id)) records.push(mergedById.get(r.id)!);
    else if (merged.deletions[r.id]) deletions[r.id] = merged.deletions[r.id];
    else records.push(r);
  }
  for (const [id, d] of Object.entries(current.deletions)) {
    done.add(id);
    if (changed(id)) deletions[id] = d;
    else if (mergedById.has(id)) records.push(mergedById.get(id)!);
    else deletions[id] = merged.deletions[id] ?? d;
  }
  // characters and deletions new from the merge
  for (const r of merged.records) if (!done.has(r.id)) records.push(r);
  for (const [id, d] of Object.entries(merged.deletions)) if (!done.has(id) && !mergedById.has(id)) deletions[id] = d;
  return { records, deletions };
}
