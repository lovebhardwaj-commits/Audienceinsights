"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
  /** Always sets the report's default window. No preference is stored. */
  applyInitialMonths: (months: number) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<DateRange | null>(null);

  const applyInitialMonths = useCallback((months: number) => {
    setRange(lastNMonths(Math.max(1, months)));
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
