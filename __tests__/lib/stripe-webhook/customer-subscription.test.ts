import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

const mockUpsertSubscription = vi.fn();
vi.mock("@/lib/stripe-webhook/lib/upsert-subscription", () => ({
  upsertSubscription: (...args: unknown[]) => mockUpsertSubscription(...args),
}));

const mockSendTransactionalEmail = vi.fn();
const mockBuildProWelcomeEmail = vi.fn().mockReturnValue("<html>welcome</html>");
const mockBuildTrialEndingSoonEmail = vi.fn().mockReturnValue("<html>trial-end</html>");
vi.mock("@/lib/stripe-webhook/lib/email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSendTransactionalEmail(...args),
  buildProWelcomeEmail: (...args: unknown[]) => mockBuildProWelcomeEmail(...args),
  buildTrialEndingSoonEmail: (...args: unknown[]) => mockBuildTrialEndingSoonEmail(...args),
  emailWrapper: vi.fn().mockReturnValue("<html />"),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import {
  handleCustomerSubscriptionCreated,
  handleCustomerSubscriptionUpdated,
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionTrialWillEnd,
} from "@/lib/stripe-webhook/handlers/customer-subscription";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CUSTOMER: Stripe.Customer = {
  id: "cus_test",
  email: "user@test.com",
  object: "customer",
} as unknown as Stripe.Customer;

const SUBSCRIPTION: Stripe.Subscription = {
  id: "sub_test",
  customer: "cus_test",
  status: "active",
  items: {
    data: [{ price: { recurring: { interval: "month" } } }],
  },
} as unknown as Stripe.Subscription;

function makeCtx(
  customersRetrieve: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(CUSTOMER),
): WebhookContext {
  return {
    admin: {} as unknown as WebhookContext["admin"],
    stripe: {
      customers: { retrieve: customersRetrieve },
    } as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeCreatedEvent(subOverride: Partial<Stripe.Subscription> = {}): Stripe.Event {
  return {
    id: "evt_sub_created",
    type: "customer.subscription.created",
    data: { object: { ...SUBSCRIPTION, ...subOverride } as Stripe.Subscription },
  } as unknown as Stripe.Event;
}

function makeUpdatedEvent(): Stripe.Event {
  return {
    id: "evt_sub_updated",
    type: "customer.subscription.updated",
    data: { object: SUBSCRIPTION },
  } as unknown as Stripe.Event;
}

function makeDeletedEvent(): Stripe.Event {
  return {
    id: "evt_sub_deleted",
    type: "customer.subscription.deleted",
    data: { object: SUBSCRIPTION },
  } as unknown as Stripe.Event;
}

function makeTrialWillEndEvent(subOverride: Partial<Stripe.Subscription> = {}): Stripe.Event {
  return {
    id: "evt_sub_trial_end",
    type: "customer.subscription.trial_will_end",
    data: {
      object: {
        ...SUBSCRIPTION,
        trial_end: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60, // 3 days from now
        ...subOverride,
      } as Stripe.Subscription,
    },
  } as unknown as Stripe.Event;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleCustomerSubscriptionCreated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertSubscription.mockResolvedValue(undefined);
    mockSendTransactionalEmail.mockResolvedValue({ id: "email-1" });
  });

  it("calls upsertSubscription with the subscription", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionCreated(makeCreatedEvent(), ctx);
    expect(mockUpsertSubscription).toHaveBeenCalledWith(SUBSCRIPTION, ctx.admin, ctx.log);
  });

  it("returns { status: 'done' }", async () => {
    const ctx = makeCtx();
    const result = await handleCustomerSubscriptionCreated(makeCreatedEvent(), ctx);
    expect(result).toEqual({ status: "done" });
  });

  it("sends Pro welcome email when status is 'active'", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionCreated(makeCreatedEvent({ status: "active" }), ctx);
    expect(ctx.stripe.customers.retrieve).toHaveBeenCalledWith("cus_test");
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      CUSTOMER.email,
      expect.stringContaining("Welcome"),
      expect.any(String),
    );
  });

  it("sends Pro welcome email when status is 'trialing'", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionCreated(makeCreatedEvent({ status: "trialing" }), ctx);
    expect(mockSendTransactionalEmail).toHaveBeenCalled();
  });

  it("does NOT send welcome email for 'past_due' status", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionCreated(makeCreatedEvent({ status: "past_due" }), ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("does NOT send welcome email for deleted customer", async () => {
    const deletedCustomer = { id: "cus_test", deleted: true } as unknown as Stripe.DeletedCustomer;
    const ctx = makeCtx(vi.fn().mockResolvedValue(deletedCustomer));
    await handleCustomerSubscriptionCreated(makeCreatedEvent(), ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("swallows customer retrieve error non-fatally", async () => {
    const ctx = makeCtx(vi.fn().mockRejectedValue(new Error("Stripe error")));
    const result = await handleCustomerSubscriptionCreated(makeCreatedEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalled();
  });

  it("sends admin notification email on new Pro signup", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionCreated(makeCreatedEvent(), ctx);
    const calls = mockSendTransactionalEmail.mock.calls;
    const adminCall = calls.find((args) => args[0] === "admin@invest.com.au");
    expect(adminCall).toBeDefined();
    expect(adminCall![1]).toContain(CUSTOMER.email!);
  });

  it("does NOT send welcome email when customer has no email (non-deleted)", async () => {
    const noEmailCustomer = { id: "cus_test", object: "customer" } as unknown as Stripe.Customer;
    const ctx = makeCtx(vi.fn().mockResolvedValue(noEmailCustomer));
    await handleCustomerSubscriptionCreated(makeCreatedEvent(), ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("resolves customer ID from object form when customer is not a string", async () => {
    const ctx = makeCtx();
    const subWithObjCustomer: Partial<Stripe.Subscription> = {
      customer: { id: "cus_obj_form", object: "customer" } as unknown as Stripe.Customer,
    };
    await handleCustomerSubscriptionCreated(makeCreatedEvent(subWithObjCustomer), ctx);
    expect(ctx.stripe.customers.retrieve).toHaveBeenCalledWith("cus_obj_form");
  });
});

describe("handleCustomerSubscriptionUpdated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertSubscription.mockResolvedValue(undefined);
  });

  it("calls upsertSubscription with the subscription", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionUpdated(makeUpdatedEvent(), ctx);
    expect(mockUpsertSubscription).toHaveBeenCalledWith(SUBSCRIPTION, ctx.admin, ctx.log);
  });

  it("returns { status: 'done' }", async () => {
    const ctx = makeCtx();
    const result = await handleCustomerSubscriptionUpdated(makeUpdatedEvent(), ctx);
    expect(result).toEqual({ status: "done" });
  });
});

describe("handleCustomerSubscriptionDeleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertSubscription.mockResolvedValue(undefined);
  });

  it("calls upsertSubscription with the subscription", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionDeleted(makeDeletedEvent(), ctx);
    expect(mockUpsertSubscription).toHaveBeenCalledWith(SUBSCRIPTION, ctx.admin, ctx.log);
  });

  it("returns { status: 'done' }", async () => {
    const ctx = makeCtx();
    const result = await handleCustomerSubscriptionDeleted(makeDeletedEvent(), ctx);
    expect(result).toEqual({ status: "done" });
  });

  it("flips advisor_tier when subscription metadata carries pending_tier + advisor_id", async () => {
    const eqSpy = vi.fn();
    const updateSpy = vi.fn().mockReturnValue({ eq: eqSpy });
    const fromSpy = vi.fn().mockReturnValue({ update: updateSpy });
    const ctx = {
      admin: { from: fromSpy } as unknown as WebhookContext["admin"],
      stripe: {} as WebhookContext["stripe"],
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    };
    const event = {
      id: "evt_sub_deleted_pending",
      type: "customer.subscription.deleted",
      data: {
        object: {
          ...SUBSCRIPTION,
          metadata: { pending_tier: "growth", advisor_id: "42" },
        } as Stripe.Subscription,
      },
    } as unknown as Stripe.Event;

    await handleCustomerSubscriptionDeleted(event, ctx);
    expect(fromSpy).toHaveBeenCalledWith("professionals");
    const updatePayload = updateSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updatePayload.advisor_tier).toBe("growth");
    expect(updatePayload.pending_tier).toBeNull();
    expect(eqSpy).toHaveBeenCalledWith("id", 42);
  });

  it("skips the deferred-downgrade flip when metadata.pending_tier is absent", async () => {
    const fromSpy = vi.fn();
    const ctx = {
      admin: { from: fromSpy } as unknown as WebhookContext["admin"],
      stripe: {} as WebhookContext["stripe"],
      log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    };
    await handleCustomerSubscriptionDeleted(makeDeletedEvent(), ctx);
    // SUBSCRIPTION has no pending_tier metadata — fromSpy never invoked.
    expect(fromSpy).not.toHaveBeenCalled();
  });
});

