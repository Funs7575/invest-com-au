import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "ip:test"),
}));
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockCookieStoreGet = vi.fn();
const mockRecordFinancialAudit = vi.fn((..._args: unknown[]) =>
  Promise.resolve(),
);
const mockEnqueueJob = vi.fn((..._args: unknown[]) => Promise.resolve());
const mockCheckoutCreate = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieStoreGet })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: (...args: unknown[]) =>
    mockRecordFinancialAudit(...args),
}));

vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

const mockSubscriptionsUpdate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    subscriptions: { update: (...args: unknown[]) => mockSubscriptionsUpdate(...args) },
  }),
}));

const mockRecordLedgerEntry = vi.fn((..._args: unknown[]) =>
  Promise.resolve({ entry: { id: 1 }, balanceAfterCents: 0, idempotent: false }),
);
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: (...args: unknown[]) => mockRecordLedgerEntry(...args),
}));

import { POST } from "@/app/api/advisor-auth/tier-upgrade/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, hasCookie = true): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (hasCookie) headers.cookie = "advisor_session=session-token";
  return new NextRequest("http://localhost/api/advisor-auth/tier-upgrade", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
  });
}

// Post-refactor, requireAdvisorSession() reads the advisor_session cookie
// from request.cookies (NextRequest) and queries advisor_sessions via the
// admin client with .single(). The route then queries professionals via
// admin with .maybeSingle(). Wire both onto mockAdminFrom; tests that
// override mockAdminFrom for professionals must re-apply the session setup
// via `buildSessionBuilder`.
function buildSessionBuilder(
  table: string,
  opts: {
    professionalId?: number | null;
    expiresAt?: string;
  },
  b: ReturnType<typeof createChainableBuilder>,
) {
  const professionalId = opts.professionalId === undefined ? 42 : opts.professionalId;
  const expiresAt = opts.expiresAt ?? new Date(Date.now() + 86400 * 1000).toISOString();
  if (table === "advisor_sessions") {
    b.single = vi.fn(() =>
      Promise.resolve({
        data: professionalId
          ? { professional_id: professionalId, expires_at: expiresAt }
          : null,
        error: null,
      }),
    );
  }
}

function withSession(
  professionalId: number | null = 42,
  expiresAt = new Date(Date.now() + 86400 * 1000).toISOString(),
) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    buildSessionBuilder(table, { professionalId, expiresAt }, b);
    return b;
  });
}

function withAdvisorTier(currentTier: string) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    buildSessionBuilder(table, {}, b);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({
          data: {
            id: 42,
            email: "advisor@test.com",
            name: "Advisor",
            advisor_tier: currentTier,
          },
          error: null,
        }),
      );
    }
    return b;
  });
}

/**
 * Wire a downgrade-eligible advisor that has a Stripe customer + an active
 * subscription with a real current_period_end, so the route resolves a
 * concrete (subscription, billing-period-end) pair for the deterministic
 * proration referenceId. `pendingTier` lets a test simulate the TOCTOU
 * window (null = guard passes).
 */
function withSubscribedAdvisor(opts: {
  currentTier: string;
  subscriptionId?: string | null;
  currentPeriodEnd: string;
  pendingTier?: string | null;
}) {
  const {
    currentTier,
    subscriptionId = "sub_abc123",
    currentPeriodEnd,
    pendingTier = null,
  } = opts;
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    buildSessionBuilder(table, {}, b);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({
          data: {
            id: 42,
            email: "advisor@test.com",
            name: "Advisor",
            advisor_tier: currentTier,
            stripe_customer_id: "cus_xyz",
            pending_tier: pendingTier,
          },
          error: null,
        }),
      );
    }
    if (table === "subscriptions") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({
          data: {
            stripe_subscription_id: subscriptionId,
            current_period_end: currentPeriodEnd,
            status: "active",
          },
          error: null,
        }),
      );
    }
    return b;
  });
}

