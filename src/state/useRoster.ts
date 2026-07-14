import { useEffect, useRef, useState } from "react";
import { CharacterRecord } from "../model/character";
import { addTombstone, bumpSyncBase, clearTombstone, clone, genId, loadRoster, loadSyncBase, loadTombstones, saveRoster, saveSyncBase, saveTombstones } from "./storage";
import { CloudUser, ConflictPair, fetchCloudDocs, mergeRosters, pushToCloud, restoreSession, signInInteractive } from "./cloudSync";

export type SyncStatus = "off" | "connecting" | "on" | "error";

export interface SyncApi {
  status: SyncStatus;
  email: string | null;
  message: string | null; // user-facing reason when connecting failed
  enable: () => void; // opens the one-time Google popup (or reconnects after an error)
  disable: () => void; // stops syncing; local data stays
}

// Translate sign-in failures into something actionable; null = the user just cancelled the popup.
const signInErrorMessage = (e: unknown): string | null => {
  const code = (e as { code?: string })?.code ?? "";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (code === "auth/popup-blocked") return "A böngésző blokkolta a bejelentkezési ablakot — engedélyezd a felugró ablakokat ehhez az oldalhoz, majd próbáld újra.";
  if (code === "auth/unauthorized-domain") return "Erről a címről nem engedélyezett a Google-bejelentkezés (Firebase: Authentication → Authorized domains).";
  if (code === "auth/network-request-failed") return "Hálózati hiba — ellenőrizd a kapcsolatot, majd próbáld újra.";
  return `A bejelentkezés nem sikerült${code ? ` (${code})` : ""}.`;
};

export type ConflictChoice = "local" | "cloud" | "both";

