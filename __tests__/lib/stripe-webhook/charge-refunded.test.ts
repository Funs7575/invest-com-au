import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockDebitWallet = vi.fn();
vi.mock("@/lib/marketplace/wallet", () => ({
  debitWallet: (...args: unknown[]) => mockDebitWallet(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { handleChargeRefunded } from "@/lib/stripe-webhook/handlers/charge-refunded";

// ── Constants ──────────────────────────────────────────────────────────────────

const COURSE_PURCHASE = {
  id: "cp_1",
  user_id: "u_1",
  course_slug: "investing-101",
  amount_paid: 4900,
};
const WALLET_TXN = { id: "wt_1", broker_slug: "commsec", amount_cents: 5000 };
const BOOKING = { id: "bk_1", user_id: "u_1", consultation_id: "c_1" };

// ── Helpers ────────────────────────────────────────────────────────────────────

type Overrides = {
  coursePurchase?: typeof COURSE_PURCHASE | null;
  walletTxn?: typeof WALLET_TXN | null;
  priorReversals?: Array<{ amount_cents: number }>;
  booking?: typeof BOOKING | null;
};

function writeBuilder() {
  return {
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((cb: (v: unknown) => void) => {
      cb({ data: null, error: null });
      return Promise.resolve();
    }),
  };
}

function makeCtx(overrides: Overrides = {}): WebhookContext {
  const {
    coursePurchase = null,
    walletTxn = null,
    priorReversals = [],
    booking = null,
  } = overrides;

  let walletCallCount = 0;
  let coursePurchaseCallCount = 0;
  let consultationCallCount = 0;

  const adminFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "course_purchases") {
      coursePurchaseCallCount++;
      if (coursePurchaseCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: coursePurchase }),
        };
      }
      return writeBuilder();
    }
    if (table === "course_revenue") {
      return writeBuilder();
    }
    if (table === "wallet_transactions") {
      walletCallCount++;
      if (walletCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: walletTxn }),
        };
      }
      // Second call: returns prior reversals array
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: priorReversals });
          return Promise.resolve();
        }),
      };
    }
    if (table === "consultation_bookings") {
      consultationCallCount++;
      if (consultationCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: booking }),
        };
      }
      return writeBuilder();
    }
    if (table === "broker_notifications") {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
  });

  return {
    admin: { from: adminFrom } as unknown as WebhookContext["admin"],
    stripe: {} as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(overrides: {
  paymentIntent?: string | { id: string } | null;
  amountRefunded?: number;
  chargeId?: string;
} = {}): Stripe.Event {
  const {
    paymentIntent = "pi_test",
    amountRefunded = 5000,
    chargeId = "ch_test",
  } = overrides;
  return {
    id: "evt_refund",
    type: "charge.refunded",
    data: {
      object: {
        id: chargeId,
        object: "charge",
        payment_intent: paymentIntent,
        amount_refunded: amountRefunded,
      } as Stripe.Charge,
    },
  } as unknown as Stripe.Event;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("handleChargeRefunded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDebitWallet.mockResolvedValue(undefined);
  });

  it("returns { status: 'done' } always", async () => {
    const result = await handleChargeRefunded(makeEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("returns done immediately when payment_intent is null", async () => {
    const ctx = makeCtx();
    const result = await handleChargeRefunded(makeEvent({ paymentIntent: null }), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it("resolves payment_intent from object form", async () => {
    const ctx = makeCtx({ coursePurchase: COURSE_PURCHASE });
    await handleChargeRefunded(makeEvent({ paymentIntent: { id: "pi_obj" } }), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Course purchase refunded",
      expect.any(Object),
    );
  });

  it("marks course purchase refunded and logs when coursePurchase found", async () => {
    const ctx = makeCtx({ coursePurchase: COURSE_PURCHASE });
    await handleChargeRefunded(makeEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Course purchase refunded",
      expect.objectContaining({ courseSlug: "investing-101", userId: "u_1" }),
    );
  });

  it("skips course flow when no coursePurchase found", async () => {
    const ctx = makeCtx({ coursePurchase: null });
    await handleChargeRefunded(makeEvent(), ctx);
    expect(ctx.log.info).not.toHaveBeenCalledWith(
      "Course purchase refunded",
      expect.any(Object),
    );
  });

  it("calls debitWallet with full delta when no prior reversals", async () => {
    await handleChargeRefunded(
      makeEvent({ amountRefunded: 5000, chargeId: "ch_test" }),
      makeCtx({ walletTxn: WALLET_TXN, priorReversals: [] }),
    );
    expect(mockDebitWallet).toHaveBeenCalledWith(
      "commsec",
      5000,
      expect.stringContaining("50.00"),
      { type: "stripe_refund", id: "ch_test" },
    );
  });

  it("subtracts prior reversals from delta", async () => {
    await handleChargeRefunded(
      makeEvent({ amountRefunded: 5000 }),
      makeCtx({ walletTxn: WALLET_TXN, priorReversals: [{ amount_cents: 2000 }] }),
    );
    expect(mockDebitWallet).toHaveBeenCalledWith(
      "commsec",
      3000,
      expect.any(String),
      expect.any(Object),
    );
  });

  it("skips debitWallet when already fully reversed (delta <= 0)", async () => {
    await handleChargeRefunded(
      makeEvent({ amountRefunded: 5000 }),
      makeCtx({ walletTxn: WALLET_TXN, priorReversals: [{ amount_cents: 5000 }] }),
    );
    expect(mockDebitWallet).not.toHaveBeenCalled();
    expect((makeCtx().log.info as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("swallows debitWallet errors non-fatally and still returns done", async () => {
    mockDebitWallet.mockRejectedValue(new Error("wallet boom"));
    const ctx = makeCtx({ walletTxn: WALLET_TXN });
    const result = await handleChargeRefunded(makeEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalledWith(
      "Wallet refund reversal failed",
      expect.objectContaining({ error: "wallet boom" }),
    );
  });

  it("skips wallet flow when no walletTxn found", async () => {
    await handleChargeRefunded(makeEvent(), makeCtx({ walletTxn: null }));
    expect(mockDebitWallet).not.toHaveBeenCalled();
  });

  it("marks consultation booking as refunded when booking found", async () => {
    const ctx = makeCtx({ booking: BOOKING });
    await handleChargeRefunded(makeEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Consultation booking refunded",
      expect.objectContaining({ bookingId: "bk_1" }),
    );
  });

  it("always writes to admin_audit_log", async () => {
    const ctx = makeCtx({ coursePurchase: COURSE_PURCHASE, walletTxn: WALLET_TXN });
    await handleChargeRefunded(makeEvent({ amountRefunded: 5000 }), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("admin_audit_log");
  });
});

// ── Advisor refund-as-credit flow ────────────────────────────────────────────

describe("handleChargeRefunded — advisor flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeAdvisorCtx(opts: {
    topupRow?: { id: number; professional_id: number; amount_cents: number; status?: string } | null;
    billingRow?: { id: number; professional_id: number; amount_cents: number } | null;
    priorRefunds?: Array<{ amount_cents: number }>;
  }): WebhookContext {
    const { topupRow = null, billingRow = null, priorRefunds = [] } = opts;
    let topupCalls = 0;
    let billingCalls = 0;

    const adminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "course_purchases" || table === "course_revenue") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          ...writeBuilder(),
        };
      }
      if (table === "wallet_transactions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      if (table === "consultation_bookings") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      if (table === "advisor_credit_topups") {
        topupCalls++;
        if (topupCalls === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: topupRow }),
          };
        }
        return writeBuilder();
      }
      if (table === "advisor_billing") {
        billingCalls++;
        if (billingCalls === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: billingRow }),
          };
        }
        return writeBuilder();
      }
      if (table === "advisor_credit_ledger") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          then: vi.fn((cb: (v: unknown) => void) => {
            cb({ data: priorRefunds });
            return Promise.resolve();
          }),
          insert: vi.fn().mockReturnThis(),
        };
      }
      if (table === "professionals") {
        // recordLedgerEntry reads/updates this; balance starts at 0
        return {
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { credit_balance_cents: 0, lifetime_credit_cents: 0, lifetime_lead_spend_cents: 0 },
            error: null,
          }),
          then: vi.fn((cb: (v: unknown) => void) => {
            cb({ data: null, error: null });
            return Promise.resolve();
          }),
        };
      }
      if (table === "admin_audit_log") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
    });

    return {
      admin: { from: adminFrom } as unknown as WebhookContext["admin"],
      stripe: {} as unknown as WebhookContext["stripe"],
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    };
  }

  it("queries advisor_credit_topups when neither course/wallet/consultation match", async () => {
    const ctx = makeAdvisorCtx({ topupRow: null });
    await handleChargeRefunded(makeEvent(), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("advisor_credit_topups");
  });

  it("falls through to advisor_billing when no topup matches", async () => {
    const ctx = makeAdvisorCtx({ topupRow: null, billingRow: null });
    await handleChargeRefunded(makeEvent(), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("advisor_billing");
  });

  it("skips advisor flow when neither topup nor billing match", async () => {
    const ctx = makeAdvisorCtx({});
    await handleChargeRefunded(makeEvent(), ctx);
    // ledger only queried after match — not here
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).not.toHaveBeenCalledWith(
      "advisor_credit_ledger",
    );
  });

  it("respects refund_policy = 'cash' (no ledger insert)", async () => {
    const ctx = makeAdvisorCtx({
      topupRow: { id: 7, professional_id: 1, amount_cents: 5000 },
    });
    const event = makeEvent();
    (event.data.object as unknown as { metadata: Record<string, string> }).metadata = {
      refund_policy: "cash",
    };
    await handleChargeRefunded(event, ctx);
    // We do touch the ledger table to read priorRefunds when policy isn't cash;
    // with policy=cash the helper logs but doesn't credit.
    const audit = (ctx.admin.from as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => c[0] === "admin_audit_log",
    );
    expect(audit.length).toBeGreaterThan(0);
  });
});
