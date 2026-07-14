// Google sync: each character is one Firestore doc at users/{uid}/characters/{id}, and the merge
// policy is per-character last-write-wins on `updatedAt` (deletions compete too, via tombstones).
// The record itself travels as a JSON string — Firestore rejects `undefined` field values and the
// CharacterRecord shape is full of optionals, so serializing sidesteps that whole class of bugs.
//
// Sign-in is signInWithPopup once per device; the Firebase session persists in IndexedDB and
// self-refreshes silently afterwards, so no further popups on later visits or edits.

import { CharacterRecord } from "../model/character";
import { getFirebase } from "./firebase";
import { SyncBase, Tombstones, migrateRecord } from "./storage";

export interface CloudUser {
  uid: string;
  email: string | null;
}

interface CloudDoc {
  v: number; // schemaVersion of the serialized record (informational)
  name: string; // duplicated out of the JSON so the Firestore console stays browsable
  updatedAt: number;
  deleted?: boolean;
  json?: string; // absent on tombstone docs
}

export interface ConflictPair {
  id: string;
  local: CharacterRecord; // this device's version (kept on screen while the user decides)
  cloud: CharacterRecord; // the other device's version
}

export interface MergeResult {
  roster: CharacterRecord[]; // what the local roster should become
  pushRecords: CharacterRecord[]; // local characters that won and must be uploaded
  pushTombstoneIds: string[]; // local deletions that won and must be uploaded
  conflicts: ConflictPair[]; // both sides changed since the common ancestor — user must decide
  nextBase: SyncBase; // the base map to persist once this merge (and its pushes) settle
}

const toUser = (u: { uid: string; email: string | null }): CloudUser => ({ uid: u.uid, email: u.email });

// Auth state is primed once at app start and kept live from then on. This matters for Safari:
// signInWithPopup must run with no real async work between the user's tap and the popup opening,
// or the popup gets blocked. With the state pre-resolved, the awaits on the click path are
// already-settled promises (microtasks), which survive the gesture window.
let currentUser: CloudUser | null = null;
let authKnown: Promise<void> | null = null;

export const primeAuthState = (): Promise<void> => {
  if (!authKnown) {
    authKnown = getFirebase().then(
      ({ auth, authMod }) =>
        new Promise<void>((resolve) => {
          authMod.onAuthStateChanged(auth, (u) => {
            currentUser = u ? toUser(u) : null; // permanent listener — tracks sign-in/out for good
            resolve(); // repeat calls are no-ops
          });
        })
    );
  }
  return authKnown;
};

// Interactive sign-in. Reuses the session when there is one (no popup); opens the popup only for
// the genuine first sign-in on this device. Throws if the user closes/blocks it.
export const signInInteractive = async (): Promise<CloudUser> => {
  await primeAuthState(); // resolved long before a human can find the button — no real gap
  if (currentUser) return currentUser;
  const { auth, authMod } = await getFirebase(); // already resolved → microtask
  const cred = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  return toUser(cred.user);
};

// Silent session restore on app start (resolves null if the stored session is gone/revoked).
export const restoreSession = async (): Promise<CloudUser | null> => {
  await primeAuthState();
  return currentUser;
};

export const signOutCloud = async (): Promise<void> => {
  const { auth, authMod } = await getFirebase();
  await authMod.signOut(auth);
};

const charsCollection = async (uid: string) => {
  const { db, fsMod } = await getFirebase();
  return { fsMod, db, col: fsMod.collection(db, "users", uid, "characters") };
};

export const fetchCloudDocs = async (uid: string): Promise<Map<string, CloudDoc>> => {
  const { fsMod, col } = await charsCollection(uid);
  const snap = await fsMod.getDocs(col);
  const out = new Map<string, CloudDoc>();
  snap.forEach((d) => out.set(d.id, d.data() as CloudDoc));
  return out;
};

const parseCloudRecord = (id: string, cdoc: CloudDoc): CharacterRecord | null => {
  if (!cdoc.json) return null;
  try {
    const rec = JSON.parse(cdoc.json) as CharacterRecord;
    if (!rec || typeof rec !== "object" || typeof rec.name !== "string" || !Array.isArray(rec.levels)) return null;
    return migrateRecord({ ...rec, id, updatedAt: cdoc.updatedAt });
  } catch {
    return null;
  }
};

