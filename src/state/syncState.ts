// Local bookkeeping for the optional Google Drive sync. All of it is per device, in localStorage.
//
// - Tombstones (id → deletion time) let the merge tell "deleted here" apart from "never seen here";
//   without them a character deleted on this device would come back from Drive on the next sync.
// - The sync base (id → the updatedAt this device last agreed with Drive on) is the common ancestor
//   for three-way merging: it separates a safe fast-forward ("only Drive changed") from a real
//   conflict ("both sides changed"). It is written only after a successful upload, never optimistically.
// - Settings: whether sync is on, when it last succeeded, and the Drive file id.

const TOMB_KEY = "magus.tombstones.v1";
const BASE_KEY = "magus.syncBase.v1";
const SETTINGS_KEY = "magus.driveSync.v1";
const TOMB_MAX_AGE_MS = 180 * 24 * 3600 * 1000; // forget deletions after half a year

export type Tombstones = Record<string, number>;
export type SyncBase = Record<string, number>;

const readMap = (key: string): Record<string, number> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [id, ts] of Object.entries(parsed)) if (typeof ts === "number") out[id] = ts;
    return out;
  } catch {
    return {};
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable: same policy as saveRoster */
  }
};

export const loadTombstones = (): Tombstones => {
  const now = Date.now();
  return Object.fromEntries(Object.entries(readMap(TOMB_KEY)).filter(([, ts]) => now - ts < TOMB_MAX_AGE_MS));
};
export const saveTombstones = (t: Tombstones): void => write(TOMB_KEY, t);
export const addTombstone = (id: string): void => saveTombstones({ ...loadTombstones(), [id]: Date.now() });

export const loadSyncBase = (): SyncBase => readMap(BASE_KEY);
export const saveSyncBase = (b: SyncBase): void => write(BASE_KEY, b);

export interface DriveSettings {
  enabled: boolean;
  lastSyncAt: number | null;
  fileId: string | null;
}

export const loadDriveSettings = (): DriveSettings => {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return {
      enabled: s.enabled === true,
      lastSyncAt: typeof s.lastSyncAt === "number" ? s.lastSyncAt : null,
      fileId: typeof s.fileId === "string" ? s.fileId : null,
    };
  } catch {
    return { enabled: false, lastSyncAt: null, fileId: null };
  }
};
export const saveDriveSettings = (s: DriveSettings): void => write(SETTINGS_KEY, s);

// Turning sync off forgets the pairing with Drive (the characters on this device stay as they are).
export const clearDriveState = (): void => {
  try {
    localStorage.removeItem(BASE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
};
