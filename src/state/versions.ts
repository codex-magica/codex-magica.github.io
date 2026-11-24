// Version vectors: how the Drive sync knows whether one version of a character replaced another or
// whether two devices edited it in parallel, with no reliance on device clocks.
//
// Every device has a random id. A character's vector counts the edits each device made to it
// ({ deviceA: 7, deviceB: 2 }). An edit on this device bumps this device's count. Then:
//   - a ≤ b in every count  → b already contains a (b replaced it): take b
//   - b ≤ a                  → a contains b: keep a
//   - neither                → edited in parallel: a real conflict
// Joining two vectors (the larger count per device) gives a vector that contains both.

export type VersionVector = Record<string, number>;

const DEVICE_KEY = "magus.deviceId.v1";
const COUNTER_KEY = "magus.vcCounter.v1";
let sessionId: string | null = null; // only when the id can't be saved
let testId: string | null = null;

// This browser's id for the sync. Stable as long as the browser keeps the app's storage. Read from
// storage every time (not cached), so when one tab takes a new id (see resetDeviceId) the others follow
// at once instead of numbering edits under the old one.
export const deviceId = (): string => {
  if (testId) return testId;
  let id: string | null = null;
  try {
    id = localStorage.getItem(DEVICE_KEY);
  } catch {
    /* storage unavailable */
  }
  if (id && /^[a-z0-9]{6,32}$/.test(id)) return id;
  if (sessionId) return sessionId;
  const fresh = (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 16);
  try {
    localStorage.setItem(DEVICE_KEY, fresh);
  } catch {
    sessionId = fresh; // can't be saved: one id for this session, which only costs a few extra conflict checks
  }
  return fresh;
};
export const setDeviceIdForTests = (id: string | null): void => {
  testId = id;
};

// A fresh id for this browser: used when another device turns out to be writing under the same id
// (browser data restored from a backup onto a second device). The edit counter stays: numbers only have
// to be unique per id, and a tab still finishing an edit must not get a number twice.
export const resetDeviceId = (): string => {
  sessionId = null;
  try {
    localStorage.removeItem(DEVICE_KEY);
  } catch {
    /* storage unavailable */
  }
  return deviceId();
};

// One counter per device, shared by all its tabs (read and written in the same synchronous step), so a
// device never gives two different versions the same number, even from two tabs.
const nextCounter = (atLeast: number): number => {
  let n = 0;
  try {
    n = Number(localStorage.getItem(COUNTER_KEY)) || 0;
  } catch {
    /* storage unavailable */
  }
  const next = Math.max(n, atLeast) + 1;
  try {
    localStorage.setItem(COUNTER_KEY, String(next));
  } catch {
    /* storage unavailable: the in-version count still increases */
  }
  return next;
};

export const bump = (vc: VersionVector | undefined, device: string): VersionVector => ({ ...vc, [device]: nextCounter(vc?.[device] ?? 0) });

export const join = (a: VersionVector, b: VersionVector): VersionVector => {
  const out: VersionVector = { ...a };
  for (const [k, n] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, n);
  return out;
};

// a ≤ b: b has seen every edit a has. An empty vector means "lineage unknown" and is never ≤ anything
// else (only equal to another empty one), so a version of unknown origin can't be silently replaced.
export const dominatedBy = (a: VersionVector, b: VersionVector): boolean => {
  const ak = Object.keys(a);
  if (ak.length === 0) return Object.keys(b).length === 0;
  return ak.every((k) => (b[k] ?? 0) >= a[k]);
};

export const vcKey = (vc: VersionVector): string =>
  Object.keys(vc)
    .sort()
    .map((k) => `${k}:${vc[k]}`)
    .join(",");

// A version of a character, as compared between devices: its vector plus its content fingerprint (or
// DELETED_HASH for a deletion).
export const DELETED_HASH = "deleted";
export const versionKeyOf = (vc: VersionVector, h: string): string => `${vcKey(vc)}|${h}`;

export const isVersionVector = (v: unknown): v is VersionVector =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v as object).every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0);
