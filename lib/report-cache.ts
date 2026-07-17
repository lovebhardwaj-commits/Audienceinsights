// Client-side report cache (Part 8) — a module-level Map that survives client-side
// navigation (the providers stay mounted), so returning to Overlap is instant instead
// of another 40s fetch. Keyed by the full request URL (account|report|range|params).
// 10-minute TTL with stale-while-revalidate: a stale hit is shown immediately while a
// fresh fetch runs in the background.

interface CacheEntry {
  data: unknown;
  ts: number;
  fetchedAt: number; // wall-clock ms for the freshness stamp
}

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, CacheEntry>();

export interface CacheHit<T> {
  data: T;
  stale: boolean;
  fetchedAt: number;
}

export function getCached<T>(key: string): CacheHit<T> | null {
  const entry = store.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.ts;
  return { data: entry.data as T, stale: age > TTL_MS, fetchedAt: entry.fetchedAt };
}

export function setCached(key: string, data: unknown): number {
  const fetchedAt = Date.now();
  store.set(key, { data, ts: fetchedAt, fetchedAt });
  return fetchedAt;
}

export function clearCache() {
  store.clear();
}