export interface RosterApi {
  records: CharacterRecord[];
  get: (id: string) => CharacterRecord | undefined;
  upsert: (record: CharacterRecord) => void; // create or replace by id
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  sync: SyncApi;
  conflicts: ConflictPair[]; // pending sync conflicts awaiting a user decision
  resolveConflict: (id: string, choice: ConflictChoice) => void;
  dismissConflicts: () => void; // "decide later" — they resurface on the next merge
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
// (debounced), and a pull-merge (per-character last-write-wins) runs on app start AND whenever the
// tab becomes visible/focused again — so picking up the iPad after editing on the phone shows the
// fresh data without a manual reload. A push missed because the tab closed early is harmless: the
// next merge sees the newer local `updatedAt` and uploads it then.
export function useRoster(): RosterApi {
  const [records, setRecords] = useState<CharacterRecord[]>(() => loadRoster());
  const [sync, setSync] = useState<{ status: SyncStatus; email: string | null; message: string | null }>(() => ({
    status: syncFlagOn() ? "connecting" : "off",
    email: null,
    message: null,
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
      const tombs = loadTombstones();
      // Expect the cloud to still be at our recorded base; anything else means another device
      // wrote in between and this push must not clobber it.
      const stale = await pushToCloud(user.uid, recs, tombs, tombIds, loadSyncBase());
      const staleSet = new Set(stale);
      // landed pushes → those versions are now the recorded common ancestor
      const baseBump: Record<string, number> = {};
      recs.forEach((r) => {
        if (!staleSet.has(r.id)) baseBump[r.id] = r.updatedAt ?? 0;
      });
      tombIds.forEach((id) => {
        if (!staleSet.has(id)) baseBump[id] = tombs[id] ?? 0;
      });
      bumpSyncBase(baseBump);
      setSync((s) => (s.status === "error" ? { ...s, status: "on" } : s));
      // Rejected pushes = the cloud moved under us → pull-merge now; it either replays the push
      // cleanly or raises the conflict dialog. (Not re-queued as dirty — the merge owns them.)
      if (stale.length > 0) void pullMerge(user);
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

  // Cheap merged-vs-current check: `updatedAt` is stamped on every mutation, so id+updatedAt pairs
  // are a faithful fingerprint. Skipping the no-op setRecords avoids re-rendering open sheets on
  // every tab switch.
  const rosterEqual = (a: CharacterRecord[], b: CharacterRecord[]): boolean =>
    a.length === b.length && a.every((r, i) => r.id === b[i].id && r.updatedAt === b[i].updatedAt);

  const pullingRef = useRef(false);
  const lastPullRef = useRef(0);
  const [conflicts, setConflicts] = useState<ConflictPair[]>([]);

  const pullMerge = async (user: CloudUser): Promise<void> => {
    if (pullingRef.current) return;
    pullingRef.current = true;
    try {
      lastPullRef.current = Date.now();
      const cloud = await fetchCloudDocs(user.uid);
      const tombs = loadTombstones();
      const prevBase = loadSyncBase();
      const { roster, pushRecords, pushTombstoneIds, conflicts: found, nextBase } = mergeRosters(recordsRef.current, tombs, cloud, prevBase);
      if (!rosterEqual(recordsRef.current, roster)) setRecords(roster);
      setConflicts(found);

      // A merge can resurrect a locally-deleted character (edit-beats-delete) — drop its tombstone.
      const liveTombs = { ...tombs };
      let tombsChanged = false;
      roster.forEach((r) => {
        if (r.id in liveTombs) {
          delete liveTombs[r.id];
          tombsChanged = true;
        }
      });
      if (tombsChanged) saveTombstones(liveTombs);

      // Persist the base conservatively: ids we still need to push keep their OLD base until the
      // push lands — otherwise a failed push would read as "in sync" and the cloud could later
      // fast-forward over an unpushed local edit.
      const pendingIds = new Set<string>([...pushRecords.map((r) => r.id), ...pushTombstoneIds]);
      const safeBase = { ...nextBase };
      pendingIds.forEach((id) => {
        if (prevBase[id] !== undefined) safeBase[id] = prevBase[id];
        else delete safeBase[id];
      });
      saveSyncBase(safeBase);
      // These pushes were decided against the snapshot we just fetched, so that snapshot is
      // exactly what the cloud must still look like; a mismatch means a same-moment write from
      // another device, and the next merge (focus/edit) will pick it up as a conflict.
      const expected: Record<string, number | undefined> = {};
      cloud.forEach((d, id) => (expected[id] = d.updatedAt));
      const stale = await pushToCloud(user.uid, pushRecords, liveTombs, pushTombstoneIds, expected);
      const finalBase = { ...nextBase };
      stale.forEach((id) => {
        if (prevBase[id] !== undefined) finalBase[id] = prevBase[id];
        else delete finalBase[id];
      });
      saveSyncBase(finalBase);
    } finally {
      pullingRef.current = false;
    }
  };

  // Visibility/focus refresh: push out local dirt first so the merge compares settled state, then
  // pull. Throttled so rapid tab/app switching doesn't spam Firestore reads.
  const refreshFromCloud = async (): Promise<void> => {
    const user = userRef.current;
    if (!user || Date.now() - lastPullRef.current < 15000) return;
    try {
      await flushPush();
      await pullMerge(user);
      setSync((s) => (s.status === "error" ? { ...s, status: "on" } : s));
    } catch (e) {
      console.error("Google sync refresh failed", e);
    }
  };

  const connect = async (interactive: boolean): Promise<void> => {
    setSync({ status: "connecting", email: null, message: null });
    try {
      const user = interactive ? await signInInteractive() : await restoreSession();
      if (!user) {
        // Stored session gone (revoked / cleared) — a popup is needed, but only on user action.
        setSync({ status: "error", email: null, message: "A korábbi bejelentkezés lejárt — kattints az újracsatlakozáshoz." });
        return;
      }
      userRef.current = user;
      await pullMerge(user);
      setSyncFlag(true);
      setSync({ status: "on", email: user.email, message: null });
    } catch (e) {
      console.error("Google sync connect failed", e);
      userRef.current = null;
      const message = interactive ? signInErrorMessage(e) : "A szinkron kapcsolódása nem sikerült — próbáld újra.";
      // message === null → the user closed the popup themselves; not an error state
      setSync({ status: message !== null && syncFlagOn() ? "error" : "off", email: null, message });
    }
  };

  useEffect(() => {
    if (syncFlagOn()) void connect(false);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushPush();
      else void refreshFromCloud();
    };
    const onFocus = () => void refreshFromCloud();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enable = (): void => {
    if (sync.status === "connecting" || sync.status === "on") return;
    void connect(true);
  };

  // Disabling sync only stops syncing — it does NOT sign out of Firebase. The session is shared
  // with the edge-gate login (and its cookie refresh), and keeping it also makes re-enabling sync
  // instant, with no popup. Real sign-out is the logout button.
  const disable = (): void => {
    setSyncFlag(false);
    userRef.current = null;
    if (pushTimerRef.current !== null) window.clearTimeout(pushTimerRef.current);
    dirtyIdsRef.current = new Set();
    deletedIdsRef.current = new Set();
    setConflicts([]);
    setSync({ status: "off", email: null, message: null });
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

  const resolveConflict = (id: string, choice: ConflictChoice) => {
    const c = conflicts.find((x) => x.id === id);
    if (!c) return;
    setConflicts((cs) => cs.filter((x) => x.id !== id));
    if (choice === "cloud") {
      // Adopt the cloud version as-is: nothing to upload, we're simply in sync at its timestamp.
      setRecords((rs) => rs.map((r) => (r.id === id ? c.cloud : r)));
      bumpSyncBase({ [id]: c.cloud.updatedAt ?? 0 });
      return;
    }
    // Keeping (also) the local version is itself an edit: re-stamp it so every other device
    // fast-forwards to the resolution instead of re-detecting the same conflict. Acknowledge the
    // cloud version we're overriding by bumping the base to it — the conditional push then
    // expects exactly that version. (If the cloud moves yet again before the push lands, the
    // push is rejected and the merge re-raises the conflict against the newer version.)
    bumpSyncBase({ [id]: c.cloud.updatedAt ?? 0 });
    const keptLocal = { ...c.local, updatedAt: Date.now() };
    dirtyIdsRef.current.add(id);
    if (choice === "local") {
      setRecords((rs) => rs.map((r) => (r.id === id ? keptLocal : r)));
    } else {
      const copy = { ...clone(c.cloud), id: genId(), name: `${c.cloud.name} (felhő)`, updatedAt: Date.now() };
      dirtyIdsRef.current.add(copy.id);
      setRecords((rs) => [...rs.map((r) => (r.id === id ? keptLocal : r)), copy]);
    }
    schedulePush();
  };

  const dismissConflicts = () => setConflicts([]);

  return {
    records,
    get,
    upsert,
    remove,
    duplicate,
    sync: { status: sync.status, email: sync.email, message: sync.message, enable, disable },
    conflicts,
    resolveConflict,
    dismissConflicts,
  };
}
