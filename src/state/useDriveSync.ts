import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  BackupMeta,
  DriveAuthError,
  ReturnContext,
  beginSilentRenewal,
  consumeRedirectResult,
  driveSyncAvailable,
  fetchAccountEmail,
  forgetToken,
  httpDrive,
  prepareSignIn,
  requestTokenInteractive,
  revokeAccess,
  signInReady,
  validToken,
} from "./googleDrive";
import { BACKUP_FORMAT, DeviceIdClashError, SyncNewerVersionError, runSync } from "./driveSyncEngine";
import { rosterStore } from "./rosterStore";
import { deviceId, resetDeviceId } from "./versions";
import { normalizeRecord, genId } from "./storage";
import { CharacterRecord } from "../model/character";
import {
  DriveSettings,
  SETTINGS_KEY,
  clearDriveState,
  loadBackedUp,
  loadDriveSettings,
  loadPublished,
  loadNonces,
  forgetNonces,
  pendingChanges,
  rememberNonce,
  confirmNonce,
  saveBackedUp,
  savePublished,
  updateDriveSettings,
} from "./syncState";

// Optional Google Drive sync, driven from the roster screen's "Google Drive" button.
//
// - Turning it on (a tap) opens Google's permission popup, then syncs right away.
// - While the ~1 hour access token is valid it syncs by itself: 2 seconds after an edit, when the app
//   goes to the background, and when it comes back.
// - When the token has expired, the app renews it WITHOUT a tap at safe moments (start, coming back to
//   the app, arriving at the roster, or a minute without touches while changes are waiting) by a quick
//   round trip through Google with prompt=none, then returns to the same screen and scroll position.
//   A small notice announces it 3 seconds ahead ("Most ne" cancels). Never while a window is open, the
//   creator is open or a field has focus, and at most once every 10 minutes.
// - Only if Google says it needs the user (signed out, permission removed) does the footer ask for a
//   tap; silent attempts then pause for 12 hours (1 hour after other errors).
// - Every new token is checked against the account sync was set up with, so characters never go into
//   another account's Drive.
// - One round at a time, across tabs too (Web Locks where available).
// Google's script is loaded only once the user opens the Drive window or has sync turned on.

export type DriveStatus = "off" | "idle" | "syncing" | "needsTap" | "error";
// The renewal notice: about to leave for Google, back and syncing, back and done.
export type DriveHop = "leaving" | "backSyncing" | "backDone" | null;

export interface DriveSyncApi {
  available: boolean; // built with a Google client ID
  enabled: boolean;
  status: DriveStatus;
  lastSyncAt: number | null;
  email: string | null;
  backups: boolean; // daily backups in Drive
  pending: { count: number; oldest: number | null }; // local changes not yet in Drive
  note: string | null; // the last round's result or error, in Hungarian
  ready: boolean; // Google's sign-in is loaded, so a tap can open the popup
  prepare: () => void;
  enable: (backups: boolean) => void; // call from a tap
  syncNow: () => void; // call from a tap
  disable: () => void;
  setBackups: (on: boolean) => void;
  atRoster: () => void; // the user arrived at the roster: a safe moment to renew
  hop: DriveHop;
  cancelHop: () => void; // "Most ne" on the notice
  listBackups: () => Promise<BackupMeta[]>; // needs a valid token (see connect)
  restoreBackup: (b: BackupMeta) => Promise<CharacterRecord>; // adds it as a new character
  connect: () => Promise<boolean>; // get a token from a tap, if there's none
}

export interface DriveSyncOptions {
  safeToLeave: () => boolean; // no unsaved UI state that a page reload would lose
  returnContext: () => ReturnContext;
}

const AUTO_DELAY_MS = 2000;
const FOREGROUND_MIN_GAP_MS = 20_000;
const SILENT_MIN_GAP_MS = 10 * 60_000;
const SILENT_BLOCK_MS = 12 * 3600_000;
const SILENT_BACKOFF_MS = 3600_000;
const RETRY_MS = 2000; // a round asked for while a failing one was running
export const HOP_NOTICE_MS = 3000; // the notice is shown this long before leaving for Google
const HOP_DONE_MS = 2400; // "Szinkronizálva" stays this long after coming back
const IDLE_HOP_MS = 60_000; // no touches for this long, with changes waiting: renew
const IDLE_CHECK_MS = 10_000;
const NEEDS_USER = new Set(["login_required", "interaction_required", "consent_required", "account_selection_required", "access_denied", "drive permission not granted"]);

