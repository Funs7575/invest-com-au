import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { handleCustomerSubscriptionPaused } from "@/lib/stripe-webhook/handlers/customer-subscription-paused";

// ── Helpers ────────────────────────────────────────────────────────────────────

type Professional = { id: string; name: string; email: string; status: string };

function writeBuilder() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn((cb: (v: unknown) => void) => {
      cb({ data: null, error: null });
      return Promise.resolve();
    }),
  };
}

function makeCtx(professional: Professional | null = null): WebhookContext {
  let profCallCount = 0;

  const adminFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "subscriptions") {
      return writeBuilder();
    }
    if (table === "professionals") {
      profCallCount++;
      if (profCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: professional }),
        };
      }
      return writeBuilder();
    }
    return {};
  });

  return {
    admin: { from: adminFrom } as unknown as WebhookContext["admin"],
    stripe: {} as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(overrides: {
  subscriptionId?: string;
  customerId?: string | object;
} = {}): Stripe.Event {
  const { subscriptionId = "sub_pause1", customerId = "cus_1" } = overrides;
  return {
    id: "evt_sub_paused",
    type: "customer.subscription.paused",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status: "paused",
      } as unknown as Stripe.Subscription,
    },
  } as unknown as Stripe.Event;
}

const ACTIVE_PROFESSIONAL: Professional = {
  id: "prof_1",
  name: "Carol",
  email: "carol@example.com",
  status: "active",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("handleCustomerSubscriptionPaused", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { status: 'done' } always", async () => {
    const result = await handleCustomerSubscriptionPaused(makeEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("updates subscriptions table to paused", async () => {
    const ctx = makeCtx();
    await handleCustomerSubscriptionPaused(makeEvent(), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("subscriptions");
  });

  it("resolves customer ID from object form", async () => {
    const ctx = makeCtx(ACTIVE_PROFESSIONAL);
    await handleCustomerSubscriptionPaused(makeEvent({ customerId: { id: "cus_obj1" } }), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Professional paused due to subscription pause",
      expect.objectContaining({ stripeCustomerId: "cus_obj1" }),
    );
  });

  it("pauses professional when they are active", async () => {
    const ctx = makeCtx(ACTIVE_PROFESSIONAL);
    await handleCustomerSubscriptionPaused(makeEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Professional paused due to subscription pause",
      expect.objectContaining({ professionalId: "prof_1" }),
    );
    // professionals table update should have been called (second call)
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("professionals");
  });

  it("does not pause professional when they are already paused", async () => {
    const ctx = makeCtx({ ...ACTIVE_PROFESSIONAL, status: "paused" });
    await handleCustomerSubscriptionPaused(makeEvent(), ctx);
    // Should not log "Professional paused due to subscription pause"
    expect(ctx.log.info).not.toHaveBeenCalledWith(
      "Professional paused due to subscription pause",
      expect.anything(),
    );
  });

  it("handles no professional found gracefully", async () => {
    const ctx = makeCtx(null); // no professional
    const result = await handleCustomerSubscriptionPaused(makeEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Subscription pause event processed",
      expect.objectContaining({ professionalFound: false }),
    );
  });

  it("logs processed info with professionalFound=true", async () => {
    const ctx = makeCtx(ACTIVE_PROFESSIONAL);
    await handleCustomerSubscriptionPaused(makeEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Subscription pause event processed",
      expect.objectContaining({ professionalFound: true, subscriptionId: "sub_pause1" }),
    );
  });
});