function ledgerRefIdFromCall(callIndex = 0): string {
  const arg = mockRecordLedgerEntry.mock.calls[callIndex]?.[0] as {
    referenceId: string;
  };
  return arg.referenceId;
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/tier-upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    delete process.env.STRIPE_SECRET_KEY;
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockCheckoutCreate.mockResolvedValue({
      id: "cs_tier_001",
      url: "https://checkout.stripe.com/c/cs_tier_001",
    });
  });

  it("returns 401 when no session cookie", async () => {
    const res = await POST(makePost({ target_tier: "growth" }, false));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is expired", async () => {
    withSession(42, new Date(Date.now() - 86400 * 1000).toISOString());
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(401);
    // requireAdvisorSession returns null for expired sessions, route maps to "Not authenticated"
    expect((await res.json()).error).toBe("Not authenticated");
  });

  it("returns 401 when session lookup returns null", async () => {
    withSession(null);
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when target_tier is missing", async () => {
    withSession();
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing target_tier");
  });

  it("returns 400 for unknown tier id", async () => {
    withSession();
    const res = await POST(makePost({ target_tier: "platinum" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown tier");
  });

  it("returns 404 when advisor row missing", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      buildSessionBuilder(table, {}, b);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      return b;
    });
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 no-op when current tier matches target", async () => {
    withAdvisorTier("growth");
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("Already on this tier");
  });

  it("defers downgrade to end of cycle, writes proration credit, queues email", async () => {
    withAdvisorTier("pro");
    const res = await POST(
      makePost({ target_tier: "growth", billing: "monthly" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    // No more immediate flip — the action is now deferred_downgrade.
    expect(json.action).toBe("deferred_downgrade");
    expect(json.pending_tier).toBe("growth");
    expect(json.tier).toBe("pro"); // current tier UNCHANGED until cycle end
    expect(json.pending_tier_effective_at).toBeTruthy();

    // pending_tier stamped on the advisor row (advisor_tier untouched here).
    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.pending_tier).toBe("growth");
    expect(updateArgs.advisor_tier).toBeUndefined();

    // Proration credit lands via the ledger helper.
    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "tier_proration_credit",
        professionalId: 42,
      }),
    );

    expect(mockRecordFinancialAudit).toHaveBeenCalled();
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      "send_email",
      expect.objectContaining({ to: "advisor@test.com" }),
    );
  });

  it("returns placeholder URL when Stripe is not configured (upgrade)", async () => {
    withAdvisorTier("free");
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("stripe_not_configured");
    expect(json.checkout_url).toContain("/upgrade/thanks?tier=growth");
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("creates Stripe subscription checkout for upgrades", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    withAdvisorTier("free");
    const res = await POST(
      makePost({ target_tier: "pro", billing: "annual" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("upgrade_checkout");
    expect(json.checkout_url).toBe("https://checkout.stripe.com/c/cs_tier_001");

    const callArg = mockCheckoutCreate.mock.calls[0][0];
    expect(callArg.mode).toBe("subscription");
    // Pro annual = 143000 per advisor-tiers.ts
    expect(callArg.line_items[0].price_data.unit_amount).toBe(143000);
    expect(callArg.line_items[0].price_data.recurring.interval).toBe("year");
    expect(callArg.metadata.type).toBe("advisor_tier_upgrade");
    expect(callArg.metadata.from_tier).toBe("free");
    expect(callArg.metadata.to_tier).toBe("pro");
  });

  it("returns 500 when stripe checkout creation throws", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_xxx";
    withAdvisorTier("free");
    mockCheckoutCreate.mockRejectedValueOnce(new Error("Stripe API down"));
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(500);
  });

  // ── Downgrade proration idempotency (deterministic reference_id) ──────────────
  // Regression coverage for the Date.now()-in-reference_id defect that defeated
  // the ledger's unique-index dedup and double-credited concurrent/retried
  // downgrades. The key must be deterministic for a given downgrade event so
  // recordLedgerEntry collapses a re-run into an idempotent no-op.
  describe("downgrade proration credit reference_id", () => {
    // ~20 days out so daysRemaining < cycleDays → a real proration credit fires.
    const periodEnd = new Date(Date.now() + 20 * 86400_000).toISOString();
    const expectedPeriodKey = new Date(periodEnd).toISOString().slice(0, 10);

    it("is deterministic — keyed on advisor + subscription + billing period, NOT a timestamp", async () => {
      withSubscribedAdvisor({
        currentTier: "pro",
        subscriptionId: "sub_abc123",
        currentPeriodEnd: periodEnd,
      });
      const res = await POST(makePost({ target_tier: "growth", billing: "monthly" }));
      expect(res.status).toBe(200);

      expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(1);
      const refId = ledgerRefIdFromCall();
      expect(refId).toBe(`pro_42_downgrade_sub_abc123_${expectedPeriodKey}`);
      // Must NOT embed a wall-clock timestamp (the original bug).
      expect(refId).not.toMatch(/\d{13}/); // 13-digit ms epoch
      // referenceType still scopes the dedup triple.
      const arg = mockRecordLedgerEntry.mock.calls[0][0] as { referenceType: string };
      expect(arg.referenceType).toBe("tier_downgrade");
    });

    it("two sequential (retried) downgrades for the same event produce the SAME key — dedup target", async () => {
      withSubscribedAdvisor({
        currentTier: "pro",
        subscriptionId: "sub_abc123",
        currentPeriodEnd: periodEnd,
      });

      // First call records the credit.
      await POST(makePost({ target_tier: "growth", billing: "monthly" }));
      // Second call (retry) — model the ledger reporting the triple already
      // exists, i.e. the unique index dedups. The route must hand it the SAME
      // referenceId for that to be possible.
      mockRecordLedgerEntry.mockImplementationOnce((..._args: unknown[]) =>
        Promise.resolve({ entry: { id: 1 }, balanceAfterCents: 0, idempotent: true }),
      );
      await POST(makePost({ target_tier: "growth", billing: "monthly" }));

      expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(2);
      const firstRef = ledgerRefIdFromCall(0);
      const secondRef = ledgerRefIdFromCall(1);
      expect(secondRef).toBe(firstRef);
      // Crucially, identical across two distinct invocations → the unique
      // (kind, reference_type, reference_id) index collapses the 2nd insert.
    });

    it("concurrent downgrades (both passing the pending_tier guard) request one idempotent key", async () => {
      withSubscribedAdvisor({
        currentTier: "pro",
        subscriptionId: "sub_abc123",
        currentPeriodEnd: periodEnd,
        pendingTier: null, // both racers read null → both pass the TOCTOU guard
      });

      // The 2nd writer hits the 23505 race-recovery path inside the real
      // recordLedgerEntry; here we just assert both racers compute the same key,
      // which is what makes that recovery dedup correctly.
      const [a, b] = await Promise.all([
        POST(makePost({ target_tier: "growth", billing: "monthly" })),
        POST(makePost({ target_tier: "growth", billing: "monthly" })),
      ]);
      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(2);
      expect(ledgerRefIdFromCall(0)).toBe(ledgerRefIdFromCall(1));
    });

    it("falls back to a stable 'nosub' segment when no Stripe subscription is found", async () => {
      // No stripe_customer_id → no subscription lookup → default 30-day cycle.
      withAdvisorTier("pro");
      const res = await POST(makePost({ target_tier: "growth", billing: "monthly" }));
      expect(res.status).toBe(200);
      const refId = ledgerRefIdFromCall();
      expect(refId).toMatch(/^pro_42_downgrade_nosub_\d{4}-\d{2}-\d{2}$/);
      expect(refId).not.toMatch(/\d{13}/);
    });

    it("returns 409 (no ledger write) when a downgrade is already pending", async () => {
      withSubscribedAdvisor({
        currentTier: "pro",
        currentPeriodEnd: periodEnd,
        pendingTier: "growth", // a downgrade is already scheduled
      });
      const res = await POST(makePost({ target_tier: "growth", billing: "monthly" }));
      expect(res.status).toBe(409);
      expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
    });

    it("does not over-credit: a same-period re-run keeps the key identical (no second distinct credit)", async () => {
      // Two separate requests for the SAME downgrade (same subscription + period)
      // must collide on key. A change of billing period (new subscription cycle)
      // is the only thing that should legitimately mint a new credit.
      withSubscribedAdvisor({
        currentTier: "elite",
        subscriptionId: "sub_elite",
        currentPeriodEnd: periodEnd,
      });
      await POST(makePost({ target_tier: "pro", billing: "monthly" }));
      const firstRef = ledgerRefIdFromCall(0);

      mockRecordLedgerEntry.mockClear();
      withSubscribedAdvisor({
        currentTier: "elite",
        subscriptionId: "sub_elite",
        currentPeriodEnd: periodEnd,
      });
      await POST(makePost({ target_tier: "pro", billing: "monthly" }));
      const secondRef = ledgerRefIdFromCall(0);
      expect(secondRef).toBe(firstRef);
    });

    it("a different billing period yields a different key (legit new credit)", async () => {
      withSubscribedAdvisor({
        currentTier: "pro",
        subscriptionId: "sub_abc123",
        currentPeriodEnd: periodEnd,
      });
      await POST(makePost({ target_tier: "growth", billing: "monthly" }));
      const firstRef = ledgerRefIdFromCall(0);

      mockRecordLedgerEntry.mockClear();
      const laterPeriod = new Date(Date.now() + 20 * 86400_000 + 35 * 86400_000).toISOString();
      withSubscribedAdvisor({
        currentTier: "pro",
        subscriptionId: "sub_abc123",
        currentPeriodEnd: laterPeriod,
      });
      await POST(makePost({ target_tier: "growth", billing: "monthly" }));
      const secondRef = ledgerRefIdFromCall(0);
      expect(secondRef).not.toBe(firstRef);
    });
  });
});