class AccountMismatchError extends Error {}

class SupersededError extends Error {}

const errorNote = (e: unknown): string => {
  if (e instanceof AccountMismatchError) return e.message;
  if (e instanceof SyncNewerVersionError) return "A Drive-on lévő adatokat az alkalmazás egy újabb verziója mentette. Frissítsd az alkalmazást (zárd be, majd nyisd meg újra), és folytatódik a szinkron.";
  if (e instanceof DriveAuthError) {
    if (e.message === "popup closed") return "A Google-ablak bezárult, mielőtt engedélyt adtál volna.";
    if (e.message === "drive permission not granted") return "Nem engedélyezted a Google Drive-hozzáférést. Próbáld újra, és hagyd bejelölve a Drive-ra vonatkozó engedélyt.";
    return "A Google-hozzáférés lejárt. Kattints a szinkronhoz.";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Nincs internetkapcsolat. A szinkron a következő alkalommal folytatódik.";
  return "Nem sikerült elérni a Google Drive-ot. Később magától újra megpróbálja.";
};

// The answer of a renewal round trip, read once at startup (before rendering).
const initialOutcome = typeof window !== "undefined" ? consumeRedirectResult() : { kind: "none" as const };

const safeDom = (): boolean => {
  if (document.querySelector('[role="dialog"]')) return false;
  const a = document.activeElement;
  return !(a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || (a instanceof HTMLElement && a.isContentEditable));
};

// One round at a time across this browser's tabs (where the browser supports Web Locks).
const withSyncLock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  return locks?.request ? (locks.request("codex-magica-drive-sync", fn) as Promise<T>) : fn();
};

const store = rosterStore();
const verifiedTokens = new Set<string>();

