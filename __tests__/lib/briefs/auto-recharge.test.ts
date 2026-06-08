import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ────────────────────────────────────────────────────
// vi.mock factories are hoisted above all const/let, so any shared spies
// they reference must be declared via vi.hoisted (per CLAUDE.md).
const {
  mockEnqueueUserNotification,
  mockPaymentIntentsCreate,
  mockCreateAdminClient,
  mockGetStripe,
} = vi.hoisted(() => ({
  mockEnqueueUserNotification: vi.fn(),
  mockPaymentIntentsCreate: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockGetStripe: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: mockGetStripe,
}));

vi.mock("@/lib/user-notifications", () => ({
  enqueueUserNotification: mockEnqueueUserNotification,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { maybeAutoRecharge } from "@/lib/briefs/auto-recharge";

// ── Test helpers ─────────────────────────────────────────────────────

const AUTH_USER_ID = "auth-user-abc";
const PRO_ID = 42;

/** A professionals row that passes every eligibility gate (auto-recharge
 *  enabled, saved card, balance below threshold, no cooldown active). */
function eligibleProRow(): {
  id: number;
  email: string;
  name: string;
  auth_user_id: string | null;
  credit_balance_cents: number;
  auto_recharge_enabled: boolean;
  auto_recharge_threshold_credits: number;
  auto_recharge_pack_slug: string;
  stripe_customer_id: string;
  stripe_default_payment_method: string | null;
  auto_recharge_last_attempted_at: string | null;
} {
  return {
    id: PRO_ID,
    email: "pro@example.com",
    name: "Test Pro",
    auth_user_id: AUTH_USER_ID,
    credit_balance_cents: 100, // 1 credit — below threshold
    auto_recharge_enabled: true,
    auto_recharge_threshold_credits: 5,
    auto_recharge_pack_slug: "starter", // real isCredit pack
    stripe_customer_id: "cus_123",
    stripe_default_payment_method: "pm_123",
    auto_recharge_last_attempted_at: null,
  };
}

/**
 * Build a fake admin client that:
 *  - returns `proRow` for the professionals.select(...).eq().maybeSingle()
 *  - no-ops the professionals.update() timestamp stamp
 *  - returns a topup row id for advisor_credit_topups.insert().select().single()
 *  - returns `proRow` again for the catch-block re-fetch (select.eq.maybeSingle)
 */
function makeAdminClient(proRow: ReturnType<typeof eligibleProRow> | null) {
  const from = vi.fn((table: string) => {
    if (table === "professionals") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: proRow })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: null, error: null })),
        })),
      };
    }
    if (table === "advisor_credit_topups") {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 999 }, error: null })),
          })),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  return { from };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
  mockGetStripe.mockReturnValue({
    paymentIntents: { create: mockPaymentIntentsCreate },
  });
  mockCreateAdminClient.mockReturnValue(makeAdminClient(eligibleProRow()));
  mockEnqueueUserNotification.mockResolvedValue(true);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Flush the `void notifyProInbox(...)` microtask so its enqueue runs. */
async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

function notifiedKinds(): string[] {
  return mockEnqueueUserNotification.mock.calls.map((c) => c[0].kind);
}

// ── PaymentIntent status branches (the core of the fix) ──────────────

