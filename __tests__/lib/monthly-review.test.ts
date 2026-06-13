import { describe, it, expect } from "vitest";
import {
  buildReviewModel,
  consecutiveMonthStreak,
  periodForDate,
  previousPeriod,
  periodDiffMonths,
  periodLabel,
  type ReviewInputs,
  type ReviewLogRow,
  type ReviewSnapshot,
  type NetWorthSection,
  type GoalsSection,
  type DecisionsSection,
  type RatesSection,
} from "@/lib/monthly-review";

// Fixed "today" inside June 2026 for deterministic projections.
const TODAY_MS = Date.UTC(2026, 5, 12); // 2026-06-12

function baseInputs(overrides: Partial<ReviewInputs> = {}): ReviewInputs {
  return {
    period: "2026-06",
    goals: [],
    balances: [],
    health: [],
    rateMemory: [],
    openDecisions: 0,
    priorReviews: [],
    todayMs: TODAY_MS,
    ...overrides,
  };
}

function section<T>(model: ReturnType<typeof buildReviewModel>, key: string): T {
  const s = model.sections.find((x) => x.key === key);
  if (!s) throw new Error(`section ${key} not found`);
  return s as T;
}

describe("period helpers", () => {
  it("derives period from a date in UTC", () => {
    expect(periodForDate(new Date(Date.UTC(2026, 0, 1)))).toBe("2026-01");
    expect(periodForDate(new Date(Date.UTC(2026, 11, 31)))).toBe("2026-12");
  });

  it("computes the previous period across year boundaries", () => {
    expect(previousPeriod("2026-06")).toBe("2026-05");
    expect(previousPeriod("2026-01")).toBe("2025-12");
  });

  it("computes whole-month distances", () => {
    expect(periodDiffMonths("2026-06", "2026-06")).toBe(0);
    expect(periodDiffMonths("2026-06", "2026-05")).toBe(1);
    expect(periodDiffMonths("2026-01", "2025-12")).toBe(1);
    expect(periodDiffMonths("2026-06", "2026-09")).toBe(-3);
  });

  it("produces a human label", () => {
    expect(periodLabel("2026-06")).toBe("June 2026");
  });
});

describe("consecutiveMonthStreak", () => {
  it("returns 0 when the end period isn't completed", () => {
    expect(consecutiveMonthStreak(new Set(["2026-04", "2026-05"]), "2026-06")).toBe(0);
  });

  it("counts a single completed month", () => {
    expect(consecutiveMonthStreak(new Set(["2026-06"]), "2026-06")).toBe(1);
  });

  it("counts consecutive months including across a year boundary", () => {
    expect(
      consecutiveMonthStreak(new Set(["2025-11", "2025-12", "2026-01"]), "2026-01"),
    ).toBe(3);
  });

  it("stops at a gap", () => {
    expect(
      consecutiveMonthStreak(new Set(["2026-02", "2026-04", "2026-05", "2026-06"]), "2026-06"),
    ).toBe(3); // 06, 05, 04 — stops before the 03 gap
  });
});

