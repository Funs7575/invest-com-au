import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));

vi.mock("@/lib/stripe-webhook/lib/email", () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
}));

import { handleRadarEarlyFraudWarning } from "@/lib/stripe-webhook/handlers/radar-early-fraud-warning";
import { sendTransactionalEmail } from "@/lib/stripe-webhook/lib/email";

// ── Helpers ────────────────────────────────────────────────────────────────────

const mockRefundsCreate = vi.fn();

function makeCtx(): WebhookContext {
  const adminFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }
    return {};
  });

  return {
    admin: { from: adminFrom } as unknown as WebhookContext["admin"],
    stripe: {
      refunds: { create: mockRefundsCreate },
    } as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeEvent(overrides: {
  chargeId?: string | object;
  fraudType?: string;
  warningId?: string;
} = {}): Stripe.Event {
  const {
    chargeId = "ch_fraud1",
    fraudType = "card_never_received",
    warningId = "issfr_test",
  } = overrides;
  return {
    id: "evt_radar",
    type: "radar.early_fraud_warning.created",
    data: {
      object: {
        id: warningId,
        object: "radar.early_fraud_warning",
        charge: chargeId,
        fraud_type: fraudType,
      },
    },
  } as unknown as Stripe.Event;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("handleRadarEarlyFraudWarning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendTransactionalEmail).mockResolvedValue(undefined);
    mockRefundsCreate.mockResolvedValue({ id: "re_1", status: "succeeded" });
  });

  it("returns { status: 'done' } always", async () => {
    const result = await handleRadarEarlyFraudWarning(makeEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("logs a warn with chargeId and fraudType", async () => {
    const ctx = makeCtx();
    await handleRadarEarlyFraudWarning(makeEvent(), ctx);
    expect(ctx.log.warn).toHaveBeenCalledWith(
      "Radar early fraud warning — attempting proactive refund",
      expect.objectContaining({ chargeId: "ch_fraud1", fraudType: "card_never_received" }),
    );
  });

  it("calls stripe.refunds.create with the chargeId", async () => {
    await handleRadarEarlyFraudWarning(makeEvent(), makeCtx());
    expect(mockRefundsCreate).toHaveBeenCalledWith({ charge: "ch_fraud1" });
  });

  it("resolves chargeId from object form", async () => {
    await handleRadarEarlyFraudWarning(makeEvent({ chargeId: { id: "ch_obj1" } }), makeCtx());
    expect(mockRefundsCreate).toHaveBeenCalledWith({ charge: "ch_obj1" });
  });

  it("logs info when refund succeeds", async () => {
    const ctx = makeCtx();
    await handleRadarEarlyFraudWarning(makeEvent(), ctx);
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Proactive refund issued to prevent dispute",
      expect.objectContaining({ refundId: "re_1" }),
    );
  });

  it("logs error and continues when refund throws", async () => {
    mockRefundsCreate.mockRejectedValueOnce(new Error("stripe error"));
    const ctx = makeCtx();
    const result = await handleRadarEarlyFraudWarning(makeEvent(), ctx);
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.error).toHaveBeenCalledWith(
      "Proactive refund failed — manual action required",
      expect.objectContaining({ error: "stripe error" }),
    );
  });

  it("sends alert email to admin with refund success status", async () => {
    await handleRadarEarlyFraudWarning(makeEvent(), makeCtx());
    const [to, subject, body] = vi.mocked(sendTransactionalEmail).mock.calls[0]!;
    expect(to).toBe("admin@invest.com.au");
    expect(subject).toContain("ch_fraud1");
    expect(body).toContain("re_1");
  });

  it("email subject indicates REFUND FAILED when refund throws", async () => {
    mockRefundsCreate.mockRejectedValueOnce(new Error("network error"));
    await handleRadarEarlyFraudWarning(makeEvent(), makeCtx());
    const [, subject] = vi.mocked(sendTransactionalEmail).mock.calls[0]!;
    expect(subject).toContain("REFUND FAILED");
  });

  it("always writes to admin_audit_log", async () => {
    const ctx = makeCtx();
    await handleRadarEarlyFraudWarning(makeEvent(), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("admin_audit_log");
  });
});
