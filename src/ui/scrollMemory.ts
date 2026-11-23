import { ScrollMark } from "../state/googleDrive";

// Remembers how far every scrolled area of the app was scrolled, so the Google Drive token round trip
// (a full page load) can put the user back exactly where they were: the sheet's columns, the phone
// pager's page, the compendium's text. Elements are found again by their position under #root, which
// is stable because the same screen is rendered with the same data.

const MAX_MARKS = 40;
const RESTORE_FOR_MS = 1500; // fonts and late layout can still grow the content after the first frame

const pathOf = (root: Element, el: Element): number[] | null => {
  const path: number[] = [];
  let n: Element = el;
  while (n !== root) {
    const parent = n.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, n));
    n = parent;
  }
  return path;
};

const elementAt = (root: Element, path: number[]): Element | null => {
  let n: Element | undefined = root;
  for (const i of path) {
    n = n.children[i];
    if (!n) return null;
  }
  return n;
};

export const captureScroll = (): ScrollMark[] => {
  const root = document.getElementById("root");
  if (!root) return [];
  const marks: ScrollMark[] = [];
  for (const el of root.querySelectorAll("*")) {
    if (el.scrollTop <= 0 && el.scrollLeft <= 0) continue;
    const path = pathOf(root, el);
    if (path) marks.push({ path, top: el.scrollTop, left: el.scrollLeft });
    if (marks.length >= MAX_MARKS) break;
  }
  return marks;
};

// Re-applies the marks over the next frames until they stick; stops as soon as the user touches anything.
export const restoreScroll = (marks: ScrollMark[] | undefined): void => {
  const root = document.getElementById("root");
  if (!root || !marks?.length) return;
  const until = Date.now() + RESTORE_FOR_MS;
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  const opts = { capture: true, passive: true, once: true } as const;
  window.addEventListener("pointerdown", stop, opts);
  window.addEventListener("wheel", stop, opts);
  window.addEventListener("keydown", stop, opts);
  const step = () => {
    if (stopped) return;
    let open = 0;
    for (const m of marks) {
      const el = elementAt(root, m.path);
      if (!el) {
        open++;
        continue;
      }
      if (Math.abs(el.scrollTop - m.top) > 1) el.scrollTop = m.top;
      if (Math.abs(el.scrollLeft - m.left) > 1) el.scrollLeft = m.left;
      if (Math.abs(el.scrollTop - m.top) > 1 || Math.abs(el.scrollLeft - m.left) > 1) open++;
    }
    if (open > 0 && Date.now() < until) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
