// The sync's status in words: what the roster and the sync window say.
import { describe, expect, test, vi } from "vitest";
import { driveAttention, driveStatusLine, roundNotice, syncedAgo } from "./driveStatus";
import type { DriveSyncApi } from "./useDriveSync";

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const H = 3600_000;
const drive = (over: Partial<DriveSyncApi> = {}): DriveSyncApi =>
  ({ enabled: true, status: "idle", needsUpdate: false, lastSyncAt: NOW - 5 * 60_000, pending: { count: 0, oldest: null }, ...over }) as DriveSyncApi;

describe("sync status in words", () => {
  test("how long ago", () => {
    expect(syncedAgo(NOW - 10_000, NOW)).toBe("az imént");
    expect(syncedAgo(NOW - 5 * 60_000, NOW)).toBe("5 perce");
    expect(syncedAgo(NOW - 3 * H, NOW)).toBe("3 órája");
    expect(syncedAgo(NOW - 30 * H, NOW)).toBe("tegnap");
    expect(syncedAgo(NOW - 80 * H, NOW)).toBe("3 napja");
  });

  test("nothing needs the player: a quiet status line, no attention", () => {
    expect(driveAttention(drive(), NOW)).toBeNull();
    expect(driveStatusLine(drive(), NOW)).toBe("Google Drive: szinkronizálva 5 perce.");
    expect(driveStatusLine(drive({ status: "syncing" }), NOW)).toBe("Szinkronizálás a Google Drive-val…");
    expect(driveStatusLine(drive({ enabled: false }), NOW)).toBeNull();
  });

  test("a passing failure is not a call to action", () => {
    expect(driveAttention(drive({ status: "error" }), NOW)).toBeNull();
    expect(driveStatusLine(drive({ status: "error" }), NOW)).toContain("magától újra megpróbálja");
  });


  test("the permission is gone: a reconnect, said once (the button next to it does it)", () => {
    expect(driveAttention(drive({ status: "needsTap" }), NOW)).toEqual({ kind: "reconnect", text: "Google Drive: a szinkron leállt, mert megszűnt a Google-engedély." });
    expect(driveAttention(drive({ status: "needsTap" }), NOW, true)?.text).toBe("A szinkron leállt, mert megszűnt a Google-engedély."); // no prefix inside the Google Drive window
  });

  test("an app update comes first, and says where the button is", () => {
    const a = driveAttention(drive({ status: "error", needsUpdate: true, driveFull: true }), NOW);
    expect(a?.kind).toBe("update");
    expect(a?.text).toContain("„Frissítés” gombbal");
  });

  test("Google storage full", () => {
    expect(driveAttention(drive({ status: "error", driveFull: true }), NOW)?.kind).toBe("full");
  });

  test("changes stuck on this device for hours are said (differently offline), fresh ones aren't", () => {
    expect(driveAttention(drive({ status: "error", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)?.text).toContain("2 karakter módosítása még csak ezen az eszközön van meg");
    expect(driveAttention(drive({ status: "error", pending: { count: 2, oldest: NOW - 1 * H } }), NOW)).toBeNull();
    expect(driveAttention(drive({ status: "idle", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)?.kind).toBe("stuck"); // idle but stuck: something's wrong
    expect(driveAttention(drive({ status: "syncing", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)).toBeNull(); // going up right now
    vi.stubGlobal("navigator", { onLine: false });
    expect(driveAttention(drive({ status: "error", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)?.kind).toBe("stuckOffline");
    expect(driveStatusLine(drive({ status: "error" }), NOW)).toBe("Google Drive: nincs internet, a módosítások később kerülnek fel.");
    vi.unstubAllGlobals();
  });

  test("in the window, with the box explaining an error, the status line keeps to the facts", () => {
    expect(driveStatusLine(drive({ status: "error" }), NOW, true, true)).toBe("Szinkronizálva 5 perce.");
  });

  test("what a round did is named: copies and deletions that came back", () => {
    expect(roundNotice([], [])).toBeNull();
    expect(roundNotice(["Kael"], [])).toContain("„Kael” két eszközön is módosult, mielőtt szinkronizálódott volna");
    expect(roundNotice(["Kael"], [])).toContain("„Kael (másik változat)”");
    expect(roundNotice(["Kael", "Mira"], [])).toContain("2 karaktered két eszközön is módosult, mielőtt szinkronizálódtak volna: „Kael” és „Mira”");
    expect(roundNotice(["A", "B", "C", "D", "E"], [])).toContain("„A”, „B”, „C” és még 2");
    expect(roundNotice([], ["Kael"])).toBe("A törölt „Kael” visszakerült a listára, mert közben egy másik eszközön módosították. Ha nem kell, töröld újra.");
    expect(roundNotice(["Kael"], ["Mira"])).toMatch(/„Kael”.*A törölt „Mira”/);
  });
});
