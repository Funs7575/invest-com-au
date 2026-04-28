import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockHandleInvoicePaid = vi.fn();
const mockHandleInvoicePaymentFailed = vi.fn();
vi.mock("@/lib/advisor-billing", () => ({
  handleInvoicePaid: (...args: unknown[]) => mockHandleInvoicePaid(...args),
  handleInvoicePaymentFailed: (...args: unknown[]) => mockHandleInvoicePaymentFailed(...args),
}));

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

import {
  handleInvoicePaidEvent,
  handleInvoicePaymentFailedEvent,
} from "@/lib/stripe-webhook/handlers/invoice";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CUSTOMER: Stripe.Customer = {
  id: "cus_test",
  email: "user@test.com",
  object: "customer",
} as unknown as Stripe.Customer;

function makeCtx(overrides: {
  customersRetrieve?: ReturnType<typeof vi.fn>;
  profileData?: unknown;
  updateError?: unknown;
} = {}): WebhookContext {
  const customersRetrieve =
    overrides.customersRetrieve ?? vi.fn().mockResolvedValue(CUSTOMER);

  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: overrides.profileData !== undefined ? overrides.profileData : { id: "profile_1" },
  });
  const profileSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle }) });

  const updateEq = vi.fn().mockResolvedValue({ error: overrides.updateError ?? null });
  const subUpdate = vi.fn().mockReturnValue({ eq: updateEq });

  const adminFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") return { select: profileSelect };
    if (table === "subscriptions") return { update: subUpdate };
    return {};
  });

  return {
    admin: { from: adminFrom } as unknown as WebhookContext["admin"],
    stripe: { customers: { retrieve: customersRetrieve } } as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeInvoicePaidEvent(invoiceOverride: Partial<Stripe.Invoice> = {}): Stripe.Event {
  return {
    id: "evt_inv_paid",
    type: "invoice.paid",
    data: {
      object: {
        id: "in_test",
        customer: "cus_test",
        payment_intent: "pi_test",
        amount_due: 2900,
        metadata: {},
        ...invoiceOverride,
      } as Stripe.Invoice,
    },
  } as unknown as Stripe.Event;
}

function makeInvoiceFailedEvent(invoiceOverride: Partial<Stripe.Invoice> = {}): Stripe.Event {
  return {
    id: "evt_inv_failed",
    type: "invoice.payment_failed",
    data: {
      object: {
        id: "in_fail",
        customer: "cus_test",
        payment_intent: "pi_fail",
        amount_due: 2900,
        metadata: {},
        ...invoiceOverride,
      } as Stripe.Invoice,
    },
  } as unknown as Stripe.Event;
}

// ── handleInvoicePaidEvent ────────────────────────────────────────────────────

describe("handleInvoicePaidEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleInvoicePaid.mockResolvedValue(undefined);
  });

  it("returns { status: 'done' }", async () => {
    const result = await handleInvoicePaidEvent(makeInvoicePaidEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("calls handleInvoicePaid when metadata.type is advisor_lead", async () => {
    const ctx = makeCtx();
    await handleInvoicePaidEvent(
      makeInvoicePaidEvent({ metadata: { type: "advisor_lead" }, id: "in_advisor" }),
      ctx,
    );
    expect(mockHandleInvoicePaid).toHaveBeenCalledWith("in_advisor", "pi_test");
  });

  it("does NOT call handleInvoicePaid for non-advisor_lead invoices", async () => {
    await handleInvoicePaidEvent(makeInvoicePaidEvent({ metadata: {} }), makeCtx());
    expect(mockHandleInvoicePaid).not.toHaveBeenCalled();
  });

  it("resolves payment_intent id from object form", async () => {
    const ctx = makeCtx();
    await handleInvoicePaidEvent(
      makeInvoicePaidEvent({
        metadata: { type: "advisor_lead" },
        id: "in_obj",
        payment_intent: { id: "pi_nested" } as unknown as string,
      }),
      ctx,
    );
    expect(mockHandleInvoicePaid).toHaveBeenCalledWith("in_obj", "pi_nested");
  });

  it("logs invoice paid", async () => {
    const ctx = makeCtx();
    await handleInvoicePaidEvent(makeInvoicePaidEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Invoice paid",
      expect.objectContaining({ invoiceId: "in_test" }),
    );
  });
});

// ── handleInvoicePaymentFailedEvent ──────────────────────────────────────────

describe("handleInvoicePaymentFailedEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleInvoicePaymentFailed.mockResolvedValue(undefined);
    mockSendTransactionalEmail.mockResolvedValue({ id: "email_1" });
  });

  it("returns { status: 'done' }", async () => {
    const result = await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("calls handleInvoicePaymentFailed when metadata.type is advisor_lead", async () => {
    await handleInvoicePaymentFailedEvent(
      makeInvoiceFailedEvent({ metadata: { type: "advisor_lead" } }),
      makeCtx(),
    );
    expect(mockHandleInvoicePaymentFailed).toHaveBeenCalledWith("in_fail");
  });

  it("does NOT call handleInvoicePaymentFailed for non-advisor_lead", async () => {
    await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), makeCtx());
    expect(mockHandleInvoicePaymentFailed).not.toHaveBeenCalled();
  });

  it("sends dunning email to customer when profile exists", async () => {
    const ctx = makeCtx();
    await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), ctx);
    expect(ctx.stripe.customers.retrieve).toHaveBeenCalledWith("cus_test");
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      CUSTOMER.email,
      expect.stringContaining("payment failed"),
      expect.any(String),
    );
  });

  it("touches subscriptions.updated_at when profile exists", async () => {
    const ctx = makeCtx();
    await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), ctx);
    const adminFrom = ctx.admin.from as ReturnType<typeof vi.fn>;
    expect(adminFrom).toHaveBeenCalledWith("subscriptions");
  });

  it("does NOT send dunning email when no profile found", async () => {
    const ctx = makeCtx({ profileData: null });
    await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("does NOT send dunning email when customer is deleted", async () => {
    const deletedCustomer = { id: "cus_test", deleted: true } as unknown as Stripe.DeletedCustomer;
    const ctx = makeCtx({ customersRetrieve: vi.fn().mockResolvedValue(deletedCustomer) });
    await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("does NOT send dunning email for advisor_lead invoices", async () => {
    await handleInvoicePaymentFailedEvent(
      makeInvoiceFailedEvent({ metadata: { type: "advisor_lead" } }),
      makeCtx(),
    );
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("swallows customer retrieve errors non-fatally", async () => {
    const ctx = makeCtx({
      customersRetrieve: vi.fn().mockRejectedValue(new Error("Stripe error")),
    });
    const result = await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalled();
  });

  it("includes dollar amount in dunning email subject", async () => {
    const ctx = makeCtx();
    await handleInvoicePaymentFailedEvent(
      makeInvoiceFailedEvent({ amount_due: 4900 }),
      ctx,
    );
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("payment failed"),
      expect.any(String),
    );
    expect(mockEmailWrapper).toHaveBeenCalledWith(
      "Payment Failed ⚠️",
      expect.any(String),
      expect.stringContaining("49.00"),
    );
  });

  it("always logs warn for payment failure", async () => {
    const ctx = makeCtx();
    await handleInvoicePaymentFailedEvent(makeInvoiceFailedEvent(), ctx);
    expect(ctx.log.warn).toHaveBeenCalledWith(
      "Payment failed for customer",
      expect.objectContaining({ invoice: "in_fail" }),
    );
  });
});
