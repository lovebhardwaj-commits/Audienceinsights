// Demo fixtures (Part 8) — anonymized recorded data served through the real routes when
// the session is in demo mode. Enables marketing screenshots and rate-limit-free dev.
// Numbers are INR-scaled and shaped to exercise every finding rule and chart state.

import type { MetaAdAccount } from "@/lib/types";
import { addDays, addMonths, daysInclusive, monthLabel, startOfMonth } from "@/lib/dates";
import { PRE_COHORT_KEY } from "@/lib/reports/creative-churn";

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

// Generates weekly-bucketed rows spanning the EXACT [since, until] the user picked —
// no fixed window — matching the real report's time_increment=7 fetch. Cohorts =
// the calendar months the range touches (oldest→newest), plus a "Pre-<oldest month>"
// cohort for legacy spend already running when the window opens. Each cohort ramps
// up over ~3 weeks then decays — newer cohorts steadily take over the top of the
// stack, healthy churn.
function creativeChurn(since?: string, until?: string) {
  const rangeUntil = until ?? "2026-06-30";
  const rangeSince = since ?? "2026-06-01";
  const STEP_DAYS = 7;
  const numPoints = Math.max(1, Math.ceil(daysInclusive(rangeSince, rangeUntil) / STEP_DAYS));
  const periodDates = Array.from({ length: numPoints }, (_, i) => addDays(rangeSince, i * STEP_DAYS));

  // Calendar months the window touches, oldest first — mirrors how the real report
  // buckets ads by launch month relative to the selected range.
  const monthKeys: string[] = [];
  {
    let cursor = startOfMonth(rangeSince);
    const lastMonth = startOfMonth(rangeUntil);
    while (cursor <= lastMonth) {
      monthKeys.push(cursor.slice(0, 7));
      cursor = addMonths(cursor, 1);
    }
  }
  // Cap at 8 month cohorts (matches the app's default topN) — keep the most recent.
  const keptMonths = monthKeys.slice(-8);
  const preLabel = `Pre-${monthLabel(`${keptMonths[0]}-01`)}`;

  // Peak spend per cohort (₹) — cycles through a realistic range so the stack has
  // varied band thickness; newer cohorts trend a bit larger (growing spend story).
  const PEAK_CYCLE = [5_100_000, 6_200_000, 7_800_000, 8_600_000, 9_200_000, 9_800_000, 7_400_000, 4_100_000];
  const WEEKS_PER_MONTH = 4.345;
  const RAMP_PERIODS = 3;
  const TAU_PERIODS = 8;
  const PRE_PERIOD_DECAY = 0.9; // slow fade for legacy spend already at peak on period 0

  function lifecycle(age: number, peak: number): number {
    if (age < 0) return 0;
    const rise = age < RAMP_PERIODS ? 0.4 + 0.6 * (age / RAMP_PERIODS) : 1;
    const decay = age < RAMP_PERIODS ? 1 : Math.exp(-(age - RAMP_PERIODS) / TAU_PERIODS);
    return peak * rise * decay;
  }

  const cohortStartPeriod = new Map<string, number>();
  keptMonths.forEach((key) => {
    const monthStart = `${key}-01`;
    // Periods before rangeSince count as negative — a cohort whose month started
    // before the window opens is already mid-lifecycle on period 0.
    const dayOffset = Math.round((new Date(monthStart).getTime() - new Date(rangeSince).getTime()) / 86_400_000);
    cohortStartPeriod.set(key, Math.round(dayOffset / STEP_DAYS));
  });

  const days = periodDates.map((date, i) => {
    const cohortSpend: Record<string, number> = {};

    // Legacy/pre-window cohort — already running, gently decaying.
    const preBase = 420_000;
    cohortSpend[PRE_COHORT_KEY] = Math.round(preBase * Math.pow(PRE_PERIOD_DECAY, i) * (0.9 + 0.2 * Math.random()));

    keptMonths.forEach((key, idx) => {
      const startPeriod = cohortStartPeriod.get(key)!;
      const peak = (PEAK_CYCLE[idx % PEAK_CYCLE.length] / WEEKS_PER_MONTH); // monthly peak → weekly peak
      const age = i - startPeriod;
      const raw = lifecycle(age, peak);
      cohortSpend[key] = raw > 0 ? Math.round(raw * (0.82 + Math.random() * 0.36)) : 0;
    });

    const totalSpend = Object.values(cohortSpend).reduce((s, v) => s + v, 0);
    return { date, totalSpend, cohortSpend };
  });

  const cohorts = [
    { key: PRE_COHORT_KEY, label: preLabel, adCount: 38, totalSpend: days.reduce((s, d) => s + (d.cohortSpend[PRE_COHORT_KEY] ?? 0), 0) },
    ...keptMonths.map((key) => ({
      key,
      label: monthLabel(`${key}-01`),
      adCount: 14 + (keptMonths.indexOf(key) % 5) * 3,
      totalSpend: days.reduce((s, d) => s + (d.cohortSpend[key] ?? 0), 0),
    })),
  ];

  const isoDates = days.map((d) => d.date);

  // Per-ad spend series — two ads per month cohort with distinct lifecycles so the
  // heatmap / treemap / status classification have real material to render.
  const AD_NAME_PAIRS = [
    ["SR_Launch_A", "SR_Launch_B"], ["SR_Bestseller_A", "SR_Static_B"],
    ["SR_Reel_A", "SR_Carousel_B"], ["SR_UGC_A", "SR_Static_B"],
    ["SR_Sale_Reel_A", "SR_Sale_Static_B"], ["SR_Evergreen_A", "SR_Retarget_B"],
    ["SR_Spring_UGC_A", "SR_Spring_Carousel_B"], ["SR_Summer_Reel_A", "SR_Summer_Static_B"],
  ];
  let adCounter = 0;
  const adSeries: Array<{ adId: string; adName: string; totalSpend: number; spendByPeriod: Record<string, number> }> = [
    ...([
      { name: "SR_Core_Prospecting_A", weeklyPeak: (220_000 * 0.6) / WEEKS_PER_MONTH },
      { name: "SR_Core_Retargeting_B", weeklyPeak: (220_000 * 0.4) / WEEKS_PER_MONTH },
    ]).map(({ name, weeklyPeak }) => {
      const spendByPeriod: Record<string, number> = {};
      let totalSpend = 0;
      for (let i = 0; i < isoDates.length; i++) {
        const spend = Math.round(weeklyPeak * Math.pow(PRE_PERIOD_DECAY, i));
        if (spend > 0) { spendByPeriod[isoDates[i]] = spend; totalSpend += spend; }
      }
      return { adId: `demo-ad-${adCounter++}`, adName: name, totalSpend, spendByPeriod };
    }),
    ...keptMonths.flatMap((key, idx) => {
      const startPeriod = cohortStartPeriod.get(key)!;
      const peak = PEAK_CYCLE[idx % PEAK_CYCLE.length] / WEEKS_PER_MONTH;
      const [nameA, nameB] = AD_NAME_PAIRS[idx % AD_NAME_PAIRS.length];
      return [
        { name: nameA, share: 0.62, ramp: RAMP_PERIODS },
        { name: nameB, share: 0.38, ramp: RAMP_PERIODS + 1 },
      ].map(({ name, share, ramp }) => {
        const spendByPeriod: Record<string, number> = {};
        let totalSpend = 0;
        for (let i = 0; i < isoDates.length; i++) {
          const age = i - startPeriod;
          if (age < 0) continue;
          const rise = age < ramp ? 0.4 + 0.6 * (age / ramp) : 1;
          const decay = age < ramp ? 1 : Math.exp(-(age - ramp) / TAU_PERIODS);
          const spend = Math.round(peak * share * rise * decay * (0.8 + Math.random() * 0.4));
          if (spend > 0) { spendByPeriod[isoDates[i]] = spend; totalSpend += spend; }
        }
        return { adId: `demo-ad-${adCounter++}`, adName: name, totalSpend, spendByPeriod };
      });
    }),
  ].sort((a, b) => b.totalSpend - a.totalSpend);

  return {
    cohorts,
    days,
    totalSpend: days.reduce((s, d) => s + d.totalSpend, 0),
    granularity: "weekly" as const,
    adSeries,
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

export function demoFixture(type: string, range?: { since: string; until: string }): unknown | null {
  switch (type) {
    case "pulse":              return pulse();
    case "rolling-reach":     return rollingReach();
    case "net-new-reach":     return rollingReach();
    case "campaign-overlap":  return overlap();
    case "conversion-windows": return conversionWindows();
    case "frequency":         return frequency();
    case "creative-churn":    return creativeChurn(range?.since, range?.until);
    case "audience-segments": return audienceSegments();
    case "partnership-ads":   return partnershipAds();
    default:                  return null;
  }
}
