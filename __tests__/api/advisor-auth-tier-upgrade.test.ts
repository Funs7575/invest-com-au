import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockCookieStoreGet = vi.fn();
const mockRecordFinancialAudit = vi.fn(() => Promise.resolve());
const mockEnqueueJob = vi.fn(() => Promise.resolve());
const mockCheckoutCreate = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieStoreGet })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
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

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
  }),
}));

import { POST } from "@/app/api/advisor-auth/tier-upgrade/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/tier-upgrade", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function withCookieAndSession(
  professionalId: number | null = 42,
  expiresAt = new Date(Date.now() + 86400 * 1000).toISOString(),
  hasCookie = true,
) {
  if (hasCookie) {
    mockCookieStoreGet.mockReturnValue({ value: "session-token" });
  } else {
    mockCookieStoreGet.mockReturnValue(undefined);
  }
  mockServerFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "advisor_sessions") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({
          data: professionalId
            ? { professional_id: professionalId, expires_at: expiresAt }
            : null,
          error: null,
        }),
      );
    }
    return b;
  });
}

function withAdvisorTier(currentTier: string) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
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
    withCookieAndSession(42, undefined, false);
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when session is expired", async () => {
    withCookieAndSession(
      42,
      new Date(Date.now() - 86400 * 1000).toISOString(),
    );
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Session expired");
  });

  it("returns 401 when session lookup returns null", async () => {
    withCookieAndSession(null);
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when target_tier is missing", async () => {
    withCookieAndSession();
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Missing target_tier");
  });

  it("returns 400 for unknown tier id", async () => {
    withCookieAndSession();
    const res = await POST(makePost({ target_tier: "platinum" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown tier");
  });

  it("returns 404 when advisor row missing", async () => {
    withCookieAndSession();
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
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
    withCookieAndSession();
    withAdvisorTier("growth");
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("Already on this tier");
  });

  it("downgrades immediately, audits, and enqueues confirmation email", async () => {
    withCookieAndSession();
    withAdvisorTier("pro");
    const res = await POST(
      makePost({ target_tier: "growth", billing: "monthly" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.action).toBe("downgraded");
    expect(json.tier).toBe("growth");

    // Direct stamp on professionals
    const proCalls = supabaseCalls.professionals || [];
    const updateCall = proCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(updateArgs.advisor_tier).toBe("growth");
    expect(updateArgs.tier_change_reason).toBe("self_service_downgrade");

    expect(mockRecordFinancialAudit).toHaveBeenCalled();
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      "send_email",
      expect.objectContaining({ to: "advisor@test.com" }),
    );
  });

  it("returns placeholder URL when Stripe is not configured (upgrade)", async () => {
    withCookieAndSession();
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
    withCookieAndSession();
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
    withCookieAndSession();
    withAdvisorTier("free");
    mockCheckoutCreate.mockRejectedValueOnce(new Error("Stripe API down"));
    const res = await POST(makePost({ target_tier: "growth" }));
    expect(res.status).toBe(500);
  });
});
