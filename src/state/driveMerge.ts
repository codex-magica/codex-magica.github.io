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
//     character, the other is stored as an alternative (`id~…`, not listed) and the player is asked
//     which stays (see rosterStore's Conflict). Every device resolves it the same way (the alternative's
//     id comes from its content), so they all end up with the same result and no extra alternatives.
// Versions that can't be read are never applied and never deleted: they stay in their file.

import { CharacterRecord } from "../model/character";
import { repairRecord } from "./storage";
import { contentHash, stripBookkeeping } from "./recordHash";
import type { Deletions } from "./rosterStore";
import { DELETED_HASH, VersionVector, dominatedBy, isVersionVector, join, vcKey, versionKeyOf } from "./versions";

// The name a conflict's other version gets (shown once it's listed: kept as a character of its own, or its
// character deleted). Neutral, so it reads right on every device.
const ALTERNATIVE_SUFFIX = " (másik változat)";
export const alternativeName = (name: string): string => `${name}${ALTERNATIVE_SUFFIX}`;
export const plainName = (name: string): string => (name.endsWith(ALTERNATIVE_SUFFIX) ? name.slice(0, -ALTERNATIVE_SUFFIX.length) : name);

const SYNC_FORMAT = "codex-magica-sync";
export const SYNC_VERSION = 2;

export interface Version {
  id: string;
  t: number; // when it was made (never behind its ancestors; see recordHash.nextStamp)
  vc: VersionVector;
  // The vector of the version whose content this is, when a merge gave it a joined vector (absent: vc).
  // A later edit of exactly this content then counts as continuing it, not as a parallel edit.
  cvc?: VersionVector;
  h: string; // content fingerprint, or DELETED_HASH
  record?: CharacterRecord; // absent for a deletion
}
const cvcOf = (v: Version): VersionVector => v.cvc ?? v.vc;

interface FileEntry {
  t: number;
  vc: VersionVector;
  cvc?: VersionVector;
  h: string;
  deleted?: true;
  record?: CharacterRecord;
}
interface DeviceFile {
  format: typeof SYNC_FORMAT;
  version: typeof SYNC_VERSION;
  device: string;
  savedAt: number;
  nonce: string; // a random mark per write: a device recognises its own writes by it
  characters: Record<string, FileEntry | unknown>;
}

export type ParsedFile =
  | { ok: true; device: string; nonce: string | null; versions: Map<string, Version>; opaque: Record<string, unknown> }
  | { ok: false; reason: "newer" | "unreadable"; version?: number };

export const versionKey = (v: Pick<Version, "vc" | "h">): string => versionKeyOf(v.vc, v.h);

const fromRecord = (r: CharacterRecord): Version => {
  const v: Version = { id: r.id, t: r.updatedAt ?? 0, vc: r.syncVc ?? {}, h: contentHash(r), record: r };
  return isVersionVector(r.syncCvc) && Object.keys(r.syncCvc).length > 0 ? { ...v, cvc: r.syncCvc } : v;
};
// a version with a (possibly) new vector, remembering which version its content was made as; its record
// carries the same bookkeeping
const withVc = (v: Version, vc: VersionVector): Version => {
  const cvc = cvcOf(v);
  const own = vcKey(cvc) === vcKey(vc) ? undefined : cvc;
  const { cvc: _old, ...rest } = v;
  return { ...rest, vc, ...(own ? { cvc: own } : {}), record: v.record && { ...v.record, syncVc: vc, syncCvc: own } };
};

export const localVersions = (records: CharacterRecord[], deletions: Deletions): Map<string, Version> => {
  const out = new Map<string, Version>();
  for (const [id, d] of Object.entries(deletions)) out.set(id, { id, t: d.t, vc: d.vc, h: DELETED_HASH });
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
  if (f.version !== SYNC_VERSION || !f.characters || typeof f.characters !== "object" || typeof f.device !== "string") return { ok: false, reason: "unreadable" };
  const versions = new Map<string, Version>();
  const opaque: Record<string, unknown> = {};
  for (const [id, raw] of Object.entries(f.characters)) {
    const e = raw as FileEntry | null;
    const t = e?.t;
    const vc = e?.vc;
    const rec = e && !e.deleted ? repairRecord({ ...(e.record as object), id }) : null;
    if (!e || typeof e !== "object" || typeof t !== "number" || !isVersionVector(vc) || (!e.deleted && !rec)) {
      opaque[id] = raw;
      continue;
    }
    if (e.deleted) {
      versions.set(id, { id, t, vc, h: DELETED_HASH });
      continue;
    }
    const cvc = isVersionVector(e.cvc) && Object.keys(e.cvc).length > 0 ? e.cvc : undefined;
    const record = { ...rec!, id, updatedAt: t, syncVc: vc, syncCvc: cvc };
    versions.set(id, { id, t, vc, h: contentHash(record), record, ...(cvc ? { cvc } : {}) });
  }
  return { ok: true, device: f.device, nonce: typeof f.nonce === "string" ? f.nonce : null, versions, opaque };
};

