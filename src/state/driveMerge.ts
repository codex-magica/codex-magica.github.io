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
import { repairRecord } from "./storage";
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
  nonce: string; // a random mark per write: a device recognises its own writes by it
  characters: Record<string, FileEntry | unknown>;
}

export type ParsedFile =
  | { ok: true; device: string; nonce: string | null; versions: Map<string, Version>; opaque: Record<string, unknown>; skipped: number }
  | { ok: false; reason: "newer" | "unreadable"; version?: number };

// The first version of the sync kept ONE shared file of this name (no version vectors). It is read as one
// more source, with its characters given a lineage of their own, so nothing in it is lost or silently
// overridden; its deletions aren't applied.
export const LEGACY_FILE_NAME = "codex-magica-roster.json";
const LEGACY_VC = { legacy: 1 };

export const versionKey = (v: Pick<Version, "vc" | "h">): string => `${vcKey(v.vc)}|${v.h}`;

const fromRecord = (r: CharacterRecord): Version => ({ id: r.id, t: r.updatedAt ?? 0, vc: r.syncVc ?? {}, h: contentHash(r), record: r });

export const localVersions = (records: CharacterRecord[], deletions: Deletions): Map<string, Version> => {
  const out = new Map<string, Version>();
  for (const [id, d] of Object.entries(deletions)) out.set(id, { id, t: d.t, vc: d.vc, h: DELETED });
  for (const r of records) out.set(r.id, fromRecord(r));
  return out;
};

