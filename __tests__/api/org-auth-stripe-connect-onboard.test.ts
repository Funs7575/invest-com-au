import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const {
  mockRequireOrgSession,
  mockAdminFrom,
  mockStripeAccountsCreate,
  mockStripeAccountLinksCreate,
  mockStripeAccountsUpdate,
} = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockAdminFrom: vi.fn(() => makeChain()),
  mockStripeAccountsCreate: vi.fn<(..._a: unknown[]) => Promise<{ id: string }>>(
    async () => ({ id: "acct_new123" }),
  ),
  mockStripeAccountLinksCreate: vi.fn<(..._a: unknown[]) => Promise<{ url: string }>>(
    async () => ({ url: "https://connect.stripe.com/onboard/acct_new123" }),
  ),
  mockStripeAccountsUpdate: vi.fn<(..._a: unknown[]) => Promise<{ id: string }>>(
    async () => ({ id: "acct_existing" }),
  ),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: () => mockRequireOrgSession(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      accounts: {
        create: (...args: unknown[]) => mockStripeAccountsCreate(...args),
        update: (...args: unknown[]) => mockStripeAccountsUpdate(...args),
      },
      accountLinks: {
        create: (...args: unknown[]) => mockStripeAccountLinksCreate(...args),
      },
    })),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "like", "head",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

const SESSION_ADMIN = { organisationId: 5, role: "admin", userId: "user-org-5" };
const SESSION_VIEWER = { organisationId: 5, role: "viewer", userId: "user-org-5" };

const ORG_NO_ACCOUNT = { id: 5, email: "org@example.com", stripe_connect_account_id: null };
const ORG_WITH_ACCOUNT = {
  id: 5,
  email: "org@example.com",
  stripe_connect_account_id: "acct_existing",
};

// ── Route under test ──────────────────────────────────────────────────────────
import { POST } from "@/app/api/org-auth/stripe-connect/onboard/route";

// ═══════════════════════════════════════════════════════════════════════════════
// POST
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/org-auth/stripe-connect/onboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
    mockStripeAccountsCreate.mockResolvedValue({ id: "acct_new123" });
    mockStripeAccountLinksCreate.mockResolvedValue({
      url: "https://connect.stripe.com/onboard/acct_new123",
    });
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockRequireOrgSession.mockResolvedValue(SESSION_VIEWER);
    const res = await POST();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Only org admins/i);
  });

  it("returns 404 when org is not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await POST();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 404 when org query returns null data with no error", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("creates a new Stripe account when org has none and returns onboarding URL", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_NO_ACCOUNT, error: null }); // org fetch
      return makeChain({ data: null, error: null }); // persist account ID update
    });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://connect.stripe.com/onboard/acct_new123");
    expect(mockStripeAccountsCreate).toHaveBeenCalledOnce();
    expect(mockStripeAccountLinksCreate).toHaveBeenCalledOnce();
  });

  it("skips account creation when org already has a stripe_connect_account_id", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ORG_WITH_ACCOUNT, error: null }));
    mockStripeAccountLinksCreate.mockResolvedValue({
      url: "https://connect.stripe.com/onboard/acct_existing",
    });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://connect.stripe.com/onboard/acct_existing");
    // Should NOT create a new account
    expect(mockStripeAccountsCreate).not.toHaveBeenCalled();
    expect(mockStripeAccountLinksCreate).toHaveBeenCalledOnce();
  });

  it("still returns the onboarding URL even when persisting the account ID fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_NO_ACCOUNT, error: null }); // org fetch
      return makeChain({ data: null, error: { message: "update failed" } }); // persist fails
    });
    const res = await POST();
    // Route continues even if DB update fails
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeDefined();
  });

  it("returns 500 when Stripe account creation throws", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: ORG_NO_ACCOUNT, error: null }));
    mockStripeAccountsCreate.mockRejectedValue(new Error("Stripe API error"));
    const res = await POST();
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Internal server error/i);
  });

  it("returns 500 when Stripe account link creation throws", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_NO_ACCOUNT, error: null });
      return makeChain({ data: null, error: null });
    });
    mockStripeAccountLinksCreate.mockRejectedValue(new Error("Stripe link error"));
    const res = await POST();
    expect(res.status).toBe(500);
  });

  it("passes account link correct refresh and return URLs", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: ORG_WITH_ACCOUNT, error: null });
      return makeChain({ data: null, error: null });
    });
    mockStripeAccountLinksCreate.mockResolvedValue({ url: "https://stripe.com/link" });
    await POST();
    const callArgs = mockStripeAccountLinksCreate.mock.calls[0];
    const linkParams = callArgs?.[0] as { account: string; type: string; refresh_url: string; return_url: string } | undefined;
    expect(linkParams?.account).toBe("acct_existing");
    expect(linkParams?.type).toBe("account_onboarding");
    expect(linkParams?.refresh_url).toContain("stripe=refresh");
    expect(linkParams?.return_url).toContain("stripe=complete");
  });
});
