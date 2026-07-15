/** Meta returns numeric fields as strings — always parse before doing math. */
export function num(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function cpmr(spend: number, reach: number): number {
  return reach > 0 ? (spend / reach) * 1000 : 0;
}

export function costPer1k(spend: number, count: number): number {
  return count > 0 ? (spend / count) * 1000 : 0;
}

export function cpp(spend: number, purchases: number): number {
  return purchases > 0 ? spend / purchases : 0;
}

export function percent(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

export function netNew(current: number, previous: number): number {
  return current - previous;
}

/** Overlap % for a campaign/adset/ad given its own reach and its unique contribution to account reach. */
export function overlapPercent(entityReach: number, uniqueContribution: number): number {
  if (entityReach <= 0) return 0;
  const overlap = entityReach - uniqueContribution;
  return (overlap / entityReach) * 100;
}

export function uniqueContribution(totalAccountReach: number, reachWithoutEntity: number): number {
  return totalAccountReach - reachWithoutEntity;
}

export function upliftRatio(lowWindow: number, highWindow: number): number {
  return lowWindow > 0 ? ((highWindow - lowWindow) / lowWindow) * 100 : 0;
}

/** Finds the value for a given action_type in a Meta `actions` array, optionally for a specific attribution window. */
export function findAction(
  actions: Array<Record<string, string>> | undefined,
  actionType: string,
  window?: string
): number {
  if (!actions) return 0;
  const row = actions.find((a) => a.action_type === actionType);
  if (!row) return 0;
  if (window) return num(row[window]);
  return num(row.value);
}

/** Purchases post as either "purchase" or "omni_purchase" depending on account setup — never both for the
 *  same event, so take whichever is present rather than summing (summing would double-count omni accounts). */
export function extractPurchases(actions: Array<Record<string, string>> | undefined): number {
  if (!actions) return 0;
  const row = actions.find((a) => a.action_type === "purchase" || a.action_type === "omni_purchase");
  return row ? num(row.value) : 0;
}