describe("handleCustomerSubscriptionTrialWillEnd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendTransactionalEmail.mockResolvedValue({ id: "email_1" });
  });

  it("returns { status: 'done' }", async () => {
    const ctx = makeCtx();
    const result = await handleCustomerSubscriptionTrialWillEnd(makeTrialWillEndEvent(), ctx);
    expect(result).toEqual({ status: "done" });
  });

  it("sends trial ending email to active customer", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionTrialWillEnd(makeTrialWillEndEvent(), ctx);
    expect(ctx.stripe.customers.retrieve).toHaveBeenCalledWith("cus_test");
    expect(mockSendTransactionalEmail).toHaveBeenCalledWith(
      CUSTOMER.email,
      expect.stringContaining("trial ends"),
      expect.any(String),
    );
  });

  it("calls buildTrialEndingSoonEmail with interval and formatted date", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionTrialWillEnd(makeTrialWillEndEvent(), ctx);
    expect(mockBuildTrialEndingSoonEmail).toHaveBeenCalledWith(
      "month",
      expect.any(String),
    );
  });

  it("does NOT send email for deleted customer", async () => {
    const deletedCustomer = { id: "cus_test", deleted: true } as unknown as Stripe.DeletedCustomer;
    const ctx = makeCtx(vi.fn().mockResolvedValue(deletedCustomer));
    await handleCustomerSubscriptionTrialWillEnd(makeTrialWillEndEvent(), ctx);
    expect(mockSendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("uses 'soon' as trial end date when trial_end is null", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionTrialWillEnd(
      makeTrialWillEndEvent({ trial_end: null }),
      ctx,
    );
    expect(mockBuildTrialEndingSoonEmail).toHaveBeenCalledWith(
      expect.any(String),
      "soon",
    );
  });

  it("swallows customer retrieve errors non-fatally", async () => {
    const ctx = makeCtx(vi.fn().mockRejectedValue(new Error("Stripe error")));
    const result = await handleCustomerSubscriptionTrialWillEnd(makeTrialWillEndEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalled();
  });

  it("logs info about the upcoming trial end", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionTrialWillEnd(makeTrialWillEndEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Subscription trial ending soon",
      expect.objectContaining({ subscriptionId: "sub_test" }),
    );
  });
});
