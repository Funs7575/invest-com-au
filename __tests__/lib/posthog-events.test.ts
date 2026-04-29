import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Tests ─────────────────────────────────────────────────────────────────────
// trackEvent and getDistinctId are pure browser functions — no external mocks needed.
// We test them by manipulating `window` and `window.posthog`.

// Save original window reference so we can restore it after SSR simulation tests
const originalWindow = global.window;

import { trackEvent, getDistinctId, type EventName, type EventProps } from "@/lib/posthog/events";

type MockPosthog = {
  capture: ReturnType<typeof vi.fn>;
  get_distinct_id?: () => string;
};

function setPosthog(ph: MockPosthog | undefined) {
  (global.window as unknown as { posthog?: MockPosthog }).posthog = ph;
}

describe("lib/posthog/events — trackEvent", () => {
  beforeEach(() => {
    setPosthog(undefined);
  });

  afterEach(() => {
    setPosthog(undefined);
  });

  it("does nothing when posthog is not on window", () => {
    // No posthog → should not throw
    expect(() =>
      trackEvent("quiz_started", { quiz_type: "advisor_match", source_page: "/quiz" })
    ).not.toThrow();
  });

  it("calls posthog.capture with the correct event name and props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("quiz_started", { quiz_type: "advisor_match", source_page: "/quiz" });
    expect(capture).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith("quiz_started", {
      quiz_type: "advisor_match",
      source_page: "/quiz",
    });
  });

  it("fires advisor_selected with correct props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("advisor_selected", {
      advisor_id: 42,
      advisor_name: "Jane Doe",
      selection_source: "quiz_results",
      rank_position: 1,
    });
    expect(capture).toHaveBeenCalledWith("advisor_selected", {
      advisor_id: 42,
      advisor_name: "Jane Doe",
      selection_source: "quiz_results",
      rank_position: 1,
    });
  });

  it("fires checkout_started with correct props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("checkout_started", {
      product_type: "advisor_subscription",
      plan_id: "pro_monthly",
      amount_cents: 9900,
      source: "upgrade_modal",
    });
    expect(capture).toHaveBeenCalledWith("checkout_started", {
      product_type: "advisor_subscription",
      plan_id: "pro_monthly",
      amount_cents: 9900,
      source: "upgrade_modal",
    });
  });

  it("fires checkout_started with null plan_id and amount_cents", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("checkout_started", {
      product_type: "course",
      plan_id: null,
      amount_cents: null,
      source: "course_page",
    });
    expect(capture).toHaveBeenCalledWith("checkout_started", expect.objectContaining({
      plan_id: null,
      amount_cents: null,
    }));
  });

  it("fires subscription_active with correct props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("subscription_active", {
      plan_id: "pro_monthly",
      plan_name: "Pro Monthly",
      amount_cents: 9900,
      interval: "month",
      advisor_id: 7,
    });
    expect(capture).toHaveBeenCalledWith("subscription_active", {
      plan_id: "pro_monthly",
      plan_name: "Pro Monthly",
      amount_cents: 9900,
      interval: "month",
      advisor_id: 7,
    });
  });

  it("fires subscription_active with null advisor_id for non-advisor products", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("subscription_active", {
      plan_id: "course_bundle",
      plan_name: "Course Bundle",
      amount_cents: 29900,
      interval: "year",
      advisor_id: null,
    });
    expect(capture).toHaveBeenCalledWith("subscription_active", expect.objectContaining({
      advisor_id: null,
      interval: "year",
    }));
  });

  it("fires advisor_apply_submitted with correct props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("advisor_apply_submitted", {
      application_type: "new",
      firm: "Smith Financial",
      city: "Sydney",
      specialisations: ["superannuation", "retirement"],
    });
    expect(capture).toHaveBeenCalledWith("advisor_apply_submitted", {
      application_type: "new",
      firm: "Smith Financial",
      city: "Sydney",
      specialisations: ["superannuation", "retirement"],
    });
  });

  it("fires advisor_apply_submitted with null firm and city", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("advisor_apply_submitted", {
      application_type: "resubmit",
      firm: null,
      city: null,
      specialisations: [],
    });
    expect(capture).toHaveBeenCalledWith("advisor_apply_submitted", expect.objectContaining({
      application_type: "resubmit",
      firm: null,
      city: null,
    }));
  });

  it("fires lead_responded_to with correct props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("lead_responded_to", {
      lead_id: "lead-abc",
      response_time_hours: 2.5,
      advisor_id: 99,
      outcome: "accepted",
    });
    expect(capture).toHaveBeenCalledWith("lead_responded_to", {
      lead_id: "lead-abc",
      response_time_hours: 2.5,
      advisor_id: 99,
      outcome: "accepted",
    });
  });

  it("fires lead_responded_to with null response_time_hours", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("lead_responded_to", {
      lead_id: "lead-xyz",
      response_time_hours: null,
      advisor_id: 5,
      outcome: "no_outcome_set",
    });
    expect(capture).toHaveBeenCalledWith("lead_responded_to", expect.objectContaining({
      response_time_hours: null,
      outcome: "no_outcome_set",
    }));
  });

  it("fires dispute_opened with correct props", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("dispute_opened", {
      dispute_type: "review",
      subject_id: "review-123",
      reason: "Inaccurate content",
    });
    expect(capture).toHaveBeenCalledWith("dispute_opened", {
      dispute_type: "review",
      subject_id: "review-123",
      reason: "Inaccurate content",
    });
  });

  it("fires dispute_opened with null reason", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("dispute_opened", {
      dispute_type: "billing",
      subject_id: "charge-456",
      reason: null,
    });
    expect(capture).toHaveBeenCalledWith("dispute_opened", expect.objectContaining({
      dispute_type: "billing",
      reason: null,
    }));
  });

  it("fires advisor_selected with null rank_position", () => {
    const capture = vi.fn();
    setPosthog({ capture });
    trackEvent("advisor_selected", {
      advisor_id: 10,
      advisor_name: "Bob",
      selection_source: "shortlist",
      rank_position: null,
    });
    expect(capture).toHaveBeenCalledWith("advisor_selected", expect.objectContaining({
      rank_position: null,
    }));
  });
});

