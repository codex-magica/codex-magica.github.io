import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import {
  BackupMeta,
  Connection,
  DriveAuthError,
  RedirectOutcome,
  ReturnContext,
  TokenServiceError,
  beginConnect,
  consumeRedirectResult,
  driveSyncAvailable,
  exchangeCode,
  fetchAccountEmail,
  forgetCredential,
  forgetToken,
  hasCredential,
  httpDrive,
  keepConnection,
  prepareSignIn,
  refreshAccess,
  requestTokenInteractive,
  signInReady,
  tokenServiceAvailable,
  validToken,
} from "./googleDrive";
import { BACKUP_FORMAT, SyncNewerVersionError } from "./driveSyncEngine";
import { syncRound } from "./driveSyncRound";
import { rosterStore } from "./rosterStore";
import { loadLastBackupAt } from "./transfer";
import { normalizeRecord, genId } from "./storage";
import { CharacterRecord } from "../model/character";
import {
  DriveSettings,
  SETTINGS_KEY,
  clearDriveState,
  loadDriveSettings,
  loadPublished,
  pendingChanges,
  updateDriveSettings,
} from "./syncState";

// Optional Google Drive sync, driven from the roster screen's "Google Drive" button.
//
// - Turning it on (a tap) takes the player to Google's consent page and back, then syncs right away.
//   (Without a token service: Google's permission popup instead.)
// - From then on it syncs by itself: 2 seconds after an edit, when the app goes to the background, when
//   it comes back, and when the device gets back online. An expired access token (they last an hour) is
//   renewed quietly through the token service.
// - Only if Google withdrew the permission (revoked in the Google account, or unused for months) does the
//   player have to reconnect, with a tap. (Without a token service, every expired token needs a tap.)
// - Every new token is checked against the account sync was set up with, so characters never go into
//   another account's Drive.
// - One round at a time, across tabs too (Web Locks where available).

export type DriveStatus = "off" | "idle" | "syncing" | "needsTap" | "error";
// The notice after coming back from Google's consent page: syncing, then done.
// "lost": sync stopped because Google's permission is gone (shown once, on any screen, until dismissed).
export type DriveHop = "backSyncing" | "backDone" | "lost" | null;

export interface DriveSyncApi {
  available: boolean; // built with a Google client ID
  service: boolean; // built with a token service: renewals are silent, reconnecting goes through Google's page
  enabled: boolean;
  status: DriveStatus;
  lastSyncAt: number | null;
  email: string | null;
  backups: boolean; // daily backups in Drive
  pending: { count: number; oldest: number | null }; // local changes not yet in Drive
  note: DriveNote | null; // the last result or error worth saying, in Hungarian
  ready: boolean; // a tap can start the sign-in now
  prepare: () => void;
  enable: (backups: boolean) => void; // call from a tap
  syncNow: () => void; // call from a tap
  disable: () => void;
  setBackups: (on: boolean) => void;
  dismissNote: () => void; // the player read it
  hop: DriveHop;
  dismissHop: () => void;
  needsUpdate: boolean; // Drive holds data from a newer app version: sync waits for this one to update
  connectIssue: number; // bumped when coming back from Google's page went wrong: show the window with the note
  listBackups: () => Promise<BackupMeta[]>;
  restoreBackup: (b: BackupMeta) => Promise<CharacterRecord>; // adds it as a new character
  connect: () => Promise<boolean>; // from a tap: make sure there's access (may leave for Google's page)
}

// `error`: something failed (shown as a warning); otherwise information (a conflict copy was made).
// `seq` changes with every new note, also when the same text comes again, so the window can show that
// the last tap did something.
export interface DriveNote {
  text: string;
  error: boolean;
  seq: number;
}

export interface DriveSyncOptions {
  returnContext: () => ReturnContext; // where to come back to after Google's consent page
}

const AUTO_DELAY_MS = 2000;
const FOREGROUND_MIN_GAP_MS = 20_000;
const RETRY_MS = 2000; // a round asked for while a failing one was running
const RETRY_FIRST_MS = 30_000; // after a failed round (Drive or the token service unreachable): try again,
const RETRY_MAX_MS = 15 * 60_000; // waiting twice as long each time, up to this
const LOCK_WAIT_MS = 120_000; // another tab's round holding the lock this long (a frozen tab): give up, retry later
const HOP_DONE_MS = 2400; // "Szinkronizálva" stays this long after coming back

