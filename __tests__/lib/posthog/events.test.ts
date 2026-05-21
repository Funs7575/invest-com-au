/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { trackEvent, getDistinctId } from "@/lib/posthog/events";

type PostHogStub = {
  capture: ReturnType<typeof vi.fn>;
  get_distinct_id?: ReturnType<typeof vi.fn>;
};

function setPosthog(stub: PostHogStub | undefined): void {
  (window as unknown as { posthog?: PostHogStub }).posthog = stub;
}

let capture: ReturnType<typeof vi.fn>;
let getId: ReturnType<typeof vi.fn>;

beforeEach(() => {
  capture = vi.fn();
  getId = vi.fn(() => "distinct-123");
  setPosthog({ capture, get_distinct_id: getId });
});

afterEach(() => {
  setPosthog(undefined);
  vi.restoreAllMocks();
});

describe("trackEvent", () => {
  it("forwards the event name and props to posthog.capture", () => {
    const props = {
      quiz_type: "advisor_match" as const,
      source_page: "/quiz",
    };
    trackEvent("quiz_started", props);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith("quiz_started", props);
  });

  it("passes the props object through unchanged (same reference, full shape)", () => {
    const props = {
      quiz_type: "diy_broker" as const,
      time_taken_seconds: 42,
      selected_advisor_type: "smsf",
      budget_range: "100k-250k",
      risk_profile: "balanced",
      top_match_slug: "jane-doe",
      match_count: 3,
      country: "hong_kong",
    };
    trackEvent("quiz_completed", props);
    const [name, sent] = capture.mock.calls[0]!;
    expect(name).toBe("quiz_completed");
    expect(sent).toBe(props);
    expect(sent).toEqual(props);
  });

  it("supports null-valued optional dimensions (e.g. domestic track)", () => {
    trackEvent("quiz_completed", {
      quiz_type: "advisor_match",
      time_taken_seconds: 10,
      selected_advisor_type: null,
      budget_range: null,
      risk_profile: null,
      top_match_slug: null,
      match_count: 0,
      country: null,
    });
    expect(capture.mock.calls[0]![1]).toMatchObject({ country: null });
  });

  it("does nothing when posthog is not attached to window", () => {
    setPosthog(undefined);
    expect(() =>
      trackEvent("advisor_viewed", {
        advisor_id: 1,
        advisor_name: "Jane",
        advisor_type: "planner",
        firm: null,
        city: null,
      }),
    ).not.toThrow();
    expect(capture).not.toHaveBeenCalled();
  });

  it("captures each of the documented event names", () => {
    trackEvent("advisor_contacted", {
      advisor_id: 1,
      contact_method: "email",
      source_section: "profile",
    });
    trackEvent("lead_submitted", {
      lead_source: "quiz",
      source_page: "/quiz",
      advisor_match_count: 2,
      quiz_completed: true,
      utm_source: "google",
      utm_campaign: "spring",
    });
    trackEvent("advisor_response", {
      lead_id: 9,
      advisor_id: 1,
      response_time_minutes: 30,
      lead_source: "quiz",
    });
    trackEvent("lead_outcome", {
      lead_id: 9,
      advisor_id: 1,
      outcome: "converted",
      lead_source: "quiz",
    });
    const names = capture.mock.calls.map((c) => c[0]);
    expect(names).toEqual([
      "advisor_contacted",
      "lead_submitted",
      "advisor_response",
      "lead_outcome",
    ]);
  });
});

describe("getDistinctId", () => {
  it("returns the distinct id from posthog", () => {
    expect(getDistinctId()).toBe("distinct-123");
    expect(getId).toHaveBeenCalledTimes(1);
  });

  it("returns null when posthog is not present", () => {
    setPosthog(undefined);
    expect(getDistinctId()).toBeNull();
  });

  it("returns null when get_distinct_id is missing on the client", () => {
    setPosthog({ capture: vi.fn() });
    expect(getDistinctId()).toBeNull();
  });

  it("returns null when get_distinct_id yields undefined", () => {
    setPosthog({ capture: vi.fn(), get_distinct_id: vi.fn(() => undefined as unknown as string) });
    expect(getDistinctId()).toBeNull();
  });
});
