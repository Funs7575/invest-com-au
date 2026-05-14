import { describe, expect, it } from "vitest";
import {
  renderDigestEmail,
  shouldSkip,
} from "@/lib/account/plan-resume-digest";

describe("renderDigestEmail", () => {
  it("uses the goal in the subject when present", () => {
    const { subject } = renderDigestEmail({
      goal: "Buy property through SMSF",
      intent_slug: null,
      share_token: "tok-abc",
      baseUrl: "https://invest.com.au",
    });
    expect(subject).toBe(
      "Pick up where you left off — Buy property through SMSF",
    );
  });

  it("falls back to humanised intent_slug when no goal", () => {
    const { subject } = renderDigestEmail({
      goal: null,
      intent_slug: "smsf_property",
      share_token: "tok-abc",
      baseUrl: "https://invest.com.au",
    });
    expect(subject).toBe("Pick up where you left off — smsf property");
  });

  it("uses a generic line when no goal and no intent", () => {
    const { subject } = renderDigestEmail({
      goal: null,
      intent_slug: null,
      share_token: "tok-abc",
      baseUrl: "https://invest.com.au",
    });
    expect(subject).toBe("Pick up where you left off — your action plan");
  });

  it("escapes html in the goal", () => {
    const { html } = renderDigestEmail({
      goal: "<script>alert('x')</script>",
      intent_slug: null,
      share_token: "tok-abc",
      baseUrl: "https://invest.com.au",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("builds an absolute resume URL from baseUrl + token", () => {
    const { html } = renderDigestEmail({
      goal: "X",
      intent_slug: null,
      share_token: "tok-abc",
      baseUrl: "https://invest.com.au/",
    });
    expect(html).toContain("https://invest.com.au/plans/tok-abc");
  });
});

describe("shouldSkip", () => {
  it("returns true when user is in the recent-sends set", () => {
    expect(
      shouldSkip({ auth_user_id: "u1" }, new Set(["u1", "u2"])),
    ).toBe(true);
  });

  it("returns false when user is not in the recent-sends set", () => {
    expect(shouldSkip({ auth_user_id: "u3" }, new Set(["u1"]))).toBe(false);
  });
});
