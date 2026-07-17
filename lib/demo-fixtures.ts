// Demo fixtures (Part 8) — anonymized recorded data served through the real routes when
// the session is in demo mode. Enables marketing screenshots and rate-limit-free dev.
// Numbers are INR-scaled and shaped to exercise every finding rule and chart state.

import type { MetaAdAccount } from "@/lib/types";

export const DEMO_ACCOUNT: MetaAdAccount = {
  id: "act_demo",
  name: "Demo Account",
  account_status: 1,
  currency: "INR",
  business_name: "Demo",
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
      windowReach: cumulativeReach,
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
    c1: [6.9, 6.4, 6.8, 6.9],
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

// 24 weekly data points so the Creative Churn chart has enough shape to be meaningful.
// Cohorts launch progressively; each fades as newer ones take over — healthy churn pattern.
function creativeChurn() {
  const cohorts = [
    { key: "__pre__",  label: "Pre-Oct 2025",  adCount: 38, totalSpend: 8_400_000 },
    { key: "2025-10",  label: "Oct 2025",       adCount: 14, totalSpend: 5_100_000 },
    { key: "2025-11",  label: "Nov 2025",       adCount: 18, totalSpend: 6_200_000 },
    { key: "2025-12",  label: "Dec 2025",       adCount: 20, totalSpend: 7_800_000 },
    { key: "2026-01",  label: "Jan 2026",       adCount: 22, totalSpend: 8_600_000 },
    { key: "2026-02",  label: "Feb 2026",       adCount: 25, totalSpend: 9_200_000 },
    { key: "2026-03",  label: "Mar 2026",       adCount: 28, totalSpend: 9_800_000 },
    { key: "2026-04",  label: "Apr 2026",       adCount: 24, totalSpend: 7_400_000 },
    { key: "2026-05",  label: "May 2026",       adCount: 20, totalSpend: 4_100_000 },
  ];

  // Generate weekly dates from 2025-11-09 for 24 weeks
  const startMs = new Date("2025-11-09").getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const days = Array.from({ length: 24 }, (_, w) => {
    const date = new Date(startMs + w * weekMs).toISOString().slice(0, 10);

    // Each cohort has a lifecycle: ramps up over a few weeks then fades.
    // When startWeek === peakWeek the cohort is already at peak (e.g. pre-existing ads).
    function cohortSpendAt(startWeek: number, peakWeek: number, peakSpend: number): number {
      if (w < startWeek) return 0;
      const age = w - startWeek;
      const rampWeeks = peakWeek - startWeek;
      if (rampWeeks === 0) return Math.max(0, Math.round(peakSpend * Math.pow(0.88, age)));
      if (age <= rampWeeks) return Math.round(peakSpend * (age / rampWeeks));
      return Math.max(0, Math.round(peakSpend * Math.pow(0.88, age - rampWeeks)));
    }

    const cohortSpend: Record<string, number> = {
      "__pre__":  cohortSpendAt(0,  0,  420_000),
      "2025-10":  cohortSpendAt(0,  2,  310_000),
      "2025-11":  cohortSpendAt(2,  5,  370_000),
      "2025-12":  cohortSpendAt(6,  9,  440_000),
      "2026-01":  cohortSpendAt(9,  12, 510_000),
      "2026-02":  cohortSpendAt(12, 15, 560_000),
      "2026-03":  cohortSpendAt(15, 18, 580_000),
      "2026-04":  cohortSpendAt(18, 21, 440_000),
      "2026-05":  cohortSpendAt(21, 23, 240_000),
    };

    const totalSpend = Object.values(cohortSpend).reduce((s, v) => s + v, 0);
    return { date, totalSpend, cohortSpend };
  });

  return {
    cohorts,
    days,
    totalSpend: days.reduce((s, d) => s + d.totalSpend, 0),
    granularity: "weekly" as const,
  };
}

function seg(reach: number, spend: number, purchases: number, reachPct: number, spendPct: number) {
  return {
    reach, spend, impressions: reach * 3, purchases,
    cpmr: Math.round((spend / reach) * 1000),
    cpa: purchases ? Math.round(spend / purchases) : 0,
    spendPct, reachPct, purchasePct: reachPct,
  };
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

function partnershipAds() {
  function makeGroup(
    adCount: number, reach: number, spend: number, purchases: number,
    newReachPct: number, incrementalPct: number, accountReachWithoutGroup: number,
  ) {
    const incrementalReach = Math.round(reach * (incrementalPct / 100));
    const newPurchasePct = newReachPct * 0.9;
    return {
      adCount, reach, spend, impressions: reach * 4, purchases,
      segments: {
        prospecting: seg(Math.round(reach * 0.55), Math.round(spend * 0.52), Math.round(purchases * 0.48), 55, 52),
        engaged:     seg(Math.round(reach * 0.28), Math.round(spend * 0.30), Math.round(purchases * 0.34), 28, 30),
        existing:    seg(Math.round(reach * 0.17), Math.round(spend * 0.18), Math.round(purchases * 0.18), 17, 18),
      },
      newReachPct, newPurchasePct,
      cpmr: Math.round((spend / reach) * 1000),
      cpa: Math.round(spend / purchases),
      newCpa: Math.round(spend / (purchases * (newPurchasePct / 100))),
      accountReachWithoutGroup, incrementalReach, incrementalPct,
    };
  }

  const partnership = makeGroup(24, 9_701_000, 3_820_000, 4_410, 45.6, 45.6, 12_800_000);
  const normal      = makeGroup(87, 13_000_000, 6_180_000, 7_820, 60.2, 60.2, 10_400_000);
  const totalAccountReach = 17_200_000;
  const overlapBetweenGroups = Math.round(totalAccountReach * 0.32);

  const weekStarts = ["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25", "2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"];
  const weeklyTrend = weekStarts.map((w, i) => ({
    weekStart: w, weekEnd: w,
    partnershipNewPct:   [42, 44, 46, 45, 47, 46, 45, 46][i],
    normalNewPct:        [58, 60, 61, 62, 63, 62, 61, 60][i],
    partnershipNewPurchPct: [38, 40, 42, 41, 43, 42, 41, 42][i],
    normalNewPurchPct:   [54, 56, 57, 58, 59, 58, 57, 56][i],
  }));

  const creators = [
    { handle: "@stylecreator_priya",   adCount: 8,  adIds: ["a1","a2"], totalReach: 3_100_000, newReachPct: 52, totalSpend: 1_420_000, totalPurchases: 1_640, newPurchases: 820, newPurchasePct: 50, newCpa: 1_732, cpmr: 458 },
    { handle: "@fashionista_delhi",     adCount: 6,  adIds: ["a3","a4"], totalReach: 2_800_000, newReachPct: 44, totalSpend: 1_180_000, totalPurchases: 1_290, newPurchases: 580, newPurchasePct: 45, newCpa: 2_034, cpmr: 421 },
    { handle: "@lifestyle_with_anya",  adCount: 5,  adIds: ["a5"],      totalReach: 2_100_000, newReachPct: 39, totalSpend: 860_000,   totalPurchases: 920,   newPurchases: 340, newPurchasePct: 37, newCpa: 2_529, cpmr: 409 },
    { handle: "@mumbai_shopper",        adCount: 5,  adIds: ["a6"],      totalReach: 1_701_000, newReachPct: 48, totalSpend: 360_000,   totalPurchases: 560,   newPurchases: 280, newPurchasePct: 50, newCpa: 1_286, cpmr: 212 },
  ];

  const partnershipAds = [
    { adId: "a1", adName: "Priya Unboxing — Saree Collection", creatorHandle: "@stylecreator_priya",   reach: 1_800_000, newReachPct: 54, spend: 860_000, purchases: 980, newPurchases: 510, newPurchasePct: 52, newCpa: 1_686 },
    { adId: "a2", adName: "Priya — Festive Edit 2026",         creatorHandle: "@stylecreator_priya",   reach: 1_300_000, newReachPct: 49, spend: 560_000, purchases: 660, newPurchases: 310, newPurchasePct: 47, newCpa: 1_806 },
    { adId: "a3", adName: "Delhi Haul — Kurta Must Haves",     creatorHandle: "@fashionista_delhi",     reach: 1_600_000, newReachPct: 46, spend: 680_000, purchases: 720, newPurchasePct: 44, newPurchases: 317, newCpa: 2_145 },
    { adId: "a4", adName: "Summer Essentials Review",          creatorHandle: "@fashionista_delhi",     reach: 1_200_000, newReachPct: 41, spend: 500_000, purchases: 570, newPurchasePct: 46, newPurchases: 263, newCpa: 1_901 },
    { adId: "a5", adName: "Anya Daily Lifestyle — Shesha",     creatorHandle: "@lifestyle_with_anya",  reach: 2_100_000, newReachPct: 39, spend: 860_000, purchases: 920, newPurchasePct: 37, newPurchases: 340, newCpa: 2_529 },
    { adId: "a6", adName: "Mumbai Shopper Picks",              creatorHandle: "@mumbai_shopper",        reach: 1_701_000, newReachPct: 48, spend: 360_000, purchases: 560, newPurchasePct: 50, newPurchases: 280, newCpa: 1_286 },
  ];

  return {
    partnership, normal,
    weeklyTrend, creators, partnershipAds,
    totalAccountReach,
    overlapBetweenGroups,
    overlapBetweenGroupsPct: (overlapBetweenGroups / totalAccountReach) * 100,
  };
}

export function demoFixture(type: string): unknown | null {
  switch (type) {
    case "pulse":              return pulse();
    case "rolling-reach":     return rollingReach();
    case "net-new-reach":     return rollingReach();
    case "campaign-overlap":  return overlap();
    case "conversion-windows": return conversionWindows();
    case "frequency":         return frequency();
    case "creative-churn":    return creativeChurn();
    case "audience-segments": return audienceSegments();
    case "partnership-ads":   return partnershipAds();
    default:                  return null;
  }
}
