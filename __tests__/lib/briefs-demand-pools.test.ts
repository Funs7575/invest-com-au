import { describe, it, expect } from "vitest";

import {
  DISTRIBUTION_SUPPRESS_THRESHOLD,
  POOL_ACCEPT_DISCOUNT_PCT,
  buildBudgetDistribution,
  discountedAcceptCost,
  isBriefPoolEligible,
  isPoolExpiredForRead,
  periodForDate,
  type DemandPoolRow,
} from "@/lib/briefs/demand-pools";
import type { BriefRow } from "@/lib/briefs/types";

function makeBrief(overrides: Partial<BriefRow> = {}): BriefRow {
  return {
    id: 7,
    slug: "test-brief",
    flow_type: "accept",
    brief_template: "smsf_accountant",
    brief_payload: { pool_opt_in: true },
    provider_preference: "any",
    routing_mode: "multi_response",
    target_professional_id: null,
    target_firm_id: null,
    target_team_id: null,
    accept_credits_cost: 4,
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    accepted_at: null,
    tracker_status: "new",
    risk_flags: [],
    risk_review_status: "clear",
    listing_id: null,
    job_title: "SMSF setup",
    job_description: "desc",
    budget_band: "2k_5k",
    advisor_types: null,
    location: "NSW",
    contact_name: "Sam",
    contact_email: "sam@example.com",
    status: "open",
    ends_at: "2026-07-01T00:00:00.000Z",
    created_at: "2026-06-10T00:00:00.000Z",
    ...overrides,
  };
}

function makePool(overrides: Partial<DemandPoolRow> = {}): DemandPoolRow {
  return {
    id: 1,
    template_key: "smsf_accountant",
    state: "NSW",
    period: "2026-06",
    status: "forming",
    min_size: 3,
    max_size: 12,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("periodForDate", () => {
  it("formats a UTC year-month bucket", () => {
    expect(periodForDate(new Date("2026-06-12T10:00:00Z"))).toBe("2026-06");
    expect(periodForDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
    expect(periodForDate(new Date("2026-12-31T23:59:59Z"))).toBe("2026-12");
  });
});

describe("discountedAcceptCost", () => {
  it("applies the default 25% volume discount, rounding up", () => {
    // 4 * 0.75 = 3 → 3
    expect(discountedAcceptCost(4)).toBe(3);
    // 2 * 0.75 = 1.5 → ceil → 2
    expect(discountedAcceptCost(2)).toBe(2);
    // 10 * 0.75 = 7.5 → ceil → 8
    expect(discountedAcceptCost(10)).toBe(8);
  });

  it("never returns below 1 credit", () => {
    expect(discountedAcceptCost(1)).toBe(1);
    expect(discountedAcceptCost(0)).toBe(1);
    expect(discountedAcceptCost(-5)).toBe(1);
  });

  it("honours an explicit discount pct and clamps it to 0..100", () => {
    expect(discountedAcceptCost(100, 0)).toBe(100); // no discount
    expect(discountedAcceptCost(100, 100)).toBe(1); // fully discounted → floor 1
    expect(discountedAcceptCost(100, 50)).toBe(50);
    expect(discountedAcceptCost(100, 150)).toBe(1); // clamp >100
  });

  it("the default constant is 25", () => {
    expect(POOL_ACCEPT_DISCOUNT_PCT).toBe(25);
    expect(discountedAcceptCost(8)).toBe(discountedAcceptCost(8, 25));
  });
});

describe("buildBudgetDistribution — anonymisation / suppression", () => {
  it("suppresses the breakdown below n=3", () => {
    const d = buildBudgetDistribution(["2k_5k", "5k_10k"]);
    expect(d.suppressed).toBe(true);
    expect(d.cells).toBeNull();
    expect(d.total).toBe(2);
  });

  it("threshold constant is 3", () => {
    expect(DISTRIBUTION_SUPPRESS_THRESHOLD).toBe(3);
  });

  it("shows per-band counts at or above the threshold", () => {
    const d = buildBudgetDistribution(["2k_5k", "2k_5k", "5k_10k"]);
    expect(d.suppressed).toBe(false);
    expect(d.total).toBe(3);
    const map = new Map(d.cells!.map((c) => [c.band, c.count]));
    expect(map.get("2k_5k")).toBe(2);
    expect(map.get("5k_10k")).toBe(1);
  });

  it("treats null/empty budget bands as 'not_sure'", () => {
    const d = buildBudgetDistribution([null, undefined, ""]);
    // 3 entries → at threshold, all collapse to not_sure
    expect(d.suppressed).toBe(false);
    expect(d.cells).toEqual([{ band: "not_sure", count: 3 }]);
  });
});

describe("isPoolExpiredForRead — lazy expiry", () => {
  it("a current-period forming pool is not expired", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    expect(isPoolExpiredForRead(makePool({ period: "2026-06" }), now)).toBe(false);
  });

  it("a pool whose period month has elapsed is expired", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    expect(isPoolExpiredForRead(makePool({ period: "2026-06" }), now)).toBe(true);
  });

  it("an already-expired pool stays expired", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    expect(isPoolExpiredForRead(makePool({ status: "expired" }), now)).toBe(true);
  });

  it("a closed pool is reported as not-expired (terminal but distinct)", () => {
    const now = new Date("2026-12-01T00:00:00Z");
    expect(isPoolExpiredForRead(makePool({ status: "closed" }), now)).toBe(false);
  });

  it("handles overflow-suffixed periods by comparing the month string", () => {
    // '2026-06#2' > '2026-06' is false for the same month in July? We compare
    // periodForDate(now) ('2026-07') > pool.period ('2026-06#2') → true.
    const now = new Date("2026-07-02T00:00:00Z");
    expect(isPoolExpiredForRead(makePool({ period: "2026-06#2" }), now)).toBe(true);
    const sameMonth = new Date("2026-06-20T00:00:00Z");
    expect(isPoolExpiredForRead(makePool({ period: "2026-06#2" }), sameMonth)).toBe(false);
  });
});

