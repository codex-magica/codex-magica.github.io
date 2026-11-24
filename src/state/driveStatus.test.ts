// The sync's status in words: what the roster and the sync window say.
import { describe, expect, test } from "vitest";
import { driveAttention, driveStatusLine, roundNotice, syncedAgo } from "./driveStatus";
import type { DriveSyncApi } from "./useDriveSync";

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const H = 3600_000;
const drive = (over: Partial<DriveSyncApi> = {}): DriveSyncApi =>
  ({ enabled: true, service: true, status: "idle", needsUpdate: false, lastSyncAt: NOW - 5 * 60_000, pending: { count: 0, oldest: null }, ...over }) as DriveSyncApi;

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

  test("the permission is gone: reconnect, naming the right button for where it's shown", () => {
    const d = drive({ status: "needsTap" });
    expect(driveAttention(d, NOW)).toContain("a Google Drive gombra");
    expect(driveAttention(d, NOW, true)).toContain("az „Újrakapcsolás” gombra");
    expect(driveAttention(drive({ status: "needsTap", service: false }), NOW, true)).toContain("a „Szinkronizálás most” gombra");
  });

  test("an app update comes first", () => {
    expect(driveAttention(drive({ status: "error", needsUpdate: true }), NOW)).toBe("Google Drive: a szinkron folytatásához frissítsd az alkalmazást.");
  });

  test("changes stuck on this device for hours are said, fresh ones aren't", () => {
    expect(driveAttention(drive({ status: "error", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)).toContain("2 karakter módosítása még csak ezen az eszközön van meg");
    expect(driveAttention(drive({ status: "error", pending: { count: 2, oldest: NOW - 1 * H } }), NOW)).toBeNull();
    expect(driveAttention(drive({ status: "idle", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)).toContain("még csak ezen az eszközön"); // idle but stuck: something's wrong
    expect(driveAttention(drive({ status: "syncing", pending: { count: 2, oldest: NOW - 4 * H } }), NOW)).toBeNull(); // going up right now
  });

  test("what a round did is named: copies and deletions that didn't hold", () => {
    expect(roundNotice([], [])).toBeNull();
    expect(roundNotice(["Kael"], [])).toContain("„Kael” két eszközön is módosult egyszerre");
    expect(roundNotice(["Kael"], [])).toContain("„Kael (másik változat)”");
    expect(roundNotice(["Kael", "Mira"], [])).toContain("2 karaktered két eszközön is módosult egyszerre: „Kael” és „Mira”");
    expect(roundNotice(["A", "B", "C", "D", "E"], [])).toContain("„A”, „B”, „C” és még 2");
    expect(roundNotice([], ["Kael"])).toBe("„Kael” törlése nem érvényesült, mert közben egy másik eszközön módosították. Ha nincs rá szükséged, töröld újra.");
    expect(roundNotice(["Kael"], ["Mira"])).toMatch(/„Kael”.*„Mira” törlése/);
  });
});
