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

import { handlePayoutFailed } from "@/lib/stripe-webhook/handlers/payout-failed";
import { sendTransactionalEmail } from "@/lib/stripe-webhook/lib/email";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCtx(): WebhookContext {
  const adminFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
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
  payoutId?: string;
  amount?: number;
  failureCode?: string | null;
  failureMessage?: string | null;
} = {}): Stripe.Event {
  const {
    payoutId = "po_fail1",
    amount = 50000,
    failureCode = "could_not_process",
    failureMessage = "Bank account cannot receive payments.",
  } = overrides;
  return {
    id: "evt_payout_failed",
    type: "payout.failed",
    data: {
      object: {
        id: payoutId,
        object: "payout",
        amount,
        currency: "aud",
        failure_code: failureCode,
        failure_message: failureMessage,
        description: "Daily payout",
      } as Stripe.Payout,
    },
  } as unknown as Stripe.Event;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("handlePayoutFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendTransactionalEmail).mockResolvedValue(undefined);
  });

  it("returns { status: 'done' } always", async () => {
    const result = await handlePayoutFailed(makeEvent(), makeCtx());
    expect(result).toEqual({ status: "done" });
  });

  it("logs a warn with failure details", async () => {
    const ctx = makeCtx();
    await handlePayoutFailed(makeEvent(), ctx);
    expect(ctx.log.warn).toHaveBeenCalledWith(
      "Stripe payout failed — manual action required",
      expect.objectContaining({ failureCode: "could_not_process" }),
    );
  });

  it("sends alert email to ADMIN_EMAIL", async () => {
    await handlePayoutFailed(makeEvent(), makeCtx());
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      "admin@invest.com.au",
      expect.stringContaining("could_not_process"),
      expect.stringContaining("500.00"),
      "Invest.com.au Alerts <alerts@invest.com.au>",
    );
  });

  it("email subject includes failure code", async () => {
    await handlePayoutFailed(makeEvent({ failureCode: "bank_account_restricted" }), makeCtx());
    const [, subject] = vi.mocked(sendTransactionalEmail).mock.calls[0]!;
    expect(subject).toContain("bank_account_restricted");
  });

  it("handles null failure_code gracefully", async () => {
    const result = await handlePayoutFailed(makeEvent({ failureCode: null }), makeCtx());
    expect(result).toEqual({ status: "done" });
    const [, subject] = vi.mocked(sendTransactionalEmail).mock.calls[0]!;
    expect(subject).toContain("unknown error");
  });

  it("writes to admin_audit_log with correct action", async () => {
    const ctx = makeCtx();
    await handlePayoutFailed(makeEvent(), ctx);
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("admin_audit_log");
    const fromCall = (ctx.admin.from as ReturnType<typeof vi.fn>).mock.results[0];
    const insertMock = fromCall?.value?.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payout_failed" }),
    );
  });
});