// A conflict's other version (see rosterStore's Conflict): its id comes from the character's id and the
// version's content.
export const alternativeId = (id: string, contentHash: string): string => `${id}~${contentHash.slice(0, 10)}`;
// The character an alternative belongs to; null for a character's own id.
export const mainIdOf = (id: string): string | null => (id.includes("~") ? id.slice(0, id.indexOf("~")) : null);

// Merges two versions of one character. Deterministic and order-independent, so every device that sees
// the same versions reaches the same result. Returns the version for the id, plus the other one as an
// alternative if both are kept.
export const combine = (a: Version, b: Version): { version: Version; alternative?: Version } => {
  const sameVc = vcKey(a.vc) === vcKey(b.vc);
  if (sameVc && a.h === b.h) return { version: a.t >= b.t ? a : b };
  if (!sameVc && dominatedBy(a.vc, b.vc)) return { version: b };
  if (!sameVc && dominatedBy(b.vc, a.vc)) return { version: a };
  // parallel versions
  const vc = join(a.vc, b.vc);
  const aDel = a.h === DELETED_HASH;
  const bDel = b.h === DELETED_HASH;
  if (aDel && bDel) return { version: { ...a, t: Math.max(a.t, b.t), vc } };
  // A deletion made after seeing the other side's content: the vectors look parallel only because a merge
  // joined them (the version that lost there is already kept as an alternative). The deletion stands. (With the
  // very same vector on both sides nothing came after anything: two devices under one id, a clone; the
  // edit wins.)
  if (aDel && !sameVc && dominatedBy(cvcOf(b), a.vc)) return { version: { ...a, t: Math.max(a.t, b.t), vc } };
  if (bDel && !sameVc && dominatedBy(cvcOf(a), b.vc)) return { version: { ...b, t: Math.max(a.t, b.t), vc } };
  // otherwise the edit the deletion didn't see wins
  if (aDel) return { version: withVc(b, vc) };
  if (bDel) return { version: withVc(a, vc) };
  // One side's content is an earlier step of the other side: a merge gave it a joined vector (the version
  // it lost to is kept as an alternative in that same merge), and then the device it came from edited it
  // again before seeing the merge. That edit continues the content: no new alternative.
  const aSeenByB = dominatedBy(cvcOf(a), b.vc);
  const bSeenByA = dominatedBy(cvcOf(b), a.vc);
  if (aSeenByB !== bSeenByA) {
    const next = aSeenByB ? b : a;
    return { version: withVc(next, vc) };
  }
  const [win, lose] = a.t > b.t || (a.t === b.t && a.h > b.h) ? [a, b] : [b, a];
  const version: Version = withVc(win, vc);
  if (a.h === b.h) return { version };
  // The alternative's history is the losing version's, under keys of its own ("~" + device): a later
  // alternative of the same content lands on the same id, and with the very same keys it would replace
  // edits made to this one meanwhile. Under its own keys, a later one (from a later version, or from
  // another branch of the character's history) isn't taken for one the player already dropped (answering
  // a conflict deletes the alternative), and edits to it stay parallel to it. The same alternative made on
  // several devices is the same version, so it merges into one.
  const id = alternativeId(a.id, lose.h);
  const altVc = Object.keys(lose.vc).length ? Object.fromEntries(Object.entries(lose.vc).map(([k, n]) => [`~${k}`, n])) : { [`~${id}`]: 1 };
  const record: CharacterRecord = { ...lose.record!, id, name: alternativeName(lose.record!.name), updatedAt: lose.t, syncVc: altVc, syncCvc: undefined };
  return { version, alternative: { id, t: lose.t, vc: altVc, h: contentHash(record), record } };
};

export interface BackupCandidate {
  id: string;
  version: Version; // the version to keep (a record, never a deletion)
  reason: "daily" | "deleted";
}

