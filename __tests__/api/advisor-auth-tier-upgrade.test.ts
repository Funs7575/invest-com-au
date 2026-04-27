import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ─────────────────────────────────────────────────────────────────

const mockCookiesGet = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockGetTier = vi.fn();
const mockIsUpgrade = vi.fn();
const mockRecordFinancialAudit = vi.fn(() => Promise.resolve());
const mockEnqueueJob = vi.fn(() => Promise.resolve());
const mockCheckoutCreate = vi.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookiesGet })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({ checkout: { sessions: { create: mockCheckoutCreate } } })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/advisor-tiers", () => ({
  getTier: (...args: unknown[]) => mockGetTier(...args),
  isUpgrade: (...args: unknown[]) => mockIsUpgrade(...args),
}));

vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: (...args: unknown[]) => mockRecordFinancialAudit(...args),
}));

vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn() })),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { POST } from "@/app/api/advisor-auth/tier-upgrade/route";

// ── Fixtures ───────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 3_600_000).toISOString();
const SESSION = { professional_id: 42, expires_at: FUTURE };
const ADVISOR = { id: 42, email: "advisor@inv.com", name: "Bob", advisor_tier: "free" };
const TIER_SPEC = {
  id: "growth",
  label: "Growth",
  features: ["Feature A"],
  monthlyPriceCents: 19900,
  annualPriceCents: 199000,
};
const CHECKOUT_URL = "https://checkout.stripe.com/pay/cs_tier";

function chain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "insert", "update", "eq", "or", "in", "order", "limit"])
    c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  c.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: null, error: null });
    return Promise.resolve();
  });
  return c;
}

function post(body: unknown, sessionCookieValue?: string): Promise<Response> {
  mockCookiesGet.mockReturnValue(
    sessionCookieValue ? { value: sessionCookieValue } : undefined,
  );
  return POST(
    new NextRequest("http://localhost/api/advisor-auth/tier-upgrade", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/tier-upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTier.mockReturnValue(TIER_SPEC);
    mockIsUpgrade.mockReturnValue(true);
    mockCheckoutCreate.mockResolvedValue({ url: CHECKOUT_URL });
  });

  it("401 — no session cookie", async () => {
    const res = await post({ target_tier: "growth" });
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Not authenticated" });
  });

  it("401 — session not found / expired in DB", async () => {
    mockServerFrom.mockReturnValueOnce(chain({ data: null }));
    const res = await post({ target_tier: "growth" }, "tok");
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Session expired" });
  });

  it("400 — missing target_tier", async () => {
    mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
    const res = await post({}, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing target_tier" });
  });

  it("400 — unknown tier (getTier returns null)", async () => {
    mockGetTier.mockReturnValueOnce(null);
    mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
    const res = await post({ target_tier: "legendary" }, "tok");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Unknown tier" });
  });

  it("404 — advisor not found in professionals", async () => {
    mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
    mockAdminFrom.mockReturnValueOnce(chain({ data: null }));
    const res = await post({ target_tier: "growth" }, "tok");
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Advisor not found" });
  });

  it("200 — same tier, returns no-op message", async () => {
    mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
    mockAdminFrom.mockReturnValueOnce(chain({ data: { ...ADVISOR, advisor_tier: "growth" } }));
    const res = await post({ target_tier: "growth" }, "tok");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, message: "Already on this tier" });
  });

  it("200 — downgrade: writes DB directly and enqueues confirmation email", async () => {
    mockIsUpgrade.mockReturnValueOnce(false);
    mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
    mockAdminFrom
      .mockReturnValueOnce(chain({ data: ADVISOR })) // professionals select
      .mockReturnValueOnce(chain({ data: null })); // professionals update
    const res = await post({ target_tier: "growth", billing: "monthly" }, "tok");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, action: "downgraded" });
    expect(mockRecordFinancialAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "adjustment", actorType: "advisor" }),
    );
    expect(mockEnqueueJob).toHaveBeenCalledWith(
      "send_email",
      expect.objectContaining({ to: ADVISOR.email }),
    );
  });

  it("200 — upgrade returns placeholder when STRIPE_SECRET_KEY unset", async () => {
    const savedKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
      mockAdminFrom.mockReturnValueOnce(chain({ data: ADVISOR }));
      const res = await post({ target_tier: "growth" }, "tok");
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true, action: "stripe_not_configured" });
    } finally {
      process.env.STRIPE_SECRET_KEY = savedKey;
    }
  });

  it("200 — upgrade creates Stripe checkout and returns URL", async () => {
    const savedKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    try {
      mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
      mockAdminFrom.mockReturnValueOnce(chain({ data: ADVISOR }));
      const res = await post({ target_tier: "growth", billing: "monthly" }, "tok");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ ok: true, action: "upgrade_checkout" });
      expect(body.checkout_url).toBeDefined();
      expect(mockCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "subscription" }),
      );
    } finally {
      process.env.STRIPE_SECRET_KEY = savedKey;
    }
  });

  it("500 — Stripe checkout throws", async () => {
    const savedKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_abc123";
    mockCheckoutCreate.mockRejectedValueOnce(new Error("Stripe unavailable"));
    try {
      mockServerFrom.mockReturnValueOnce(chain({ data: SESSION }));
      mockAdminFrom.mockReturnValueOnce(chain({ data: ADVISOR }));
      const res = await post({ target_tier: "growth", billing: "annual" }, "tok");
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: "Failed to start checkout" });
    } finally {
      process.env.STRIPE_SECRET_KEY = savedKey;
    }
  });
});
