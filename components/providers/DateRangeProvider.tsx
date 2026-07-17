"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
  /** Called on page mount with the report's own default window.
   *  - First visit to a route → applies the default.
   *  - Return visit to a route where the user already picked a range → restores their pick.
   *  - Never overrides a user's explicit selection mid-session. */
  applyInitialMonths: (months: number) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [range, setRangeState] = useState<DateRange | null>(null);
  // Stores the user's explicit range per route so it can be restored on return visits.
  const userRanges = useRef<Map<string, DateRange>>(new Map());

  const setRange = useCallback((r: DateRange | null) => {
    if (r && pathname) userRanges.current.set(pathname, r);
    setRangeState(r);
  }, [pathname]);

  const applyInitialMonths = useCallback((months: number) => {
    if (!pathname) return;
    const stored = userRanges.current.get(pathname);
    if (stored) {
      // Restore the user's prior selection for this route.
      setRangeState(stored);
    } else {
      // First visit — apply the report's own default.
      setRangeState(lastNMonths(Math.max(1, months)));
    }
  }, [pathname]);

  return (
    <DateRangeContext.Provider value={{ range, setRange, applyInitialMonths }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
