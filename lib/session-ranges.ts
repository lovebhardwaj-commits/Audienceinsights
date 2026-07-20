import type { DateRange } from "./types";

// Module-level map — survives SPA navigation within a session, resets on full page reload.
const store = new Map<string, DateRange>();

export function getSessionRange(route: string): DateRange | null {
  return store.get(route) ?? null;
}

export function setSessionRange(route: string, range: DateRange): void {
  store.set(route, range);
}
