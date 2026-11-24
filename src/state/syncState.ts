// Local bookkeeping for the optional Google Drive sync. All of it is per device, in localStorage.
// (Deletion markers live with the roster, in rosterStore.ts.)
//
// - Settings: whether sync and the daily Drive backups are on, the account, when it last succeeded.
// - Published: what this device last wrote to its file in Drive (id → version key), so the app can show
//   how many changes are still waiting to go up.
// - Backed up: which versions already have a backup in Drive, so they aren't checked again every round.

import { CharacterRecord } from "../model/character";
import { contentHash } from "./recordHash";
import type { Deletions } from "./rosterStore";
import { DELETED_HASH, versionKeyOf } from "./versions";

export const SETTINGS_KEY = "magus.driveSync.v1";
const PUBLISHED_KEY = "magus.drivePublished.v2";
const BACKED_UP_KEY = "magus.driveBackedUp.v1";
const NONCES_KEY = "magus.driveNonces.v1";
const CONFIRMED_NONCE_KEY = "magus.driveNonceConfirmed.v1";
const LEGACY_BASE_KEY = "magus.syncBase.v1"; // the first version of the sync; no longer used

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable: the sync still works, this is only bookkeeping */
  }
};
const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v === null ? fallback : (v as T);
  } catch {
    return fallback;
  }
};

export interface DriveSettings {
  enabled: boolean;
  backups: boolean; // daily backups of every character in Drive (on by default)
  lastSyncAt: number | null;
  email: string | null; // the Google account that syncs (shown in the window; skips the account chooser)
}

const OFF_SETTINGS: DriveSettings = { enabled: false, backups: true, lastSyncAt: null, email: null };

export const loadDriveSettings = (): DriveSettings => {
  const s = read<Record<string, unknown>>(SETTINGS_KEY, {});
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    enabled: s.enabled === true,
    backups: s.backups !== false,
    lastSyncAt: num(s.lastSyncAt),
    email: typeof s.email === "string" ? s.email : null,
  };
};
const saveDriveSettings = (s: DriveSettings): void => write(SETTINGS_KEY, s);
export const updateDriveSettings = (patch: Partial<DriveSettings>): DriveSettings => {
  const next = { ...loadDriveSettings(), ...patch };
  saveDriveSettings(next);
  return next;
};

// ── what this device last published ──────────────────────────────────────────────────────────────
export type Published = Record<string, string>;
export const loadPublished = (): Published => read<Published>(PUBLISHED_KEY, {});
export const savePublished = (p: Published): void => write(PUBLISHED_KEY, p);

// the same keys as driveMerge.versionKey, so what's published compares with what's here
const recordKey = (r: CharacterRecord): string => versionKeyOf(r.syncVc ?? {}, contentHash(r));
const deletionKey = (d: { vc: Record<string, number> }): string => versionKeyOf(d.vc, DELETED_HASH);

// A deletion made here that sync still has to take to Drive (sync on, and Drive doesn't have it yet):
// the deleted character's last state must stay until then, however long that takes, so it can be backed up.
export const deletionAwaitsDrive = (id: string, d: { vc: Record<string, number> }): boolean =>
  loadDriveSettings().enabled && loadPublished()[id] !== deletionKey(d);

// Changes on this device not yet in its Drive file: edits, new characters and deletions. `oldest` is
// when the oldest of them happened (for the "sync before switching devices" hint).
export const pendingChanges = (records: CharacterRecord[], deletions: Deletions, published: Published): { count: number; oldest: number | null } => {
  let count = 0;
  let oldest: number | null = null;
  const note = (ts: number) => {
    count++;
    oldest = oldest === null ? ts : Math.min(oldest, ts);
  };
  for (const r of records) if (published[r.id] !== recordKey(r)) note(r.updatedAt ?? 0);
  for (const [id, d] of Object.entries(deletions)) if (published[id] !== undefined && published[id] !== deletionKey(d)) note(d.t);
  return { count, oldest };
};

// ── versions already backed up ───────────────────────────────────────────────────────────────────
const BACKED_UP_MAX = 5000;
export const loadBackedUp = (): Set<string> => new Set(read<string[]>(BACKED_UP_KEY, []));
export const saveBackedUp = (s: Set<string>): void => write(BACKED_UP_KEY, [...s].slice(-BACKED_UP_MAX));

// ── the marks this device wrote into its Drive file (to notice another device writing it) ──────────
// Three places, so a mark of ours is never mistaken for another device's:
//   - the mark last seen in (or written to) the file, kept on its own: failed writes can't push it out;
//   - the marks of recent write attempts (an answer can get lost after the write happened);
//   - all of these in memory too, for when storage is full.
// (Keyed by the storage object, which is one per browser; tests simulate several devices with one each.)
const sessions = new WeakMap<object, Set<string>>();
const session = (): Set<string> => {
  const key = (globalThis as { localStorage?: object }).localStorage ?? sessions;
  let s = sessions.get(key);
  if (!s) sessions.set(key, (s = new Set()));
  return s;
};
export const forgetSessionNoncesForTests = (): void => session().clear(); // as after a reload
export const loadNonces = (): string[] => {
  const confirmed = read<string | null>(CONFIRMED_NONCE_KEY, null);
  return [...new Set([...read<string[]>(NONCES_KEY, []), ...(confirmed ? [confirmed] : []), ...session()])];
};
export const rememberNonce = (n: string): void => {
  session().add(n);
  write(NONCES_KEY, [...read<string[]>(NONCES_KEY, []), n].slice(-20));
};
export const confirmNonce = (n: string): void => {
  session().add(n);
  write(CONFIRMED_NONCE_KEY, n);
};
export const forgetNonces = (): void => {
  session().clear();
  write(NONCES_KEY, []);
  try {
    localStorage.removeItem(CONFIRMED_NONCE_KEY);
  } catch {
    /* ignore */
  }
};

// Turning sync off forgets the pairing with Drive. The characters (and deletion markers) stay, and the
// device keeps its id, so turning it back on later continues where it left off. The backups choice is
// remembered for next time.
export const clearDriveState = (): void => {
  const backups = loadDriveSettings().backups;
  try {
    localStorage.removeItem(PUBLISHED_KEY);
    localStorage.removeItem(LEGACY_BASE_KEY);
    localStorage.removeItem(BACKED_UP_KEY); // another account may be next: its backups are its own
  } catch {
    /* ignore */
  }
  forgetNonces(); // this tab's in-memory marks too
  saveDriveSettings({ ...OFF_SETTINGS, backups });
};
