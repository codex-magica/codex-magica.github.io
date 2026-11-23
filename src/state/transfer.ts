// Character files and whole-roster backups.
//
// - A character file is the raw CharacterRecord JSON (schemaVersion travels inside it). Importing one
//   always mints a fresh id, so it can never collide with, or silently overwrite, an existing character.
// - A backup holds the whole roster. Restoring it keeps ids, so restoring the same backup twice is a
//   no-op: unknown characters are added, identical ones skipped, and one that exists but differs is
//   added as a separate copy. Nothing on the device is ever overwritten.

import { CharacterRecord } from "../model/character";
import { genId, isSafeId, normalizeRecord } from "./storage";
import { contentHash } from "./recordHash";

export const BACKUP_FORMAT = "codex-magica-backup";

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  characters: CharacterRecord[];
}

// `updatedAt` and `syncVc` are local bookkeeping; they're meaningless in a file and must not make copies
// look different.
const withoutStamp = (record: CharacterRecord): CharacterRecord => {
  const { updatedAt: _t, syncVc: _v, ...rest } = record;
  return rest;
};

const isBackup = (raw: unknown): raw is BackupFile => {
  const b = raw as BackupFile | null;
  return !!b && typeof b === "object" && b.format === BACKUP_FORMAT && Array.isArray(b.characters);
};

// Phones/tablets get the share sheet (save to iCloud Drive, Google Drive, Files…); everything else a
// download. Resolves false only when the user cancels the share sheet.
const saveJsonFile = async (fileName: string, data: unknown): Promise<boolean> => {
  const json = JSON.stringify(data, null, 2);
  const file = new File([json], fileName, { type: "application/json" });
  const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  if (touch && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return false;
      // any other share failure: fall back to a plain download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke later: revoking right after click() can cancel the download in some browsers
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
};

const safeName = (name: string) => name.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "karakter";

export const exportRecordFile = (record: CharacterRecord): Promise<boolean> =>
  saveJsonFile(`${safeName(record.name)}.json`, withoutStamp(record));

// ── backups ───────────────────────────────────────────────────────────────────────────────────────

const LAST_BACKUP_KEY = "magus.lastBackup.v1";

export const loadLastBackupAt = (): number | null => {
  try {
    const v = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};

export const exportBackupFile = async (records: CharacterRecord[]): Promise<boolean> => {
  const now = new Date();
  const backup: BackupFile = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    characters: records.map(withoutStamp),
  };
  const saved = await saveJsonFile(`codex-magica-mentes-${now.toISOString().slice(0, 10)}.json`, backup);
  if (saved) {
    try {
      localStorage.setItem(LAST_BACKUP_KEY, String(now.getTime()));
    } catch {
      /* storage unavailable: the reminder just stays on */
    }
  }
  return saved;
};

// ── import (character file or backup) ─────────────────────────────────────────────────────────────

export interface ImportResult {
  add: CharacterRecord[]; // ready to upsert
  skipped: number; // already on this device, unchanged
  invalid: number; // entries that couldn't be read (damaged or not a character)
  kind: "character" | "backup";
}

export const parseImportFile = (text: string, existing: CharacterRecord[]): ImportResult | null => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  if (isBackup(data)) {
    const have = new Map(existing.map((r) => [r.id, contentHash(r)]));
    const add: CharacterRecord[] = [];
    let skipped = 0;
    let invalid = 0;
    for (const raw of data.characters) {
      const rec = normalizeRecord(raw);
      if (!rec) {
        invalid++;
        continue;
      }
      // keep ids, so restoring twice is a no-op; an odd or missing one gets a fresh id
      const clean = withoutStamp(isSafeId((raw as CharacterRecord).id) ? rec : { ...rec, id: genId() });
      const current = have.get(clean.id);
      if (current === undefined) add.push(clean);
      else if (current === contentHash(clean)) skipped++;
      else add.push({ ...clean, id: genId() }); // differs from the local one: keep both
    }
    return { add, skipped, invalid, kind: "backup" };
  }

  const rec = normalizeRecord(data);
  if (rec) return { add: [{ ...withoutStamp(rec), id: genId() }], skipped: 0, invalid: 0, kind: "character" };
  return null;
};
