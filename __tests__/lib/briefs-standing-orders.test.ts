import { describe, it, expect } from "vitest";

import {
  briefMatchesOrder,
  isOrderLive,
  orderCandidates,
  type StandingOrderRow,
} from "@/lib/briefs/standing-orders";
import type { BriefRow } from "@/lib/briefs/types";

function makeOrder(overrides: Partial<StandingOrderRow> = {}): StandingOrderRow {
  return {
    id: 1,
    professional_id: 42,
    status: "active",
    paused_until: null,
    brief_templates: [],
    states: [],
    budget_bands: [],
    max_credits_per_accept: 10,
    weekly_accept_cap: 3,
    last_triggered_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeBrief(overrides: Partial<BriefRow> = {}): BriefRow {
  return {
    id: 7,
    slug: "test-brief",
    flow_type: "accept",
    brief_template: "financial_adviser",
    brief_payload: {},
    provider_preference: "any",
    routing_mode: "smart_match",
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
    job_title: "Help with super",
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

describe("isOrderLive", () => {
  it("active orders are live", () => {
    expect(isOrderLive(makeOrder({ status: "active" }))).toBe(true);
  });

  it("paused orders without a timer are not live", () => {
    expect(isOrderLive(makeOrder({ status: "paused" }))).toBe(false);
  });

  it("paused orders resume once paused_until elapses", () => {
    const now = new Date("2026-06-11T12:00:00.000Z");
    const stillPaused = makeOrder({
      status: "paused",
      paused_until: "2026-06-12T00:00:00.000Z",
    });
    const elapsed = makeOrder({
      status: "paused",
      paused_until: "2026-06-11T00:00:00.000Z",
    });
    expect(isOrderLive(stillPaused, now)).toBe(false);
    expect(isOrderLive(elapsed, now)).toBe(true);
  });
});

describe("briefMatchesOrder", () => {
  it("empty filters match any brief within the credit ceiling", () => {
    expect(briefMatchesOrder(makeBrief(), makeOrder())).toBe(true);
  });

  it("rejects briefs whose accept cost exceeds the ceiling", () => {
    expect(
      briefMatchesOrder(
        makeBrief({ accept_credits_cost: 11 }),
        makeOrder({ max_credits_per_accept: 10 }),
      ),
    ).toBe(false);
  });

  it("defaults a null accept cost to 2 credits (acceptBrief parity)", () => {
    expect(
      briefMatchesOrder(
        makeBrief({ accept_credits_cost: null }),
        makeOrder({ max_credits_per_accept: 2 }),
      ),
    ).toBe(true);
    expect(
      briefMatchesOrder(
        makeBrief({ accept_credits_cost: null }),
        makeOrder({ max_credits_per_accept: 1 }),
      ),
    ).toBe(false);
  });

  it("template filter must include the brief's template", () => {
    const order = makeOrder({ brief_templates: ["smsf_property", "tax"] });
    expect(briefMatchesOrder(makeBrief({ brief_template: "tax" }), order)).toBe(true);
    expect(
      briefMatchesOrder(makeBrief({ brief_template: "financial_adviser" }), order),
    ).toBe(false);
    expect(briefMatchesOrder(makeBrief({ brief_template: null }), order)).toBe(false);
  });

  it("state filter must include the brief's location", () => {
    const order = makeOrder({ states: ["NSW", "VIC"] });
    expect(briefMatchesOrder(makeBrief({ location: "VIC" }), order)).toBe(true);
    expect(briefMatchesOrder(makeBrief({ location: "QLD" }), order)).toBe(false);
    expect(briefMatchesOrder(makeBrief({ location: null }), order)).toBe(false);
  });

  it("budget filter must include the brief's band", () => {
    const order = makeOrder({ budget_bands: ["5k_10k", "10k_plus"] });
    expect(briefMatchesOrder(makeBrief({ budget_band: "10k_plus" }), order)).toBe(true);
    expect(briefMatchesOrder(makeBrief({ budget_band: "under_500" }), order)).toBe(false);
  });
});

describe("orderCandidates", () => {
  it("never-triggered rules lead, then least-recently-triggered", () => {
    const a = makeOrder({ id: 1, last_triggered_at: "2026-06-10T00:00:00.000Z" });
    const b = makeOrder({ id: 2, last_triggered_at: null, created_at: "2026-06-05T00:00:00.000Z" });
    const c = makeOrder({ id: 3, last_triggered_at: "2026-06-01T00:00:00.000Z" });
    expect(orderCandidates([a, b, c]).map((o) => o.id)).toEqual([2, 3, 1]);
  });

  it("ties break on rule age (oldest first) and input is not mutated", () => {
    const a = makeOrder({ id: 1, created_at: "2026-06-03T00:00:00.000Z" });
    const b = makeOrder({ id: 2, created_at: "2026-06-01T00:00:00.000Z" });
    const input = [a, b];
    expect(orderCandidates(input).map((o) => o.id)).toEqual([2, 1]);
    expect(input.map((o) => o.id)).toEqual([1, 2]);
  });
});
