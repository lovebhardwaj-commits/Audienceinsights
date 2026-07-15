"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

const STORAGE_KEY = "ads-reach:date-range";

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRangeState] = useState<DateRange | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as DateRange;
        if (parsed?.since && parsed?.until) {
          setRangeState(parsed);
          return;
        }
      }
    } catch {}
    setRangeState(lastNMonths(3));
  }, []);

  const setRange = (r: DateRange | null) => {
    setRangeState(r);
    try {
      if (r) localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
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
