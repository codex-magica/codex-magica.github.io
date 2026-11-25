// Optional Google Drive sync, driven from the roster screen's "Google Drive" button. A plain module (no
// React): the state below is read through `useDriveSync` (useSyncExternalStore), and `start`/`stop`
// follow the app's screen, which exists only in the tab in use (activeTab.ts).
//
// - Turning it on takes the player to Google's consent page and back, then syncs right away. The account
//   that answered is checked there, once: a renewed token can only ever be for that same account.
// - From then on it syncs by itself: 2 seconds after an edit, when the app goes to the background, when
//   it comes back, and when the device gets back online. An expired access token (they last an hour) is
//   renewed quietly through the token service.
// - Only if Google withdrew the permission (revoked in the Google account, or unused for months) does the
//   player have to reconnect, with a tap.
// - One round at a time; a round asked for meanwhile runs right after.
//
// Scope: several cases are deliberately not handled (several tabs syncing at once, edits that can't be
// saved locally, sign-in without the token service, live updates, …): see "Scope and deliberate
// limitations" in docs/google-drive-sync.md before adding to this.

import {
  BackupMeta,
  Connection,
  DriveAuthError,
  DriveFullError,
  RedirectOutcome,
  TokenServiceError,
  beginConnect,
  consumeRedirectResult,
  driveSyncAvailable,
  exchangeCode,
  forgetCredential,
  forgetToken,
  hasCredential,
  httpDrive,
  keepConnection,
  refreshAccess,
  validToken,
} from "./googleDrive";
import { DRIVE_SNAPSHOT_FORMAT, SyncNewerVersionError } from "./driveSyncEngine";
import { LocalSaveError, syncRound } from "./driveSyncRound";
import { roundNotice } from "./driveStatus";
import { rosterStore } from "./rosterStore";
import { repairRecord, genId } from "./storage";
import { CharacterRecord } from "../model/character";
import { DriveSettings, clearDriveState, loadDriveSettings, loadPublished, pendingChanges, updateDriveSettings } from "./syncState";

export type DriveStatus = "off" | "idle" | "syncing" | "needsTap" | "error";
// The notice after coming back from Google's consent page: syncing, then done.
// "lost": sync stopped because Google's permission is gone (shown once, on any screen, until dismissed).
export type DriveHop = "backSyncing" | "backDone" | "lost" | null;

// `error`: something failed (shown as a warning); otherwise information (a deleted character came back).
// `seq` changes with every new note, also when the same text comes again, so the window can show that
// the last tap did something.
export interface DriveNote {
  text: string;
  error: boolean;
  seq: number;
}

export interface DriveSyncState {
  settings: DriveSettings;
  status: DriveStatus;
  note: DriveNote | null; // the last error, or a notice about something just tapped
  notice: DriveNote | null; // what a round did that the player should know (deletions undone by a parallel edit), until dismissed
  hop: DriveHop;
  needsUpdate: boolean; // Drive holds data from a newer app version: sync waits for this one to update
  driveFull: boolean; // the player's Google storage is full: sync waits for them to free some space
  connectProblem: boolean; // coming back from Google's page went wrong: the window shows it, until closed
  syncs: number; // counts finished rounds (what's published changed)
}

const AUTO_DELAY_MS = 2000;
const FOREGROUND_MIN_GAP_MS = 20_000;
const RETRY_FIRST_MS = 30_000; // after a failed round (Drive or the token service unreachable): try again,
const RETRY_MAX_MS = 15 * 60_000; // waiting twice as long each time, up to this
const HOP_DONE_MS = 2400; // "Szinkronizálva" stays this long after coming back

