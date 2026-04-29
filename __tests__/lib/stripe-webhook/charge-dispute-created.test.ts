import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { handleChargeDisputeCreated } from "@/lib/stripe-webhook/handlers/charge-dispute-created";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(adminOverride?: { from: ReturnType<typeof vi.fn> }): WebhookContext {
  const adminFrom = adminOverride?.from ?? vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
  });
  return {
    admin: { from: adminFrom } as unknown as WebhookContext["admin"],
    stripe: {} as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(disputeOverride: Partial<Stripe.Dispute> = {}): Stripe.Event {
  return {
    id: "evt_dispute_1",
    type: "charge.dispute.created",
    data: {
      object: {
        id: "dp_1",
        charge: "ch_abc",
        amount: 2500,
        reason: "fraudulent",
        status: "needs_response",
        ...disputeOverride,
      } as Stripe.Dispute,
    },
  } as unknown as Stripe.Event;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("handleChargeDisputeCreated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("returns { status: 'done' }", async () => {
    const ctx = makeCtx();
    const result = await handleChargeDisputeCreated(makeEvent(), ctx);
    expect(result).toEqual({ status: "done" });
  });

  it("inserts an admin_audit_log row", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const adminFrom = vi.fn().mockReturnValue({ insert: insertMock });
    const ctx = makeCtx({ from: adminFrom });
    await handleChargeDisputeCreated(makeEvent(), ctx);
    expect(adminFrom).toHaveBeenCalledWith("admin_audit_log");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "stripe_dispute",
        entity_type: "dispute",
        entity_id: "dp_1",
      }),
    );
  });

  it("fires dispute alert email when RESEND_API_KEY is set", async () => {
    const ctx = makeCtx();
    await handleChargeDisputeCreated(makeEvent(), ctx);
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("resend.com");
    const body = JSON.parse(opts.body as string) as { subject: string };
    expect(body.subject).toContain("25.00");
    expect(body.subject).toContain("Dispute");
  });

  it("does not fire email when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const ctx = makeCtx();
    await handleChargeDisputeCreated(makeEvent(), ctx);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("swallows fetch errors non-fatally", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const ctx = makeCtx();
    const result = await handleChargeDisputeCreated(makeEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalled();
  });

  it("extracts chargeId from string charge field", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const adminFrom = vi.fn().mockReturnValue({ insert: insertMock });
    const ctx = makeCtx({ from: adminFrom });
    await handleChargeDisputeCreated(makeEvent({ charge: "ch_direct" }), ctx);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity_name: "ch_direct" }),
    );
  });

  it("extracts chargeId from object charge field", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const adminFrom = vi.fn().mockReturnValue({ insert: insertMock });
    const ctx = makeCtx({ from: adminFrom });
    await handleChargeDisputeCreated(
      makeEvent({ charge: { id: "ch_nested" } as unknown as string }),
      ctx,
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ entity_name: "ch_nested" }),
    );
  });

  it("includes dispute details in audit log", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const adminFrom = vi.fn().mockReturnValue({ insert: insertMock });
    const ctx = makeCtx({ from: adminFrom });
    await handleChargeDisputeCreated(makeEvent({ amount: 5000, reason: "product_not_received" }), ctx);
    const details = (insertMock.mock.calls[0]![0] as { details: Record<string, unknown> }).details;
    expect(details.amount_cents).toBe(5000);
    expect(details.reason).toBe("product_not_received");
  });
});
