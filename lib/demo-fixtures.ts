// Demo fixtures (Part 8) — anonymized recorded data served through the real routes when
// the session is in demo mode. Enables marketing screenshots and rate-limit-free dev.
// Numbers are INR-scaled and shaped to exercise every finding rule and chart state.

import type { MetaAdAccount } from "@/lib/types";

export const DEMO_ACCOUNT: MetaAdAccount = {
  id: "act_demo",
  name: "Shesha (Demo)",
  account_status: 1,
  currency: "INR",
  business_name: "Shiprocket",
};

const MONTHS = ["2026-03-01", "2026-04-01", "2026-05-01", "2026-06-01"];
const MONTH_LABELS = ["Mar 2026", "Apr 2026", "May 2026", "Jun 2026"];

function pulse() {
  const reach = [4_820_000, 5_140_000, 5_900_000, 6_310_000];
  const spend = [3_120_000, 3_460_000, 3_980_000, 4_240_000];
  const frequency = [2.1, 2.4, 3.2, 3.8];
  const purchases = [12_400, 13_950, 15_200, 16_800];
  return {
    months: MONTHS.map((m, i) => ({ monthStart: m, label: MONTH_LABELS[i], reach: reach[i], spend: spend[i], frequency: frequency[i], purchases: purchases[i] })),
  };
}

function rollingReach() {
  const months = MONTHS.map((m, i) => {
    const isolatedReach = [4_820_000, 5_140_000, 5_900_000, 6_310_000][i];
    const netNewPct = [78, 61, 44, 33][i];
    const netNewReach = Math.round((isolatedReach * netNewPct) / 100);
    const spend = [3_120_000, 3_460_000, 3_980_000, 4_240_000][i];
    const cumulativeReach = [4_820_000, 8_900_000, 12_400_000, 15_100_000][i];
    return {
      label: MONTH_LABELS[i], monthStart: m, monthEnd: m,
      isolatedReach, frequency: [2.1, 2.4, 3.2, 3.8][i],
      cumulativeReach,
      windowReach: cumulativeReach, // sliding-window mode reads this
      netNewReach, netNewPct,
      spend, cpmr: Math.round((spend / isolatedReach) * 1000),
      costPer1kNetNew: Math.round((spend / netNewReach) * 1000),
    };
  });
  return { months, totalRollingReach: 15_100_000, totalSpend: 14_800_000, latestNetNewPct: 33 };
}

function overlap() {
  const entities = [
    { id: "c1", name: "SR1503_Shesha_Manual_Sales_AO_India_CPP", reach: 2_100_000, spend: 769_000, overlapPct: 73 },
    { id: "c2", name: "SR1503_Shesha_ASC_Prospecting_Broad", reach: 1_850_000, spend: 612_000, overlapPct: 22 },
    { id: "c3", name: "SR1503_Shesha_Retargeting_7d_Viewers", reach: 940_000, spend: 388_000, overlapPct: 81 },
    { id: "c4", name: "SR1503_Shesha_Catalogue_DPA_India", reach: 1_320_000, spend: 505_000, overlapPct: 41 },
    { id: "c5", name: "SR1503_Shesha_Lookalike_1pct_Purchasers", reach: 1_100_000, spend: 296_000, overlapPct: 34 },
  ].map((e) => {
    const uniqueContribution = Math.round(e.reach * (1 - e.overlapPct / 100));
    return { ...e, cpmr: Math.round((e.spend / e.reach) * 1000), reachWithoutEntity: 0, uniqueContribution };
  });
  return { level: "campaign" as const, totalAccountReach: 5_900_000, totalSpend: 2_570_000, entityCount: entities.length, entities };
}

function conversionWindows() {
  const weeks = ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"].map((w, i) => {
    const p1 = [6_100, 6_400, 6_900, 7_200, 1_276][i];
    const p28 = [6_900, 7_100, 7_600, 8_000, 1_553][i];
    const p7 = Math.round((p1 + p28) / 2);
    const isPartial = i === 4;
    return {
      weekStart: w, weekEnd: w, purchases1dc: p1, purchases7dc: p7, purchases28dc: p28,
      spend: [820_000, 860_000, 910_000, 940_000, 190_000][i],
      upliftRatio: ((p28 - p1) / p1) * 100, sameDayPct: (p1 / p28) * 100, isPartial,
    };
  });
  return { weeks, totalPurchases1dc: 27_876, totalPurchases28dc: 31_153, overallUpliftRatio: 11.8 };
}