// Three-way merge per character, against the recorded common ancestor (`base`):
//   - only the cloud moved → fast-forward silently (the everyday "other device edited" case)
//   - only this device moved → push silently
//   - both moved → record vs record is a ConflictPair for the user to resolve;
//                  edit vs delete auto-resolves in favor of the edit (no data loss);
//   - no base recorded (pre-existing data / first sync here) → legacy last-write-wins,
//     and the winner seeds the base so future merges are three-way.
// A corrupt/unparseable cloud doc never deletes local data. Conflicted ids stay at their old base
// (and keep the local version on screen) until the user decides.
export const mergeRosters = (local: CharacterRecord[], tombstones: Tombstones, cloud: Map<string, CloudDoc>, base: SyncBase): MergeResult => {
  const localById = new Map(local.map((r) => [r.id, r]));
  const ids = new Set<string>();
  local.forEach((r) => ids.add(r.id));
  Object.keys(tombstones).forEach((id) => ids.add(id));
  cloud.forEach((_, id) => ids.add(id));

  const roster: CharacterRecord[] = [];
  const pushRecords: CharacterRecord[] = [];
  const pushTombstoneIds: string[] = [];
  const conflicts: ConflictPair[] = [];
  const nextBase: SyncBase = {};

  ids.forEach((id) => {
    const rec = localById.get(id);
    // A live local record outranks its own leftover tombstone (it was re-created after deletion).
    const localTs = rec ? rec.updatedAt ?? 0 : tombstones[id] ?? 0;
    const cdoc = cloud.get(id);
    const b = base[id];

    if (!cdoc) {
      if (rec) {
        roster.push(rec);
        pushRecords.push(rec);
        nextBase[id] = localTs;
      }
      return; // tombstone-only: nothing exists anywhere anymore
    }

    const cloudTs = cdoc.updatedAt;
    const cloudRec = cdoc.deleted ? null : parseCloudRecord(id, cdoc);

    if (!cdoc.deleted && !cloudRec) {
      // corrupt cloud doc — local (record or deletion) overwrites it
      if (rec) {
        roster.push(rec);
        pushRecords.push(rec);
        nextBase[id] = localTs;
      } else if (tombstones[id]) {
        pushTombstoneIds.push(id);
        nextBase[id] = localTs;
      }
      return;
    }

    if (b === undefined) {
      // no common ancestor known → legacy last-write-wins (ties go to the cloud)
      if (cloudTs >= localTs) {
        if (!cdoc.deleted) {
          roster.push(cloudRec!);
          nextBase[id] = cloudTs;
        }
      } else if (rec) {
        roster.push(rec);
        pushRecords.push(rec);
        nextBase[id] = localTs;
      } else {
        pushTombstoneIds.push(id);
        nextBase[id] = localTs;
      }
      return;
    }

    const localChanged = localTs !== b;
    const cloudChanged = cloudTs !== b;

    if (!localChanged && !cloudChanged) {
      if (rec) {
        roster.push(rec);
        nextBase[id] = b;
      }
      return;
    }
    if (!localChanged) {
      // fast-forward to the cloud (deletion included)
      if (!cdoc.deleted) {
        roster.push(cloudRec!);
        nextBase[id] = cloudTs;
      }
      return;
    }
    if (!cloudChanged) {
      // only this device moved → push (record or deletion)
      if (rec) {
        roster.push(rec);
        pushRecords.push(rec);
        nextBase[id] = localTs;
      } else {
        pushTombstoneIds.push(id);
        nextBase[id] = localTs;
      }
      return;
    }

    // both sides moved since the base
    if (!rec && cdoc.deleted) return; // deleted on both — they agree
    if (!rec) {
      // deleted here, edited elsewhere → the edit wins (resurrect; caller clears the tombstone)
      roster.push(cloudRec!);
      nextBase[id] = cloudTs;
      return;
    }
    if (cdoc.deleted) {
      // edited here, deleted elsewhere → the edit wins
      roster.push(rec);
      pushRecords.push(rec);
      nextBase[id] = localTs;
      return;
    }
    if (localTs === cloudTs) {
      // same version on both sides (e.g. our own push landed but its confirmation was lost) —
      // they only LOOK divergent from the stale base; they're in sync
      roster.push(rec);
      nextBase[id] = localTs;
      return;
    }
    // record vs record: genuine conflict — keep local on screen, let the user decide
    roster.push(rec);
    conflicts.push({ id, local: rec, cloud: cloudRec! });
    nextBase[id] = b;
  });

  // Keep local ordering stable: existing local order first, cloud-only additions appended.
  const order = new Map(local.map((r, i) => [r.id, i]));
  roster.sort((a, b2) => (order.get(a.id) ?? 1e9) - (order.get(b2.id) ?? 1e9));
  return { roster, pushRecords, pushTombstoneIds, conflicts, nextBase };
};

const recordDoc = (r: CharacterRecord): CloudDoc => ({
  v: r.schemaVersion,
  name: r.name,
  updatedAt: r.updatedAt ?? 0,
  deleted: false,
  json: JSON.stringify(r),
});

// Conditional push (optimistic locking). A blind write would be document-level last-write-wins:
// two devices editing near-simultaneously would let the second push silently overwrite the first,
// destroying the divergent version before any pull could ever detect the conflict. So each write
// happens in a transaction and only lands if the cloud doc is still the version this device
// expected (`expected[id]`, normally the sync base) — or already carries our own timestamp (a
// retried push is idempotent). Rejected ids are returned so the caller can run a pull-merge,
// which is where the conflict surfaces to the user.
export const pushToCloud = async (
  uid: string,
  records: CharacterRecord[],
  tombstones: Tombstones,
  tombstoneIds: string[],
  expected: Record<string, number | undefined>
): Promise<string[]> => {
  if (records.length === 0 && tombstoneIds.length === 0) return [];
  const { fsMod, db, col } = await charsCollection(uid);
  const items = [
    ...records.map((r) => ({ id: r.id, rec: r as CharacterRecord | null })),
    ...tombstoneIds.map((id) => ({ id, rec: null as CharacterRecord | null })),
  ];
  const stale: string[] = [];
  await fsMod.runTransaction(db, async (tx) => {
    stale.length = 0; // transactions may retry — start clean
    const refs = items.map((it) => fsMod.doc(col, it.id));
    const snaps: Array<{ exists: () => boolean; data: () => unknown }> = [];
    for (const ref of refs) snaps.push(await tx.get(ref)); // reads must precede writes
    items.forEach((it, i) => {
      const cloudTs = snaps[i].exists() ? (snaps[i].data() as CloudDoc).updatedAt : undefined;
      const ownTs = it.rec ? it.rec.updatedAt ?? 0 : tombstones[it.id];
      const ok = cloudTs === undefined || cloudTs === expected[it.id] || cloudTs === ownTs;
      if (!ok) {
        stale.push(it.id);
        return;
      }
      const data: CloudDoc = it.rec ? recordDoc(it.rec) : { v: 0, name: "", updatedAt: tombstones[it.id] ?? Date.now(), deleted: true };
      tx.set(refs[i], data as unknown as Record<string, unknown>);
    });
  });
  return stale;
};
