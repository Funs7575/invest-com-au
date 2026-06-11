/**
 * Licence-mode rating gates (DISC-20260610-A).
 *
 * The default test env runs general_advice (vitest.setup.ts) — these tests
 * pin the factual_only behaviour by mocking the flag module, following the
 * pattern in compare-engine-gates.test.ts.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/compliance-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/compliance-config")>()),
  SHOW_RATINGS: false,
  SHOW_ADVISOR_RATINGS: false,
}));

describe("renderStars central licence gate", () => {
  it("returns an empty string in factual_only mode (defence-in-depth net)", async () => {
    const { renderStars } = await import("@/lib/tracking");
    expect(renderStars(4.5)).toBe("");
    expect(renderStars(0)).toBe("");
  });
});

describe("schema-markup builders in factual_only mode", () => {
  it("brokerFinancialProductJsonLd omits aggregateRating", async () => {
    const { brokerFinancialProductJsonLd } = await import("@/lib/schema-markup");
    const ld = brokerFinancialProductJsonLd({
      name: "Test Broker",
      slug: "test-broker",
      rating: 4.7,
      reviewCount: 120,
    } as Parameters<typeof brokerFinancialProductJsonLd>[0]);
    expect(JSON.stringify(ld)).not.toContain("aggregateRating");
  });

  it("advisorJsonLd omits aggregateRating", async () => {
    const { advisorJsonLd } = await import("@/lib/schema-markup");
    const ld = advisorJsonLd({
      name: "Test Advisor",
      slug: "test-advisor",
      rating: 4.9,
      reviewCount: 31,
    } as Parameters<typeof advisorJsonLd>[0]);
    expect(JSON.stringify(ld)).not.toContain("aggregateRating");
  });

  it("brokerReviewJsonLd carries neither reviewRating nor aggregateRating", async () => {
    const { brokerReviewJsonLd } = await import("@/lib/seo");
    const ld = brokerReviewJsonLd({
      name: "Test Broker",
      slug: "test-broker",
      rating: 4.2,
      review_count: 55,
    } as Parameters<typeof brokerReviewJsonLd>[0]);
    const json = JSON.stringify(ld);
    expect(json).not.toContain("reviewRating");
    expect(json).not.toContain("aggregateRating");
  });
});
