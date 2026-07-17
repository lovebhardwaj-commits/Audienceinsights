// Findings engine (Part 6) — the moat. Every insight in the app is a structured verdict
// with money attached, ranked by moneyAtStake. Hard rules:
//  · no finding restates a visible KPI  · ₹ wherever computable  · named entity where
//  applicable  · exactly one action  · always include a `good` finding when one is true.

import { formatCompactNumber, formatCurrencyCompact, formatPercent } from "@/lib/format";
import type { CampaignOverlapReport } from "@/lib/reports/campaign-overlap";
import type { FrequencyReport } from "@/lib/reports/frequency";
import type { ConversionWindowsReport } from "@/lib/reports/conversion-windows";

export type FindingSeverity = "critical" | "warning" | "good" | "info";

export interface Finding {
  severity: FindingSeverity;
  report: string;
  entityId?: string;
  headline: string;
  detail: string;
  action: string;
  moneyAtStake?: number;
}

/** Rank: money-at-stake first (desc), then severity weight. */
const SEV_WEIGHT: Record<FindingSeverity, number> = { critical: 3, warning: 2, info: 1, good: 0 };
export function rankFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const m = (b.moneyAtStake ?? 0) - (a.moneyAtStake ?? 0);
    if (m !== 0) return m;
    return SEV_WEIGHT[b.severity] - SEV_WEIGHT[a.severity];
  });
}

/** Drop the shared name prefix so findings name the distinguishing remainder (Part 5.4). */
function distinguishing(name: string, prefix: string | null): string {
  if (prefix && name.startsWith(prefix)) return name.slice(prefix.length) || name;
  return name;
}

// ── Overlap ────────────────────────────────────────────────────────────────────
export function overlapFindings(report: CampaignOverlapReport, prefix: string | null = null): Finding[] {
  const findings: Finding[] = [];
  const accountReach = report.totalAccountReach || 0;
  const accountSpend = report.totalSpend || 0;
  const sumReaches = report.entities.reduce((s, e) => s + e.reach, 0);

  // Account-level: double-counting made plain.
  if (accountReach > 0 && sumReaches > accountReach * 1.1) {
    const coverage = sumReaches / accountReach;
    findings.push({
      severity: "warning",
      report: "campaign-overlap",
      headline: `You paid to reach ${formatCompactNumber(sumReaches)} but reached ${formatCompactNumber(accountReach)} people`,
      detail: `The average person was covered ${coverage.toFixed(1)}× across your ${report.level}s.`,
      action: "Add exclusion audiences between your highest-overlap campaigns to stop paying for the same people twice.",
    });
  }

  // Per-entity: low unique% on meaningful spend → money re-reaching covered people.
  for (const e of report.entities) {
    const uniquePct = 100 - e.overlapPct;
    const spendShare = accountSpend > 0 ? e.spend / accountSpend : 0;
    if (uniquePct < 25 && spendShare > 0.05) {
      const wasted = e.spend * (e.overlapPct / 100);
      findings.push({
        severity: "critical",
        report: "campaign-overlap",
        entityId: e.id,
        headline: `${formatCurrencyCompact(wasted)} re-reaching people other campaigns already covered`,
        detail: `"${distinguishing(e.name, prefix)}" is only ${formatPercent(uniquePct)} unique on ${formatCurrencyCompact(e.spend)} of spend.`,
        action: "Add exclusion audiences or consolidate this into an overlapping campaign.",
        moneyAtStake: wasted,
      });
    }
  }

  if (findings.length === 0 && report.entities.length > 0) {
    const best = [...report.entities].sort((a, b) => (100 - b.overlapPct) - (100 - a.overlapPct))[0];
    findings.push({
      severity: "good",
      report: "campaign-overlap",
      entityId: best.id,
      headline: "Your campaigns are reaching distinct audiences",
      detail: `Top performer "${distinguishing(best.name, prefix)}" is ${formatPercent(100 - best.overlapPct)} unique — little wasted overlap.`,
      action: "Keep the current audience separation as you scale spend.",
    });
  }
  return findings;
}

