"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { usePathname } from "next/navigation";
import { lastNMonths } from "@/lib/dates";
import type { DateRange } from "@/lib/types";

interface DateRangeContextValue {
  range: DateRange | null;
  setRange: (range: DateRange | null) => void;
  /** Sets the report's default window. Always applied on first render of a route. */
  applyInitialMonths: (months: number) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);
  const [range, setRange] = useState<DateRange | null>(null);

  // Reset range to null synchronously during render when the route changes.
  // This runs before children render, so no stale range leaks to the next report.
  // Each page's useEffect then calls applyInitialMonths to set its own default.
  if (pathname !== currentPath) {
    setCurrentPath(pathname);
    setRange(null);
  }

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
