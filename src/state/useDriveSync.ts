import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RosterApi } from "./useRoster";
import {
  DriveAuthError,
  ReturnContext,
  beginSilentRenewal,
  consumeRedirectResult,
  driveSyncAvailable,
  fetchAccountEmail,
  httpDrive,
  prepareSignIn,
  requestTokenInteractive,
  revokeAccess,
  signInReady,
  validToken,
} from "./googleDrive";
import { runSync } from "./driveSyncEngine";
import { applyMerge } from "./driveMerge";
import {
  DriveSettings,
  OFF_SETTINGS,
  clearDriveState,
  loadDriveSettings,
  loadSyncBase,
  loadTombstones,
  pendingChanges,
  saveSyncBase,
  saveTombstones,
  updateDriveSettings,
} from "./syncState";

// Optional Google Drive sync, driven from the roster screen's "Google Drive" button.
//
// - Turning it on (a tap) opens Google's permission popup, then syncs right away.
// - While the ~1 hour access token is valid it syncs by itself: 2 seconds after an edit, when the app
//   goes to the background, and when it comes back.
// - When the token has expired, the app renews it WITHOUT a tap at safe moments (start, coming back to
//   the app, arriving at the roster) by a quick round trip through Google with prompt=none, then
//   returns to the same screen. Never while a window is open, the creator is open or a field has focus,
//   and at most once every 10 minutes.
// - Only if Google says it needs the user (signed out, permission removed) does the footer ask for a
//   tap; silent attempts then pause for 12 hours.
// Google's script is loaded only once the user opens the Drive window or has sync turned on.

export type DriveStatus = "off" | "idle" | "syncing" | "needsTap" | "error";

export interface DriveSyncApi {
  available: boolean; // built with a Google client ID
  enabled: boolean;
  status: DriveStatus;
  lastSyncAt: number | null;
  email: string | null;
  pending: { count: number; oldest: number | null }; // local changes not yet in Drive
  note: string | null; // the last round's result or error, in Hungarian
  ready: boolean; // Google's sign-in is loaded, so a tap can open the popup
  prepare: () => void;
  enable: () => void; // call from a tap
  syncNow: () => void; // call from a tap
  disable: () => void;
  atRoster: () => void; // the user arrived at the roster: a safe moment to renew
}

export interface DriveSyncOptions {
  safeToLeave: () => boolean; // no unsaved UI state that a page reload would lose
  returnContext: () => ReturnContext;
}

const AUTO_DELAY_MS = 2000;
const FOREGROUND_MIN_GAP_MS = 20_000;
const SILENT_MIN_GAP_MS = 10 * 60_000;
const SILENT_BLOCK_MS = 12 * 3600_000;
const NEEDS_USER = new Set(["login_required", "interaction_required", "consent_required", "account_selection_required", "access_denied", "drive permission not granted"]);