export interface MergeResult {
  records: CharacterRecord[];
  deletions: Deletions;
  file: DeviceFile;
  publishNeeded: boolean;
  published: Record<string, string>; // id → version key of what the file holds
  pulled: number; // characters changed here because of another device
  undeleted: string[]; // characters deleted here that came back: an edit made elsewhere in parallel won
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
const resolve = (versions: Version[]): { version: Version; alternatives: Version[] } => {
  const distinct = [...new Map(versions.map((v) => [versionKey(v), v])).values()];
  const maximal = distinct.filter((v) => !distinct.some((u) => u !== v && vcKey(u.vc) !== vcKey(v.vc) && dominatedBy(v.vc, u.vc)));
  maximal.sort((x, y) => (versionKey(x) < versionKey(y) ? -1 : versionKey(x) > versionKey(y) ? 1 : 0));
  let acc = maximal[0];
  const alternatives: Version[] = [];
  for (const v of maximal.slice(1)) {
    const r = combine(acc, v);
    acc = r.version;
    if (r.alternative) alternatives.push(r.alternative);
  }
  return { version: acc, alternatives };
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
): MergeResult {
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
    const { version, alternatives } = resolve(groups.get(id)!);
    acc.set(id, version);
    // alternatives sync like characters (another device may already have the same one)
    for (const c of alternatives) {
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
  for (const v of acc.values()) if (v.h === DELETED_HASH) deletions[v.id] = { t: v.t, vc: v.vc };

  let pulled = 0;
  const undeleted: string[] = [];
  for (const v of acc.values()) {
    const before = mine.get(v.id);
    if (!before) {
      if (v.record) pulled++;
    } else if (before.h !== v.h) {
      pulled++;
      // (an alternative a conflict answer dropped can come back as a new question, while its character is
      // there: that's not on the list)
      const mainId = mainIdOf(v.id);
      const main = mainId === null ? undefined : acc.get(mainId);
      const question = main !== undefined && main.h !== DELETED_HASH;
      if (before.h === DELETED_HASH && v.record && !question) undeleted.push(v.record.name);
    }
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
      const deleted = latest.h === DELETED_HASH;
      const replaced = [...versions.values()].filter(
        (v) => v.record && versionKey(v) !== versionKey(latest) && dominatedBy(v.vc, latest.vc) && (deleted || (dayOf(latest.t) !== dayOf(v.t) && v.h !== latest.h))
      );
      const lastOfItsDay = (v: Version) =>
        !replaced.some((u) => u !== v && vcKey(u.vc) !== vcKey(v.vc) && dominatedBy(v.vc, u.vc) && (deleted || dayOf(u.t) === dayOf(v.t)));
      for (const v of replaced) if (lastOfItsDay(v)) backupList.push({ id, version: v, reason: deleted ? "deleted" : "daily" });
    }
  // A character deleted here but edited in parallel elsewhere stays (the edit wins over a deletion that
  // didn't see it). The state it had here before deleting is kept as a backup, so nothing is lost.
  if (backups)
    for (const v of lastStates) {
      const latest = acc.get(v.id);
      if (!latest || latest.h === DELETED_HASH || latest.h === v.h) continue;
      if (backupList.some((b) => b.id === v.id && versionKey(b.version) === versionKey(v))) continue;
      backupList.push({ id: v.id, version: v, reason: "deleted" });
    }

  const characters: Record<string, FileEntry | unknown> = {};
  // carried over untouched: this device's file never drops what it couldn't read
  for (const [id, raw] of Object.entries(ownOpaque)) if (!acc.has(id)) characters[id] = raw;
  for (const v of acc.values())
    characters[v.id] =
      v.h === DELETED_HASH ? { t: v.t, vc: v.vc, h: DELETED_HASH, deleted: true } : { t: v.t, vc: v.vc, ...(v.cvc ? { cvc: v.cvc } : {}), h: v.h, record: stripBookkeeping(v.record!) };
  const publishNeeded = !ownPrevious || canonical(ownPrevious) !== canonical(acc);

  const published: Record<string, string> = {};
  for (const v of acc.values()) published[v.id] = versionKey(v);
  return { records, deletions, file: { format: SYNC_FORMAT, version: SYNC_VERSION, device, savedAt: now, nonce, characters }, publishNeeded, published, pulled, undeleted, backups: backupList };
}

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
