import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks — must appear before route import ──────────────────────────────────

const mockRequireCronAuth = vi.fn();
const mockRecordLedgerEntry = vi.fn();
const mockGetStripe = vi.fn();
const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: (...args: unknown[]) => mockGetStripe(...args),
}));

vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: (...args: unknown[]) => mockRecordLedgerEntry(...args),
}));

import { GET, AUTO_TOPUP_MAX_CENTS, AUTO_TOPUP_COOLDOWN_MS } from "@/app/api/cron/advisor-auto-topup/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq() {
  return new Request("http://localhost/api/cron/advisor-auto-topup") as unknown as NextRequest;
}

function makeSelectChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "order", "limit", "filter"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb({ data, error }));
  return chain;
}

const mockStripe = {
  customers: { retrieve: vi.fn() },
  paymentIntents: { create: vi.fn() },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-auto-topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockGetStripe.mockReturnValue(mockStripe);
    mockRecordLedgerEntry.mockResolvedValue(undefined);
  });

  it("returns 401 when cron auth fails", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireCronAuth.mockReturnValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when professionals DB query fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeSelectChain(null, { message: "connection refused" }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBeTruthy();
  });

  it("returns ok:true with no outcomes when no candidates exist", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.eligible_count).toBe(0);
    expect(json.outcomes).toHaveLength(0);
  });

  it("filters out candidates whose balance is at or above threshold", async () => {
    const aboveThreshold = {
      id: 1,
      credit_balance_cents: 5000,
      auto_topup_threshold_cents: 5000, // balance === threshold → not eligible
      auto_topup_amount_cents: 15000,
      stripe_customer_id: "cus_test",
    };
    mockAdminFrom.mockReturnValue(makeSelectChain([aboveThreshold]));
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.eligible_count).toBe(0);
    expect(json.candidate_count).toBe(1);
  });

  it("skips advisor with no stripe_customer_id", async () => {
    const noStripe = {
      id: 2,
      credit_balance_cents: 1000,
      auto_topup_threshold_cents: 3000,
      auto_topup_amount_cents: 15000,
      stripe_customer_id: null,
    };
    mockAdminFrom.mockReturnValue(makeSelectChain([noStripe]));
    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.eligible_count).toBe(1);
    expect(json.skipped_count).toBe(1);
    const outcome = json.outcomes[0];
    expect(outcome.status).toBe("skipped");
    expect(outcome.reason).toBe("no_stripe_customer");
  });

  it("skips advisor in 24h cooldown (recent auto-topup ledger entry)", async () => {
    const pro = {
      id: 3,
      credit_balance_cents: 1000,
      auto_topup_threshold_cents: 3000,
      auto_topup_amount_cents: 15000,
      stripe_customer_id: "cus_abc",
    };

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      if (call++ === 0) return makeSelectChain([pro]); // professionals
      return makeSelectChain([{ id: 1, created_at: new Date().toISOString(), metadata: { auto_topup: true } }]); // recent ledger entry
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.skipped_count).toBe(1);
    expect(json.outcomes[0].reason).toBe("cooldown_active");
  });

  it("marks as failed when Stripe charge throws", async () => {
    const pro = {
      id: 4,
      credit_balance_cents: 500,
      auto_topup_threshold_cents: 3000,
      auto_topup_amount_cents: 15000,
      stripe_customer_id: "cus_xyz",
    };

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      if (call++ === 0) return makeSelectChain([pro]); // professionals
      return makeSelectChain([]); // ledger check — no recent auto-topup
    });

    mockStripe.customers.retrieve.mockResolvedValue({
      id: "cus_xyz",
      deleted: false,
      invoice_settings: { default_payment_method: "pm_test" },
    });
    mockStripe.paymentIntents.create.mockRejectedValue(new Error("Card declined"));

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.failed_count).toBe(1);
    expect(json.outcomes[0].status).toBe("failed");
    expect(json.outcomes[0].reason).toBe("stripe_charge_error");
  });

  it("records charged outcome and ledger entry on successful Stripe charge", async () => {
    const pro = {
      id: 5,
      credit_balance_cents: 500,
      auto_topup_threshold_cents: 3000,
      auto_topup_amount_cents: 15000,
      stripe_customer_id: "cus_ok",
    };

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      if (call++ === 0) return makeSelectChain([pro]); // professionals
      return makeSelectChain([]); // ledger check — no recent auto-topup
    });

    mockStripe.customers.retrieve.mockResolvedValue({
      id: "cus_ok",
      deleted: false,
      invoice_settings: { default_payment_method: "pm_card" },
    });
    mockStripe.paymentIntents.create.mockResolvedValue({
      id: "pi_success",
      status: "succeeded",
    });
    mockRecordLedgerEntry.mockResolvedValue(undefined);

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.charged_count).toBe(1);
    expect(json.total_charged_cents).toBe(15000);
    expect(json.outcomes[0].status).toBe("charged");
    expect(json.outcomes[0].paymentIntentId).toBe("pi_success");
    expect(mockRecordLedgerEntry).toHaveBeenCalledOnce();
  });

  it("caps charge at AUTO_TOPUP_MAX_CENTS even if advisor set higher amount", async () => {
    const pro = {
      id: 6,
      credit_balance_cents: 0,
      auto_topup_threshold_cents: 5000,
      auto_topup_amount_cents: AUTO_TOPUP_MAX_CENTS + 10000, // over the cap
      stripe_customer_id: "cus_big",
    };

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      if (call++ === 0) return makeSelectChain([pro]);
      return makeSelectChain([]);
    });

    mockStripe.customers.retrieve.mockResolvedValue({
      id: "cus_big",
      deleted: false,
      invoice_settings: { default_payment_method: "pm_big" },
    });
    mockStripe.paymentIntents.create.mockResolvedValue({ id: "pi_capped", status: "succeeded" });
    mockRecordLedgerEntry.mockResolvedValue(undefined);

    await GET(makeReq());

    // Stripe was called with exactly AUTO_TOPUP_MAX_CENTS
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: AUTO_TOPUP_MAX_CENTS }),
      expect.anything(),
    );
  });
});

describe("AUTO_TOPUP_MAX_CENTS / AUTO_TOPUP_COOLDOWN_MS constants", () => {
  it("max is $500 AUD (50000 cents)", () => {
    expect(AUTO_TOPUP_MAX_CENTS).toBe(50000);
  });

  it("cooldown is 24 hours in ms", () => {
    expect(AUTO_TOPUP_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
  });
});
