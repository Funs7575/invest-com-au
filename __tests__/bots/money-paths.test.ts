import { describe, it, expect } from "vitest";
import {
  classify,
  resolveAction,
  decide,
  type PolicyOptions,
} from "../../bots/safety/money-paths";

const SANDBOX: PolicyOptions = {
  targetClass: "sandbox",
  mockAi: true,
  allowDestructive: false,
};
const PROTECTED: PolicyOptions = {
  targetClass: "protected",
  mockAi: true,
  allowDestructive: false,
};

describe("classify — real route paths", () => {
  it.each([
    ["/go/etoro", "GET", "affiliate"],
    ["/api/affiliate/click", "POST", "affiliate"],
    ["/api/track-click", "GET", "affiliate"],
    ["/api/stripe/create-checkout", "POST", "payment"],
    ["/api/advertise/create-checkout", "POST", "payment"],
    ["/api/pros/billing/subscribe", "POST", "payment"],
    ["/api/advisor-auth/billing-portal", "POST", "payment"],
    ["/api/v1/billing/checkout", "POST", "payment"],
    ["/api/booking/slot-123/checkout", "POST", "payment"],
    ["/api/listings/checkout", "POST", "payment"],
    ["/api/org-auth/stripe-connect/onboard", "POST", "external-integration"],
    ["/api/account/holdings/sharesight/connect", "POST", "external-integration"],
    ["/api/webhooks/broker-signup", "POST", "external-integration"],
    ["/api/account/delete", "POST", "account-destructive"],
    ["/api/account/documents/abc", "DELETE", "account-destructive"],
    ["/api/advisor-lead", "POST", "lead"],
    ["/api/submit-lead", "POST", "lead"],
    ["/api/quiz/submit", "POST", "lead"],
    ["/api/listings/owner-flow/42/submit", "POST", "lead"],
    ["/api/newsletter", "POST", "email"],
    ["/api/rate-alerts", "POST", "email"],
    ["/api/chatbot", "POST", "ai"],
    ["/api/concierge", "POST", "ai"],
    ["/api/community/threads", "POST", "content"],
    ["/api/follows/advisor", "POST", "content"],
    ["/api/advisors/some-slug/endorse", "POST", "content"],
    ["/api/account/bookmarks", "POST", "account"],
    ["/api/account/goals", "PATCH", "account"],
    ["/api/some-future-write", "POST", "content"], // catch-all
  ])("%s %s -> %s", (path, method, expected) => {
    expect(classify(path, method)).toBe(expected);
  });

  it.each([
    ["/api/brokers", "GET"],
    ["/api/quiz/data", "GET"],
    ["/api/account/profile", "GET"], // reading own account is a safe GET
    ["/compare", "GET"],
    ["/advisors", "GET"],
  ])("treats read %s %s as non-side-effecting (null)", (path, method) => {
    expect(classify(path, method)).toBeNull();
  });
});

describe("resolveAction — policy + overrides", () => {
  it("always mocks irreversible/external categories on every target", () => {
    for (const cat of ["payment", "affiliate", "external-integration"] as const) {
      expect(resolveAction(cat, SANDBOX)).toBe("mock");
      expect(resolveAction(cat, PROTECTED)).toBe("mock");
    }
  });

  it("allows internal writes on sandbox, mocks them on protected", () => {
    for (const cat of ["lead", "email", "content", "account"] as const) {
      expect(resolveAction(cat, SANDBOX)).toBe("allow");
      expect(resolveAction(cat, PROTECTED)).toBe("mock");
    }
  });

  it("mocks AI when mockAi, allows it (cost-capped) otherwise", () => {
    expect(resolveAction("ai", { ...SANDBOX, mockAi: true })).toBe("mock");
    expect(resolveAction("ai", { ...PROTECTED, mockAi: false })).toBe("allow");
  });

  it("gates destructive account ops behind allowDestructive + sandbox", () => {
    expect(resolveAction("account-destructive", SANDBOX)).toBe("mock");
    expect(
      resolveAction("account-destructive", { ...SANDBOX, allowDestructive: true }),
    ).toBe("allow");
    // Never destructive on a protected target, even if the flag is on.
    expect(
      resolveAction("account-destructive", { ...PROTECTED, allowDestructive: true }),
    ).toBe("mock");
  });
});

describe("decide", () => {
  it("returns null for reads", () => {
    expect(decide("/api/brokers", "GET", SANDBOX)).toBeNull();
  });
  it("mocks payments on sandbox", () => {
    expect(decide("/api/stripe/x", "POST", SANDBOX)).toEqual({
      category: "payment",
      action: "mock",
    });
  });
  it("allows content on sandbox, mocks on protected", () => {
    expect(decide("/api/community/threads", "POST", SANDBOX)).toEqual({
      category: "content",
      action: "allow",
    });
    expect(decide("/api/community/threads", "POST", PROTECTED)).toEqual({
      category: "content",
      action: "mock",
    });
  });
});
