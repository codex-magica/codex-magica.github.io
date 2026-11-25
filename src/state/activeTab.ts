// The app is used in one browser tab at a time. Several tabs editing and syncing the same characters
// at once was the source of most of the hard cases (two rounds at once, edits arriving from another
// tab, one tab turning sync off while another reconnects), so another tab now shows "open in another
// tab" with a button to continue there instead. Saving stays safe across tabs anyway (rosterStore
// re-reads what's saved before every change).
//
// The active tab holds a Web Lock for as long as it's open. A new tab takes it only if it's free (it
// never queues for it: a tab left on Google's consent page must find it free when it comes back).
// "Folytatás itt" takes it over; the tab that had it switches to the "open in another tab" screen. Where
// Web Locks don't exist, every tab is active.
//
// States: "checking" (for a moment at start), "active", "elsewhere" (another tab has it; `wasActive`:
// this tab had it before, so its screens are stale and continuing here reloads the page).

import { consumeRedirectResult } from "./googleDrive";

export type TabState = "checking" | "active" | "elsewhere";

const LOCK = "codex-magica-active-tab";
let state: TabState = "checking";
let wasActive = false;
const listeners = new Set<() => void>();
const set = (s: TabState) => {
  if (s === "active") wasActive = true;
  state = s;
  listeners.forEach((l) => l());
};

const lockManager = (): LockManager | null => {
  const locks = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: LockManager }).locks : undefined;
  return locks?.request ? locks : null;
};

// Hold the lock until the page is left (released then, so the next page in this tab, or a reload, finds
// it free even if this one stays in the back/forward cache); if another tab takes it over, this one
// steps back. A busy lock is tried again a few times before saying "another tab": the page this one
// replaced (a reload, the way back from Google's consent page) may not have let go of it yet.
let release: (() => void) | null = null;
const claim = (steal: boolean, triesLeft = 4) => {
  const locks = lockManager();
  if (!locks) return set("active");
  locks
    .request(LOCK, steal ? { steal: true } : { ifAvailable: true }, (lock) => {
      if (!lock) {
        if (triesLeft > 0) setTimeout(() => claim(false, triesLeft - 1), 250);
        else set("elsewhere");
        return;
      }
      set("active");
      return new Promise<void>((done) => (release = done));
    })
    .catch((e: unknown) => {
      // taken over by another tab; anything else (the browser refusing locks, say, with site data
      // blocked) mustn't lock the player out: run as if there were no Web Locks
      set((e as { name?: string })?.name === "AbortError" ? "elsewhere" : "active");
    });
};

let started = false;
export const startActiveTab = (): void => {
  if (started) return;
  started = true;
  // back from Google's consent page with its answer: this page is the one the player is using, whatever
  // another tab did meanwhile
  // (read through consumeRedirectResult: it has already taken the answer out of the address)
  claim(consumeRedirectResult().kind === "code");
  // back through the back/forward cache: the page may be long out of date, and another tab may have
  // been used meanwhile: start over
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => release?.());
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) window.location.reload();
    });
  }
};

// "Folytatás itt": continue in this tab. A tab that was already in use before reloads, so nothing it
// shows is stale; a tab that never was simply takes over.
export const continueHere = (): void => {
  if (wasActive) {
    const locks = lockManager();
    if (!locks) return window.location.reload();
    void locks.request(LOCK, { steal: true }, () => {
      window.location.reload();
      return new Promise<void>(() => {});
    });
    return;
  }
  claim(true);
};

export const tabState = (): TabState => state;
export const subscribeTab = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
