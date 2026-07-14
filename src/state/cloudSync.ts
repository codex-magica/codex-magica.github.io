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

// Interactive sign-in. Waits for the persisted session to restore first — right after page load
// auth.currentUser is still null while IndexedDB is read, and checking it synchronously would open
// a popup that flashes and auto-closes. The popup only opens when there is truly no session (the
// genuine first sign-in on this device). Throws if the user closes it.
export const signInInteractive = async (): Promise<CloudUser> => {
  const existing = await restoreSession();
  if (existing) return existing;
  const { auth, authMod } = await getFirebase();
  const cred = await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider());
  return toUser(cred.user);
};

// Silent session restore on app start (resolves null if the stored session is gone/revoked).
export const restoreSession = async (): Promise<CloudUser | null> => {
  const { auth, authMod } = await getFirebase();
  return new Promise((resolve) => {
    const unsubscribe = authMod.onAuthStateChanged(auth, (u) => {
      unsubscribe();
      resolve(u ? toUser(u) : null);
    });
  });
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

export const pushToCloud = async (uid: string, records: CharacterRecord[], tombstones: Tombstones, tombstoneIds: string[]): Promise<void> => {
  if (records.length === 0 && tombstoneIds.length === 0) return;
  const { fsMod, db, col } = await charsCollection(uid);
  const batch = fsMod.writeBatch(db);
  for (const r of records) batch.set(fsMod.doc(col, r.id), recordDoc(r) as unknown as Record<string, unknown>);
  for (const id of tombstoneIds) {
    const tomb: CloudDoc = { v: 0, name: "", updatedAt: tombstones[id] ?? Date.now(), deleted: true };
    batch.set(fsMod.doc(col, id), tomb as unknown as Record<string, unknown>);
  }
  await batch.commit();
};
