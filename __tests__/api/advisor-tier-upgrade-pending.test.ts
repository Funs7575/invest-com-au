import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn();
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockRecordLedgerEntry = vi.fn();
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: (...args: unknown[]) => mockRecordLedgerEntry(...args),
}));

const mockRecordFinancialAudit = vi.fn();
vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: (...args: unknown[]) => mockRecordFinancialAudit(...args),
}));

const mockSubscriptionsUpdate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    subscriptions: { update: (...args: unknown[]) => mockSubscriptionsUpdate(...args) },
  }),
}));

let advisorRow: {
  id: number;
  email: string;
  advisor_tier: string;
  stripe_customer_id: string | null;
  pending_tier: string | null;
  pending_tier_effective_at: string | null;
} | null = null;
let prorationRows: Array<{ id: number; amount_cents: number; reference_id: string }> = [];
let subRow: { stripe_subscription_id: string } | null = null;
const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({
  eq: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "professionals") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: advisorRow }),
            }),
          }),
          update: mockUpdate,
        };
      }
      if (table === "advisor_credit_ledger") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: prorationRows, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: subRow }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    }),
  }),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/advisor-auth/tier-upgrade/pending/route";

function makeReq() {
  return new NextRequest("https://invest.com.au/api/advisor-auth/tier-upgrade/pending", {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  advisorRow = {
    id: 1,
    email: "advisor@x.co",
    advisor_tier: "pro",
    stripe_customer_id: "cus_xxx",
    pending_tier: "growth",
    pending_tier_effective_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
  };
  prorationRows = [{ id: 99, amount_cents: 5000, reference_id: "pro_1_123" }];
  subRow = { stripe_subscription_id: "sub_xxx" };
  mockRequireAdvisorSession.mockResolvedValue(1);
  mockRecordLedgerEntry.mockResolvedValue({
    entry: { id: 100 },
    balanceAfterCents: 0,
    idempotent: false,
  });
  mockSubscriptionsUpdate.mockResolvedValue({});
  mockRecordFinancialAudit.mockResolvedValue(undefined);
  process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
});

describe("DELETE /api/advisor-auth/tier-upgrade/pending", () => {
  it("401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq());
    expect(res.status).toBe(401);
  });

  it("404 when advisor not found", async () => {
    advisorRow = null;
    const res = await DELETE(makeReq());
    expect(res.status).toBe(404);
  });

  it("404 when no pending downgrade is queued", async () => {
    advisorRow = { ...advisorRow!, pending_tier: null };
    const res = await DELETE(makeReq());
    expect(res.status).toBe(404);
  });

  it("claws back the proration credit via admin_adjustment ledger entry", async () => {
    const res = await DELETE(makeReq());
    expect(res.status).toBe(200);
    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 1,
        amountCents: -5000, // negative — claws back the prior +5000
        kind: "admin_adjustment",
        referenceType: "tier_downgrade_clawback",
      }),
    );
  });

  it("calls Stripe subscriptions.update with cancel_at_period_end=false", async () => {
    await DELETE(makeReq());
    expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
      "sub_xxx",
      expect.objectContaining({ cancel_at_period_end: false }),
    );
  });

  it("clears pending_tier and pending_tier_effective_at on the advisor row", async () => {
    await DELETE(makeReq());
    const lastCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1];
    const payload = lastCall?.[0] as Record<string, unknown>;
    expect(payload.pending_tier).toBeNull();
    expect(payload.pending_tier_effective_at).toBeNull();
  });

  it("returns the cancelled tier label and clawback amount", async () => {
    const res = await DELETE(makeReq());
    const body = await res.json();
    expect(body.cancelled_pending_tier).toBe("growth");
    expect(body.clawback_cents).toBe(-5000);
  });

  it("skips Stripe call when STRIPE_SECRET_KEY is unset", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await DELETE(makeReq());
    expect(mockSubscriptionsUpdate).not.toHaveBeenCalled();
  });
});
