import { useEffect, useState } from "react";

// The app's single JS-side breakpoint — mirrors the theme's `md` (1200px: tablet + desktop).
// Deliberately NOT useBreakpointValue: the theme overrides only `base`/`md`, and extendTheme merges
// Chakra's default sm/lg/xl/2xl back in, which scrambles that hook's breakpoint resolution — it
// returns the `base` value even on desktop. CSS `{ base, md }` style props are unaffected; this
// hook tracks the exact same media query they compile to.
const QUERY = "(min-width: 1200px)"; // keep in sync with theme.ts breakpoints.md

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}
