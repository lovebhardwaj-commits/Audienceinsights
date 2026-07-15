import { formatCompactNumber, formatCurrency, formatNumber, formatPercent } from "./format";
import type { AudienceSegmentsReport } from "./reports/audience-segments";
import type { CreativeChurnReport } from "./reports/creative-churn";
import type { ConversionWindowsReport } from "./reports/conversion-windows";
import type { EntitySegmentRow } from "./reports/creative-segments";

export function audienceSegmentInsights(report: AudienceSegmentsReport): string[] {
  const insights: string[] = [];
  const prospectPct = report.totals.prospecting.reachPct;
  const existPct = report.totals.existing.reachPct + report.totals.engaged.reachPct;

  if (prospectPct >= 60)
    insights.push(`${formatPercent(prospectPct)} of your reach is new audience — strong prospecting performance.`);
  else if (prospectPct < 30)
    insights.push(`Only ${formatPercent(prospectPct)} of reach is new audience — you may be over-saturating existing users.`);
  else
    insights.push(`${formatPercent(prospectPct)} of your reach is new audience, ${formatPercent(existPct)} is existing + engaged.`);

  if (report.totals.prospecting.cpmr > 0 && report.totals.existing.cpmr > 0) {
    const ratio = report.totals.prospecting.cpmr / report.totals.existing.cpmr;
    if (ratio > 1.5)
      insights.push(`New audience costs ${ratio.toFixed(1)}x more per 1K reached than existing — expected, but watch if it keeps climbing.`);
    else if (ratio < 0.8)
      insights.push(`New audience is cheaper to reach than existing (${formatCurrency(report.totals.prospecting.cpmr)} vs ${formatCurrency(report.totals.existing.cpmr)} CPMR) — unusual, investigate targeting.`);
  }

  insights.push(`Total reach: ${formatCompactNumber(report.totalReach)} people across ${formatCurrency(report.totalSpend)} spend.`);
  return insights;
}

export function creativeChurnInsights(report: CreativeChurnReport): string[] {
  const insights: string[] = [];
  const { cohorts, days } = report;
  if (days.length === 0 || cohorts.length === 0) return insights;

  insights.push(`${cohorts.length} creative cohorts spent in this period across ${formatCompactNumber(cohorts.reduce((s, c) => s + c.adCount, 0))} ads.`);

  // Last-7-days spend mix: legacy bucket vs the two newest launch months.
  const recentDays = days.slice(-7);
  const recentTotal = recentDays.reduce((s, d) => s + d.totalSpend, 0);
  if (recentTotal > 0) {
    const legacy = cohorts.find((c) => c.key === "__pre__");
    if (legacy) {
      const legacyRecent = recentDays.reduce((s, d) => s + (d.cohortSpend[legacy.key] ?? 0), 0);
      const legacyPct = (legacyRecent / recentTotal) * 100;
      if (legacyPct > 50)
        insights.push(`${formatPercent(legacyPct)} of the last week's spend still goes to legacy creatives (${legacy.label}) — creative refresh is overdue.`);
      else if (legacyPct > 0)
        insights.push(`Legacy creatives (${legacy.label}) take ${formatPercent(legacyPct)} of the last week's spend.`);
    }

    const newest = cohorts.filter((c) => c.key !== "__pre__").slice(-2);
    const newestRecent = recentDays.reduce(
      (s, d) => s + newest.reduce((x, c) => x + (d.cohortSpend[c.key] ?? 0), 0),
      0
    );
    const newestPct = (newestRecent / recentTotal) * 100;
    if (newest.length > 0) {
      if (newestPct > 50)
        insights.push(`${formatPercent(newestPct)} of current spend is on creatives launched in the last 2 months — healthy rotation.`);
      else if (newestPct < 20)
        insights.push(`Only ${formatPercent(newestPct)} of current spend is on creatives launched in the last 2 months — older creatives still dominate.`);
    }
  }

  return insights;
}

export function overlapInsights(totalReach: number, entities: Array<{ name: string; overlapPct: number; uniqueContribution: number }>, entityLabel: string): string[] {
  const insights: string[] = [];
  if (entities.length === 0) return insights;

  const highOverlap = entities.filter((e) => e.overlapPct > 50);
  const lowOverlap = entities.filter((e) => e.overlapPct < 20);

  if (highOverlap.length > 0)
    insights.push(`${highOverlap.length} ${entityLabel}${highOverlap.length > 1 ? "s" : ""} ha${highOverlap.length > 1 ? "ve" : "s"} >50% overlap — these audiences compete with each other.`);

  if (lowOverlap.length > 0 && lowOverlap.length <= 3)
    insights.push(`${lowOverlap.map((e) => `"${e.name.slice(0, 30)}"`).join(", ")} ha${lowOverlap.length > 1 ? "ve" : "s"} <20% overlap — reaching mostly unique people.`);

  const topContributor = entities.reduce((max, e) => (e.uniqueContribution > max.uniqueContribution ? e : max), entities[0]);
  insights.push(`"${topContributor.name.slice(0, 40)}" contributes the most unique reach: ${formatCompactNumber(topContributor.uniqueContribution)} people.`);

  return insights;
}

