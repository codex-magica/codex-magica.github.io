import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  BackupMeta,
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
  prepareSignIn,
  refreshAccess,
  requestTokenInteractive,
  signInReady,
  tokenServiceAvailable,
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
export type DriveHop = "backSyncing" | "backDone" | null;

export interface DriveSyncApi {
  available: boolean; // built with a Google client ID
  service: boolean; // built with a token service: renewals are silent, reconnecting goes through Google's page
  enabled: boolean;
  status: DriveStatus;
  lastSyncAt: number | null;
  email: string | null;
  backups: boolean; // daily backups in Drive
  pending: { count: number; oldest: number | null }; // local changes not yet in Drive
  note: string | null; // the last round's result or error, in Hungarian
  ready: boolean; // a tap can start the sign-in now
  prepare: () => void;
  enable: (backups: boolean) => void; // call from a tap
  syncNow: () => void; // call from a tap
  disable: () => void;
  setBackups: (on: boolean) => void;
  hop: DriveHop;
  listBackups: () => Promise<BackupMeta[]>;
  restoreBackup: (b: BackupMeta) => Promise<CharacterRecord>; // adds it as a new character
  connect: () => Promise<boolean>; // from a tap: make sure there's access (may leave for Google's page)
}

export interface DriveSyncOptions {
  returnContext: () => ReturnContext; // where to come back to after Google's consent page
}

const AUTO_DELAY_MS = 2000;
const FOREGROUND_MIN_GAP_MS = 20_000;
const RETRY_MS = 2000; // a round asked for while a failing one was running
const HOP_DONE_MS = 2400; // "Szinkronizálva" stays this long after coming back

class AccountMismatchError extends Error {}

class SupersededError extends Error {}

// The Hungarian note for an error, shown in the Drive window. `service`: reconnecting means Google's page.
const errorNote = (e: unknown, service: boolean): string => {
  if (e instanceof AccountMismatchError) return e.message;
  if (e instanceof SyncNewerVersionError) return "A Drive-on lévő adatokat az alkalmazás egy újabb verziója mentette. Frissítsd az alkalmazást (zárd be, majd nyisd meg újra), és folytatódik a szinkron.";
  if (e instanceof TokenServiceError) return "Most nem sikerült elérni a szinkronszolgáltatást. Később magától újra megpróbálja.";
  if (e instanceof DriveAuthError) return authNote(e.message, service);
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "Nincs internetkapcsolat. A szinkron a következő alkalommal folytatódik.";
  return "Nem sikerült elérni a Google Drive-ot. Később magától újra megpróbálja.";
};
const authNote = (reason: string, service: boolean): string => {
  if (reason === "popup closed") return "A Google-ablak bezárult, mielőtt engedélyt adtál volna.";
  if (reason === "drive permission not granted") return "Nem engedélyezted a Google Drive-hozzáférést. Próbáld újra, és hagyd bejelölve a Drive-ra vonatkozó engedélyt.";
  if (reason === "access_denied") return "Nem adtál engedélyt a Google-nek, ezért a szinkron nem kapcsolódott.";
  if (reason === "no answer") return "A Google-bejelentkezés nem fejeződött be. Próbáld újra.";
  if (reason === "credential revoked") return "Ez például akkor fordul elő, ha a Google-fiókodban visszavontad az alkalmazás engedélyét, vagy hat hónapig nem használtad.";
  return service ? "A Google-kapcsolatot újra össze kell kötni. Kattints az „Újrakapcsolás” gombra." : "A Google-hozzáférés lejárt. Kattints a „Szinkronizálás most” gombra.";
};

// Google's answer from the consent page, read once at startup (before rendering).
const initialOutcome: RedirectOutcome = typeof window !== "undefined" ? consumeRedirectResult() : { kind: "none" };
// A code can be redeemed once: React's development double start mustn't send it twice.
let codeTaken = false;

