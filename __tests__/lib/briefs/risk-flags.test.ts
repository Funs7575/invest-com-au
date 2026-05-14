import { describe, it, expect } from "vitest";
import { scanBriefSync, type RiskPattern } from "@/lib/briefs/risk-flags";

const PATTERNS: RiskPattern[] = [
  { pattern: "withdraw super", category: "super_withdrawal", severity: "review" },
  { pattern: "guaranteed returns", category: "guaranteed_returns", severity: "review" },
  { pattern: "tax avoidance", category: "tax_avoidance", severity: "block" },
  { pattern: "high yield", category: "high_yield", severity: "warn" },
];

describe("scanBriefSync", () => {
  it("returns clear when no patterns match", () => {
    const result = scanBriefSync("I want a normal SMSF setup", PATTERNS);
    expect(result.flags).toEqual([]);
    expect(result.severity).toBe("clear");
    expect(result.reviewStatus).toBe("clear");
    expect(result.shouldRouteNow).toBe(true);
  });

  it("flags warn-severity matches but still routes", () => {
    const result = scanBriefSync("looking for high yield options", PATTERNS);
    expect(result.flags).toContain("high_yield");
    expect(result.severity).toBe("warn");
    expect(result.reviewStatus).toBe("clear");
    expect(result.shouldRouteNow).toBe(true);
  });

  it("holds review-severity matches for compliance approval", () => {
    const result = scanBriefSync("guaranteed returns please", PATTERNS);
    expect(result.flags).toContain("guaranteed_returns");
    expect(result.severity).toBe("review");
    expect(result.reviewStatus).toBe("pending_review");
    expect(result.shouldRouteNow).toBe(false);
  });

  it("picks the highest severity when multiple matches hit", () => {
    const result = scanBriefSync(
      "I want to use tax avoidance with high yield products",
      PATTERNS,
    );
    expect(result.flags.sort()).toEqual(["high_yield", "tax_avoidance"]);
    expect(result.severity).toBe("block");
    expect(result.reviewStatus).toBe("pending_review");
    expect(result.shouldRouteNow).toBe(false);
  });

  it("is case-insensitive", () => {
    const result = scanBriefSync("WITHDRAW SUPER NOW", PATTERNS);
    expect(result.flags).toContain("super_withdrawal");
  });
});