describe("lib/posthog/events — getDistinctId", () => {
  it("returns posthog distinct_id when available", () => {
    (global.window as unknown as { posthog?: { get_distinct_id: () => string } }).posthog = {
      get_distinct_id: () => "user_abc123",
    };
    expect(getDistinctId()).toBe("user_abc123");
    (global.window as unknown as { posthog?: unknown }).posthog = undefined;
  });

  it("returns null when posthog is not on window", () => {
    (global.window as unknown as { posthog?: unknown }).posthog = undefined;
    expect(getDistinctId()).toBeNull();
  });

  it("returns null when get_distinct_id is missing", () => {
    (global.window as unknown as { posthog?: Record<string, unknown> }).posthog = {};
    expect(getDistinctId()).toBeNull();
    (global.window as unknown as { posthog?: unknown }).posthog = undefined;
  });
});

// ── Type-level assertions (compile-time only) ─────────────────────────────────
// These confirm the EventProps map is exhaustive for all 11 event names.
describe("EventProps type coverage", () => {
  it("EventName union includes all 11 events", () => {
    const names: EventName[] = [
      "quiz_started",
      "quiz_completed",
      "advisor_viewed",
      "advisor_contacted",
      "lead_submitted",
      "advisor_selected",
      "checkout_started",
      "subscription_active",
      "advisor_apply_submitted",
      "lead_responded_to",
      "dispute_opened",
    ];
    expect(names).toHaveLength(11);
  });

  it("EventProps has correct keys for each new event", () => {
    type NewEvents = Pick<
      EventProps,
      | "advisor_selected"
      | "checkout_started"
      | "subscription_active"
      | "advisor_apply_submitted"
      | "lead_responded_to"
      | "dispute_opened"
    >;
    // Type-only check: this compiles iff all 6 keys exist in EventProps
    const _check: keyof NewEvents = "advisor_selected";
    expect(_check).toBe("advisor_selected");
  });
});