// ── the Hungarian notes ─────────────────────────────────────────────────────────────────────────────
const authNote = (reason: string): string => {
  if (reason === "drive permission not granted") return "Nem engedélyezted a Google Drive-hozzáférést. Próbáld újra, és a Google oldalán jelöld be a Drive-ra vonatkozó négyzetet is.";
  if (reason === "access_denied") return "Nem adtál engedélyt a Google oldalán, így a szinkron kikapcsolva maradt. Bármikor újra megpróbálhatod.";
  if (reason === "no answer") return "A Google-bejelentkezés nem fejeződött be. Próbáld újra.";
  if (reason === "credential revoked")
    return "Megszűnt a Google-engedély (például mert visszavontad a Google-fiókodban, vagy hónapokig nem használtad a szinkront). Az „Újrakapcsolás” gombbal adhatod meg újra; addig a karaktereid megmaradnak ezen az eszközön.";
  return "Újra engedélyt kell adnod a Google-nek. Ezt az „Újrakapcsolás” gombbal teheted meg.";
};
// a round, or a renewal, that failed
const errorNote = (e: unknown): string => {
  if (e instanceof SyncNewerVersionError)
    return "Egy másik eszközöd már az alkalmazás újabb verzióját használja. A szinkron folytatásához frissítsd az alkalmazást a lent megjelenő „Frissítés” gombbal; ha nem látod, zárd be, és nyisd meg újra.";
  if (e instanceof DriveAuthError) return authNote(e.message);
  if (e instanceof LocalSaveError)
    return "Ezen az eszközön most nem sikerül menteni (valószínűleg megtelt vagy le van tiltva a böngésző tárhelye), ezért a szinkron szünetel. Exportáld a karaktereidet, hogy biztonságban legyenek.";
  if (e instanceof DriveFullError)
    return "Betelt a Google-tárhelyed, ezért a szinkron szünetel. Szabadíts fel helyet a Google-fiókodban (a Drive, a Gmail és a Fotók közösen használják); utána a szinkron magától folytatódik.";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Nincs internetkapcsolat. Amint lesz, a szinkron magától folytatódik.";
  // Drive or the token service unreachable or busy: the same for the player
  return "Most nem érhető el a Google Drive. Az alkalmazás magától újra megpróbálja; a módosításaid addig is megmaradnak ezen az eszközön.";
};
// finishing the connection failed before it was set up: a tap is needed (nothing retries by itself)
const connectNote = (e: unknown): string => {
  if (e instanceof TokenServiceError) return "A Google-kapcsolat most egy átmeneti hiba miatt nem jött létre. Próbáld újra pár perc múlva.";
  if (e instanceof DriveAuthError && e.message === "drive permission not granted") return authNote(e.message);
  return "Nem sikerült kapcsolódni a Google-hoz. Próbáld újra.";
};
const startNote = (r: "insecure" | "storage" | "failed"): string =>
  r === "insecure"
    ? "A Google-bejelentkezés csak biztonságos (https) kapcsolaton keresztül indul el. Nyisd meg az alkalmazást a szokásos címén."
    : r === "storage"
      ? "A Google-bejelentkezés nem indult el, mert ezen az eszközön most nem sikerül menteni (valószínűleg megtelt vagy le van tiltva a böngésző tárhelye)."
      : "Nem sikerült elindítani a Google-bejelentkezést. Próbáld újra.";

