import { describe, it, expect } from "vitest";

import {
  assembleWrapped,
  buildWrappedCards,
  EMPTY_WRAPPED_ROWS,
  formatAudCents,
  fyDaysRemaining,
  fyForDate,
  fyFromEndYear,
  longestRunDays,
  wrappedFyForDate,
  wrappedShareSummary,
  type WrappedSourceRows,
} from "@/lib/wrapped";

// 2026-06-12 — inside FY26, 18+ days before June 30.
const NOW_MS = Date.UTC(2026, 5, 12);
const FY26 = fyFromEndYear(2026);

// ─── FY maths ─────────────────────────────────────────────────────────────

describe("fyForDate", () => {
  it("maps a June date to the FY ending that month", () => {
    const fy = fyForDate(new Date(Date.UTC(2026, 5, 12)));
    expect(fy.label).toBe("FY26");
    expect(fy.startIso).toBe("2025-07-01");
    expect(fy.endIso).toBe("2026-06-30");
    expect(fy.endExclusiveIso).toBe("2026-07-01");
  });

  it("rolls over on July 1", () => {
    expect(fyForDate(new Date(Date.UTC(2026, 6, 1))).label).toBe("FY27");
    expect(fyForDate(new Date(Date.UTC(2026, 5, 30))).label).toBe("FY26");
  });
});

describe("wrappedFyForDate", () => {
  it("recaps the current FY through June", () => {
    expect(wrappedFyForDate(new Date(Date.UTC(2026, 5, 12))).label).toBe("FY26");
    expect(wrappedFyForDate(new Date(Date.UTC(2026, 0, 2))).label).toBe("FY26");
  });

  it("keeps showing the just-closed FY through July–September", () => {
    expect(wrappedFyForDate(new Date(Date.UTC(2026, 6, 5))).label).toBe("FY26");
    expect(wrappedFyForDate(new Date(Date.UTC(2026, 8, 30))).label).toBe("FY26");
  });

  it("switches to the new FY from October", () => {
    expect(wrappedFyForDate(new Date(Date.UTC(2026, 9, 1))).label).toBe("FY27");
  });
});

describe("fyDaysRemaining", () => {
  it("counts days until June 30 inclusive", () => {
    expect(fyDaysRemaining(FY26, NOW_MS)).toBe(19);
  });

  it("returns 0 once the FY is over", () => {
    expect(fyDaysRemaining(FY26, Date.UTC(2026, 6, 5))).toBe(0);
  });
});

// ─── longestRunDays ───────────────────────────────────────────────────────

describe("longestRunDays", () => {
  it("returns 0 for no check-ins and 1 for a single day", () => {
    expect(longestRunDays([])).toBe(0);
    expect(longestRunDays(["2026-03-01"])).toBe(1);
  });

  it("finds the longest consecutive run across gaps and duplicates", () => {
    const dates = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-02", // duplicate
      "2026-01-03",
      // gap
      "2026-02-10",
      "2026-02-11",
      "2026-02-12",
      "2026-02-13",
      "2026-02-14",
    ];
    expect(longestRunDays(dates)).toBe(5);
  });

  it("is order-independent", () => {
    expect(longestRunDays(["2026-04-03", "2026-04-01", "2026-04-02"])).toBe(3);
  });
});

// ─── Fixtures ─────────────────────────────────────────────────────────────