describe("isBriefPoolEligible", () => {
  it("accepts an open, cleared, untargeted accept-flow brief with template + state", () => {
    expect(isBriefPoolEligible(makeBrief())).toBe(true);
  });

  it("rejects non-accept flow", () => {
    expect(isBriefPoolEligible(makeBrief({ flow_type: "auction" }))).toBe(false);
  });

  it("rejects already-accepted briefs", () => {
    expect(isBriefPoolEligible(makeBrief({ accepted_by_professional_id: 9 }))).toBe(false);
    expect(isBriefPoolEligible(makeBrief({ accepted_by_team_id: 9 }))).toBe(false);
  });

  it("rejects non-open status", () => {
    expect(isBriefPoolEligible(makeBrief({ status: "closed" }))).toBe(false);
  });

  it("rejects briefs still under risk review", () => {
    expect(isBriefPoolEligible(makeBrief({ risk_review_status: "pending_review" }))).toBe(false);
    expect(isBriefPoolEligible(makeBrief({ risk_review_status: "rejected" }))).toBe(false);
  });

  it("accepts an admin-approved brief", () => {
    expect(isBriefPoolEligible(makeBrief({ risk_review_status: "approved" }))).toBe(true);
  });

  it("rejects direct-targeted briefs (they go to one named provider)", () => {
    expect(
      isBriefPoolEligible(makeBrief({ routing_mode: "direct", target_professional_id: 3 })),
    ).toBe(false);
  });

  it("rejects briefs missing a template or a state (nothing to cluster on)", () => {
    expect(isBriefPoolEligible(makeBrief({ brief_template: null }))).toBe(false);
    expect(isBriefPoolEligible(makeBrief({ location: null }))).toBe(false);
  });
});
