import { useEffect, useRef, useState } from "react";
import { CharacterRecord } from "../model/character";
import { addTombstone, clearTombstone, clone, genId, loadRoster, loadTombstones, saveRoster } from "./storage";
import { CloudUser, fetchCloudDocs, mergeRosters, pushToCloud, restoreSession, signInInteractive, signOutCloud } from "./cloudSync";

export type SyncStatus = "off" | "connecting" | "on" | "error";

export interface SyncApi {
  status: SyncStatus;
  email: string | null;
  enable: () => void; // opens the one-time Google popup (or reconnects after an error)
  disable: () => void; // stops syncing; local data stays
}

export interface RosterApi {
  records: CharacterRecord[];
  get: (id: string) => CharacterRecord | undefined;
  upsert: (record: CharacterRecord) => void; // create or replace by id
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  sync: SyncApi;
}

const SYNC_FLAG_KEY = "magus.sync.v1";
const syncFlagOn = (): boolean => {
  try {
    return localStorage.getItem(SYNC_FLAG_KEY) === "on";
  } catch {
    return false;
  }
};
const setSyncFlag = (on: boolean): void => {
  try {
    localStorage.setItem(SYNC_FLAG_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
};

const PUSH_DEBOUNCE_MS = 2500;

// The character roster, persisted to local storage on every change. Local storage is always the
// source of truth; when Google sync is on, changes are also write-through pushed to Firestore
// (debounced), and app start merges the cloud copy in (per-character last-write-wins). A push
// missed because the tab closed early is harmless: the next start's merge sees the newer local
// `updatedAt` and uploads it then.
export function useRoster(): RosterApi {
  const [records, setRecords] = useState<CharacterRecord[]>(() => loadRoster());
  const [sync, setSync] = useState<{ status: SyncStatus; email: string | null }>(() => ({
    status: syncFlagOn() ? "connecting" : "off",
    email: null,
  }));

  const userRef = useRef<CloudUser | null>(null);
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const dirtyIdsRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const pushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    saveRoster(records);
  }, [records]);

  const flushPush = async (): Promise<void> => {
    const user = userRef.current;
    if (!user || (dirtyIdsRef.current.size === 0 && deletedIdsRef.current.size === 0)) return;
    const recs = recordsRef.current.filter((r) => dirtyIdsRef.current.has(r.id));
    const tombIds = Array.from(deletedIdsRef.current);
    dirtyIdsRef.current = new Set();
    deletedIdsRef.current = new Set();
    try {
      await pushToCloud(user.uid, recs, loadTombstones(), tombIds);
      setSync((s) => (s.status === "error" ? { ...s, status: "on" } : s));
    } catch (e) {
      // Re-queue and surface the error; the next edit (or the next app start's merge) retries.
      recs.forEach((r) => dirtyIdsRef.current.add(r.id));
      tombIds.forEach((id) => deletedIdsRef.current.add(id));
      setSync((s) => (s.status === "on" ? { ...s, status: "error" } : s));
      console.error("Google sync push failed", e);
    }
  };

  const schedulePush = (): void => {
    if (!userRef.current) return;
    if (pushTimerRef.current !== null) window.clearTimeout(pushTimerRef.current);
    pushTimerRef.current = window.setTimeout(() => {
      pushTimerRef.current = null;
      void flushPush();
    }, PUSH_DEBOUNCE_MS);
  };

  const runInitialSync = async (user: CloudUser): Promise<void> => {
    const cloud = await fetchCloudDocs(user.uid);
    const tombs = loadTombstones();
    const { roster, pushRecords, pushTombstoneIds } = mergeRosters(recordsRef.current, tombs, cloud);
    setRecords(roster);
    await pushToCloud(user.uid, pushRecords, tombs, pushTombstoneIds);
  };

  const connect = async (interactive: boolean): Promise<void> => {
    setSync({ status: "connecting", email: null });
    try {
      const user = interactive ? await signInInteractive() : await restoreSession();
      if (!user) {
        // Stored session gone (revoked / cleared) — a popup is needed, but only on user action.
        setSync({ status: "error", email: null });
        return;
      }
      userRef.current = user;
      await runInitialSync(user);
      setSyncFlag(true);
      setSync({ status: "on", email: user.email });
    } catch (e) {
      console.error("Google sync connect failed", e);
      userRef.current = null;
      setSync({ status: syncFlagOn() ? "error" : "off", email: null });
    }
  };

  useEffect(() => {
    if (syncFlagOn()) void connect(false);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushPush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = (): void => {
    if (sync.status === "connecting" || sync.status === "on") return;
    void connect(true);
  };

  const disable = (): void => {
    setSyncFlag(false);
    userRef.current = null;
    if (pushTimerRef.current !== null) window.clearTimeout(pushTimerRef.current);
    dirtyIdsRef.current = new Set();
    deletedIdsRef.current = new Set();
    setSync({ status: "off", email: null });
    void signOutCloud().catch(() => {});
  };

  const get = (id: string) => records.find((r) => r.id === id);

  const upsert = (record: CharacterRecord) => {
    const stamped = { ...record, updatedAt: Date.now() };
    clearTombstone(stamped.id);
    deletedIdsRef.current.delete(stamped.id);
    dirtyIdsRef.current.add(stamped.id);
    setRecords((rs) => {
      const i = rs.findIndex((r) => r.id === stamped.id);
      if (i < 0) return [...rs, stamped];
      const copy = rs.slice();
      copy[i] = stamped;
      return copy;
    });
    schedulePush();
  };

  const remove = (id: string) => {
    addTombstone(id);
    dirtyIdsRef.current.delete(id);
    deletedIdsRef.current.add(id);
    setRecords((rs) => rs.filter((r) => r.id !== id));
    schedulePush();
  };

  const duplicate = (id: string) => {
    const r = recordsRef.current.find((x) => x.id === id);
    if (!r) return;
    const copy = { ...clone(r), id: genId(), name: `${r.name} (másolat)`, updatedAt: Date.now() };
    dirtyIdsRef.current.add(copy.id);
    setRecords((rs) => [...rs, copy]);
    schedulePush();
  };

  return { records, get, upsert, remove, duplicate, sync: { status: sync.status, email: sync.email, enable, disable } };
}
