// The sync's status in words, for the roster and the sync window (no React here, so it can be tested).
import type { DriveSyncApi } from "./useDriveSync";

// "3 perce", "2 órája", "tegnap"… for the last successful sync
export const syncedAgo = (ts: number, now: number): string => {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return "az imént";
  if (min < 60) return `${min} perce`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} órája`;
  const d = Math.floor(h / 24);
  return d === 1 ? "tegnap" : `${d} napja`;
};

const STALE_PENDING_MS = 3 * 3600_000;

// What sync needs from the player, if anything (null: nothing, or sync is off): an app update, Google's
// permission again, a tap (without a token service), or changes stuck on this device for hours (said
// before the player picks up another device). On the roster the button to tap is "Google Drive"; inside
// the window it's "Szinkronizálás most", or "Újrakapcsolás" when the permission has to be given again.
export const driveAttention = (drive: DriveSyncApi, now: number, inWindow = false): string | null => {
  if (!drive.enabled || drive.status === "syncing") return null;
  const reconnect = drive.service && drive.status === "needsTap";
  const button = !inWindow ? "a Google Drive gombra" : reconnect ? "az „Újrakapcsolás” gombra" : "a „Szinkronizálás most” gombra";
  if (drive.needsUpdate) return "Google Drive: a szinkron folytatásához frissítsd az alkalmazást.";
  if (drive.driveFull) return "Google Drive: betelt a Google-tárhelyed, ezért a szinkron szünetel. Ha felszabadítasz helyet, magától folytatódik.";
  if (reconnect) return `Google Drive: a szinkron leállt, újra engedélyt kell adnod. Kattints ${button}.`;
  if (drive.status === "needsTap") return `Google Drive: a következő szinkronhoz kattints ${button}.`;
  if (drive.pending.count > 0 && drive.pending.oldest !== null && now - drive.pending.oldest > STALE_PENDING_MS)
    return `${drive.pending.count} karakter módosítása még csak ezen az eszközön van meg. Mielőtt másik eszközön folytatod, kattints ${button}.`;
  return null;
};

// One-line status (null while sync is off): what needs the player, or how it's going.
export const driveStatusLine = (drive: DriveSyncApi, now: number, inWindow = false): string | null => {
  if (!drive.enabled) return null;
  if (drive.status === "syncing") return "Szinkronizálás a Google Drive-val…";
  const attention = driveAttention(drive, now, inWindow);
  if (attention) return attention;
  if (drive.status === "error") return "Google Drive: most nem érhető el, az alkalmazás magától újra megpróbálja.";
  return drive.lastSyncAt ? `Google Drive: szinkronizálva ${syncedAgo(drive.lastSyncAt, now)}.` : "Google Drive: bekapcsolva.";
};

// What a round did that the player should know about: characters kept twice (edited on two devices at
// once) and deleted ones that came back (edited elsewhere meanwhile). Null if nothing.
const quoted = (names: string[]): string => {
  const q = names.slice(0, 3).map((n) => `„${n}”`);
  return names.length > 3 ? `${q.join(", ")} és még ${names.length - 3}` : q.length > 1 ? `${q.slice(0, -1).join(", ")} és ${q[q.length - 1]}` : q[0];
};
export const roundNotice = (copied: string[], undeleted: string[]): string | null => {
  const parts: string[] = [];
  if (copied.length === 1)
    parts.push(`${quoted(copied)} két eszközön is módosult egyszerre, ezért mindkét változata megmaradt: a másik „${copied[0]} (másik változat)” néven került a listára. Nézd át, és töröld, amelyikre nincs szükséged.`);
  else if (copied.length > 1)
    parts.push(`${copied.length} karaktered két eszközön is módosult egyszerre: ${quoted(copied)}. Mindegyiknek mindkét változata megmaradt, a másik „(másik változat)” jelöléssel került a listára. Nézd át őket, és töröld, amelyikre nincs szükséged.`);
  if (undeleted.length === 1) parts.push(`${quoted(undeleted)} törlése nem érvényesült, mert közben egy másik eszközön módosították. Ha nincs rá szükséged, töröld újra.`);
  else if (undeleted.length > 1) parts.push(`${quoted(undeleted)} törlése nem érvényesült, mert közben egy másik eszközön módosították őket. Ha nincs rájuk szükséged, töröld őket újra.`);
  return parts.length ? parts.join(" ") : null;
};