export function useDriveSync(opts: DriveSyncOptions): DriveSyncApi {
  const available = driveSyncAvailable();
  const roster = useSyncExternalStore(store.subscribe, store.getState);
  const [settings, setSettings] = useState<DriveSettings>(() => {
    // Google answered a renewal round trip: "needs the user" pauses silent attempts for a while, other
    // errors for an hour; a token lifts the pause
    if (initialOutcome.kind === "error")
      return updateDriveSettings({ silentBlockedUntil: Date.now() + (NEEDS_USER.has(initialOutcome.error) ? SILENT_BLOCK_MS : SILENT_BACKOFF_MS) });
    if (initialOutcome.kind === "token") return updateDriveSettings({ silentBlockedUntil: null });
    return loadDriveSettings();
  });
  const [status, setStatus] = useState<DriveStatus>(() => (settings.enabled ? (validToken() ? "idle" : "needsTap") : "off"));
  const [note, setNote] = useState<string | null>(() =>
    initialOutcome.kind === "error" && NEEDS_USER.has(initialOutcome.error) ? "Kijelentkeztél a Google-fiókodból, vagy a Google újra engedélyt kér. Kattints a szinkronhoz." : null
  );
  const [ready, setReady] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const running = useRef(false);
  const again = useRef(false);
  const generation = useRef(0); // bumped when sync is turned off: a round from before must not touch anything
  const roundRef = useRef<(token: string) => Promise<void>>(async () => {});
  const lastAttempt = useRef(0);
  const enabledRef = useRef(settings.enabled);
  enabledRef.current = settings.enabled;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [hop, setHopState] = useState<DriveHop>(() => (initialOutcome.kind === "token" && settings.enabled ? "backSyncing" : null));
  const hopRef = useRef(hop);
  const setHop = useCallback((h: DriveHop) => {
    hopRef.current = h;
    setHopState(h);
  }, []);
  const hopTimer = useRef<number | undefined>(undefined);
  const lastInput = useRef(Date.now());

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

  // Every new token must belong to the account sync was set up with: otherwise the characters would
  // merge into someone else's Drive. The first token sets the account.
  const ensureAccount = useCallback(
    async (token: string, current: () => boolean = () => true): Promise<void> => {
      if (verifiedTokens.has(token)) return;
      const email = await fetchAccountEmail(token);
      if (!email) throw new Error("account check failed"); // network trouble: try again later
      if (!current()) throw new SupersededError(); // sync was turned off (or on again) meanwhile
      const expected = loadDriveSettings().email;
      if (expected && expected.toLowerCase() !== email.toLowerCase()) {
        forgetToken(token);
        throw new AccountMismatchError(`Ezzel a Google-fiókkal jelentkeztél be: ${email}, de a szinkron ehhez a fiókhoz tartozik: ${expected}. Jelentkezz be azzal, vagy kapcsold ki, majd újra be a szinkront.`);
      }
      if (!expected) patchSettings({ email });
      verifiedTokens.add(token);
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
      const gen = generation.current;
      const current = () => generation.current === gen && enabledRef.current;
      setStatus("syncing");
      try {
        await ensureAccount(token, current);
        await withSyncLock(async () => {
          do {
            if (!current()) return;
            again.current = false;
            store.reload(); // the freshest saved state (another tab may have changed it)
            const s = loadDriveSettings();
            let snapshot = store.getState();
            const run = () => {
              snapshot = store.getState();
              const input = { records: snapshot.records, deletions: snapshot.deletions, device: deviceId(), backups: s.backups, backedUp: loadBackedUp(), ourNonces: loadNonces(), rememberNonce, confirmNonce };
              return runSync(httpDrive(token), input);
            };
            let out;
            try {
              out = await run();
            } catch (e) {
              if (!(e instanceof DeviceIdClashError)) throw e;
              // another device writes under this device's id: take a new one, keep this device's edits as
              // its own, and sync again
              const old = deviceId();
              // shared history: what Drive holds, and what this device itself last published there
              store.relabelDevice(old, resetDeviceId(), new Set([...e.published, ...Object.values(loadPublished())]));
              forgetNonces();
              savePublished({});
              out = await run();
            }
            if (!current()) return; // turned off meanwhile: drop the result
            store.applyRound(snapshot, out); // against what's saved now: edits made meanwhile (here or in another tab) stay
            savePublished(out.published);
            saveBackedUp(out.backedUp);
            patchSettings({ lastSyncAt: Date.now() });
            setSyncTick((n) => n + 1);
            if (out.conflictCopies > 0)
              setNote(
                `${out.conflictCopies} karakter két eszközön is módosult, mielőtt szinkronizálódhatott volna. A másik változat külön karakterként került a listára („… (másik változat)”), hogy semmi ne vesszen el.`
              );
            else setNote((n) => (n && n.includes("(másik változat)") ? n : null)); // a conflict notice stays until the next one
          } while (again.current);
        });
        if (current()) {
          if (hopRef.current === "backSyncing") {
            setHop("backDone");
            window.setTimeout(() => hopRef.current === "backDone" && setHop(null), HOP_DONE_MS);
          }
          setStatus("idle");
        }
      } catch (e) {
        if (current()) {
          if (hopRef.current === "backSyncing") setHop(null);
          setStatus(e instanceof DriveAuthError || e instanceof AccountMismatchError ? "needsTap" : "error");
          setNote(errorNote(e));
          // a different account answers the renewal: don't make the round trip every 10 minutes
          if (e instanceof AccountMismatchError) patchSettings({ silentBlockedUntil: Date.now() + SILENT_BLOCK_MS });
        }
      } finally {
        running.current = false;
      }
      // something asked for a round while this one ran, and this one stopped early (an error, or sync was
      // turned off and on): run it now, with whatever token is current
      if (again.current) {
        again.current = false;
        window.setTimeout(() => {
          const t = validToken();
          if (t && enabledRef.current) void roundRef.current(t);
        }, RETRY_MS);
      }
    },
    [ensureAccount, patchSettings, setHop]
  );
  roundRef.current = round;

  // Renew by redirect when nothing would be lost and it isn't looping.
  const canLeave = useCallback((): boolean => {
    const s = loadDriveSettings();
    const now = Date.now();
    return (
      navigator.onLine !== false &&
      document.visibilityState !== "hidden" &&
      !store.getState().saveFailed && // a reload would lose the edits only memory holds
      !running.current &&
      (s.silentBlockedUntil ?? 0) < now &&
      now - (s.lastSilentAt ?? 0) > SILENT_MIN_GAP_MS &&
      safeDom() &&
      optsRef.current.safeToLeave()
    );
  }, []);

  // Sync without user interaction: with a valid token right away; otherwise renew by redirect if this
  // is a safe moment (allowRedirect), else wait for a tap.
  const trySilent = useCallback(
    (allowRedirect: boolean) => {
      if (!available || !enabledRef.current) return;
      const token = validToken();
      if (token) {
        void round(token);
        return;
      }
      if (allowRedirect && hopRef.current === "leaving") return; // already announced
      if (allowRedirect && canLeave()) {
        // announce first, then go if it is still a safe moment
        setHop("leaving");
        hopTimer.current = window.setTimeout(() => {
          hopTimer.current = undefined;
          if (hopRef.current !== "leaving") return;
          if (enabledRef.current && !validToken() && canLeave()) {
            patchSettings({ lastSilentAt: Date.now() });
            if (beginSilentRenewal(optsRef.current.returnContext(), loadDriveSettings().email)) return; // the notice stays up while the page unloads
          }
          setHop(null);
          setStatus((st) => (st === "syncing" ? st : validToken() ? st : "needsTap"));
        }, HOP_NOTICE_MS);
        return;
      }
      setStatus((st) => (st === "syncing" ? st : "needsTap"));
    },
    [available, round, canLeave, patchSettings, setHop]
  );

  const cancelHop = useCallback(() => {
    window.clearTimeout(hopTimer.current);
    hopTimer.current = undefined;
    setHop(null);
    patchSettings({ lastSilentAt: Date.now() }); // "Most ne": not again for 10 minutes
    setStatus((s) => (s === "syncing" ? s : "needsTap"));
  }, [patchSettings, setHop]);

  // A token from a tap (the popup), with the account pre-filled.
  const tokenFromTap = useCallback(
    (firstTime: boolean): Promise<string> | null => {
      if (!signInReady()) {
        prepare();
        setNote("A Google-bejelentkezés még töltődik. Próbáld újra egy pillanat múlva.");
        return null;
      }
      return requestTokenInteractive(firstTime, loadDriveSettings().email);
    },
    [prepare]
  );

  const interactive = (firstTime: boolean, backups?: boolean) => {
    const token = !firstTime ? validToken() : null;
    if (token) return void round(token);
    const p = tokenFromTap(firstTime);
    if (!p)
      return;
    p.then(
      (t) => {
        enabledRef.current = true;
        patchSettings({ enabled: true, silentBlockedUntil: null, ...(backups === undefined ? {} : { backups }) });
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
    generation.current++;
    window.clearTimeout(hopTimer.current);
    setHop(null);
    void revokeAccess();
    clearDriveState();
    verifiedTokens.clear();
    setSettings(loadDriveSettings());
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
  const revision = roster.revision;
  useEffect(() => {
    if (!available || !settings.enabled || revision === 0) return;
    const t = window.setTimeout(() => trySilent(false), AUTO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [revision, available, settings.enabled, trySilent]);

  // leaving the app: upload right away while the token works; coming back: sync (and renew if needed)
  useEffect(() => {
    if (!available || !settings.enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        const token = validToken();
        const st = store.getState();
        if (token && pendingChanges(st.records, st.deletions, loadPublished()).count > 0) void round(token);
      } else {
        store.reload(); // a frozen or cached page may have missed another tab's changes
        if (Date.now() - lastAttempt.current > FOREGROUND_MIN_GAP_MS) trySilent(true);
      }
    };
    const onOnline = () => trySilent(false);
    // back from Google through the back/forward cache: the page wasn't reloaded, so the notice is stale
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      store.reload();
      if (hopRef.current === "leaving") setHop(null);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [available, settings.enabled, trySilent, round, setHop]);

  // A screen left open for a long time (a sheet during a game): after a minute without touches, with
  // changes waiting and the token expired, renew so the changes reach Drive.
  useEffect(() => {
    if (!available || !settings.enabled) return;
    const touched = () => {
      lastInput.current = Date.now();
    };
    const listenOpts = { capture: true, passive: true } as const;
    const kinds = ["pointerdown", "keydown", "wheel", "scroll", "touchstart"] as const;
    kinds.forEach((k) => window.addEventListener(k, touched, listenOpts));
    const iv = window.setInterval(() => {
      if (hopRef.current || running.current || validToken() || document.visibilityState !== "visible") return;
      if (Date.now() - lastInput.current < IDLE_HOP_MS) return;
      const st = store.getState();
      if (pendingChanges(st.records, st.deletions, loadPublished()).count === 0) return;
      trySilent(true);
    }, IDLE_CHECK_MS);
    return () => {
      kinds.forEach((k) => window.removeEventListener(k, touched, listenOpts));
      window.clearInterval(iv);
    };
  }, [available, settings.enabled, trySilent]);

  // sync turned off (or on) in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SETTINGS_KEY) return;
      const next = loadDriveSettings();
      if (enabledRef.current && !next.enabled) {
        enabledRef.current = false;
        generation.current++;
        window.clearTimeout(hopTimer.current);
        setHop(null);
        verifiedTokens.clear();
        setStatus("off");
        setNote(null);
      } else if (!enabledRef.current && next.enabled) {
        enabledRef.current = true;
        setStatus(validToken() ? "idle" : "needsTap");
      }
      setSettings(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setHop]);

  // unmount (and React's dev-mode remount): drop a pending hop so a remount can announce it again
  useEffect(
    () => () => {
      window.clearTimeout(hopTimer.current);
      hopTimer.current = undefined;
      if (hopRef.current === "leaving") hopRef.current = null;
    },
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pending = useMemo(() => pendingChanges(roster.records, roster.deletions, loadPublished()), [roster.records, roster.deletions, syncTick]);

  const listBackups = useCallback(async (): Promise<BackupMeta[]> => {
    const token = validToken();
    if (!token) throw new DriveAuthError("no token");
    await ensureAccount(token);
    return httpDrive(token).listBackups();
  }, [ensureAccount]);

  const restoreBackup = useCallback(
    async (b: BackupMeta): Promise<CharacterRecord> => {
      const token = validToken();
      if (!token) throw new DriveAuthError("no token");
      await ensureAccount(token);
      const body = await httpDrive(token).readFile(b.id);
      const data = "json" in body ? (body.json as { format?: string; record?: unknown }) : null;
      const rec = data && data.format === BACKUP_FORMAT ? normalizeRecord({ ...(data.record as object), id: genId() }) : null;
      if (!rec) throw new Error("unreadable backup");
      const [y, m, d] = b.day.split("-");
      const restored: CharacterRecord = { ...rec, id: genId(), name: `${rec.name} (${y}. ${m}. ${d}.)`, syncVc: undefined, syncCvc: undefined, updatedAt: undefined };
      store.upsert(restored);
      return restored;
    },
    [ensureAccount]
  );

  // From a tap: make sure there's a token (opens Google's popup if needed).
  const connect = useCallback(async (): Promise<boolean> => {
    if (validToken()) return true;
    const p = tokenFromTap(false);
    if (!p) return false;
    try {
      const t = await p;
      await ensureAccount(t);
      trySilent(false); // changes may be waiting for this token
      return true;
    } catch (e) {
      setNote(errorNote(e));
      return false;
    }
  }, [tokenFromTap, ensureAccount, trySilent]);

  return {
    available,
    enabled: settings.enabled,
    status: settings.enabled ? status : "off",
    lastSyncAt: settings.lastSyncAt,
    email: settings.email,
    backups: settings.backups,
    pending: settings.enabled ? pending : { count: 0, oldest: null },
    note,
    ready,
    prepare,
    enable: (backups: boolean) => interactive(true, backups),
    syncNow: () => interactive(false),
    disable,
    setBackups: (on: boolean) => patchSettings({ backups: on }),
    atRoster: () => {
      if (Date.now() - lastAttempt.current > FOREGROUND_MIN_GAP_MS) trySilent(true);
    },
    hop: settings.enabled ? hop : null,
    cancelHop,
    listBackups,
    restoreBackup,
    connect,
  };
}