const errorNote = (e: unknown): string => {
  if (e instanceof DriveAuthError) {
    if (e.message === "popup closed") return "A Google-ablak bezárult, mielőtt engedélyt adtál volna.";
    if (e.message === "drive permission not granted") return "A Google Drive-hozzáférés nem lett engedélyezve. Próbáld újra, és hagyd bejelölve a Drive-ra vonatkozó engedélyt.";
    return "A Google-hozzáférés lejárt. Koppints a szinkronhoz.";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Nincs internetkapcsolat. A szinkron a következő alkalommal folytatódik.";
  return "Nem sikerült elérni a Google Drive-ot. Később újrapróbálható.";
};

// The answer of a renewal round trip, read once at startup (index.tsx calls it before rendering).
const initialOutcome = typeof window !== "undefined" ? consumeRedirectResult() : { kind: "none" as const };

const safeDom = (): boolean => {
  if (document.querySelector('[role="dialog"]')) return false;
  const a = document.activeElement;
  return !(a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || (a instanceof HTMLElement && a.isContentEditable));
};

export function useDriveSync(roster: RosterApi, opts: DriveSyncOptions): DriveSyncApi {
  const available = driveSyncAvailable();
  const [settings, setSettings] = useState<DriveSettings>(() => {
    // Google answered a renewal round trip with "needs the user": pause silent attempts for a while
    if (initialOutcome.kind === "error" && NEEDS_USER.has(initialOutcome.error)) return updateDriveSettings({ silentBlockedUntil: Date.now() + SILENT_BLOCK_MS });
    if (initialOutcome.kind === "token") return updateDriveSettings({ silentBlockedUntil: null });
    return loadDriveSettings();
  });
  const [status, setStatus] = useState<DriveStatus>(() => (settings.enabled ? (validToken() ? "idle" : "needsTap") : "off"));
  const [note, setNote] = useState<string | null>(() =>
    initialOutcome.kind === "error" && NEEDS_USER.has(initialOutcome.error) ? "A Google kijelentkeztetett, vagy újra engedélyt kér. Koppints a szinkronhoz." : null
  );
  const [ready, setReady] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const running = useRef(false);
  const again = useRef(false);
  const lastAttempt = useRef(0);
  const enabledRef = useRef(settings.enabled);
  enabledRef.current = settings.enabled;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const patchSettings = useCallback((patch: Partial<DriveSettings>) => setSettings(updateDriveSettings(patch)), []);

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

  const learnEmail = useCallback(
    (token: string) => {
      if (loadDriveSettings().email) return;
      void fetchAccountEmail(token).then((email) => email && enabledRef.current && patchSettings({ email }));
    },
    [patchSettings]
  );

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
          const out = await runSync(httpDrive(token), { local: roster.currentRecords(), tombstones: loadTombstones(), base: loadSyncBase(), fileId: loadDriveSettings().fileId });
          if (!enabledRef.current) return; // turned off meanwhile: drop the result
          const tombs = loadTombstones();
          roster.applySync((current) => applyMerge(current, out.roster, tombs, startedAt));
          saveSyncBase(out.base);
          saveTombstones(Object.fromEntries(Object.entries(tombs).filter(([, ts]) => ts >= startedAt)));
          patchSettings({ enabled: true, lastSyncAt: Date.now(), fileId: out.fileId });
          setSyncTick((n) => n + 1);
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
    [roster, patchSettings]
  );

  // Renew by redirect when nothing would be lost and it isn't looping.
  const canLeave = (): boolean => {
    const s = loadDriveSettings();
    const now = Date.now();
    return (
      navigator.onLine !== false &&
      !running.current &&
      (s.silentBlockedUntil ?? 0) < now &&
      now - (s.lastSilentAt ?? 0) > SILENT_MIN_GAP_MS &&
      safeDom() &&
      optsRef.current.safeToLeave()
    );
  };

  // Sync without user interaction: with a valid token right away; otherwise renew by redirect if this
  // is a safe moment (allowRedirect), else wait for a tap.
  const trySilent = useCallback(
    (allowRedirect: boolean) => {
      if (!available || !enabledRef.current) return;
      const token = validToken();
      if (token) {
        learnEmail(token);
        void round(token);
        return;
      }
      if (allowRedirect && canLeave()) {
        patchSettings({ lastSilentAt: Date.now() });
        beginSilentRenewal(optsRef.current.returnContext(), loadDriveSettings().email);
        return;
      }
      setStatus((s) => (s === "syncing" ? s : "needsTap"));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, round, learnEmail, patchSettings]
  );

  const interactive = (firstTime: boolean) => {
    if (!signInReady()) {
      prepare();
      setNote("A Google-bejelentkezés még töltődik. Próbáld újra egy pillanat múlva.");
      return;
    }
    const token = !firstTime ? validToken() : null;
    if (token) return void round(token);
    requestTokenInteractive(firstTime, loadDriveSettings().email).then(
      (t) => {
        enabledRef.current = true;
        patchSettings({ enabled: true, silentBlockedUntil: null });
        learnEmail(t);
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
    setSettings({ ...OFF_SETTINGS });
    setStatus("off");
    setNote(null);
  };

  // app start: load Google's script (for a later tap) and sync, renewing by redirect if needed
  useEffect(() => {
    if (!available || !settings.enabled) return;
    prepare();
    trySilent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2 seconds after local edits (no redirect: the user is in the middle of something)
  useEffect(() => {
    if (!available || !settings.enabled || roster.localRevision === 0) return;
    const t = window.setTimeout(() => trySilent(false), AUTO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [roster.localRevision, available, settings.enabled, trySilent]);

  // leaving the app: upload right away while the token works; coming back: sync (and renew if needed)
  useEffect(() => {
    if (!available || !settings.enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        const token = validToken();
        if (token && pendingChanges(roster.currentRecords(), loadSyncBase(), loadTombstones()).count > 0) void round(token);
      } else if (Date.now() - lastAttempt.current > FOREGROUND_MIN_GAP_MS) {
        trySilent(true);
      }
    };
    const onOnline = () => trySilent(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [available, settings.enabled, trySilent, round, roster]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pending = useMemo(() => pendingChanges(roster.records, loadSyncBase(), loadTombstones()), [roster.records, syncTick]);

  return {
    available,
    enabled: settings.enabled,
    status: settings.enabled ? status : "off",
    lastSyncAt: settings.lastSyncAt,
    email: settings.email,
    pending: settings.enabled ? pending : { count: 0, oldest: null },
    note,
    ready,
    prepare,
    enable: () => interactive(true),
    syncNow: () => interactive(false),
    disable,
    atRoster: () => {
      if (Date.now() - lastAttempt.current > FOREGROUND_MIN_GAP_MS) trySilent(true);
    },
  };
}
