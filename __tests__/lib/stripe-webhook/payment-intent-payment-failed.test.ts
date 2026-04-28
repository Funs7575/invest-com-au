import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/stripe-webhook/lib/email", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
}));

import { handlePaymentIntentPaymentFailed } from "@/lib/stripe-webhook/handlers/payment-intent-payment-failed";
import { sendTransactionalEmail } from "@/lib/stripe-webhook/lib/email";

// ── Helpers ────────────────────────────────────────────────────────────────────

const COURSE_PURCHASE = { id: "cp_1", user_id: "u_1", course_slug: "investing-101" };

function makeCtx(coursePurchase: typeof COURSE_PURCHASE | null = null): WebhookContext {
  // Non-deleted customers do NOT have a `deleted` key — the check is `"deleted" in customer`
  const mockStripeCustomerRetrieve = vi.fn().mockResolvedValue({
    id: "cus_1",
    email: "user@example.com",
  });
  let coursePurchaseCallCount = 0;

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
    stripe: {
      customers: { retrieve: mockStripeCustomerRetrieve },
    } as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(overrides: {
  piId?: string;
  customerId?: string | null;
  amount?: number;
  description?: string | null;
} = {}): Stripe.Event {
  const { piId = "pi_fail1", customerId = "cus_1", amount = 4900, description = null } = overrides;
  return {
    id: "evt_1",
    type: "payment_intent.payment_failed",
    data: {
      object: {
        id: piId,
        object: "payment_intent",
        amount,
        currency: "aud",
        customer: customerId,
        description,
        last_payment_error: { message: "Your card was declined." },
      } as unknown as Stripe.PaymentIntent,
    },
  } as unknown as Stripe.Event;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("handlePaymentIntentPaymentFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { status: 'done' } always", async () => {
    const result = await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("skips email when no customerId on payment intent", async () => {
    await handlePaymentIntentPaymentFailed(makeEvent({ customerId: null }), makeCtx());
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("sends failure email to customer email", async () => {
    await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx());
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      "user@example.com",
      "Payment failed — action needed",
      expect.stringContaining("Update payment method"),
    );
  });

  it("includes course name in email when coursePurchase found", async () => {
    await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx(COURSE_PURCHASE));
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      "user@example.com",
      "Payment failed — action needed",
      expect.stringContaining("investing-101"),
    );
  });

  it("skips email when customer is deleted", async () => {
    const ctx = makeCtx();
    (ctx.stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "cus_1",
      deleted: true,
    });
    await handlePaymentIntentPaymentFailed(makeEvent(), ctx);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("logs error and continues when stripe.customers.retrieve throws", async () => {
    const ctx = makeCtx();
    (ctx.stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("stripe timeout"),
    );
    const result = await handlePaymentIntentPaymentFailed(makeEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalledWith(
      "payment_intent.payment_failed — customer lookup failed",
      expect.objectContaining({ error: "stripe timeout" }),
    );
  });

  it("always writes to admin_audit_log", async () => {
    const ctx = makeCtx(COURSE_PURCHASE);
    await handlePaymentIntentPaymentFailed(makeEvent(), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("admin_audit_log");
  });
});
