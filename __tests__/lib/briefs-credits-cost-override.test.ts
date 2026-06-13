import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Locks in the `acceptBrief({ costOverride })` extension used by Group Briefs:
 * the override replaces the brief's own `accept_credits_cost` for the ledger
 * debit, while every other rule (optimistic lock, tier, rollback, tracker
 * event) stays identical. This proves the volume discount flows through the
 * ESTABLISHED money path rather than a fork.
 */

const { mockRecordLedgerEntry, mockGetProPricingTier, mockMaybeAutoRecharge, mockTables } =
  vi.hoisted(() => ({
    mockRecordLedgerEntry: vi.fn(),
    mockGetProPricingTier: vi.fn(),
    mockMaybeAutoRecharge: vi.fn(),
    mockTables: {
      // The single brief row acceptBrief loads + claims.
      brief: {
        id: 42,
        flow_type: "accept",
        status: "open",
        risk_review_status: "clear",
        accepted_by_professional_id: null,
        accepted_by_team_id: null,
        accept_credits_cost: 4, // base cost — the override must win over this
        slug: "x",
        contact_email: "c@x.com",
      } as Record<string, unknown>,
      proBalanceCents: 100_00,
    },
  }));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: mockRecordLedgerEntry,
}));

vi.mock("@/lib/briefs/pricing-tier", () => ({
  getProPricingTier: mockGetProPricingTier,
}));

vi.mock("@/lib/briefs/auto-recharge", () => ({
  maybeAutoRecharge: mockMaybeAutoRecharge,
}));

// Minimal admin client: routes the calls acceptBrief makes.
vi.mock("@/lib/supabase/admin", () => {
  function builder(table: string) {
    const chain: Record<string, unknown> = {};
    chain.from = (t: string) => builder(t);
    chain.select = () => chain;
    chain.update = () => chain;
    chain.insert = () => chain;
    chain.eq = () => chain;
    chain.is = () => chain;
    chain.maybeSingle = async () => {
      if (table === "advisor_auctions") return { data: mockTables.brief, error: null };
      if (table === "professionals") {
        return { data: { credit_balance_cents: mockTables.proBalanceCents }, error: null };
      }
      return { data: null, error: null };
    };
    // .update(...).eq(...).is(...).is(...).select().maybeSingle() — the claim.
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve({ data: null, error: null }));
    return chain;
  }
  return { createAdminClient: vi.fn(() => builder("root")) };
});

import { acceptBrief, CENTS_PER_CREDIT } from "@/lib/briefs/credits";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProPricingTier.mockResolvedValue("standard");
  mockRecordLedgerEntry.mockResolvedValue({ balanceAfterCents: 97_00 });
  mockMaybeAutoRecharge.mockResolvedValue(undefined);
  // Reset the brief to a fresh unclaimed state for each test.
  mockTables.brief.accepted_by_professional_id = null;
  mockTables.brief.accepted_by_team_id = null;
  mockTables.brief.accept_credits_cost = 4;
  mockTables.proBalanceCents = 100_00;
});

describe("acceptBrief costOverride", () => {
  it("debits the overridden cost (discounted), not the brief's accept_credits_cost", async () => {
    const res = await acceptBrief({ briefId: 42, professionalId: 7, costOverride: 3 });
    expect(res.accepted).toBe(true);
    expect(res.accepted === true && res.creditsSpent).toBe(3);
    // Ledger debit is for the OVERRIDDEN 3 credits, not the base 4.
    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 7,
        amountCents: -3 * CENTS_PER_CREDIT,
        kind: "lead_spend",
        referenceType: "brief_accept",
        referenceId: "42",
      }),
    );
  });

  it("falls back to the brief's own cost when no override is given (existing callers unaffected)", async () => {
    const res = await acceptBrief({ briefId: 42, professionalId: 7 });
    expect(res.accepted === true && res.creditsSpent).toBe(4);
    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: -4 * CENTS_PER_CREDIT }),
    );
  });

  it("clamps a negative override to 0 (never credits the adviser)", async () => {
    const res = await acceptBrief({ briefId: 42, professionalId: 7, costOverride: -10 });
    expect(res.accepted).toBe(true);
    expect(res.accepted === true && res.creditsSpent).toBe(0);
    // 0 credits → success path skips/zeroes the debit; no positive amount ever.
    if (mockRecordLedgerEntry.mock.calls.length > 0) {
      const call = mockRecordLedgerEntry.mock.calls[0]![0] as { amountCents: number };
      expect(call.amountCents).toBeLessThanOrEqual(0);
    }
  });

  it("gates affordability on the discounted cost — a balance that covers 3 but not 4 still accepts", async () => {
    mockTables.proBalanceCents = 3 * CENTS_PER_CREDIT; // exactly 3 credits
    const res = await acceptBrief({ briefId: 42, professionalId: 7, costOverride: 3 });
    expect(res.accepted).toBe(true);
  });
});
