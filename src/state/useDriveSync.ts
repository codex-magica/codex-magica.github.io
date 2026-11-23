import { useCallback, useEffect, useRef, useState } from "react";
import { RosterApi } from "./useRoster";
import {
  DriveAuthError,
  driveSyncAvailable,
  httpDrive,
  prepareSignIn,
  requestTokenInteractive,
  revokeAccess,
  signInReady,
  validToken,
} from "./googleDrive";
import { runSync } from "./driveSyncEngine";
import { applyMerge } from "./driveMerge";
import { clearDriveState, loadDriveSettings, loadSyncBase, loadTombstones, saveDriveSettings, saveSyncBase, saveTombstones } from "./syncState";

// Optional Google Drive sync, driven from the roster screen's "Google Drive" button.
//
// - Turning it on (a tap) opens Google's permission popup, then syncs right away.
// - While the ~1 hour access token is valid, it syncs by itself: a few seconds after each edit, and
//   when the app comes back to the foreground.
// - After that, the next sync needs a tap (browsers only allow Google's popup from a tap). The
//   footer says so; the popup then usually closes by itself.
// Google's script is loaded only once the user opens the Drive window or has sync turned on.

export type DriveStatus = "off" | "idle" | "syncing" | "needsTap" | "error";

export interface DriveSyncApi {
  available: boolean; // built with a Google client ID
  enabled: boolean;
  status: DriveStatus;
  lastSyncAt: number | null;
  note: string | null; // the last round's result or error, in Hungarian
  ready: boolean; // Google's sign-in is loaded, so a tap can open the popup
  prepare: () => void;
  enable: () => void; // call from a tap
  syncNow: () => void; // call from a tap
  disable: () => void;
}

const AUTO_DELAY_MS = 4000;
const FOREGROUND_MIN_GAP_MS = 20_000;

const errorNote = (e: unknown): string => {
  if (e instanceof DriveAuthError) {
    if (e.message === "popup closed") return "A Google-ablak bezárult, mielőtt engedélyt adtál volna.";
    if (e.message === "drive permission not granted") return "A Google Drive-hozzáférés nem lett engedélyezve. Próbáld újra, és hagyd bejelölve a Drive-ra vonatkozó engedélyt.";
    return "A Google-bejelentkezés lejárt. Koppints a szinkronhoz.";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Nincs internetkapcsolat. A szinkron a következő alkalommal folytatódik.";
  return "Nem sikerült elérni a Google Drive-ot. Később újrapróbálható.";
};

export function useDriveSync(roster: RosterApi): DriveSyncApi {
  const available = driveSyncAvailable();
  const [settings, setSettings] = useState(loadDriveSettings);
  const [status, setStatus] = useState<DriveStatus>(() => (settings.enabled ? (validToken() ? "idle" : "needsTap") : "off"));
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const running = useRef(false);
  const again = useRef(false);
  const lastAttempt = useRef(0);
  const enabledRef = useRef(settings.enabled);
  enabledRef.current = settings.enabled;

  const prepare = useCallback(() => {
    if (!available || signInReady()) {
      setReady(signInReady());
      return;
    }
    prepareSignIn().then(
      () => setReady(true),
      () => setNote("A Google-bejelentkezés nem töltődött be. Van internetkapcsolat?")
    );
  }, [available]);

  const round = useCallback(
    async (token: string) => {
      if (running.current) {
        again.current = true;
        return;
      }
      running.current = true;
      lastAttempt.current = Date.now();
      setStatus("syncing");
      try {
        do {
          again.current = false;
          const startedAt = Date.now();
          const s = loadDriveSettings();
          const out = await runSync(httpDrive(token), { local: roster.currentRecords(), tombstones: loadTombstones(), base: loadSyncBase(), fileId: s.fileId });
          if (!enabledRef.current) return; // turned off meanwhile: drop the result
          const tombs = loadTombstones();
          roster.applySync((current) => applyMerge(current, out.roster, tombs, startedAt));
          saveSyncBase(out.base);
          saveTombstones(Object.fromEntries(Object.entries(tombs).filter(([, ts]) => ts >= startedAt)));
          const next = { enabled: true, lastSyncAt: Date.now(), fileId: out.fileId };
          saveDriveSettings(next);
          setSettings(next);
          setNote(
            out.conflictCopies > 0
              ? `${out.conflictCopies} karakter két eszközön is módosult. A másik változat külön karakterként került a listára („… (másik eszközről)”), hogy semmi ne vesszen el.`
              : null
          );
        } while (again.current);
        setStatus("idle");
      } catch (e) {
        setStatus(e instanceof DriveAuthError ? "needsTap" : "error");
        setNote(errorNote(e));
      } finally {
        running.current = false;
      }
    },
    [roster]
  );

  // automatic sync: only with a still-valid token (no popup without a tap)
  const trySilent = useCallback(() => {
    if (!available || !enabledRef.current) return;
    const token = validToken();
    if (token) void round(token);
    else setStatus((s) => (s === "syncing" ? s : "needsTap"));
  }, [available, round]);

  const interactive = (firstTime: boolean) => {
    if (!signInReady()) {
      prepare();
      setNote("A Google-bejelentkezés még töltődik. Próbáld újra egy pillanat múlva.");
      return;
    }
    const token = !firstTime ? validToken() : null;
    if (token) return void round(token);
    requestTokenInteractive(firstTime).then(
      (t) => {
        if (firstTime) {
          const next = { ...loadDriveSettings(), enabled: true };
          saveDriveSettings(next);
          enabledRef.current = true;
          setSettings(next);
        }
        void round(t);
      },
      (e) => {
        setNote(errorNote(e));
        if (!firstTime) setStatus("needsTap");
      }
    );
  };

  const disable = () => {
    enabledRef.current = false;
    void revokeAccess();
    clearDriveState();
    setSettings({ enabled: false, lastSyncAt: null, fileId: null });
    setStatus("off");
    setNote(null);
  };

  // on start (sync turned on earlier): load Google's script and sync if the token still works
  useEffect(() => {
    if (!available || !settings.enabled) return;
    prepare();
    trySilent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a few seconds after local edits
  useEffect(() => {
    if (!available || !settings.enabled || roster.localRevision === 0) return;
    const t = window.setTimeout(trySilent, AUTO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [roster.localRevision, available, settings.enabled, trySilent]);

  // when the app comes back to the foreground or online
  useEffect(() => {
    if (!available || !settings.enabled) return;
    const onWake = () => {
      if (document.visibilityState === "visible" && Date.now() - lastAttempt.current > FOREGROUND_MIN_GAP_MS) trySilent();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);
    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [available, settings.enabled, trySilent]);

  return {
    available,
    enabled: settings.enabled,
    status: settings.enabled ? status : "off",
    lastSyncAt: settings.lastSyncAt,
    note,
    ready,
    prepare,
    enable: () => interactive(true),
    syncNow: () => interactive(false),
    disable,
  };
}