// ── Frequency ────────────────────────────────────────────────────────────────────
export function frequencyFindings(report: FrequencyReport, prefix: string | null = null): Finding[] {
  const findings: Finding[] = [];
  for (const c of report.campaigns) {
    // Longest run of consecutive ≥5× weeks.
    let run = 0, maxRun = 0, peak = 0;
    for (const w of report.weeks) {
      const f = report.matrix[c.id]?.[w]?.frequency ?? 0;
      if (f >= 5) { run++; maxRun = Math.max(maxRun, run); peak = Math.max(peak, f); }
      else run = 0;
    }
    if (maxRun >= 2) {
      findings.push({
        severity: "critical",
        report: "frequency",
        entityId: c.id,
        headline: `${peak.toFixed(1)}× frequency for ${maxRun} straight weeks`,
        detail: `"${distinguishing(c.name, prefix)}" is showing the same people ads far past the fatigue point.`,
        action: "Set a 3–4× weekly frequency cap or rotate in fresh creative.",
      });
    }
  }
  if (findings.length === 0 && report.campaigns.length > 0) {
    findings.push({
      severity: "good",
      report: "frequency",
      headline: "No campaign is overexposing your audience",
      detail: "Every campaign stayed below 5× weekly frequency this period.",
      action: "Keep monitoring as you raise budgets — frequency climbs with spend.",
    });
  }
  return findings;
}

// ── Conversion Windows ───────────────────────────────────────────────────────────
export function conversionFindings(report: ConversionWindowsReport): Finding[] {
  const full = report.weeks.filter((w) => !w.isPartial);
  if (full.length === 0) return [];
  const sameDayAvg = full.reduce((s, w) => s + w.sameDayPct, 0) / full.length;
  if (sameDayAvg >= 85) {
    return [{
      severity: "info",
      report: "conversion-windows",
      headline: `${sameDayAvg.toFixed(0)}% of purchases land same-day`,
      detail: "1-day attribution already captures most of your value — your window choice isn't distorting ROAS much.",
      action: "Trust your 1-day ROAS for daily decisions; reserve 28-day for launch retrospectives.",
    }];
  }
  return [{
    severity: "info",
    report: "conversion-windows",
    headline: `${(100 - sameDayAvg).toFixed(0)}% of purchases take more than a day`,
    detail: "A meaningful share of conversions close after the click day — 1-day ROAS understates true performance.",
    action: "Use the 7-day window for budget decisions on considered purchases.",
  }];
}

// ── Net New Reach ────────────────────────────────────────────────────────────────
interface NetNewMonthLike { netNewReach: number; netNewPct: number; costPer1kNetNew: number }
export function netNewFindings(report: { months: NetNewMonthLike[] }): Finding[] {
  const months = report.months.filter((m) => m.netNewReach > 0);
  if (months.length < 2) return [];
  const latest = months[months.length - 1];
  const findings: Finding[] = [];
  if (latest.netNewPct < 40) {
    findings.push({
      severity: "warning",
      report: "net-new-reach",
      headline: `Only ${formatPercent(latest.netNewPct)} of last month's reach was new people`,
      detail: `You're increasingly paying to re-reach the same audience at ${formatCurrencyCompact(latest.costPer1kNetNew)} per 1K net-new.`,
      action: "Broaden targeting or refresh creative to open up untapped audience.",
    });
  } else {
    findings.push({
      severity: "good",
      report: "net-new-reach",
      headline: `${formatPercent(latest.netNewPct)} of last month's reach was genuinely new`,
      detail: "Your prospecting is still finding fresh audience rather than recycling it.",
      action: "Maintain the current prospecting-to-retargeting budget split.",
    });
  }
  return findings;
}
