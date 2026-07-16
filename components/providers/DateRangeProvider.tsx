"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRangeState] = useState<DateRange | null>(null);

  useEffect(() => {
    setRangeState(lastNMonths(1));
  }, []);

  const setRange = (r: DateRange | null) => {
    setRangeState(r);
  };

  return (
    <DateRangeContext.Provider value={{ range, setRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
