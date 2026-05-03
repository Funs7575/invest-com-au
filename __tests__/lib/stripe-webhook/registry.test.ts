import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import type { WebhookContext, WebhookHandlerResult } from "@/lib/stripe-webhook/types";

import {
  registerHandler,
  dispatchEvent,
  _resetRegistry,
  _registeredEventTypes,
} from "@/lib/stripe-webhook/registry";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(type: string): Stripe.Event {
  return {
    id: `evt_${type.replace(/\./g, "_")}`,
    type,
    data: { object: {} },
  } as unknown as Stripe.Event;
}

function makeCtx(): WebhookContext {
  return {
    admin: {} as unknown as WebhookContext["admin"],
    stripe: {} as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("stripe-webhook registry", () => {
  beforeEach(() => {
    _resetRegistry();
  });

  it("returns handled:false for an unregistered event type", async () => {
    const result = await dispatchEvent(makeEvent("unrecognised.event"), makeCtx());
    expect(result).toEqual({ handled: false });
  });

  it("dispatches to a registered handler and returns its result", async () => {
    const handler = vi.fn<[Stripe.Event, WebhookContext], Promise<WebhookHandlerResult>>(
      async () => ({ status: "done" }),
    );
    registerHandler("invoice.paid", handler);

    const evt = makeEvent("invoice.paid");
    const ctx = makeCtx();
    const result = await dispatchEvent(evt, ctx);

    expect(result).toEqual({ handled: true, result: { status: "done" } });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(evt, ctx);
  });

  it("wraps a handler that throws into { handled:true, result:{status:'error'} }", async () => {
    const boom = new Error("boom");
    registerHandler("payout.failed", async () => {
      throw boom;
    });

    const result = await dispatchEvent(makeEvent("payout.failed"), makeCtx());
    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.result.status).toBe("error");
      if (result.result.status === "error") {
        expect(result.result.error).toBe(boom);
      }
    }
  });

  it("wraps a non-Error throw into an Error instance", async () => {
    registerHandler("charge.refunded", async () => {
      throw "string error"; // eslint-disable-line no-throw-literal
    });

    const result = await dispatchEvent(makeEvent("charge.refunded"), makeCtx());
    expect(result.handled).toBe(true);
    if (result.handled && result.result.status === "error") {
      expect(result.result.error).toBeInstanceOf(Error);
      expect(result.result.error.message).toBe("string error");
    }
  });

  it("re-registering an event type replaces the prior handler (idempotent register)", async () => {
    const first = vi.fn<[Stripe.Event, WebhookContext], Promise<WebhookHandlerResult>>(
      async () => ({ status: "partial", reason: "first" }),
    );
    const second = vi.fn<[Stripe.Event, WebhookContext], Promise<WebhookHandlerResult>>(
      async () => ({ status: "done" }),
    );
    registerHandler("radar.early_fraud_warning.created", first);
    registerHandler("radar.early_fraud_warning.created", second);

    await dispatchEvent(makeEvent("radar.early_fraud_warning.created"), makeCtx());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("_resetRegistry clears all registered handlers", async () => {
    registerHandler("invoice.paid", async () => ({ status: "done" }));
    _resetRegistry();
    const result = await dispatchEvent(makeEvent("invoice.paid"), makeCtx());
    expect(result).toEqual({ handled: false });
  });

  it("_registeredEventTypes returns sorted list of registered types", () => {
    registerHandler("payout.failed", async () => ({ status: "done" }));
    registerHandler("charge.refunded", async () => ({ status: "done" }));
    registerHandler("invoice.paid", async () => ({ status: "done" }));
    expect(_registeredEventTypes()).toEqual([
      "charge.refunded",
      "invoice.paid",
      "payout.failed",
    ]);
  });

  it("returns handled:partial from a handler that returns partial status", async () => {
    registerHandler("charge.dispute.created", async () => ({
      status: "partial",
      reason: "email skipped",
    }));

    const result = await dispatchEvent(makeEvent("charge.dispute.created"), makeCtx());
    expect(result).toEqual({
      handled: true,
      result: { status: "partial", reason: "email skipped" },
    });
  });
});