// Reads one device file. Records are only repaired, never judged by the rules engine (a version the
// engine can't compute today is still somebody's data). Entries that don't check out at all are skipped
// here and kept verbatim (`opaque`), so this device's own file never loses them when it's rewritten.
export const parseDeviceFile = (raw: unknown): ParsedFile => {
  const f = raw as Partial<DeviceFile> & { characters?: Record<string, unknown> } | null;
  if (!f || typeof f !== "object" || f.format !== SYNC_FORMAT || typeof f.version !== "number") return { ok: false, reason: "unreadable" };
  if (f.version > SYNC_VERSION) return { ok: false, reason: "newer", version: f.version };
  if (!f.characters || typeof f.characters !== "object") return { ok: false, reason: "unreadable" };
  const legacy = (f.version as number) === 1;
  if (!legacy && typeof f.device !== "string") return { ok: false, reason: "unreadable" };
  const versions = new Map<string, Version>();
  const opaque: Record<string, unknown> = {};
  let skipped = 0;
  for (const [id, raw] of Object.entries(f.characters)) {
    const e = raw as (FileEntry & { updatedAt?: number }) | null;
    const t = legacy ? e?.updatedAt : e?.t;
    const vc = legacy ? LEGACY_VC : e?.vc;
    const rec = e && !e.deleted ? repairRecord({ ...(e.record as object), id }) : null;
    if (!e || typeof e !== "object" || typeof t !== "number" || !isVersionVector(vc) || (!e.deleted && !rec)) {
      skipped++;
      opaque[id] = raw;
      continue;
    }
    if (e.deleted) {
      if (!legacy) versions.set(id, { id, t, vc, h: DELETED });
      continue;
    }
    const record = { ...rec!, id, updatedAt: t, syncVc: vc };
    versions.set(id, { id, t, vc, h: contentHash(record), record });
  }
  return { ok: true, device: legacy ? "" : f.device!, nonce: typeof f.nonce === "string" ? f.nonce : null, versions, opaque, skipped };
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
  published: Record<string, string>; // id → version key of what the file holds
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

// Resolves all known versions of one character: versions contained in another are dropped first (so the
// order the files arrive in can't matter), then the remaining parallel ones are merged in a fixed order.
const resolve = (versions: Version[]): { version: Version; copies: Version[] } => {
  const distinct = [...new Map(versions.map((v) => [versionKey(v), v])).values()];
  const maximal = distinct.filter((v) => !distinct.some((u) => u !== v && vcKey(u.vc) !== vcKey(v.vc) && dominatedBy(v.vc, u.vc)));
  maximal.sort((x, y) => (versionKey(x) < versionKey(y) ? -1 : versionKey(x) > versionKey(y) ? 1 : 0));
  let acc = maximal[0];
  const copies: Version[] = [];
  for (const v of maximal.slice(1)) {
    const r = combine(acc, v);
    acc = r.version;
    if (r.copy) copies.push(r.copy);
  }
  return { version: acc, copies };
};

export function mergeRound(
  local: { records: CharacterRecord[]; deletions: Deletions },
  sources: Map<string, Version>[], // every readable device file, this device's previous one included
  ownPrevious: Map<string, Version> | null,
  device: string,
  now: number,
  backups: boolean,
  nonce = "",
  ownOpaque: Record<string, unknown> = {} // entries of this device's previous file that couldn't be read
): RoundResult {
  const mine = localVersions(local.records, local.deletions);
  const groups = new Map<string, Version[]>(); // every known version of each id
  const add = (v: Version) => groups.set(v.id, [...(groups.get(v.id) ?? []), v]);
  mine.forEach(add);
  for (const src of sources) src.forEach(add);
  // a deletion not yet in Drive still knows the last state: a candidate for the "before deletion" backup
  const lastStates: Version[] = [];
  for (const [id, d] of Object.entries(local.deletions))
    if (d.last) lastStates.push({ id, t: d.last.updatedAt ?? d.t, vc: d.last.syncVc ?? {}, h: contentHash(d.last), record: d.last });

  const acc = new Map<string, Version>();
  const pending = [...groups.keys()];
  for (let guard = 0; pending.length && guard < 10_000; guard++) {
    const id = pending.shift()!;
    const { version, copies } = resolve(groups.get(id)!);
    acc.set(id, version);
    // conflict copies are characters too (another device may already have the same one)
    for (const c of copies) {
      const known = groups.get(c.id) ?? [];
      if (known.some((k) => versionKey(k) === versionKey(c))) continue;
      add(c);
      if (!pending.includes(c.id)) pending.push(c.id);
    }
  }
  const seen = new Map<string, Map<string, Version>>(); // every distinct version of each id, for backups
  for (const v of [...[...groups.values()].flat(), ...lastStates]) {
    if (!seen.has(v.id)) seen.set(v.id, new Map());
    seen.get(v.id)!.set(versionKey(v), v);
  }

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

  // Daily backups: a version of a character that gets replaced by one from another day, or by a deletion,
  // is kept (the last state of each day the character was edited, and the last state before deleting it).
  // Only the LAST state counts: older versions still sitting in other devices' files are skipped when a
  // later one (of the same day, for the daily rule) replaced them too.
  const backupList: BackupCandidate[] = [];
  if (backups)
    for (const [id, versions] of seen) {
      const latest = acc.get(id);
      if (!latest) continue;
      const deleted = latest.h === DELETED;
      const replaced = [...versions.values()].filter(
        (v) => v.record && versionKey(v) !== versionKey(latest) && dominatedBy(v.vc, latest.vc) && (deleted || (dayOf(latest.t) !== dayOf(v.t) && v.h !== latest.h))
      );
      const lastOfItsDay = (v: Version) =>
        !replaced.some((u) => u !== v && vcKey(u.vc) !== vcKey(v.vc) && dominatedBy(v.vc, u.vc) && (deleted || dayOf(u.t) === dayOf(v.t)));
      for (const v of replaced) if (lastOfItsDay(v)) backupList.push({ id, version: v, reason: deleted ? "deleted" : "daily" });
    }

  const characters: Record<string, FileEntry | unknown> = {};
  // carried over untouched: this device's file never drops what it couldn't read
  for (const [id, raw] of Object.entries(ownOpaque)) if (!acc.has(id)) characters[id] = raw;
  for (const v of acc.values())
    characters[v.id] = v.h === DELETED ? { t: v.t, vc: v.vc, h: DELETED, deleted: true } : { t: v.t, vc: v.vc, h: v.h, record: stripBookkeeping(v.record!) };
  const publishNeeded = !ownPrevious || canonical(ownPrevious) !== canonical(acc);

  const published: Record<string, string> = {};
  for (const v of acc.values()) published[v.id] = versionKey(v);
  return { records, deletions, file: { format: SYNC_FORMAT, version: SYNC_VERSION, device, savedAt: now, nonce, characters }, publishNeeded, published, pulled, conflictCopies, backups: backupList };
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