export function rollingReachInsights(months: Array<{ label: string; netNewReach: number; netNewPct: number; cpmr: number }>, totalReach: number): string[] {
  const insights: string[] = [];
  if (months.length < 2) return insights;

  const latest = months[months.length - 1];
  const prev = months[months.length - 2];

  insights.push(`Total cumulative reach: ${formatCompactNumber(totalReach)} unique people.`);

  if (latest.netNewPct > 50)
    insights.push(`${formatPercent(latest.netNewPct)} of ${latest.label}'s reach was net new — still finding fresh audience.`);
  else if (latest.netNewPct < 20)
    insights.push(`Only ${formatPercent(latest.netNewPct)} net new in ${latest.label} — audience is saturating, consider new targeting or creatives.`);
  else
    insights.push(`${formatPercent(latest.netNewPct)} net new reach in ${latest.label}.`);

  if (prev.cpmr > 0 && latest.cpmr > 0) {
    const change = ((latest.cpmr - prev.cpmr) / prev.cpmr) * 100;
    if (Math.abs(change) > 10)
      insights.push(`CPMR ${change > 0 ? "increased" : "decreased"} ${Math.abs(change).toFixed(0)}% from ${prev.label} to ${latest.label} (${formatCurrency(prev.cpmr)} → ${formatCurrency(latest.cpmr)}).`);
  }

  return insights;
}

export function conversionWindowInsights(report: ConversionWindowsReport): string[] {
  const insights: string[] = [];

  if (report.overallUpliftRatio < 5)
    insights.push(`Only ${formatPercent(report.overallUpliftRatio)} difference between 1-day and 28-day windows — conversions happen fast, your attribution is clean.`);
  else if (report.overallUpliftRatio > 15)
    insights.push(`28-day attribution credits ${formatPercent(report.overallUpliftRatio)} more conversions than 1-day — most purchases take multiple days to close.`);
  else
    insights.push(`${formatPercent(report.overallUpliftRatio)} uplift from extending to 28-day window — moderate consideration cycle.`);

  const sameDayAvg = report.weeks.reduce((s, w) => s + w.sameDayPct, 0) / (report.weeks.length || 1);
  insights.push(`On average, ${sameDayAvg.toFixed(0)}% of conversions happen within 1 day of ad exposure.`);

  const purchases1dc = report.totalPurchases1dc;
  const purchases28dc = report.totalPurchases28dc;
  if (purchases28dc > 0 && purchases1dc > 0) {
    const delayed = purchases28dc - purchases1dc;
    insights.push(`${formatNumber(delayed)} purchases (${formatPercent((delayed / purchases28dc) * 100)}) required more than 1 day to convert.`);
  }

  return insights;
}

export function creativeSegmentInsights(entities: EntitySegmentRow[], entityLabel: string): string[] {
  const insights: string[] = [];
  if (entities.length === 0) return insights;

  const highNew = entities.filter((e) => e.prospectingReachPct >= 70);
  const lowNew = entities.filter((e) => e.prospectingReachPct < 40);

  if (highNew.length > 0)
    insights.push(`${highNew.length} ${entityLabel.toLowerCase()}${highNew.length > 1 ? "s" : ""} have ≥70% new audience reach — strong prospecting performers.`);

  if (lowNew.length > 0 && lowNew.length <= entities.length / 2)
    insights.push(`${lowNew.length} ${entityLabel.toLowerCase()}${lowNew.length > 1 ? "s" : ""} are below 40% new audience — these mostly recycle existing/engaged users.`);

  const sorted = [...entities].sort((a, b) => b.prospectingReachPct - a.prospectingReachPct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  if (best && worst && best !== worst)
    insights.push(`Best prospecting ${entityLabel.toLowerCase()}: "${best.name.slice(0, 35)}" (${formatPercent(best.prospectingReachPct)} new). Worst: "${worst.name.slice(0, 35)}" (${formatPercent(worst.prospectingReachPct)} new).`);

  return insights;
}
