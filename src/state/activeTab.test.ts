// One tab in use at a time (activeTab.ts), modelled with a small Web Locks stand-in shared by "tabs"
// (separate copies of the module).
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// exclusive locks with ifAvailable and steal, the way the app uses them
const makeLocks = () => {
  let holder: { reject: (e: unknown) => void } | null = null;
  return {
    request(_name: string, opts: { ifAvailable?: boolean; steal?: boolean }, cb: (lock: object | null) => unknown) {
      return new Promise((resolve, reject) => {
        if (holder && opts.ifAvailable) return resolve(cb(null));
        if (holder && opts.steal) holder.reject(new DOMException("stolen", "AbortError"));
        else if (holder) throw new Error("this stand-in doesn't queue");
        holder = { reject };
        Promise.resolve(cb({})).then(resolve, reject);
      });
    },
  };
};

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await vi.advanceTimersByTimeAsync(1500); // a busy lock is tried again for about a second
};
const openTab = async () => {
  vi.resetModules();
  const m = await import("./activeTab");
  m.startActiveTab();
  await flush();
  return m;
};

let reload: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers();
  reload = vi.fn();
  vi.stubGlobal("window", { addEventListener: vi.fn(), location: { reload } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("one tab in use at a time", () => {
  test("the first tab is in use; a second one says the app is open elsewhere, without queueing for it", async () => {
    vi.stubGlobal("navigator", { locks: makeLocks() });
    const a = await openTab();
    expect(a.tabState()).toBe("active");
    const b = await openTab();
    expect(b.tabState()).toBe("elsewhere");
  });

  test("continuing in the second tab takes over; the first steps back, and continuing there again reloads it", async () => {
    vi.stubGlobal("navigator", { locks: makeLocks() });
    const a = await openTab();
    const b = await openTab();
    b.continueHere();
    await flush();
    expect(b.tabState()).toBe("active");
    expect(a.tabState()).toBe("elsewhere");
    expect(reload).not.toHaveBeenCalled(); // b never showed anything stale
    a.continueHere();
    await flush();
    expect(reload).toHaveBeenCalledTimes(1); // a's screens were stale: it starts over
  });

  test("without Web Locks every tab is in use (as before)", async () => {
    vi.stubGlobal("navigator", {});
    expect((await openTab()).tabState()).toBe("active");
    expect((await openTab()).tabState()).toBe("active");
  });

  test("a lock that's still busy for a moment (the page this one replaced hasn't let go yet) is tried again", async () => {
    let busyFor = 2;
    vi.stubGlobal("navigator", {
      locks: { request: (_n: string, _o: object, cb: (lock: object | null) => unknown) => Promise.resolve(cb(busyFor-- > 0 ? null : {})) },
    });
    expect((await openTab()).tabState()).toBe("active");
  });

  test("a browser that refuses locks for another reason still runs the app", async () => {
    vi.stubGlobal("navigator", { locks: { request: () => Promise.reject(new DOMException("blocked", "SecurityError")) } });
    expect((await openTab()).tabState()).toBe("active");
  });
});