const createDriveSync = () => {
  const available = driveSyncAvailable();
  const store = rosterStore();
  // Google's answer from the consent page, read once at startup (before rendering)
  const outcome: RedirectOutcome = available && typeof window !== "undefined" ? consumeRedirectResult() : { kind: "none" };
  const back = outcome.kind === "code";
  const hasAccess = (): boolean => validToken() !== null || hasCredential();

  let noteSeq = 0;
  const initialSettings = loadDriveSettings();
  let state: DriveSyncState = {
    settings: initialSettings,
    status: back ? "syncing" : initialSettings.enabled ? (hasAccess() ? "idle" : "needsTap") : "off",
    note:
      outcome.kind === "error"
        ? {
            text:
              outcome.error === "access_denied" && initialSettings.enabled
                ? "Nem adtál engedélyt a Google oldalán, így a szinkron továbbra is szünetel. Bármikor újra megpróbálhatod." // a reconnect, cancelled
                : ["access_denied", "no answer"].includes(outcome.error)
                  ? authNote(outcome.error)
                  : "Nem sikerült kapcsolódni a Google-hoz. Próbáld újra.",
            error: outcome.error !== "access_denied", // cancelling isn't a failure
            seq: ++noteSeq,
          }
        : null,
    notice: null,
    hop: back ? "backSyncing" : null,
    needsUpdate: false,
    driveFull: false,
    connectProblem: outcome.kind === "error",
    syncs: 0,
  };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<DriveSyncState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };
  const say = (text: string | null, error = true) => set({ note: text === null ? null : { text, error, seq: ++noteSeq } });
  const patchSettings = (patch: Partial<DriveSettings>) => set({ settings: updateDriveSettings(patch) });
  const enabled = () => state.settings.enabled;

  // ── rounds ─────────────────────────────────────────────────────────────────────────────────────────
  let active = false; // between start() and stop(): the app's screen is up in this tab
  let generation = 0; // bumped when sync is turned off: a round from before must not touch anything
  let running = false;
  let again = false; // a round was asked for while one ran (or a refused token was renewed): run it next
  let authRetried = false; // a token Drive refused: renewed and retried once
  let lastAttempt = 0;
  let retryDelay = RETRY_FIRST_MS;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let editTimer: ReturnType<typeof setTimeout> | undefined;

  // A round failed for a passing reason (no network, Google or the token service busy): try again by
  // itself, so changes don't wait for the next edit or for the app to be reopened.
  const scheduleRetry = () => {
    if (retryTimer !== undefined) return; // already waiting (several triggers failed at once): back off once
    const gen = generation;
    const delay = retryDelay;
    retryDelay = Math.min(delay * 2, RETRY_MAX_MS);
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      if (gen === generation) void autoSync();
    }, delay);
  };
  const stopRetrying = () => {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    retryDelay = RETRY_FIRST_MS;
  };

  // Sync stopped in the background and needs the player (Google's permission is gone): rare, so a card
  // says so once, wherever the player is.
  const needTap = () => set({ status: "needsTap", hop: state.status !== "needsTap" && state.hop === null ? "lost" : state.hop });

  // An access token: the stored one while it lasts, else a quiet renewal through the token service.
  // Null: the permission is gone (a tap is needed).
  const getToken = async (): Promise<string | null> => validToken() ?? (hasCredential() ? refreshAccess() : null);

  const round = async (token: string) => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    lastAttempt = Date.now();
    const gen = generation;
    const current = () => gen === generation && enabled() && active;
    set({ status: "syncing" });
    try {
      const result = await syncRound({ store, drive: httpDrive(token), backups: state.settings.backups, current });
      if (result && current()) {
        patchSettings({ lastSyncAt: Date.now() });
        const told = roundNotice(result.out.undeleted);
        const hopDone = state.hop === "backSyncing";
        set({
          status: "idle",
          syncs: state.syncs + 1,
          needsUpdate: false,
          driveFull: false,
          ...(told ? { notice: { text: told, error: false, seq: ++noteSeq } } : {}),
          ...(state.note?.error ? { note: null } : {}), // an error is over
          ...(hopDone ? { hop: "backDone" as const } : {}),
        });
        if (hopDone) setTimeout(() => state.hop === "backDone" && set({ hop: null }), HOP_DONE_MS);
        authRetried = false;
        stopRetrying();
      }
    } catch (e) {
      if (current()) {
        if (state.hop === "backSyncing") set({ hop: null });
        if (e instanceof DriveAuthError && hasCredential() && !authRetried) {
          // Drive refused a token that should still be valid: renew it quietly and try once more
          authRetried = true;
          again = true;
        } else if (e instanceof DriveAuthError) {
          set({ driveFull: false });
          needTap();
          say(errorNote(e));
        } else {
          authRetried = false; // a later refused token gets its quiet renewal again
          set({ status: "error", driveFull: e instanceof DriveFullError, needsUpdate: e instanceof SyncNewerVersionError });
          say(errorNote(e));
          if (e instanceof SyncNewerVersionError)
            void navigator.serviceWorker?.getRegistration?.().then((r) => r?.update()).catch(() => undefined); // fetch the new version now, for the update banner
          else scheduleRetry(); // that one waits for an app update
        }
      }
    } finally {
      running = false;
    }
    if (again) {
      again = false;
      void autoSync(); // right away: the app may be about to be frozen in the background
    }
  };

  // Sync without the player, renewing the token quietly.
  const autoSync = async () => {
    if (!available || !enabled() || !active) return;
    if (running) {
      again = true; // one at a time: the running round's end starts the next
      return;
    }
    let token: string | null;
    try {
      token = await getToken();
    } catch (e) {
      if (!enabled() || !active) return;
      if (e instanceof DriveAuthError) needTap();
      else {
        set({ status: "error" });
        scheduleRetry();
      }
      say(errorNote(e));
      return;
    }
    if (!enabled() || !active) return;
    if (token) await round(token);
    else if (!running) needTap(); // (a round still running reports for itself)
  };

  // ── connecting ─────────────────────────────────────────────────────────────────────────────────────
  // Off to Google's consent page (turning sync on, or reconnecting).
  const leaveForGoogle = (backups?: boolean) => {
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return say("Nincs internetkapcsolat. A Google-engedélyhez internet kell; próbáld újra, ha lesz.");
    void beginConnect(state.settings.email, backups).then((r) => r !== true && say(startNote(r)));
  };

  // Back from Google's consent page with a code: exchange it, check the account, and sync.
  const finishConnect = async (o: Extract<RedirectOutcome, { kind: "code" }>) => {
    const enabling = !enabled();
    const gen = generation;
    const failed = (text: string) => {
      set({ hop: null, status: enabling ? "off" : "needsTap", connectProblem: true });
      say(text);
    };
    let got: Connection;
    try {
      got = await exchangeCode(o.code, o.verifier);
    } catch (e) {
      return failed(connectNote(e)); // the code is spent and nothing was set up
    }
    // the app went on in another tab meanwhile, or sync was turned off here: keep nothing
    if (!active || gen !== generation) return set({ hop: null });
    // the account sync belongs to: a reconnect must be by the same one (nothing it gave is kept
    // otherwise, so the right account's credential stays)
    const expected = state.settings.enabled ? state.settings.email : null;
    if (!got.email) return failed("Nem sikerült ellenőrizni, melyik Google-fiókkal jelentkeztél be. Próbáld újra.");
    if (expected && expected.toLowerCase() !== got.email.toLowerCase())
      return failed(
        `A szinkron ehhez a fiókhoz tartozik: ${expected}, de ezzel jelentkeztél be: ${got.email}. Az „Újrakapcsolás” gombbal próbáld újra, és a Google oldalán ezt válaszd: ${expected}. Ha inkább a másik fiókot használnád, kapcsold ki, majd kapcsold be újra a szinkront.`
      );
    keepConnection(got);
    patchSettings({ email: expected ?? got.email, ...(enabling ? { enabled: true, ...(o.backups === undefined ? {} : { backups: o.backups }) } : {}) });
    await round(got.token);
  };

  // ── the app's lifetime in this tab ─────────────────────────────────────────────────────────────────
  let started = false;
  let lastRevision = store.getState().revision;
  const onEdit = () => {
    const { revision } = store.getState();
    if (revision === lastRevision) return; // not an edit here (a sync result, say)
    lastRevision = revision;
    clearTimeout(editTimer);
    if (enabled()) editTimer = setTimeout(() => void autoSync(), AUTO_DELAY_MS); // 2 seconds after edits
  };
  // leaving the app: send what's waiting right away (renewing the token if it ran out: an edit made just
  // before locking the phone must not wait for the app to be opened again); coming back: sync
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      const st = store.getState();
      if (pendingChanges(st.records, st.deletions, loadPublished()).count > 0) void autoSync();
    } else if (Date.now() - lastAttempt > FOREGROUND_MIN_GAP_MS) void autoSync();
  };
  const onOnline = () => void autoSync();
  let unsubscribe: () => void = () => {};

  const api = {
    available,
    getState: (): DriveSyncState => state,
    subscribe: (l: () => void): (() => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    // The app's screen came up in this tab (again, in React's development double start): sync from
    // here. The return from Google's consent page is finished once.
    start(): void {
      if (!available || active) return;
      active = true;
      unsubscribe = store.subscribe(onEdit);
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("online", onOnline);
      if (started) return;
      started = true;
      if (outcome.kind === "code") void finishConnect(outcome);
      else void autoSync();
    },
    // The screen went away: the app is continued in another tab (activeTab.ts). Nothing from here may go
    // on syncing.
    stop(): void {
      if (!active) return;
      active = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      clearTimeout(editTimer);
      stopRetrying();
    },

    // "Bekapcsolás" and "Újrakapcsolás" (needsTap) go to Google's page; "Szinkronizálás most" syncs,
    // renewing quietly
    enable: (backups: boolean) => leaveForGoogle(backups),
    syncNow: (): void => {
      authRetried = false;
      if (state.status !== "needsTap" && hasAccess()) void autoSync();
      else leaveForGoogle();
    },
    // This device only: the permission stays valid for the player's other devices (and in their Google
    // account's list of connected apps, where it can be removed).
    disable: (): void => {
      generation++;
      stopRetrying();
      forgetToken();
      forgetCredential();
      clearDriveState();
      set({ settings: loadDriveSettings(), status: "off", hop: null, needsUpdate: false, driveFull: false, note: null });
    },
    setBackups: (on: boolean) => patchSettings({ backups: on }),
    dismissNotice: () => set({ notice: null }),
    dismissHop: () => set({ hop: null }),
    ackConnectProblem: () => set({ connectProblem: false }),

    // From a tap: make sure there's access. Renews quietly, or leaves for Google's page when the
    // permission is gone (and returns false).
    connect: async (): Promise<boolean> => {
      try {
        if (await getToken()) return true;
      } catch (e) {
        say(errorNote(e));
        if (!(e instanceof DriveAuthError)) return false;
      }
      leaveForGoogle();
      return false;
    },
    listBackups: async (): Promise<BackupMeta[]> => httpDrive(await needToken()).listBackups(),
    // A backup comes back as a new character (dated in its name); nothing is replaced.
    restoreBackup: async (b: BackupMeta): Promise<CharacterRecord> => {
      const body = await httpDrive(await needToken()).readFile(b.id);
      const data = "json" in body ? (body.json as { format?: string; record?: unknown }) : null;
      // repaired, not checked against today's rules engine: a character it can't compute is still restored
      const id = genId();
      const rec = data && data.format === DRIVE_SNAPSHOT_FORMAT && data.record && typeof data.record === "object" ? repairRecord({ ...(data.record as CharacterRecord), id }) : null;
      if (!rec) throw new Error("unreadable backup");
      const [y, m, d] = b.day.split("-");
      const restored: CharacterRecord = { ...rec, id, name: `${rec.name} (${y}. ${m}. ${d}.)`, syncVc: undefined, syncCvc: undefined, updatedAt: undefined };
      store.upsert(restored);
      return restored;
    },
  };
  const needToken = async (): Promise<string> => {
    const token = await getToken();
    if (!token) throw new DriveAuthError("no token");
    return token;
  };
  return api;
};

export type DriveSyncController = ReturnType<typeof createDriveSync>;
let instance: DriveSyncController | null = null;
export const driveSync = (): DriveSyncController => (instance ??= createDriveSync());
