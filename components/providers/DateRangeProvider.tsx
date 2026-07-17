"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
  /** Report pages call this on mount to set their own default range. Fires once per
   *  page mount (stable callback + single-dep effect), so navigating to a new report
   *  always resets to that report's sensible default. */
  applyInitialMonths: (months: number) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRangeState] = useState<DateRange | null>(null);

  const setRange = useCallback((r: DateRange | null) => {
    setRangeState(r);
  }, []);

  const applyInitialMonths = useCallback((months: number) => {
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
