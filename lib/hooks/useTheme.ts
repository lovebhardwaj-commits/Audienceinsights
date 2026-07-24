"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

// The inline script in app/layout.tsx already stamped data-theme on <html> before
// paint — this just mirrors that into React state and lets the user flip it.
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // One-time sync with what app/layout.tsx's inline script already stamped on
    // <html> before paint — not derived from props/state, so this is the correct
    // place to read it.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(current === "dark" ? "dark" : "light");
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  }

  return [theme, setTheme];
}
