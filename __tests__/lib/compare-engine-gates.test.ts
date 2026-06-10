import { describe, expect, it, vi } from "vitest";

/**
 * Licence-mode gate on the compare table schema. Pin factual_only's
 * SHOW_RATINGS=false so the test is deterministic regardless of the
 * runner's NEXT_PUBLIC_LICENCE_MODE (general_advice mode is the identity
 * pass-through, exercised implicitly by every other compare test).
 */
vi.mock("@/lib/compliance-config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/compliance-config")>()),
  SHOW_RATINGS: false,
}));

import { CATEGORY_SCHEMAS, applyComplianceGates } from "@/lib/compare-engine";

describe("applyComplianceGates (factual_only)", () => {
  it("strips the editorial rating column and sort option", () => {
    const gated = applyComplianceGates(CATEGORY_SCHEMAS.all);
    expect(gated.columns.map((c) => c.key)).not.toContain("rating");
    expect(gated.sortOptions.map((o) => o.col)).not.toContain("rating");
  });

  it("keeps the factual columns intact", () => {
    const gated = applyComplianceGates(CATEGORY_SCHEMAS.all);
    expect(gated.columns.map((c) => c.key)).toEqual(
      expect.arrayContaining(["estimatedAnnualCost", "commercial", "freshness"]),
    );
    expect(gated.platformTypes).toEqual(CATEGORY_SCHEMAS.all.platformTypes);
  });
});
