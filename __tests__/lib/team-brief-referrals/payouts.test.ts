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

import { recordReferralPayout } from "@/lib/team-brief-referrals/payouts";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.REFERRAL_PAYOUT_BPS;

  // Default: referrals UPDATE chain — payout audit stamp.
  mockFrom.mockImplementation((table: string) => {
    if (table === "team_brief_referrals") {
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }
    if (table === "expert_team_members") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { professional_id: 9 }, error: null }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { credit_balance_cents: 0 }, error: null }),
          }),
        }),
      };
    }
    return {};
  });

  mockRecordLedgerEntry.mockResolvedValue({
    entry: { id: 1 } as never,
    balanceAfterCents: 0,
    idempotent: false,
  });
});

describe("recordReferralPayout", () => {
  it("charges the accepting pro and pays out 20% to the referring pro by default", async () => {
    const result = await recordReferralPayout({
      referralId: 100,
      briefId: 500,
      acceptCreditsCost: 25,
      acceptingProfessionalId: 1,
      fromProfessionalId: 2,
      fromTeamId: 10,
    });

    // 25 credits × 100 cents = 2500 cents charge
    expect(result.chargeCents).toBe(2500);
    // 20% of 2500 = 500 cents
    expect(result.payoutCents).toBe(500);
    expect(result.payoutProfessionalId).toBe(2);

    // Two ledger writes: lead_spend on accepting pro + referral_payout on referrer
    expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(2);
    const calls = mockRecordLedgerEntry.mock.calls.map((c) => c[0]);
    expect(calls[0]).toMatchObject({
      professionalId: 1,
      amountCents: -2500,
      kind: "lead_spend",
      referenceType: "brief_accept",
      referenceId: "500",
    });
    expect(calls[1]).toMatchObject({
      professionalId: 2,
      amountCents: 500,
      kind: "referral_payout",
      referenceType: "referral_payout",
      referenceId: "100",
    });
  });

  it("honours REFERRAL_PAYOUT_BPS env override", async () => {
    process.env.REFERRAL_PAYOUT_BPS = "3000";
    const result = await recordReferralPayout({
      referralId: 100,
      briefId: 500,
      acceptCreditsCost: 25,
      acceptingProfessionalId: 1,
      fromProfessionalId: 2,
      fromTeamId: 10,
    });
    // 30% of 2500 = 750
    expect(result.payoutCents).toBe(750);
  });

  it("clamps invalid REFERRAL_PAYOUT_BPS to the default", async () => {
    process.env.REFERRAL_PAYOUT_BPS = "99999"; // out of range
    const result = await recordReferralPayout({
      referralId: 100,
      briefId: 500,
      acceptCreditsCost: 25,
      acceptingProfessionalId: 1,
      fromProfessionalId: 2,
      fromTeamId: 10,
    });
    // Falls back to 20% default
    expect(result.payoutCents).toBe(500);
  });

  it("falls back to the first active member of from_team when fromProfessionalId is null", async () => {
    const result = await recordReferralPayout({
      referralId: 100,
      briefId: 500,
      acceptCreditsCost: 25,
      acceptingProfessionalId: 1,
      fromProfessionalId: null,
      fromTeamId: 10,
    });
    // The mocked expert_team_members lookup returns professional_id=9.
    expect(result.payoutProfessionalId).toBe(9);
    const payoutCall = mockRecordLedgerEntry.mock.calls[1]?.[0];
    expect(payoutCall).toMatchObject({ professionalId: 9, kind: "referral_payout" });
  });

  it("skips the payout ledger write when BPS=0 but still charges the acceptor", async () => {
    process.env.REFERRAL_PAYOUT_BPS = "0";
    await recordReferralPayout({
      referralId: 100,
      briefId: 500,
      acceptCreditsCost: 25,
      acceptingProfessionalId: 1,
      fromProfessionalId: 2,
      fromTeamId: 10,
    });
    expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(1);
    expect(mockRecordLedgerEntry.mock.calls[0]?.[0]).toMatchObject({ kind: "lead_spend" });
  });

  it("throws when there is no payout target (null fromProfessionalId AND no team members)", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_team_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    await expect(
      recordReferralPayout({
        referralId: 100,
        briefId: 500,
        acceptCreditsCost: 25,
        acceptingProfessionalId: 1,
        fromProfessionalId: null,
        fromTeamId: 10,
      }),
    ).rejects.toThrow(/no payout target/);
  });
});
