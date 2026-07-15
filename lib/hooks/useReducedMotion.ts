"use client";

import { useEffect, useState } from "react";

// [PM ENHANCEMENT] — Recharts animations are JS-driven, so the global CSS
// prefers-reduced-motion rule can't reach them. This hook lets every chart
// component gate isAnimationActive on the same OS-level setting.
export function useReducedMotion(): boolean {
  // Default false (animations on) — matches SSR output, corrected on mount.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
