// Google sync: each character is one Firestore doc at users/{uid}/characters/{id}, and the merge
// policy is per-character last-write-wins on `updatedAt` (deletions compete too, via tombstones).
// The record itself travels as a JSON string — Firestore rejects `undefined` field values and the
// CharacterRecord shape is full of optionals, so serializing sidesteps that whole class of bugs.
//
// Sign-in is signInWithPopup once per device; the Firebase session persists in IndexedDB and
// self-refreshes silently afterwards, so no further popups on later visits or edits.

import { CharacterRecord } from "../model/character";
import { getFirebase } from "./firebase";
import { Tombstones, migrateRecord } from "./storage";

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

export interface MergeResult {
  roster: CharacterRecord[]; // what the local roster should become
  pushRecords: CharacterRecord[]; // local characters that won and must be uploaded
  pushTombstoneIds: string[]; // local deletions that won and must be uploaded
}

const toUser = (u: { uid: string; email: string | null }): CloudUser => ({ uid: u.uid, email: u.email });

// Interactive sign-in — the one-time popup. Throws if the user closes it.
export const signInInteractive = async (): Promise<CloudUser> => {
  const { auth, authMod } = await getFirebase();
  if (auth.currentUser) return toUser(auth.currentUser);
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

// Per-character last-write-wins across three sources: local records, local tombstones, cloud docs.
// Ties go to the cloud (nothing to upload). A corrupt/unparseable cloud doc never deletes local data.
export const mergeRosters = (local: CharacterRecord[], tombstones: Tombstones, cloud: Map<string, CloudDoc>): MergeResult => {
  const localById = new Map(local.map((r) => [r.id, r]));
  const ids = new Set<string>();
  local.forEach((r) => ids.add(r.id));
  Object.keys(tombstones).forEach((id) => ids.add(id));
  cloud.forEach((_, id) => ids.add(id));

  const roster: CharacterRecord[] = [];
  const pushRecords: CharacterRecord[] = [];
  const pushTombstoneIds: string[] = [];

  ids.forEach((id) => {
    const rec = localById.get(id);
    // A live local record outranks its own leftover tombstone (it was re-created after deletion).
    const localTs = rec ? rec.updatedAt ?? 0 : tombstones[id] ?? 0;
    const cdoc = cloud.get(id);

    if (cdoc && cdoc.updatedAt >= localTs) {
      if (cdoc.deleted) return; // cloud deletion wins → drop locally
      const parsed = parseCloudRecord(id, cdoc);
      if (parsed) {
        roster.push(parsed);
        return;
      }
      // fall through: cloud doc is corrupt — treat local as the winner
    }

    if (rec) {
      roster.push(rec);
      pushRecords.push(rec);
    } else if (cdoc && !cdoc.deleted) {
      pushTombstoneIds.push(id); // deleted locally after the cloud copy was written
    }
  });

  // Keep local ordering stable: existing local order first, cloud-only additions appended.
  const order = new Map(local.map((r, i) => [r.id, i]));
  roster.sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
  return { roster, pushRecords, pushTombstoneIds };
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
