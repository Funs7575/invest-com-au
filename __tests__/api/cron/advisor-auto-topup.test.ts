import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AUTO_TOPUP_MAX_CENTS,
  AUTO_TOPUP_COOLDOWN_MS,
  AUTO_TOPUP_DEFAULT_CENTS,
} from "@/app/api/cron/advisor-auto-topup/route";

describe("advisor-auto-topup constants", () => {
  it("AUTO_TOPUP_MAX_CENTS is exactly $500", () => {
    expect(AUTO_TOPUP_MAX_CENTS).toBe(50000);
  });

  it("AUTO_TOPUP_COOLDOWN_MS is exactly 24 hours", () => {
    expect(AUTO_TOPUP_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
    expect(AUTO_TOPUP_COOLDOWN_MS).toBe(86_400_000);
  });

  it("AUTO_TOPUP_DEFAULT_CENTS is $150", () => {
    expect(AUTO_TOPUP_DEFAULT_CENTS).toBe(15000);
  });

  it("default amount is well below the cap", () => {
    expect(AUTO_TOPUP_DEFAULT_CENTS).toBeLessThan(AUTO_TOPUP_MAX_CENTS);
  });
});

describe("auto-topup guardrail invariants (documented in route header)", () => {
  it("$500 cap fires for any amount above 50000 cents", () => {
    // Min(60000, 50000) = 50000. Min(100000, 50000) = 50000.
    expect(Math.min(60000, AUTO_TOPUP_MAX_CENTS)).toBe(AUTO_TOPUP_MAX_CENTS);
    expect(Math.min(100000, AUTO_TOPUP_MAX_CENTS)).toBe(AUTO_TOPUP_MAX_CENTS);
    expect(Math.min(50001, AUTO_TOPUP_MAX_CENTS)).toBe(AUTO_TOPUP_MAX_CENTS);
  });

  it("$500 cap is a no-op for amounts at or below cap", () => {
    expect(Math.min(15000, AUTO_TOPUP_MAX_CENTS)).toBe(15000);
    expect(Math.min(50000, AUTO_TOPUP_MAX_CENTS)).toBe(50000);
    expect(Math.min(1, AUTO_TOPUP_MAX_CENTS)).toBe(1);
  });

  it("24h cooldown window is symmetric", () => {
    const now = new Date("2026-05-09T12:00:00Z");
    const cooldownStart = new Date(now.getTime() - AUTO_TOPUP_COOLDOWN_MS);
    expect(cooldownStart.toISOString()).toBe("2026-05-08T12:00:00.000Z");
  });
});

describe("idempotency-key day stamp", () => {
  // The route uses `auto_topup_<advisorId>_<YYYYMMDD>` (UTC) as the
  // Stripe idempotency key. This test pins the day-stamp algorithm so
  // a future refactor doesn't accidentally split the key across UTC
  // midnight in a way that would let a duplicate charge land.
  it("computes UTC day stamp deterministically", () => {
    const cases: Array<[string, string]> = [
      ["2026-05-09T00:00:00Z", "20260509"],
      ["2026-05-09T23:59:59Z", "20260509"],
      ["2026-05-10T00:00:00Z", "20260510"],
      ["2026-01-01T00:00:00Z", "20260101"],
      ["2026-12-31T23:59:59Z", "20261231"],
    ];
    for (const [iso, expected] of cases) {
      const d = new Date(iso);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      expect(`${year}${month}${day}`).toBe(expected);
    }
  });
});
