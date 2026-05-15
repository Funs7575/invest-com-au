import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockRecordLedgerEntry } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRecordLedgerEntry: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: mockRecordLedgerEntry,
  CENTS_PER_CREDIT: 100,
}));

import {
  successChargeCents,
  getSuccessPricingMultiplierBps,
  getProPricingTier,
  settleSuccessCharge,
} from "@/lib/briefs/pricing-tier";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SUCCESS_PRICING_MULTIPLIER_BPS;
  mockRecordLedgerEntry.mockResolvedValue({
    entry: { id: 1 } as never,
    balanceAfterCents: 0,
    idempotent: false,
  });
});

describe("successChargeCents", () => {
  it("returns 1.5x the standard credit cost by default", () => {
    // 25 credits × 100 cents = 2500 base; 1.5x = 3750
    expect(successChargeCents(25)).toBe(3750);
  });

  it("honours SUCCESS_PRICING_MULTIPLIER_BPS env override", () => {
    process.env.SUCCESS_PRICING_MULTIPLIER_BPS = "20000"; // 2x
    expect(successChargeCents(25)).toBe(5000);
  });

  it("clamps invalid multiplier values", () => {
    process.env.SUCCESS_PRICING_MULTIPLIER_BPS = "999"; // below floor
    expect(getSuccessPricingMultiplierBps()).toBe(15_000);
    process.env.SUCCESS_PRICING_MULTIPLIER_BPS = "60000"; // above ceiling
    expect(getSuccessPricingMultiplierBps()).toBe(15_000);
  });
});

describe("getProPricingTier", () => {
  it("returns 'success_only' when the pro row says so", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { pricing_tier: "success_only" }, error: null }),
        }),
      }),
    }));
    expect(await getProPricingTier(1)).toBe("success_only");
  });

  it("returns 'standard' for any other value (including null)", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { pricing_tier: null }, error: null }),
        }),
      }),
    }));
    expect(await getProPricingTier(1)).toBe("standard");
  });

  it("returns 'standard' on read error to fail safe", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockRejectedValue(new Error("db unreachable")),
        }),
      }),
    }));
    expect(await getProPricingTier(1)).toBe("standard");
  });
});

describe("settleSuccessCharge", () => {
  it("charges the pro 1.5x at outcome=completed when tier was success_only at accept", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 500, pricing_tier_at_accept: "success_only" },
              error: null,
            }),
        }),
      }),
    }));
    const result = await settleSuccessCharge({
      briefId: 500,
      professionalId: 7,
      standardCredits: 25,
    });
    expect(result.charged).toBe(true);
    expect(result.amountCents).toBe(3750);
    expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(1);
    expect(mockRecordLedgerEntry.mock.calls[0]?.[0]).toMatchObject({
      professionalId: 7,
      amountCents: -3750,
      kind: "success_bonus_award",
      referenceType: "success_charge",
      referenceId: "500",
    });
  });

  it("returns not_success_tier when the brief was accepted on standard tier", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 500, pricing_tier_at_accept: "standard" },
              error: null,
            }),
        }),
      }),
    }));
    const result = await settleSuccessCharge({
      briefId: 500,
      professionalId: 7,
      standardCredits: 25,
    });
    expect(result.charged).toBe(false);
    expect(result.reason).toBe("not_success_tier");
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("reports already_settled when ledger returns idempotent=true", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: { id: 500, pricing_tier_at_accept: "success_only" },
              error: null,
            }),
        }),
      }),
    }));
    mockRecordLedgerEntry.mockResolvedValue({
      entry: { id: 1 } as never,
      balanceAfterCents: 0,
      idempotent: true,
    });
    const result = await settleSuccessCharge({
      briefId: 500,
      professionalId: 7,
      standardCredits: 25,
    });
    expect(result.charged).toBe(false);
    expect(result.reason).toBe("already_settled");
  });
});
