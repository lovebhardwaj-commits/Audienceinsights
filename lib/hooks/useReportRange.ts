"use client";

import { useCallback, useEffect, useState } from "react";
import { lastNMonths } from "../dates";
import { getSessionRange, setSessionRange } from "../session-ranges";
import type { DateRange } from "../types";

/**
 * Per-route date range state backed by session memory.
 * On mount: restores the range used last time this route was visited this session,
 * or falls back to lastNMonths(defaultMonths). On change: persists to session store.
 */
export function useReportRange(
  route: string,
  defaultMonths: number,
): [DateRange | null, (r: DateRange | null) => void] {
  const [range, setRangeState] = useState<DateRange | null>(null);

  useEffect(() => {
    setRangeState(getSessionRange(route) ?? lastNMonths(defaultMonths));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRange = useCallback(
    (r: DateRange | null) => {
      setRangeState(r);
      if (r) setSessionRange(route, r);
    },
    [route],
  );

  return [range, setRange];
}