function richRows(): WrappedSourceRows {
  return {
    holdings: [
      // In FY26: 10 × $500.00 = $5,000
      { acquired_at: "2025-08-10", shares: 10, cost_basis_per_share_cents: 50_000 },
      // Before FY26 — counted in balances, not in "put to work"
      { acquired_at: "2025-03-01", shares: 5, cost_basis_per_share_cents: 100_000 },
      // In FY26: 4 × $810.00 = $3,240
      { acquired_at: "2026-06-01", shares: 4, cost_basis_per_share_cents: 81_000 },
    ],
    goals: [
      {
        label: "Emergency fund",
        target_cents: 1_000_000,
        current_balance_cents: 800_000,
        monthly_contribution_cents: 20_000,
        expected_return_pct: 0,
        target_date: "2027-06-30",
      },
      {
        label: "House deposit",
        target_cents: 5_000_000,
        current_balance_cents: 100_000,
        monthly_contribution_cents: 10_000,
        expected_return_pct: 0,
        target_date: "2026-12-31",
      },
    ],
    manualBalanceCents: 2_000_000,
    healthLog: [
      { overall: 72, scored_month: "2025-09-01" },
      { overall: 78, scored_month: "2026-05-01" },
    ],
    checkinDates: [
      ...Array.from({ length: 14 }, (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`),
      "2026-05-01",
      "2026-05-10",
    ],
    quizzesCompleted: 2,
    guidesSaved: 5,
    watchlistAdds: 3,
    activeAlerts: 2,
    alertsTriggered: 3,
    accountCreatedAt: "2024-01-15T03:00:00Z",
  };
}

// ─── assembleWrapped ──────────────────────────────────────────────────────

describe("assembleWrapped — rich user", () => {
  const data = assembleWrapped(richRows(), FY26, NOW_MS);

  it("marks the FY as in progress with days remaining", () => {
    expect(data.inProgress).toBe(true);
    expect(data.daysRemaining).toBe(19);
    expect(data.isFirstFy).toBe(false);
    expect(data.hasAnyData).toBe(true);
  });

  it("sums tracked balances from holdings (at cost), goals and manual balances", () => {
    expect(data.balances).not.toBeNull();
    // holdings 500_000 + 500_000 + 324_000 = 1_324_000
    expect(data.balances?.holdingsCents).toBe(1_324_000);
    expect(data.balances?.goalsCents).toBe(900_000);
    expect(data.balances?.manualCents).toBe(2_000_000);
    expect(data.balances?.totalCents).toBe(4_224_000);
    expect(data.balances?.holdingsCount).toBe(3);
  });

  it("only counts holdings acquired inside the FY as money put to work", () => {
    expect(data.invested).toEqual({ addedCents: 824_000, newHoldings: 2 });
  });

  it("projects goals and counts the on-track ones", () => {
    // Emergency fund: 800k + 12×20k = 1.04M ≥ 1M target → on track.
    // House deposit: 100k + 6×10k = 160k of 5M → off track.
    expect(data.goals?.total).toBe(2);
    expect(data.goals?.onTrack).toBe(1);
    expect(data.goals?.topGoalLabel).toBe("Emergency fund");
    expect(data.goals?.topGoalProgressPct).toBe(104);
  });

  it("builds the health trend from the first and last scored months", () => {
    expect(data.health).toEqual({
      startOverall: 72,
      endOverall: 78,
      startGrade: "C",
      endGrade: "B",
      months: 2,
    });
  });

  it("keeps the alert counts", () => {
    expect(data.alerts).toEqual({ activeAlerts: 2, alertsTriggered: 3 });
  });

  it("computes the FY streak and dedupes check-in days", () => {
    expect(data.streak).toEqual({ longestRunDays: 14, totalCheckins: 16 });
  });

  it("totals research activity", () => {
    expect(data.activity).toEqual({
      quizzesCompleted: 2,
      guidesSaved: 5,
      watchlistAdds: 3,
      total: 10,
    });
  });
});

describe("assembleWrapped — sparse and new users", () => {
  it("nulls every section a user lacks", () => {
    const rows: WrappedSourceRows = {
      ...EMPTY_WRAPPED_ROWS,
      goals: richRows().goals,
      accountCreatedAt: "2023-02-01T00:00:00Z",
    };
    const data = assembleWrapped(rows, FY26, NOW_MS);
    expect(data.goals).not.toBeNull();
    expect(data.balances).not.toBeNull(); // goal balances count as tracked money
    expect(data.invested).toBeNull();
    expect(data.health).toBeNull();
    expect(data.alerts).toBeNull();
    expect(data.streak).toBeNull();
    expect(data.activity).toBeNull();
    expect(data.hasAnyData).toBe(true);
  });

  it("flags a brand-new account with no data as a first FY", () => {
    const rows: WrappedSourceRows = {
      ...EMPTY_WRAPPED_ROWS,
      accountCreatedAt: "2026-05-20T10:00:00Z",
    };
    const data = assembleWrapped(rows, FY26, NOW_MS);
    expect(data.hasAnyData).toBe(false);
    expect(data.isFirstFy).toBe(true);
    expect(data.balances).toBeNull();
  });

  it("degrades the alerts card when the send log is unavailable", () => {
    const withAlerts = assembleWrapped(
      { ...EMPTY_WRAPPED_ROWS, activeAlerts: 1, alertsTriggered: null },
      FY26,
      NOW_MS,
    );
    expect(withAlerts.alerts).toEqual({ activeAlerts: 1, alertsTriggered: null });

    const without = assembleWrapped(
      { ...EMPTY_WRAPPED_ROWS, activeAlerts: 0, alertsTriggered: null },
      FY26,
      NOW_MS,
    );
    expect(without.alerts).toBeNull();
  });

  it("treats the FY as complete when viewed after June 30", () => {
    const data = assembleWrapped(richRows(), FY26, Date.UTC(2026, 6, 5));
    expect(data.inProgress).toBe(false);
    expect(data.daysRemaining).toBe(0);
  });
});

// ─── Cards ────────────────────────────────────────────────────────────────

describe("buildWrappedCards", () => {
  it("orders a rich deck intro → sections → finale", () => {
    const cards = buildWrappedCards(assembleWrapped(richRows(), FY26, NOW_MS));
    expect(cards.map((c) => c.key)).toEqual([
      "intro",
      "balances",
      "invested",
      "goals",
      "health",
      "alerts",
      "streak",
      "activity",
      "finale",
    ]);
    expect(cards[0]?.headline).toBe("FY26, nearly wrapped.");
    expect(cards[cards.length - 1]?.headline).toBe("Finish strong.");
  });

  it("uses completed-year copy after June 30", () => {
    const cards = buildWrappedCards(assembleWrapped(richRows(), FY26, Date.UTC(2026, 6, 5)));
    expect(cards[0]?.headline).toBe("FY26, wrapped.");
    expect(cards[cards.length - 1]?.headline).toBe("Bring on FY27.");
  });

  it("renders concrete own-data stats on the section cards", () => {
    const cards = buildWrappedCards(assembleWrapped(richRows(), FY26, NOW_MS));
    const byKey = new Map(cards.map((c) => [c.key, c]));
    expect(byKey.get("balances")?.headline).toBe("$42,240");
    expect(byKey.get("invested")?.headline).toBe("+$8,240");
    expect(byKey.get("goals")?.headline).toBe("1 of 2 on track");
    expect(byKey.get("health")?.headline).toBe("C → B");
    expect(byKey.get("alerts")?.headline).toBe("3 alerts fired");
    expect(byKey.get("streak")?.headline).toBe("14-day streak");
    expect(byKey.get("activity")?.headline).toBe("10 research moves");
  });

  it("gives a brand-new user exactly intro + finale with first-FY framing", () => {
    const data = assembleWrapped(
      { ...EMPTY_WRAPPED_ROWS, accountCreatedAt: "2026-05-20T10:00:00Z" },
      FY26,
      NOW_MS,
    );
    const cards = buildWrappedCards(data);
    expect(cards.map((c) => c.key)).toEqual(["intro", "finale"]);
    expect(cards[0]?.headline).toBe("Your first FY starts now.");
    expect(cards[1]?.headline).toBe("Start your story.");
  });

  it("falls back to 'on watch' copy when the send log is unavailable", () => {
    const data = assembleWrapped(
      { ...EMPTY_WRAPPED_ROWS, activeAlerts: 2, alertsTriggered: null },
      FY26,
      NOW_MS,
    );
    const alerts = buildWrappedCards(data).find((c) => c.key === "alerts");
    expect(alerts?.headline).toBe("2 alerts on watch");
  });

  it("uses a steady-grade headline when health has a single month", () => {
    const data = assembleWrapped(
      { ...EMPTY_WRAPPED_ROWS, healthLog: [{ overall: 80, scored_month: "2026-02-01" }] },
      FY26,
      NOW_MS,
    );
    const health = buildWrappedCards(data).find((c) => c.key === "health");
    expect(health?.headline).toBe("Grade B");
    expect(health?.body).toContain("first scored month");
  });

  it("never compares the user against other people", () => {
    const cards = buildWrappedCards(assembleWrapped(richRows(), FY26, NOW_MS));
    for (const card of cards) {
      const text = `${card.kicker} ${card.headline} ${card.body}`.toLowerCase();
      expect(text).not.toMatch(/other (users|investors)|beat \d|top \d+%|percentile|than most/);
    }
  });
});

// ─── Share summary + formatting ───────────────────────────────────────────

describe("wrappedShareSummary", () => {
  it("compresses the year into at most four segments", () => {
    const summary = wrappedShareSummary(assembleWrapped(richRows(), FY26, NOW_MS));
    expect(summary.startsWith("FY26 — ")).toBe(true);
    expect(summary).toContain("$42,240 tracked");
    expect(summary).toContain("1 of 2 goals on track");
    expect(summary.split(" · ")).toHaveLength(4);
  });

  it("has a clean-slate fallback", () => {
    const summary = wrappedShareSummary(assembleWrapped(EMPTY_WRAPPED_ROWS, FY26, NOW_MS));
    expect(summary).toBe("FY26 — a clean slate.");
  });
});

describe("formatAudCents", () => {
  it("formats whole Australian dollars", () => {
    expect(formatAudCents(1_824_000)).toBe("$18,240");
    expect(formatAudCents(95_000)).toBe("$950");
    expect(formatAudCents(0)).toBe("$0");
  });
});