describe("buildReviewModel — first review (baseline)", () => {
  const model = buildReviewModel(
    baseInputs({
      balances: [
        { label: "Savings", amount_cents: 2_000_000, category: "savings" }, // $20,000
        { label: "Super", amount_cents: 8_000_000, category: "super" }, // $80,000
      ],
      goals: [
        {
          id: 1,
          label: "House deposit",
          goal_type: "house_deposit",
          target_cents: 10_000_000,
          target_date: "2028-06-01",
          current_balance_cents: 2_000_000,
          monthly_contribution_cents: 100_000,
          expected_return_pct: 5,
        },
      ],
      openDecisions: 2,
      priorReviews: [], // no prior → baseline
    }),
  );

  it("flags baseline when there is no prior completed review", () => {
    expect(model.isBaseline).toBe(true);
  });

  it("frames net worth as a starting figure with no delta", () => {
    const nw = section<NetWorthSection>(model, "net_worth");
    expect(nw.totalCents).toBe(10_000_000);
    expect(nw.deltaCents).toBeNull();
    expect(nw.detail).toContain("starting net worth");
    expect(nw.detail).toContain("$100,000");
  });

  it("frames goals as baseline with null per-goal delta", () => {
    const goals = section<GoalsSection>(model, "goals");
    expect(goals.goals).toHaveLength(1);
    expect(goals.goals[0]!.deltaPct).toBeNull();
    expect(goals.detail).toContain("Tracking 1 goal");
  });

  it("persists a v1 snapshot capturing the current figures", () => {
    expect(model.snapshot.v).toBe(1);
    expect(model.snapshot.netWorthCents).toBe(10_000_000);
    expect(model.snapshot.openDecisions).toBe(2);
    expect(model.snapshot.goals["1"]).toBeDefined();
    expect(model.snapshot.goals["1"]!.currentBalanceCents).toBe(2_000_000);
  });

  it("has a streak of 1 for the first completed month", () => {
    expect(model.streak).toBe(1);
  });

  it("includes a nudge for every section", () => {
    for (const s of model.sections) {
      expect(s.nudge.href).toMatch(/^\//);
      expect(s.nudge.label.length).toBeGreaterThan(0);
    }
  });
});

describe("buildReviewModel — second review (deltas vs prior snapshot)", () => {
  const priorSnapshot: ReviewSnapshot = {
    v: 1,
    netWorthCents: 9_000_000, // $90k last month
    goals: { "1": { progressPct: 40, currentBalanceCents: 1_500_000 } },
    healthOverall: 60,
    openDecisions: 4,
    takenAt: "2026-05-12T00:00:00.000Z",
  };

  const priorReviews: ReviewLogRow[] = [
    { period: "2026-05", completed_at: "2026-05-12T00:00:00.000Z", snapshot: priorSnapshot },
  ];

  const model = buildReviewModel(
    baseInputs({
      period: "2026-06",
      balances: [{ label: "Savings", amount_cents: 10_000_000, category: "savings" }], // $100k now
      goals: [
        {
          id: 1,
          label: "House deposit",
          goal_type: "house_deposit",
          target_cents: 10_000_000,
          target_date: "2028-06-01",
          current_balance_cents: 2_500_000,
          monthly_contribution_cents: 100_000,
          expected_return_pct: 5,
        },
      ],
      openDecisions: 2, // down from 4
      priorReviews,
    }),
  );

  it("is not baseline when a prior completed review exists", () => {
    expect(model.isBaseline).toBe(false);
  });

  it("reports the net-worth delta vs the prior snapshot", () => {
    const nw = section<NetWorthSection>(model, "net_worth");
    expect(nw.totalCents).toBe(10_000_000);
    expect(nw.deltaCents).toBe(1_000_000); // +$10k
    expect(nw.detail).toContain("up $10,000");
  });

  it("reports per-goal progress delta", () => {
    const goals = section<GoalsSection>(model, "goals");
    // current progress > 40 (balance grew), so delta is positive number
    expect(typeof goals.goals[0]!.deltaPct).toBe("number");
    expect(goals.goals[0]!.deltaPct).not.toBeNull();
  });

  it("reports fewer open decisions than last review", () => {
    const dec = section<DecisionsSection>(model, "decisions");
    expect(dec.openCount).toBe(2);
    expect(dec.detail).toContain("fewer than last review");
  });

  it("counts a 2-month streak", () => {
    expect(model.streak).toBe(2); // 2026-05 + 2026-06
  });
});

describe("buildReviewModel — sparse user", () => {
  const model = buildReviewModel(
    baseInputs({
      balances: [], // no net worth
      goals: [], // no goals
      rateMemory: [], // no rate moves
      openDecisions: 0,
      priorReviews: [],
    }),
  );

  it("still renders a net-worth screen prompting to add balances", () => {
    const nw = section<NetWorthSection>(model, "net_worth");
    expect(nw.totalCents).toBe(0);
    expect(nw.detail).toContain("Add your savings");
    expect(nw.nudge.href).toBe("/account/net-worth");
  });

  it("renders a goals screen prompting to set a goal", () => {
    const goals = section<GoalsSection>(model, "goals");
    expect(goals.goals).toHaveLength(0);
    expect(goals.nudge.label).toBe("Set a goal");
  });

  it("omits the rates screen entirely when nothing was flagged", () => {
    expect(model.sections.find((s) => s.key === "rates")).toBeUndefined();
  });

  it("renders an all-caught-up decisions screen", () => {
    const dec = section<DecisionsSection>(model, "decisions");
    expect(dec.openCount).toBe(0);
    expect(dec.detail).toContain("all caught up");
  });

  it("snapshot is well-formed even with no data", () => {
    expect(model.snapshot).toMatchObject({ v: 1, netWorthCents: 0, openDecisions: 0 });
    expect(model.snapshot.goals).toEqual({});
    expect(model.snapshot.healthOverall).toBeNull();
  });
});

describe("buildReviewModel — table/source missing fail-soft", () => {
  // Simulates the case where an upstream table doesn't exist yet: the caller
  // hands in empty arrays for every source. The model must assemble without
  // throwing and produce sensible baseline copy.
  const model = buildReviewModel({
    period: "2026-06",
    goals: [],
    balances: [],
    health: [],
    rateMemory: [],
    openDecisions: 0,
    priorReviews: [],
    todayMs: TODAY_MS,
  });

  it("does not throw and yields the always-present sections", () => {
    const keys = model.sections.map((s) => s.key);
    expect(keys).toContain("net_worth");
    expect(keys).toContain("goals");
    expect(keys).toContain("decisions");
    // rates is the only optional section; absent with no data
    expect(keys).not.toContain("rates");
  });

  it("is baseline and has a streak of 1", () => {
    expect(model.isBaseline).toBe(true);
    expect(model.streak).toBe(1);
  });
});

describe("buildReviewModel — rates section when flagged", () => {
  const model = buildReviewModel(
    baseInputs({
      rateMemory: [
        {
          broker_name: "ANZ",
          broker_slug: "anz",
          product_kind: "td",
          last_seen_rate_bps: 425, // 4.25% now
          notified_rate_bps: 450, // was 4.50%
          notified_at: "2026-06-01T00:00:00.000Z",
        },
        {
          // not flagged (no notified_at) — should be ignored
          broker_name: "CBA",
          broker_slug: "cba",
          product_kind: "savings",
          last_seen_rate_bps: 500,
          notified_rate_bps: null,
          notified_at: null,
        },
      ],
    }),
  );

  it("surfaces only flagged rate moves", () => {
    const rates = section<RatesSection>(model, "rates");
    expect(rates.changed).toHaveLength(1);
    expect(rates.changed[0]!.brokerName).toBe("ANZ");
    expect(rates.changed[0]!.fromPct).toBe("4.50");
    expect(rates.changed[0]!.currentPct).toBe("4.25");
  });

  it("links the nudge to term-deposits for a td product", () => {
    const rates = section<RatesSection>(model, "rates");
    expect(rates.nudge.href).toBe("/term-deposits");
  });
});

describe("buildReviewModel — alreadyCompleted", () => {
  it("marks the period completed when a completed row exists for it", () => {
    const model = buildReviewModel(
      baseInputs({
        period: "2026-06",
        priorReviews: [
          {
            period: "2026-06",
            completed_at: "2026-06-12T00:00:00.000Z",
            snapshot: {
              v: 1,
              netWorthCents: 0,
              goals: {},
              healthOverall: null,
              openDecisions: 0,
              takenAt: "2026-06-12T00:00:00.000Z",
            },
          },
        ],
      }),
    );
    expect(model.alreadyCompleted).toBe(true);
  });
});
