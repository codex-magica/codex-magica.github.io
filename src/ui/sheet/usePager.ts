import { useEffect, useRef, useState } from "react";

// The phone snap-pager: full-width snap pages inside a horizontal scroll container; the dots track /
// drive the scroll position. Attach `ref` + `onScroll` to the scroll container.
export function usePager(pageCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef(0);
  const [page, setPage] = useState(0);
  const pageStep = (el: HTMLElement) =>
    el.children.length > 1 ? (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft : el.clientWidth;
  const clampPage = (i: number) => Math.max(0, Math.min(pageCount - 1, i));
  const onScroll = () => {
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      const step = pageStep(el);
      if (step <= 0) return;
      const idx = el.scrollLeft / step;
      // hysteresis: flip only once clearly past the midpoint, so momentum/snap settling around the
      // boundary can't flap the active dot back and forth
      setPage((p) => (Math.abs(idx - p) > 0.55 ? clampPage(Math.round(idx)) : p));
    });
  };
  // once scrolling fully settles, snap the indicator to the exact page (browsers with scrollend)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const settle = () => {
      const step = pageStep(el);
      if (step > 0) setPage(clampPage(Math.round(el.scrollLeft / step)));
    };
    el.addEventListener("scrollend", settle);
    return () => el.removeEventListener("scrollend", settle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);
  const goPage = (i: number) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: i * pageStep(el), behavior: "smooth" });
  };
  return { scrollRef, onScroll, page: clampPage(page), goPage };
}