describe("maybeAutoRecharge — notification gated on PaymentIntent status", () => {
  it("status=succeeded → enqueues topup_succeeded only", async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ status: "succeeded" });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(mockEnqueueUserNotification).toHaveBeenCalledTimes(1);
    const call = mockEnqueueUserNotification.mock.calls[0][0];
    expect(call.kind).toBe("topup_succeeded");
    expect(call.authUserId).toBe(AUTH_USER_ID);
    expect(call.body).toMatch(/topped up/i);
    // never a failure on success
    expect(notifiedKinds()).not.toContain("topup_failed");
  });

  it("status=requires_action → enqueues topup_failed (action required), NOT success", async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ status: "requires_action" });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockEnqueueUserNotification).toHaveBeenCalledTimes(1);
    const call = mockEnqueueUserNotification.mock.calls[0][0];
    expect(call.kind).toBe("topup_failed");
    expect(call.body).toMatch(/verification|updating|update your payment/i);
    expect(notifiedKinds()).not.toContain("topup_succeeded");
  });

  it("status=requires_payment_method → enqueues topup_failed, NOT success", async () => {
    mockPaymentIntentsCreate.mockResolvedValue({
      status: "requires_payment_method",
    });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockEnqueueUserNotification).toHaveBeenCalledTimes(1);
    expect(notifiedKinds()).toEqual(["topup_failed"]);
    expect(notifiedKinds()).not.toContain("topup_succeeded");
  });

  it("status=processing → suppresses ALL notifications (no false success, no failure)", async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ status: "processing" });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("status=requires_capture (other non-terminal) → suppresses all notifications", async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ status: "requires_capture" });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("status=canceled → suppresses all notifications", async () => {
    mockPaymentIntentsCreate.mockResolvedValue({ status: "canceled" });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("regression: a non-succeeded clean return must never fire topup_succeeded", async () => {
    // This is the exact defect the fix closes: a non-throwing create()
    // that did NOT settle previously fired an optimistic success.
    for (const status of [
      "processing",
      "requires_action",
      "requires_payment_method",
      "requires_capture",
      "canceled",
    ]) {
      mockEnqueueUserNotification.mockClear();
      mockPaymentIntentsCreate.mockResolvedValue({ status });
      await maybeAutoRecharge(PRO_ID);
      await flush();
      expect(notifiedKinds()).not.toContain("topup_succeeded");
    }
  });
});

// ── Throw path (hard decline) still routes to the catch failure inbox ─

describe("maybeAutoRecharge — hard-decline throw path", () => {
  it("create() throws → catch enqueues topup_failed, never success", async () => {
    mockPaymentIntentsCreate.mockRejectedValue(
      Object.assign(new Error("Your card was declined."), {
        type: "StripeCardError",
      }),
    );

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockEnqueueUserNotification).toHaveBeenCalledTimes(1);
    expect(notifiedKinds()).toEqual(["topup_failed"]);
    expect(notifiedKinds()).not.toContain("topup_succeeded");
  });
});

// ── Eligibility gates — no charge, no notification ───────────────────

describe("maybeAutoRecharge — eligibility gates short-circuit before charging", () => {
  it("auto_recharge_enabled=false → no charge, no notification", async () => {
    const row = eligibleProRow();
    row.auto_recharge_enabled = false;
    mockCreateAdminClient.mockReturnValue(makeAdminClient(row));

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("balance at/above threshold → no charge", async () => {
    const row = eligibleProRow();
    row.credit_balance_cents = 1000; // 10 credits >= threshold 5
    mockCreateAdminClient.mockReturnValue(makeAdminClient(row));

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("recent attempt within cooldown → no charge", async () => {
    const row = eligibleProRow();
    row.auto_recharge_last_attempted_at = new Date().toISOString();
    mockCreateAdminClient.mockReturnValue(makeAdminClient(row));

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("missing saved payment method → no charge", async () => {
    const row = eligibleProRow();
    row.stripe_default_payment_method = null;
    mockCreateAdminClient.mockReturnValue(makeAdminClient(row));

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).not.toHaveBeenCalled();
    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });

  it("no auth_user_id → success status still charges but enqueues nothing (no inbox target)", async () => {
    const row = eligibleProRow();
    row.auth_user_id = null;
    mockCreateAdminClient.mockReturnValue(makeAdminClient(row));
    mockPaymentIntentsCreate.mockResolvedValue({ status: "succeeded" });

    await maybeAutoRecharge(PRO_ID);
    await flush();

    expect(mockPaymentIntentsCreate).toHaveBeenCalledTimes(1);
    // notifyProInbox returns early when auth_user_id is null
    expect(mockEnqueueUserNotification).not.toHaveBeenCalled();
  });
});
