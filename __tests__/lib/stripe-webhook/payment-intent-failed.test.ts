import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockSendTransactionalEmail = vi.fn();
const mockEmailWrapper = vi.fn().mockReturnValue("<html>wrapped</html>");
vi.mock("@/lib/stripe-webhook/lib/email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSendTransactionalEmail(...args),
  emailWrapper: (...args: unknown[]) => mockEmailWrapper(...args),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { handlePaymentIntentPaymentFailed } from "@/lib/stripe-webhook/handlers/payment-intent-failed";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CUSTOMER: Stripe.Customer = {
  id: "cus_fail",
  email: "buyer@test.com",
  object: "customer",
} as unknown as Stripe.Customer;

function makeCtx(overrides: {
  customersRetrieve?: ReturnType<typeof vi.fn>;
} = {}): WebhookContext {
  const customersRetrieve =
    overrides.customersRetrieve ?? vi.fn().mockResolvedValue(CUSTOMER);
  return {
    admin: {} as unknown as WebhookContext["admin"],
    stripe: { customers: { retrieve: customersRetrieve } } as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(piOverride: Partial<Stripe.PaymentIntent> = {}): Stripe.Event {
  return {
    id: "evt_pi_fail",
    type: "payment_intent.payment_failed",
    data: {
      object: {
        id: "pi_fail_1",
        amount: 4900,
        currency: "aud",
        customer: "cus_fail",
        receipt_email: null,
        metadata: { type: "course", course_slug: "investing-101" },
        last_payment_error: { message: "Your card was declined." },
        ...piOverride,
      } as Stripe.PaymentIntent,
    },
  } as Stripe.Event;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handlePaymentIntentPaymentFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendTransactionalEmail.mockResolvedValue(undefined);
  });

  it("returns {status: done}", async () => {
    const result = await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("sends email to customer email when customer is attached", async () => {
    await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx());
    const [to] = mockSendTransactionalEmail.mock.calls[0] as [string];
    expect(to).toBe("buyer@test.com");
  });

  it("uses receipt_email when no customer is attached", async () => {
    const ctx = makeCtx({ customersRetrieve: vi.fn() });
    const event = makeEvent({ customer: null, receipt_email: "guest@test.com" });
    await handlePaymentIntentPaymentFailed(event, ctx);
    const [to] = mockSendTransactionalEmail.mock.calls[0] as [string];
    expect(to).toBe("guest@test.com");
    expect(ctx.stripe.customers.retrieve).not.toHaveBeenCalled();
  });

  it("skips email when no customer and no receipt_email", async () => {
    const ctx = makeCtx({ customersRetrieve: vi.fn() });
    const event = makeEvent({ customer: null, receipt_email: null });
    await handlePaymentIntentPaymentFailed(event, ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("includes decline reason in email body", async () => {
    await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx());
    const [, , body] = mockEmailWrapper.mock.calls[0] as [string, string, string];
    expect(body).toContain("Your card was declined.");
  });

  it("routes course metadata to /courses/<slug>", async () => {
    await handlePaymentIntentPaymentFailed(makeEvent(), makeCtx());
    const [, , body] = mockEmailWrapper.mock.calls[0] as [string, string, string];
    expect(body).toContain("https://invest.com.au/courses/investing-101");
  });

  it("routes consultation metadata to /consultations/<slug>", async () => {
    const event = makeEvent({
      metadata: { type: "consultation", consultation_slug: "tax-advice" },
    });
    await handlePaymentIntentPaymentFailed(event, makeCtx());
    const [, , body] = mockEmailWrapper.mock.calls[0] as [string, string, string];
    expect(body).toContain("https://invest.com.au/consultations/tax-advice");
  });

  it("falls back to /account for unknown metadata type", async () => {
    const event = makeEvent({ metadata: { type: "advisor_credit_topup" } });
    await handlePaymentIntentPaymentFailed(event, makeCtx());
    const [, , body] = mockEmailWrapper.mock.calls[0] as [string, string, string];
    expect(body).toContain("https://invest.com.au/account");
  });

  it("logs warn with paymentIntentId and declineReason", async () => {
    const ctx = makeCtx();
    await handlePaymentIntentPaymentFailed(makeEvent(), ctx);
    expect(ctx.log.warn).toHaveBeenCalledWith(
      "PaymentIntent payment failed",
      expect.objectContaining({
        paymentIntentId: "pi_fail_1",
        declineReason: "Your card was declined.",
      }),
    );
  });

  it("does not throw when customer lookup fails", async () => {
    const ctx = makeCtx({
      customersRetrieve: vi.fn().mockRejectedValue(new Error("network timeout")),
    });
    const event = makeEvent({ receipt_email: null });
    await expect(handlePaymentIntentPaymentFailed(event, ctx)).resolves.toEqual({
      status: "done",
    });
    expect(ctx.log.error).toHaveBeenCalledWith(
      "PaymentIntent failed: customer lookup error",
      expect.objectContaining({ error: "network timeout" }),
    );
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("handles object-form customer reference", async () => {
    const event = makeEvent({ customer: { id: "cus_fail" } as Stripe.Customer });
    const ctx = makeCtx();
    await handlePaymentIntentPaymentFailed(event, ctx);
    expect((ctx.stripe.customers.retrieve as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("cus_fail");
  });

  it("uses 'an unknown reason' when last_payment_error is absent", async () => {
    const event = makeEvent({ last_payment_error: null });
    await handlePaymentIntentPaymentFailed(event, makeCtx());
    const [, , body] = mockEmailWrapper.mock.calls[0] as [string, string, string];
    expect(body).toContain("an unknown reason");
  });
});
