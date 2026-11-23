import React, { useEffect, useRef, useState } from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";

// A horizontal-scroll wrapper with edge-fade affordance. Overlay scrollbars give no hint that a
// table continues past the edge — so while content extends beyond a side, a soft shadow gradient
// sits on that edge (pointer-transparent, fades out at the scroll ends).
export const ScrollX: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const shade = useColorModeValue("rgba(72, 54, 24, 0.14)", "rgba(0, 0, 0, 0.5)");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft < max - 2;
      setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // ResizeObserver: Safari 13.1+; older browsers fall back to window resizes
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    if (!ro) window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <Box position="relative">
      <Box ref={ref} overflowX="auto">{children}</Box>
      <Box position="absolute" top={0} bottom={0} left={0} w="22px" pointerEvents="none"
        opacity={edges.left ? 1 : 0} transition="opacity .18s"
        bg={`linear-gradient(to right, ${shade}, transparent)`} />
      <Box position="absolute" top={0} bottom={0} right={0} w="22px" pointerEvents="none"
        opacity={edges.right ? 1 : 0} transition="opacity .18s"
        bg={`linear-gradient(to left, ${shade}, transparent)`} />
    </Box>
  );
};