// Finishing the connection failed before it was set up: a tap is needed (nothing retries by itself).
const connectNote = (e: unknown, service: boolean): string => {
  if (e instanceof TokenServiceError) return "A szinkronszolgáltatás most nem érhető el, ezért a Google-kapcsolat nem jött létre. Próbáld újra egy kicsit később.";
  if (e instanceof DriveAuthError && (e.message === "drive permission not granted" || e.message === "access_denied")) return authNote(e.message, service);
  if (e instanceof AccountMismatchError) return e.message;
  return "Nem sikerült befejezni a Google-kapcsolódást. Próbáld újra.";
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
  const service = tokenServiceAvailable();
  const roster = useSyncExternalStore(store.subscribe, store.getState);
  const [settings, setSettings] = useState<DriveSettings>(() => loadDriveSettings());
  const back = available && initialOutcome.kind === "code"; // back from Google's consent page with a code
  const [status, setStatus] = useState<DriveStatus>(() =>
    back ? "syncing" : settings.enabled ? (validToken() || hasCredential() ? "idle" : "needsTap") : "off"
  );
  const [note, setNote] = useState<string | null>(() => (available && initialOutcome.kind === "error" ? authNote(initialOutcome.error, service) : null));
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
  const enabledRef = useRef(settings.enabled);
  enabledRef.current = settings.enabled;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const [hop, setHopState] = useState<DriveHop>(() => (back ? "backSyncing" : null));
  const hopRef = useRef(hop);
  const setHop = useCallback((h: DriveHop) => {
    hopRef.current = h;
    setHopState(h);
  }, []);

  const patchSettings = useCallback((patch: Partial<DriveSettings>) => setSettings(updateDriveSettings(patch)), []);

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
        throw new AccountMismatchError(`Ezzel a Google-fiókkal jelentkeztél be: ${email}, de a szinkron ehhez a fiókhoz tartozik: ${expected}. Jelentkezz be azzal, vagy kapcsold ki, majd újra be a szinkront.`);
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
        authRetried.current = false;
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
          // Drive refused a token that should still be valid: renew it quietly and try once more
          if (e instanceof DriveAuthError && hasCredential() && !authRetried.current) {
            authRetried.current = true;
            again.current = true;
          } else {
            setStatus(e instanceof DriveAuthError || e instanceof AccountMismatchError ? "needsTap" : "error");
            setNote(errorNote(e, service));
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
    [ensureAccount, patchSettings, setHop, service]
  );

  // Sync without user interaction, renewing the token quietly if there's a way to.
  const autoSync = useCallback(async () => {
    if (!available || !enabledRef.current) return;
    let token: string | null;
    try {
      token = await getToken();
    } catch (e) {
      if (!enabledRef.current) return;
      setStatus(e instanceof DriveAuthError ? "needsTap" : "error");
      setNote(errorNote(e, service));
      return;
    }
    if (!enabledRef.current) return;
    if (token) await round(token);
    else setStatus((st) => (st === "syncing" ? st : "needsTap"));
  }, [available, getToken, round, service]);
  autoRef.current = autoSync;

  // A token from a tap, without a token service (the popup), with the account pre-filled.
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

  // With a token service: off to Google's consent page (turning sync on, or reconnecting).
  const leaveForGoogle = useCallback((backups?: boolean) => {
    if (store.getState().saveFailed) {
      // the latest edits exist only in memory: the page reload would lose them
      setNote("Előbb mentsd el a karaktereidet fájlba: ezen az eszközön most nem sikerül menteni, és a Google oldalára átlépve elvesznének a legutóbbi módosítások.");
      return;
    }
    void beginConnect(optsRef.current.returnContext(), loadDriveSettings().email, backups).then((ok) => {
      if (!ok) setNote("Nem sikerült elindítani a Google-bejelentkezést. Próbáld újra.");
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
    setHop(null);
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
      const turnOn = () => {
        if (!enabling) return;
        enabledRef.current = true;
        patchSettings({ enabled: true, ...(o.backups === undefined ? {} : { backups: o.backups }) });
      };
      let got: { token: string; credential: string | null };
      try {
        got = await exchangeCode(o.code, o.verifier);
      } catch (e) {
        // the code is spent and nothing was set up: say what to do (nothing retries by itself)
        setHop(null);
        setStatus(enabling ? "off" : "needsTap");
        setNote(connectNote(e, service));
        return;
      }
      try {
        await ensureAccount(got.token);
      } catch (e) {
        setHop(null);
        if (e instanceof AccountMismatchError) {
          // another account answered: drop what it gave (its permission stays in that account, which may
          // well sync a roster of its own elsewhere)
          if (got.credential) forgetCredential(got.credential);
          setStatus(enabling ? "off" : "needsTap");
          setNote(connectNote(e, service));
          return;
        }
        // network trouble checking the account: the connection itself is fine, so turn sync on; the next
        // round checks the account again
        turnOn();
        setStatus("error");
        setNote(errorNote(e, service));
        return;
      }
      turnOn();
      await round(got.token);
    },
    [ensureAccount, patchSettings, round, setHop, service]
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
  }, [setHop]);

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
    hop,
    listBackups,
    restoreBackup,
    connect,
  };
}
