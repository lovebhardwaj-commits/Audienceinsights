"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
  /** Report pages call this on mount with their `minUsefulMonths` (D3/7.1). Until the
   *  user explicitly picks a range, each report opens at its own sensible minimum so
   *  New Reach never renders a one-bar "trend". An explicit pick always wins after. */
  applyInitialMonths: (months: number) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRangeState] = useState<DateRange | null>(null);
  // Once the user picks a range, we stop auto-adjusting it on report navigation.
  const userSetRef = useRef(false);

  useEffect(() => {
    setRangeState(lastNMonths(1));
  }, []);

  const setRange = useCallback((r: DateRange | null) => {
    userSetRef.current = true;
    setRangeState(r);
  }, []);

  const applyInitialMonths = useCallback((months: number) => {
    if (userSetRef.current) return;
    setRangeState(lastNMonths(Math.max(1, months)));
  }, []);

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