class AccountMismatchError extends Error {}

class SupersededError extends Error {}

// The note shown in the Drive window: a string is an error, { info } a notice, null clears it, and
// { clearError } clears only an error. A new note always gets a new `seq` (see DriveNote).
let noteSeq = 0;
type NoteAction = string | null | { info: string } | { clearError: true };
const noteReducer = (n: DriveNote | null, a: NoteAction): DriveNote | null => {
  if (a === null) return null;
  if (typeof a === "string") return { text: a, error: true, seq: ++noteSeq };
  if ("info" in a) return { text: a.info, error: false, seq: ++noteSeq };
  return n && !n.error ? n : null;
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

// The Hungarian note for an error, shown in the Drive window. `service`: reconnecting means Google's page.
const errorNote = (e: unknown, service: boolean): string => {
  if (e instanceof AccountMismatchError) return e.message;
  if (e instanceof SyncNewerVersionError)
    return "Egy másik eszközöd már az alkalmazás újabb verzióját használja. Kattints a lent megjelenő „Frissítés” gombra; ha nem látod, zárd be az alkalmazást, és nyisd meg újra.";
  if (e instanceof DriveAuthError) return authNote(e.message, service);
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Nincs internetkapcsolat. Amint lesz, a szinkron magától folytatódik.";
  // Drive or the token service unreachable or busy: the same for the player
  return "Most nem érhető el a Google Drive. Az alkalmazás magától újra megpróbálja; a módosításaid addig is megmaradnak ezen az eszközön.";
};
const authNote = (reason: string, service: boolean): string => {
  if (reason === "popup closed") return "A Google-ablak bezárult, mielőtt engedélyt adtál volna.";
  if (reason === "drive permission not granted") return "Nem engedélyezted a Google Drive-hozzáférést. Próbáld újra, és a Google oldalán jelöld be a Drive-ra vonatkozó négyzetet is.";
  if (reason === "access_denied") return "A szinkron nem kapcsolt be, mert a Google oldalán nem adtál engedélyt. Bármikor újra megpróbálhatod.";
  if (reason === "no answer") return "A Google-bejelentkezés nem fejeződött be. Próbáld újra.";
  if (reason === "credential revoked")
    return "A szinkron engedélye megszűnt (például mert a Google-fiókodban eltávolítottad, vagy hónapokig nem használtad). Kattints az „Újrakapcsolás” gombra; addig a karaktereid ezen az eszközön megmaradnak.";
  return service ? "Újra engedélyt kell adnod a Google-nek. Kattints az „Újrakapcsolás” gombra." : "A Google-hozzáférés lejárt. Kattints a „Szinkronizálás most” gombra.";
};

// Google's answer from the consent page, read once at startup (before rendering).
const initialOutcome: RedirectOutcome = typeof window !== "undefined" ? consumeRedirectResult() : { kind: "none" };
// A code can be redeemed once: React's development double start mustn't send it twice.
let codeTaken = false;

// Finishing the connection failed before it was set up: a tap is needed (nothing retries by itself).
const connectNote = (e: unknown, service: boolean): string => {
  if (e instanceof TokenServiceError) return "A Google-kapcsolat most egy átmeneti hiba miatt nem jött létre. Próbáld újra pár perc múlva.";
  if (e instanceof DriveAuthError && (e.message === "drive permission not granted" || e.message === "access_denied")) return authNote(e.message, service);
  if (e instanceof AccountMismatchError) return e.message;
  return "Nem sikerült kapcsolódni a Google-hoz. Próbáld újra.";
};

// One round at a time across this browser's tabs (where the browser supports Web Locks).
const withSyncLock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  if (!locks?.request) return fn();
  // a tab frozen mid-round (in the background on a phone) keeps the lock: don't wait for it forever
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), LOCK_WAIT_MS) : undefined;
  return (locks.request("codex-magica-drive-sync", ctl ? { signal: ctl.signal } : {}, () => {
    clearTimeout(timer);
    return fn();
  }) as Promise<T>).finally(() => clearTimeout(timer));
};

const store = rosterStore();

