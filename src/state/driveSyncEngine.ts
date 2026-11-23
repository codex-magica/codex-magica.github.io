// One sync round with Google Drive: download the file, merge, upload the result.
//
// Drive has no conditional writes for file contents, so a write that races another device's write
// is detected instead: right before uploading we re-read the file's version, and if it moved since
// we downloaded it, the round starts over with the newer file (up to three times).

import { CharacterRecord } from "../model/character";
import { DriveTransport } from "./googleDrive";
import { MergeResult, mergeWithCloud, parseCloudFile } from "./driveMerge";
import { SyncBase, Tombstones } from "./syncState";

export interface SyncInput {
  local: CharacterRecord[];
  tombstones: Tombstones;
  base: SyncBase;
  fileId: string | null;
}
export interface SyncOutput {
  roster: CharacterRecord[];
  base: SyncBase;
  fileId: string;
  pulled: number;
  conflictCopies: number;
  uploaded: boolean;
}

export class SyncRaceError extends Error {}

export async function runSync(drive: DriveTransport, input: SyncInput, now: () => number = Date.now): Promise<SyncOutput> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const remote = await drive.find(input.fileId);
    const merged: MergeResult = mergeWithCloud(input.local, input.tombstones, remote ? parseCloudFile(remote.content) : null, input.base, now());
    let fileId = remote?.id ?? null;
    if (merged.uploadNeeded || !remote) {
      if (remote) {
        const current = await drive.version(remote.id);
        if (current !== null && current !== remote.version) continue; // another device saved meanwhile
        if (current === null) fileId = (await drive.create(merged.file)).id; // file vanished: recreate
        else await drive.update(remote.id, merged.file);
      } else {
        fileId = (await drive.create(merged.file)).id;
      }
    }
    return {
      roster: merged.roster,
      base: merged.base,
      fileId: fileId!,
      pulled: merged.pulled,
      conflictCopies: merged.conflictCopies,
      uploaded: merged.uploadNeeded || !remote,
    };
  }
  throw new SyncRaceError("Drive kept changing during sync");
}
