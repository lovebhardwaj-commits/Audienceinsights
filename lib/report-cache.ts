// Client-side report cache — two-layer:
//   L1: in-memory Map (fast, survives SPA navigation, cleared on page refresh)
//   L2: localStorage (survives page refreshes, keyed by full request URL)
//
// Cache key = full request URL, which encodes accountId + report type + date range +
// any extra params (lookbackDays, level, topN, …). Changing the date range changes
// the URL → cache miss → fresh fetch. Same range on a return visit → instant render.
//
// TTL: 10 min for "fresh" (no background refetch); 1 hour before localStorage is
// considered too stale to show without a background revalidation.

interface CacheEntry {
  data: unknown;
  ts: number;
  fetchedAt: number;
}

const MEM_TTL_MS = 10 * 60 * 1000;   // 10 minutes — no-refetch window
const LS_TTL_MS  = 60 * 60 * 1000;   // 1 hour  — localStorage max freshness
const LS_PREFIX  = "arc:";            // "ads reach cache"
const LS_MAX_ENTRIES = 30;            // evict oldest when over limit

const store = new Map<string, CacheEntry>();

export interface CacheHit<T> {
  data: T;
  stale: boolean;
  fetchedAt: number;
}

// ── localStorage helpers (graceful fallback if unavailable) ──────────────────

function lsRead(key: string): CacheEntry | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function lsWrite(key: string, entry: CacheEntry): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded — evict the oldest arc: entry and retry once
    evictOldest();
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry)); } catch { /* give up */ }
  }
}

function evictOldest(): void {
  const keys: { k: string; ts: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(LS_PREFIX)) continue;
    try {
      const e = JSON.parse(localStorage.getItem(k) ?? "{}") as CacheEntry;
      keys.push({ k, ts: e.ts ?? 0 });
    } catch { /* skip */ }
  }
  // Remove the oldest half when we hit the entry cap or a quota error
  keys.sort((a, b) => a.ts - b.ts);
  const toRemove = Math.max(1, Math.floor(keys.length / 2));
  keys.slice(0, toRemove).forEach(({ k }) => localStorage.removeItem(k));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getCached<T>(key: string): CacheHit<T> | null {
  // L1: in-memory
  const mem = store.get(key);
  if (mem) {
    const age = Date.now() - mem.ts;
    return { data: mem.data as T, stale: age > MEM_TTL_MS, fetchedAt: mem.fetchedAt };
  }

  // L2: localStorage — warm L1 if found
  const ls = lsRead(key);
  if (!ls) return null;
  const age = Date.now() - ls.ts;
  if (age > LS_TTL_MS) {
    // Expired — remove from localStorage and treat as a miss
    if (typeof localStorage !== "undefined") localStorage.removeItem(LS_PREFIX + key);
    return null;
  }
  store.set(key, ls); // promote to L1
  return { data: ls.data as T, stale: age > MEM_TTL_MS, fetchedAt: ls.fetchedAt };
}

export function setCached(key: string, data: unknown): number {
  const fetchedAt = Date.now();
  const entry: CacheEntry = { data, ts: fetchedAt, fetchedAt };
  store.set(key, entry);
  lsWrite(key, entry);
  pruneLocalStorage();
  return fetchedAt;
}

export function clearCache() {
  store.clear();
  if (typeof localStorage === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_PREFIX)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

// Keep localStorage tidy — remove entries beyond LS_MAX_ENTRIES (oldest first)
function pruneLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  const keys: { k: string; ts: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(LS_PREFIX)) continue;
    try {
      const e = JSON.parse(localStorage.getItem(k) ?? "{}") as CacheEntry;
      keys.push({ k, ts: e.ts ?? 0 });
    } catch { /* skip */ }
  }
  if (keys.length <= LS_MAX_ENTRIES) return;
  keys.sort((a, b) => a.ts - b.ts);
  keys.slice(0, keys.length - LS_MAX_ENTRIES).forEach(({ k }) => localStorage.removeItem(k));
}
