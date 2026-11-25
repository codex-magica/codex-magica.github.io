// One sync round with Google Drive: read every device's file, merge, keep backups, write this device's
// file. Nothing in Drive is ever replaced unless it was read successfully first:
//   - any failed download stops the round (it's retried next time); nothing is written
//   - a file that isn't valid JSON is downloaded once more (a cut-off download reads fine the second
//     time); if it's really damaged and it's this device's own file, a copy is kept aside before the
//     file is rewritten; another device's damaged file is left alone
//   - a file from a newer version of the app stops the round: this version must not misread it
//   - backups are written before this device's file, so a version is never replaced before its backup
//     exists

import { CharacterRecord } from "../model/character";
import { DriveFileMeta, DriveTransport, FileBody, fitBytes } from "./googleDrive";
import { BackupCandidate, ParsedFile, dayOf, mergeRound, parseDeviceFile, stripBookkeeping, versionKey } from "./driveMerge";
import { Deletions } from "./rosterStore";
import type { VersionVector } from "./versions";
import { Published } from "./syncState";

export class SyncNewerVersionError extends Error {}
// Another device writes this device's file: two devices ended up with the same id (browser data copied
// onto a second device). The caller takes a fresh id and syncs again (see driveSyncRound.ts).
// `published`: the version keys every readable Drive file holds, so only versions that aren't in Drive yet
// get relabelled; `ancestry`: every vector Drive holds per character, so a relabelled version keeps the
// published history it was made on.
export class DeviceIdClashError extends Error {
  constructor(
    message: string,
    readonly published: Set<string> = new Set(),
    readonly ancestry: Map<string, VersionVector[]> = new Map()
  ) {
    super(message);
  }
}

export const DRIVE_SNAPSHOT_FORMAT = "codex-magica-snapshot"; // one character's backup in Drive (not the roster backup file, transfer.ts)

export interface SyncInput {
  records: CharacterRecord[];
  deletions: Deletions;
  device: string;
  backups: boolean;
  backedUp: Set<string>; // "id:fingerprint" of versions already backed up
  ourNonces: string[]; // the marks this device wrote into its file recently
  rememberNonce: (nonce: string) => void; // called (and must persist) before a write
  confirmNonce?: (nonce: string) => void; // the mark now in the file is ours (read back, or written)
  // still wanted? Checked right before this device's file is written: a round no longer wanted (sync
  // turned off, the app continued in another tab) writes nothing, so no mark of it lands unremembered
  current?: () => boolean;
}
export interface SyncOutput {
  records: CharacterRecord[];
  deletions: Deletions;
  published: Published;
  backedUp: Set<string>;
  // for tests and diagnostics: characters changed here by another device, copies made
  pulled: number;
  conflictCopies: number;
  copied: string[]; // names of characters kept twice (parallel edits), for the player
  undeleted: string[]; // characters deleted here that came back (a parallel edit won)
  uploaded: boolean;
  skippedFiles: number; // other devices' files that couldn't be read (left alone)
}

// Downloaded files by id and version: a round where nothing changed costs one listing. Only files that
// read fine are kept; an unreadable one is downloaded again next time.
export type RunSyncCache = Map<string, { version: string; parsed: ParsedFile }>;
const sharedCache: RunSyncCache = new Map();

const byCreated = (a: DriveFileMeta, b: DriveFileMeta) => (a.createdTime < b.createdTime ? -1 : a.createdTime > b.createdTime ? 1 : a.id < b.id ? -1 : 1);

const read = async (drive: DriveTransport, f: DriveFileMeta, cache: RunSyncCache): Promise<{ parsed: ParsedFile; raw?: string }> => {
  const hit = cache.get(f.id);
  if (hit && hit.version === f.version) return hit;
  let body: FileBody = await drive.readFile(f.id);
  if ("raw" in body) {
    const first = body.raw;
    body = await drive.readFile(f.id);
    // two different texts: the downloads were cut off, not the file damaged. Stop the round (it's tried
    // again later) rather than treat this device's own file as damaged and rewrite it.
    if ("raw" in body && body.raw !== first) throw new Error("download cut off twice");
  }
  const parsed: ParsedFile = "json" in body ? parseDeviceFile(body.json) : { ok: false, reason: "unreadable" };
  // keep the original text of anything unreadable, so it can be set aside intact
  const out = { parsed, raw: parsed.ok ? undefined : "raw" in body ? body.raw : JSON.stringify(body.json) };
  if (parsed.ok) cache.set(f.id, { version: f.version, parsed });
  return out;
};

