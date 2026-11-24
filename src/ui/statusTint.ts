// iOS/iPadOS 26 colours the status bar of the home-screen app from the #status-tint strip (index.css).
// Safari doesn't always look again when the page changes under it: after a modal or the menu drawer
// closed, or the light/dark mode changed, it could keep the soft haze it had picked. Growing the strip by
// a pixel for one presented frame makes it look again. (Observed Safari behaviour, not documented by
// Apple: https://exsesx.dev/blog/en/safari-26-invisible-tint-sampler)
let token = 0;
export const refreshStatusTint = (): void => {
  if (typeof document === "undefined" || typeof requestAnimationFrame !== "function") return;
  const root = document.documentElement;
  const mine = ++token;
  root.dataset.tintRefresh = "";
  // two frames: the change must be on screen for one before it's taken back
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (token === mine) delete root.dataset.tintRefresh;
    })
  );
};