// Saving fails (storage full), so the latest edits exist only in memory: a backup file saved after the
// last of them holds everything, so leaving the page for Google's is safe then.
const exportedSinceLastEdit = (): boolean => {
  const at = loadLastBackupAt();
  if (at === null) return false;
  const st = store.getState();
  const last = Math.max(0, ...st.records.map((r) => r.updatedAt ?? 0), ...Object.values(st.deletions).map((d) => d.t));
  return at >= last;
};
const verifiedTokens = new Set<string>();

export function useDriveSync(opts: DriveSyncOptions): DriveSyncApi {
  const available = driveSyncAvailable();
  const service = tokenServiceAvailable();
  const roster = useSyncExternalStore(store.subscribe, store.getState);
  const [settings, setSettings] = useState<DriveSettings>(() => loadDriveSettings());
  const back = available && initialOutcome.kind === "code"; // back from Google's consent page with a code
  const [status, setStatus] = useState<DriveStatus>(() =>
    back ? "syncing" : settings.enabled ? (validToken() || hasCredential() ? "idle" : "needsTap") : "off"
  );
  const [note, setNote] = useReducer(noteReducer, null, () =>
    available && initialOutcome.kind === "error"
      ? { text: authNote(initialOutcome.error, service), error: initialOutcome.error !== "access_denied", seq: ++noteSeq } // cancelling isn't a failure
      : null
  );
  // coming back from Google's page went wrong: the window was closed by the page change, so it's opened
  // again with the note (an error from the address counts from the start)
  const [connectIssue, setConnectIssue] = useState(() => (available && initialOutcome.kind === "error" ? 1 : 0));
  const [ready, setReady] = useState(service);
  const [syncTick, setSyncTick] = useState(0);
  const running = useRef(false);
  const again = useRef(false);
  const generation = useRef(0); // bumped when sync is turned off: a round from before must not touch anything
  const autoRef = useRef<() => Promise<void>>(async () => {});
  const authRetried = useRef(false); // a token Drive refused: renewed and retried once
  const statusRef = useRef<DriveStatus>(status);
  statusRef.current = status;
  const lastAttempt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryDelay = useRef(RETRY_FIRST_MS);
  const enabledRef = useRef(settings.enabled);
  enabledRef.current = settings.enabled;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [hop, setHopState] = useState<DriveHop>(() => (back ? "backSyncing" : null));
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const hopRef = useRef(hop);
  const setHop = useCallback((h: DriveHop) => {
    hopRef.current = h;
    setHopState(h);
  }, []);

  const patchSettings = useCallback((patch: Partial<DriveSettings>) => setSettings(updateDriveSettings(patch)), []);

  // Sync stopped in the background and needs the player (Google's permission is gone): with a token
  // service this is rare, so a card says so once, wherever the player is. (Without one, a tap is
  // needed every hour: the roster line is enough.)
  const needTap = useCallback(() => {
    if (service && statusRef.current !== "needsTap" && hopRef.current === null) setHop("lost");
    setStatus("needsTap");
  }, [service, setHop]);

  // A round failed for a passing reason (no network, Google or the token service busy): try again by
  // itself, so changes don't wait for the next edit or for the app to be reopened.
  const scheduleRetry = useCallback(() => {
    clearTimeout(retryTimer.current);
    const gen = generation.current;
    const delay = retryDelay.current;
    retryDelay.current = Math.min(delay * 2, RETRY_MAX_MS);
    retryTimer.current = setTimeout(() => {
      retryTimer.current = undefined;
      if (generation.current === gen && enabledRef.current) void autoRef.current();
    }, delay);
  }, []);
  const stopRetrying = useCallback(() => {
    clearTimeout(retryTimer.current);
    retryTimer.current = undefined;
    retryDelay.current = RETRY_FIRST_MS;
  }, []);

  // Only without a token service: load Google's script ahead of the tap, so the popup opens straight
  // from it (browsers block popups opened after a wait).
  const prepare = useCallback(() => {
    if (!available || service || signInReady()) {
      setReady(service || signInReady());
      return;
    }
    prepareSignIn().then(
      () => setReady(true),
      () => setNote("A Google-bejelentkezés nem töltődött be. Van internetkapcsolat?")
    );
  }, [available, service]);

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
        throw new AccountMismatchError(
          `A szinkron ehhez a fiókhoz tartozik: ${expected}, de most ezzel jelentkeztél be: ${email}. Kattints az „Újrakapcsolás” gombra, és válaszd a(z) ${expected} fiókot. Ha mostantól a másik fiókot használnád, kapcsold ki a szinkront, majd kapcsold be újra.`
        );
      }
      if (!expected) patchSettings({ email });
      verifiedTokens.add(token);
    },
    [patchSettings]
  );

  // An access token: the stored one while it lasts, else a quiet renewal through the token service.
  // Null: a tap is needed (no token service, or the permission was withdrawn).
  const getToken = useCallback(async (): Promise<string | null> => {
    const t = validToken();
    if (t) return t;
    return hasCredential() ? refreshAccess() : null;
  }, []);

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
            const result = await syncRound({ store, drive: httpDrive(token), backups: loadDriveSettings().backups, current });
            if (!result) return; // turned off meanwhile: nothing was kept
            const { out } = result;
            patchSettings({ lastSyncAt: Date.now() });
            setSyncTick((n) => n + 1);
            const told = roundNotice(out.copied, out.undeleted);
            if (told) setNote({ info: told });
            else setNote({ clearError: true }); // a notice stays until it's dismissed; an error is over
          } while (again.current);
        });
        authRetried.current = false;
        if (current()) {
          stopRetrying();
          setNeedsUpdate(false);
          if (hopRef.current === "backSyncing") {
            setHop("backDone");
            window.setTimeout(() => hopRef.current === "backDone" && setHop(null), HOP_DONE_MS);
          }
          setStatus("idle");
        }
      } catch (e) {
        if (current()) {
          if (hopRef.current === "backSyncing") setHop(null);
          // Drive refused a token that should still be valid: renew it quietly and try once more
          if (e instanceof DriveAuthError && hasCredential() && !authRetried.current) {
            authRetried.current = true;
            again.current = true;
          } else {
            const tap = e instanceof DriveAuthError || e instanceof AccountMismatchError;
            if (tap) needTap();
            else setStatus("error");
            if (e instanceof SyncNewerVersionError) {
              setNeedsUpdate(true);
              // fetch the new version now, so the update banner can offer it
              void navigator.serviceWorker?.getRegistration?.().then((r) => r?.update()).catch(() => undefined);
            }
            setNote(errorNote(e, service));
            if (!tap) {
              authRetried.current = false; // a later refused token gets its quiet renewal again
              if (!(e instanceof SyncNewerVersionError)) scheduleRetry(); // that one waits for an app update
            }
          }
        }
      } finally {
        running.current = false;
      }
      // something asked for a round while this one ran, and this one stopped early (an error, or sync was
      // turned off and on): run it now, renewing the token if needed
      if (again.current) {
        again.current = false;
        window.setTimeout(() => {
          if (enabledRef.current) void autoRef.current();
        }, RETRY_MS);
      }
    },
    [ensureAccount, patchSettings, setHop, service, scheduleRetry, stopRetrying, needTap]
  );

  // Sync without user interaction, renewing the token quietly if there's a way to.
  const autoSync = useCallback(async () => {
    if (!available || !enabledRef.current) return;
    let token: string | null;
    try {
      token = await getToken();
    } catch (e) {
      if (!enabledRef.current) return;
      if (e instanceof DriveAuthError) needTap();
      else setStatus("error");
      setNote(errorNote(e, service));
      if (!(e instanceof DriveAuthError)) scheduleRetry();
      return;
    }
    if (!enabledRef.current) return;
    if (token) await round(token);
    else if (!running.current) needTap(); // (a round still running reports for itself)
  }, [available, getToken, round, service, scheduleRetry, needTap]);
  autoRef.current = autoSync;

  // A token from a tap, without a token service (the popup), with the account pre-filled.
  const tokenFromTap = useCallback(
    (firstTime: boolean): Promise<string> | null => {
      if (!signInReady()) {
        prepare();
        setNote({ info: "A Google-bejelentkezés még töltődik. Próbáld újra egy pillanat múlva." });
        return null;
      }
      return requestTokenInteractive(firstTime, loadDriveSettings().email);
    },
    [prepare]
  );

  // With a token service: off to Google's consent page (turning sync on, or reconnecting).
  const leaveForGoogle = useCallback((backups?: boolean) => {
    if (store.getState().saveFailed && !exportedSinceLastEdit()) {
      // the latest edits exist only in memory: the page change would lose them, unless they're in a file
      setNote("Ezen az eszközön most nem sikerül menteni, ezért ha átlépsz a Google oldalára, elvesznének a legutóbbi módosításaid. Előbb mentsd el a karaktereidet fájlba a karakterlistán, utána újra megpróbálhatod.");
      return;
    }
    void beginConnect(optsRef.current.returnContext(), loadDriveSettings().email, backups).then((r) => {
      if (r === true) return;
      setNote(
        r === "insecure"
          ? "A Google-bejelentkezés csak biztonságos (https) kapcsolaton keresztül indul el. Nyisd meg az alkalmazást a szokásos címén."
          : r === "storage"
            ? "Nem sikerült elindítani a Google-bejelentkezést, mert ezen az eszközön betelt a tárhely. Mentsd el a karaktereidet fájlba, töröld, amire nincs szükséged, és próbáld újra."
            : "Nem sikerült elindítani a Google-bejelentkezést. Próbáld újra."
      );
    });
  }, []);

  const interactive = (firstTime: boolean, backups?: boolean) => {
    authRetried.current = false;
    if (service) {
      // "Szinkronizálás most" syncs (renewing quietly); "Újrakapcsolás" (needsTap) goes to Google's page
      if (!firstTime && statusRef.current !== "needsTap" && (validToken() || hasCredential())) return void autoSync();
      return leaveForGoogle(firstTime ? backups : undefined);
    }
    const token = !firstTime ? validToken() : null;
    if (token) return void round(token);
    const p = tokenFromTap(firstTime);
    if (!p) return;
    p.then(
      (t) => {
        enabledRef.current = true;
        patchSettings({ enabled: true, ...(backups === undefined ? {} : { backups }) });
        void round(t);
      },
      (e) => {
        setNote(errorNote(e, service));
        if (!firstTime) setStatus("needsTap");
      }
    );
  };

  const disable = () => {
    enabledRef.current = false;
    generation.current++;
    stopRetrying();
    setHop(null);
    setNeedsUpdate(false);
    // This device only: the permission stays valid for the player's other devices (and in their Google
    // account's list of connected apps, where it can be removed).
    forgetToken();
    forgetCredential();
    clearDriveState();
    verifiedTokens.clear();
    setSettings(loadDriveSettings());
    setStatus("off");
    setNote(null);
  };

  // Back from Google's consent page with a code: exchange it, check the account, and sync.
  const finishConnect = useCallback(
    async (o: Extract<RedirectOutcome, { kind: "code" }>) => {
      const enabling = !loadDriveSettings().enabled;
      // reconnecting, and another tab turned sync off meanwhile: that wins
      const droppedMeanwhile = () => {
        if (enabling || loadDriveSettings().enabled) return false;
        setHop(null);
        setStatus("off");
        return true;
      };
      const turnOn = () => {
        if (!enabling) return;
        enabledRef.current = true;
        patchSettings({ enabled: true, ...(o.backups === undefined ? {} : { backups: o.backups }) });
      };
      let got: Connection;
      try {
        got = await exchangeCode(o.code, o.verifier);
      } catch (e) {
        // the code is spent and nothing was set up: say what to do (nothing retries by itself)
        setHop(null);
        setStatus(enabling ? "off" : "needsTap");
        setNote(connectNote(e, service));
        setConnectIssue((n) => n + 1);
        return;
      }
      try {
        await ensureAccount(got.token);
      } catch (e) {
        setHop(null);
        if (e instanceof AccountMismatchError) {
          // another account answered: nothing it gave is kept, and the right account's credential stays
          // (the other account's permission stays in that account, which may sync a roster of its own)
          setStatus(enabling ? "off" : "needsTap");
          setNote(connectNote(e, service));
          setConnectIssue((n) => n + 1);
          return;
        }
        if (droppedMeanwhile()) return;
        // network trouble checking the account: the connection itself is fine, so turn sync on; the next
        // round checks the account again (every token is checked before Drive is touched)
        keepConnection(got);
        turnOn();
        setStatus("error");
        setNote(errorNote(e, service));
        setConnectIssue((n) => n + 1);
        scheduleRetry();
        return;
      }
      if (droppedMeanwhile()) return;
      keepConnection(got);
      turnOn();
      await round(got.token);
    },
    [ensureAccount, patchSettings, round, setHop, service, scheduleRetry]
  );

  // app start: finish a return from Google's consent page, or sync (renewing quietly if needed)
  useEffect(() => {
    if (!available) return;
    if (initialOutcome.kind === "code") {
      if (!codeTaken) {
        codeTaken = true;
        void finishConnect(initialOutcome);
      }
      return;
    }
    if (!settings.enabled) return;
    prepare();
    void autoSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2 seconds after local edits
  const revision = roster.revision;
  useEffect(() => {
    if (!available || !settings.enabled || revision === 0) return;
    const t = window.setTimeout(() => void autoSync(), AUTO_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [revision, available, settings.enabled, autoSync]);

  // leaving the app: upload right away while the token works; coming back, or back online: sync
  useEffect(() => {
    if (!available || !settings.enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        const token = validToken();
        const st = store.getState();
        if (token && pendingChanges(st.records, st.deletions, loadPublished()).count > 0) void round(token);
      } else {
        store.reload(); // a frozen or cached page may have missed another tab's changes
        if (Date.now() - lastAttempt.current > FOREGROUND_MIN_GAP_MS) void autoSync();
      }
    };
    const onOnline = () => void autoSync();
    // back through the back/forward cache: the page wasn't reloaded, another tab may have saved meanwhile
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) store.reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [available, settings.enabled, autoSync, round]);

  // sync turned off (or on) in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SETTINGS_KEY) return;
      const next = loadDriveSettings();
      if (enabledRef.current && !next.enabled) {
        enabledRef.current = false;
        generation.current++;
        stopRetrying();
        setHop(null);
        verifiedTokens.clear();
        setStatus("off");
        setNote(null);
      } else if (!enabledRef.current && next.enabled) {
        enabledRef.current = true;
        setStatus(validToken() || hasCredential() ? "idle" : "needsTap");
      }
      setSettings(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setHop, stopRetrying]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pending = useMemo(() => pendingChanges(roster.records, roster.deletions, loadPublished()), [roster.records, roster.deletions, syncTick]);

  const needToken = useCallback(async (): Promise<string> => {
    const token = await getToken();
    if (!token) throw new DriveAuthError("no token");
    await ensureAccount(token);
    return token;
  }, [getToken, ensureAccount]);

  const listBackups = useCallback(async (): Promise<BackupMeta[]> => httpDrive(await needToken()).listBackups(), [needToken]);

  const restoreBackup = useCallback(
    async (b: BackupMeta): Promise<CharacterRecord> => {
      const body = await httpDrive(await needToken()).readFile(b.id);
      const data = "json" in body ? (body.json as { format?: string; record?: unknown }) : null;
      const rec = data && data.format === BACKUP_FORMAT ? normalizeRecord({ ...(data.record as object), id: genId() }) : null;
      if (!rec) throw new Error("unreadable backup");
      const [y, m, d] = b.day.split("-");
      const restored: CharacterRecord = { ...rec, id: genId(), name: `${rec.name} (${y}. ${m}. ${d}.)`, syncVc: undefined, syncCvc: undefined, updatedAt: undefined };
      store.upsert(restored);
      return restored;
    },
    [needToken]
  );

  // From a tap: make sure there's access. With a token service this renews quietly, or leaves for
  // Google's page when the permission is gone (and returns false); without one it opens the popup.
  const connect = useCallback(async (): Promise<boolean> => {
    try {
      const t = await getToken();
      if (t) {
        await ensureAccount(t);
        return true;
      }
    } catch (e) {
      setNote(errorNote(e, service));
      if (!(e instanceof DriveAuthError)) return false;
    }
    if (service) {
      leaveForGoogle();
      return false;
    }
    const p = tokenFromTap(false);
    if (!p) return false;
    try {
      const t = await p;
      await ensureAccount(t);
      void autoSync(); // changes may be waiting for this token
      return true;
    } catch (e) {
      setNote(errorNote(e, service));
      return false;
    }
  }, [getToken, ensureAccount, service, leaveForGoogle, tokenFromTap, autoSync]);

  return {
    available,
    service,
    enabled: settings.enabled,
    status: settings.enabled ? status : back && status === "syncing" ? "syncing" : "off",
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
    dismissNote: () => setNote(null),
    hop,
    dismissHop: () => setHop(null),
    needsUpdate: settings.enabled && needsUpdate,
    connectIssue,
    listBackups,
    restoreBackup,
    connect,
  };
}