function frequency() {
  const campaigns = [
    { id: "c1", name: "SR1503_Shesha_Catalogue_DPA_India" },
    { id: "c2", name: "SR1503_Shesha_ASC_Prospecting_Broad" },
    { id: "c3", name: "SR1503_Shesha_Retargeting_7d_Viewers" },
  ];
  const weeks = ["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"];
  const freqs: Record<string, number[]> = {
    c1: [6.9, 6.4, 6.8, 6.9], // overexposed 4 weeks → critical
    c2: [1.8, 2.1, 2.4, 2.6],
    c3: [3.1, 3.4, 4.2, 4.6],
  };
  const matrix: Record<string, Record<string, { frequency: number; reach: number }>> = {};
  for (const c of campaigns) {
    matrix[c.id] = {};
    weeks.forEach((w, i) => { matrix[c.id][w] = { frequency: freqs[c.id][i], reach: 400_000 }; });
  }
  return { campaigns, weeks, matrix };
}

function creativeChurn() {
  const cohorts = [
    { key: "__pre__", label: "Pre-Mar 2026", adCount: 42, totalSpend: 3_100_000 },
    { key: "2026-03", label: "Mar 2026", adCount: 18, totalSpend: 2_400_000 },
    { key: "2026-04", label: "Apr 2026", adCount: 22, totalSpend: 2_950_000 },
    { key: "2026-05", label: "May 2026", adCount: 25, totalSpend: 3_400_000 },
    { key: "2026-06", label: "Jun 2026", adCount: 20, totalSpend: 2_950_000 },
  ];
  const weeks = ["2026-03-02", "2026-03-30", "2026-04-27", "2026-05-25", "2026-06-22"];
  const days = weeks.map((date, i) => {
    const cohortSpend: Record<string, number> = {
      "__pre__": Math.max(0, 900_000 - i * 180_000),
      "2026-03": i >= 0 ? 600_000 - i * 100_000 : 0,
      "2026-04": i >= 1 ? 720_000 - (i - 1) * 90_000 : 0,
      "2026-05": i >= 2 ? 850_000 - (i - 2) * 80_000 : 0,
      "2026-06": i >= 3 ? 780_000 : 0,
    };
    const totalSpend = Object.values(cohortSpend).reduce((s, v) => s + Math.max(0, v), 0);
    return { date, totalSpend, cohortSpend };
  });
  return { cohorts, days, totalSpend: days.reduce((s, d) => s + d.totalSpend, 0), granularity: "weekly" as const };
}

function seg(reach: number, spend: number, purchases: number, reachPct: number, spendPct: number) {
  return { reach, spend, impressions: reach * 3, purchases, cpmr: Math.round((spend / reach) * 1000), cpa: purchases ? Math.round(spend / purchases) : 0, spendPct, reachPct, purchasePct: reachPct };
}
function segmentMap(pReach: number) {
  return {
    prospecting: seg(pReach, 900_000, 5_400, 42, 43),
    engaged: seg(700_000, 420_000, 4_100, 25, 20),
    existing: seg(900_000, 380_000, 5_700, 33, 18),
    unknown: seg(0, 0, 0, 0, 0),
  };
}
function audienceSegments() {
  const weeks = ["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25", "2026-06-01"];
  const weekList = weeks.map((week, i) => ({
    weekStart: week, weekEnd: week,
    totalReach: 2_800_000, totalSpend: 1_700_000, totalPurchases: 15_200,
    segments: segmentMap(1_200_000 - i * 40_000),
  }));
  return {
    weeks: weekList,
    totals: segmentMap(1_120_000),
    totalReach: 3_100_000, totalSpend: 2_100_000, totalPurchases: 15_200,
  };
}

export function demoFixture(type: string): unknown | null {
  switch (type) {
    case "pulse": return pulse();
    case "rolling-reach": return rollingReach();
    case "net-new-reach": return rollingReach();
    case "campaign-overlap": return overlap();
    case "conversion-windows": return conversionWindows();
    case "frequency": return frequency();
    case "creative-churn": return creativeChurn();
    case "audience-segments": return audienceSegments();
    // partnership-ads has a deep report shape — omitted from demo fixtures for now.
    default: return null;
  }
}
