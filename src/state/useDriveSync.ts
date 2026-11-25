import { useEffect, useMemo, useSyncExternalStore } from "react";
import { BackupMeta } from "./googleDrive";
import { rosterStore } from "./rosterStore";
import { loadPublished, pendingChanges } from "./syncState";
import { CharacterRecord } from "../model/character";
import { DriveHop, DriveNote, DriveStatus, driveSync } from "./driveSyncController";

export type { DriveHop, DriveNote, DriveStatus };

// The Google Drive sync for the app's screens: the controller's state (driveSyncController.ts), plus
// how many changes wait to go up. Mounting starts the sync in this tab; unmounting (the app continued in
// another tab) stops it.
export interface DriveSyncApi {
  available: boolean; // built with a Google client ID and a token service
  enabled: boolean;
  status: DriveStatus;
  lastSyncAt: number | null;
  email: string | null;
  backups: boolean; // daily backups in Drive
  pending: { count: number; oldest: number | null }; // local changes not yet in Drive
  note: DriveNote | null; // the last error, or a notice about something just tapped, in Hungarian
  notice: DriveNote | null; // what a sync round did that the player should know (deletions undone by a parallel edit), until dismissed
  enable: (backups: boolean) => void;
  syncNow: () => void;
  disable: () => void;
  setBackups: (on: boolean) => void;
  dismissNotice: () => void; // the player read it
  hop: DriveHop;
  dismissHop: () => void;
  needsUpdate: boolean; // Drive holds data from a newer app version: sync waits for this one to update
  driveFull: boolean; // the player's Google storage is full: sync waits for them to free some space
  connectProblem: boolean; // coming back from Google's page went wrong: show the window with the note, until it's closed
  ackConnectProblem: () => void;
  listBackups: () => Promise<BackupMeta[]>;
  restoreBackup: (b: BackupMeta) => Promise<CharacterRecord>; // adds it as a new character
  connect: () => Promise<boolean>; // make sure there's access (may leave for Google's page)
}

const store = rosterStore();

export function useDriveSync(): DriveSyncApi {
  const sync = driveSync();
  const s = useSyncExternalStore(sync.subscribe, sync.getState);
  const roster = useSyncExternalStore(store.subscribe, store.getState);
  useEffect(() => {
    sync.start();
    return () => sync.stop();
  }, [sync]);
  const on = s.settings.enabled;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pending = useMemo(() => pendingChanges(roster.records, roster.deletions, loadPublished()), [roster.records, roster.deletions, s.syncs]);
  return {
    available: sync.available,
    enabled: on,
    // off, except while finishing the return from Google's page that turns it on
    status: on ? s.status : s.hop === "backSyncing" && s.status === "syncing" ? "syncing" : "off",
    lastSyncAt: s.settings.lastSyncAt,
    email: s.settings.email,
    backups: s.settings.backups,
    pending: on ? pending : { count: 0, oldest: null },
    note: s.note,
    notice: on ? s.notice : null,
    enable: sync.enable,
    syncNow: sync.syncNow,
    disable: sync.disable,
    setBackups: sync.setBackups,
    dismissNotice: sync.dismissNotice,
    hop: s.hop,
    dismissHop: sync.dismissHop,
    needsUpdate: on && s.needsUpdate,
    driveFull: on && s.driveFull,
    connectProblem: s.connectProblem,
    ackConnectProblem: sync.ackConnectProblem,
    listBackups: sync.listBackups,
    restoreBackup: sync.restoreBackup,
    connect: sync.connect,
  };
}
