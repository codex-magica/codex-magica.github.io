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

const online = (): boolean => typeof navigator === "undefined" || navigator.onLine !== false;
// "Google Drive: …" on the roster; inside the Google Drive window the prefix would only repeat its title
const say = (text: string, inWindow: boolean): string => (inWindow ? text[0].toUpperCase() + text.slice(1) : `Google Drive: ${text}`);

// What sync needs from the player, if anything (null: nothing, or sync is off), and which kind, so the
// button next to it can do it: an app update, Google storage full, Google's permission again, or changes
// stuck on this device for hours (said before the player picks up another device).
export type AttentionKind = "update" | "full" | "reconnect" | "stuck" | "stuckOffline";
export interface Attention {
  kind: AttentionKind;
  text: string;
}
export const driveAttention = (drive: DriveSyncApi, now: number, inWindow = false): Attention | null => {
  if (!drive.enabled || drive.status === "syncing") return null;
  const a = (kind: AttentionKind, text: string): Attention => ({ kind, text: say(text, inWindow) });
  if (drive.needsUpdate)
    return a("update", "a szinkron folytatásához frissítsd az alkalmazást a lent megjelenő „Frissítés” gombbal. Ha nem látod, zárd be, és nyisd meg újra az alkalmazást.");
  if (drive.driveFull) return a("full", "betelt a Google-tárhelyed, ezért a szinkron szünetel. Ha felszabadítasz helyet, magától folytatódik.");
  if (drive.status === "needsTap") return a("reconnect", "a szinkron leállt, mert megszűnt a Google-engedély.");
  if (drive.pending.count > 0 && drive.pending.oldest !== null && now - drive.pending.oldest > STALE_PENDING_MS) {
    const n = drive.pending.count;
    return online()
      ? a("stuck", `${n} karakter módosítása még csak ezen az eszközön van meg. Mielőtt másik eszközön folytatnád, kattints a „Szinkronizálás most” gombra.`)
      : a("stuckOffline", `${n} karakter módosítása még csak ezen az eszközön van meg, mert nincs internet. Amint lesz, magától feltöltődik.`);
  }
  return null;
};

// One-line status (null while sync is off): what needs the player, or how it's going. `factsOnly`: just
// when it last synced (the window says the rest in its own box).
export const driveStatusLine = (drive: DriveSyncApi, now: number, inWindow = false, factsOnly = false): string | null => {
  if (!drive.enabled) return null;
  const synced = drive.lastSyncAt ? say(`szinkronizálva ${syncedAgo(drive.lastSyncAt, now)}.`, inWindow) : say("bekapcsolva.", inWindow);
  if (factsOnly) return synced;
  if (drive.status === "syncing") return "Szinkronizálás a Google Drive-val…";
  const attention = driveAttention(drive, now, inWindow);
  if (attention) return attention.text;
  if (drive.status === "error")
    return say(online() ? "a legutóbbi szinkron nem sikerült, az alkalmazás magától újra megpróbálja." : "nincs internet, a módosítások később kerülnek fel.", inWindow);
  return synced;
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
    parts.push(`${quoted(copied)} két eszközön is módosult, mielőtt szinkronizálódott volna, ezért mindkét változata megmaradt. A másikat „${copied[0]} (másik változat)” néven találod a listán; nézd át, és töröld, amelyik nem kell.`);
  else if (copied.length > 1)
    parts.push(`${copied.length} karaktered két eszközön is módosult, mielőtt szinkronizálódott volna: ${quoted(copied)}. Mindegyiknek megmaradt mindkét változata; a másikat „(másik változat)” végződéssel találod a listán. Nézd át őket, és töröld, amelyik nem kell.`);
  if (undeleted.length === 1) parts.push(`A törölt ${quoted(undeleted)} visszakerült a listára, mert közben egy másik eszközön módosították. Ha nem kell, töröld újra.`);
  else if (undeleted.length > 1) parts.push(`A törölt ${quoted(undeleted)} visszakerültek a listára, mert közben egy másik eszközön módosították őket. Ha nem kellenek, töröld őket újra.`);
  return parts.length ? parts.join(" ") : null;
};