// A backup's name depends only on the character and the version, so two devices (in any time zone)
// keeping the same version find the same file instead of making a second one.
const tag = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
};
const backupFileName = (c: BackupCandidate): string => `codex-magica-backup.${tag(c.id)}.${c.version.h}.json`;
const newNonce = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

export async function runSync(drive: DriveTransport, input: SyncInput, now: () => number = Date.now, cache: RunSyncCache = sharedCache): Promise<SyncOutput> {
  const files = await drive.listSyncFiles();
  const own = files.filter((f) => f.device === input.device).sort(byCreated)[0] ?? null;

  const sources = [];
  let ownPrevious = null;
  let ownOpaque: Record<string, unknown> = {};
  let ownUnreadable: string | null = null;
  let skippedFiles = 0;
  let clash = false;
  for (const f of files) {
    const { parsed, raw } = await read(drive, f, cache);
    if (!parsed.ok && parsed.reason === "newer") throw new SyncNewerVersionError(`sync file version ${parsed.version}`);
    if (!parsed.ok) {
      if (f.id === own?.id) ownUnreadable = raw ?? "";
      else skippedFiles++;
      continue;
    }
    if (f.id === own?.id) {
      if (parsed.nonce && input.ourNonces.length > 0 && !input.ourNonces.includes(parsed.nonce)) clash = true;
      else if (parsed.nonce) input.confirmNonce?.(parsed.nonce);
      ownPrevious = parsed.versions;
      ownOpaque = parsed.opaque;
    }
    sources.push(parsed.versions);
  }
  if (clash) {
    const published = new Set<string>();
    const ancestry = new Map<string, VersionVector[]>();
    for (const src of sources)
      for (const v of src.values()) {
        published.add(versionKey(v));
        ancestry.set(v.id, [...(ancestry.get(v.id) ?? []), v.vc]);
      }
    throw new DeviceIdClashError("own file written elsewhere", published, ancestry);
  }

  const nonce = newNonce();
  const result = mergeRound({ records: input.records, deletions: input.deletions }, sources, ownPrevious, input.device, now(), input.backups, nonce, ownOpaque);

  // backups first: nothing gets replaced in Drive before its backup exists
  const backedUp = new Set(input.backedUp);
  for (const c of result.backups) {
    const key = `${c.id}:${c.version.h}`;
    if (backedUp.has(key)) continue;
    const name = backupFileName(c);
    if (!(await drive.backupExists(name))) {
      const props = { char: c.id, day: dayOf(c.version.t), reason: c.reason, name: fitBytes(c.version.record!.name, 110) };
      await drive.createBackup(name, props, { format: DRIVE_SNAPSHOT_FORMAT, version: 1, savedAt: now(), reason: c.reason, day: props.day, record: stripBookkeeping(c.version.record!) });
    }
    backedUp.add(key);
  }

  let uploaded = false;
  if (ownUnreadable !== null) await drive.keepUnreadable(`codex-magica-unreadable.${input.device}.${now()}.txt`, ownUnreadable);
  if ((result.publishNeeded || ownUnreadable !== null) && (input.current?.() ?? true)) {
    input.rememberNonce(nonce); // before writing: an answer lost on the way mustn't make it look foreign
    if (own) {
      const { version } = await drive.updateFile(own.id, result.file);
      cache.set(own.id, { version, parsed: parseDeviceFile(result.file) });
    } else {
      const created = await drive.createSyncFile(input.device, result.file);
      cache.set(created.id, { version: created.version, parsed: parseDeviceFile(result.file) });
    }
    input.confirmNonce?.(nonce);
    uploaded = true;
  }

  return { records: result.records, deletions: result.deletions, published: result.published, backedUp, pulled: result.pulled, conflictCopies: result.conflictCopies, copied: result.copied, undeleted: result.undeleted, uploaded, skippedFiles };
}
