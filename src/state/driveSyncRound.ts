// One sync round with this device's saved state: what useDriveSync runs each time (under its lock), and
// what the tests run too, so they exercise exactly this code.
//
// The roster is re-read first (another tab may have changed it); the round's result is applied to what's
// saved when it ends, so edits made meanwhile (here or in another tab) stay. If another device turns out
// to write under this device's id (browser data copied to a second device), this device takes a new id,
// keeps its own unpublished edits as its own, and runs again.
import { DriveTransport } from "./googleDrive";
import { DeviceIdClashError, SyncOutput, runSync, RunSyncCache } from "./driveSyncEngine";
import { RosterStore } from "./rosterStore";
import { deviceId, resetDeviceId } from "./versions";
import { confirmNonce, forgetNonces, loadBackedUp, loadNonces, loadPublished, rememberNonce, saveBackedUp, savePublished } from "./syncState";

export interface RoundOptions {
  store: RosterStore;
  drive: DriveTransport;
  backups: boolean;
  // still wanted? (false once sync was turned off, or on again, meanwhile: nothing is kept from the round)
  current: () => boolean;
  now?: () => number;
  cache?: RunSyncCache;
}

export interface RoundResult {
  out: SyncOutput;
  newDeviceId: string | null; // set if this device took a new id (a clone was found)
}

// Null: the round was no longer wanted when it ended, and nothing was kept.
export async function syncRound({ store, drive, backups, current, now, cache }: RoundOptions): Promise<RoundResult | null> {
  store.reload(); // the freshest saved state
  let snapshot = store.getState();
  const run = () => {
    snapshot = store.getState();
    return runSync(
      drive,
      {
        records: snapshot.records,
        deletions: snapshot.deletions,
        device: deviceId(),
        backups,
        backedUp: loadBackedUp(),
        ourNonces: loadNonces(),
        // marks are kept only while the round is still wanted: after "Kikapcsolás" they'd outlive the
        // reset and make this device's file look like a clone's later
        rememberNonce: (n: string) => void (current() && rememberNonce(n)),
        confirmNonce: (n: string) => void (current() && confirmNonce(n)),
      },
      now,
      cache
    );
  };
  let out: SyncOutput;
  let newDeviceId: string | null = null;
  try {
    out = await run();
  } catch (e) {
    if (!(e instanceof DeviceIdClashError)) throw e;
    if (!current()) return null;
    const old = deviceId();
    newDeviceId = resetDeviceId();
    // shared history: what Drive holds, and what this device itself last published there
    store.relabelDevice(old, newDeviceId, new Set([...e.published, ...Object.values(loadPublished())]));
    forgetNonces();
    savePublished({});
    out = await run();
  }
  if (!current()) return null;
  store.applyRound(snapshot, out);
  savePublished(out.published);
  saveBackedUp(out.backedUp);
  return { out, newDeviceId };
}
