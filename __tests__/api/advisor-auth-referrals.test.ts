import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/advisor-auth/referrals/route";

// ── Builder helper ────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeGet() {
  return new NextRequest(
    "http://localhost/api/advisor-auth/referrals",
    {
      method: "GET",
      headers: { "x-forwarded-for": "9.9.9.9" },
    },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/referrals — auth + rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/too many requests/i);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not authenticated/i);
  });
});

describe("GET /api/advisor-auth/referrals — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns referral code, url, and zero-stats when professional has no email", async () => {
    // professionals query returns a row with no email
    mockAdminFrom.mockReturnValue(
      makeBuilder({ email: null, referral_credit_cents: 0 }, null),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      referral_code: string;
      referral_url: string;
      stats: { total_referred: number; active_referrals: number; credits_earned_cents: number };
    };
    expect(body.referral_code).toMatch(/^ADV/);
    expect(body.referral_url).toContain("?ref=ADV");
    expect(body.stats.total_referred).toBe(0);
    expect(body.stats.active_referrals).toBe(0);
    expect(body.stats.credits_earned_cents).toBe(0);
  });

  it("counts paid referrals and sums their reward_cents", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        // professionals.maybeSingle()
        return makeBuilder({ email: "advisor@example.com", referral_credit_cents: 0 }, null);
      }
      // referral_rewards query
      return makeBuilder(
        [
          { status: "paid", reward_cents: 5000 },
          { status: "paid", reward_cents: 3000 },
          { status: "pending", reward_cents: 2000 },
        ],
        null,
      );
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      stats: { total_referred: number; active_referrals: number; credits_earned_cents: number };
    };
    expect(body.stats.total_referred).toBe(3);
    expect(body.stats.active_referrals).toBe(2);
    expect(body.stats.credits_earned_cents).toBe(8000);
  });

  it("uses stored referral_credit_cents when it is larger than computed credits", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return makeBuilder({ email: "advisor@example.com", referral_credit_cents: 99999 }, null);
      }
      // rewards with small sum
      return makeBuilder([{ status: "paid", reward_cents: 100 }], null);
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      stats: { credits_earned_cents: number };
    };
    // stored (99999) > computed (100) → should report 99999
    expect(body.stats.credits_earned_cents).toBe(99999);
  });

  it("returns zero stats when professional row is null (not found)", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as {
      stats: { total_referred: number; credits_earned_cents: number };
    };
    expect(body.stats.total_referred).toBe(0);
    expect(body.stats.credits_earned_cents).toBe(0);
  });

  it("returns 200 when rewards array is empty", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return makeBuilder({ email: "a@b.com", referral_credit_cents: 0 }, null);
      }
      return makeBuilder([], null);
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as { stats: { total_referred: number } };
    expect(body.stats.total_referred).toBe(0);
  });

  it("generates a deterministic referral code from the advisor ID", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    mockRequireAdvisorSession.mockResolvedValue(42);

    const res1 = await GET(makeGet());
    // Reset without changing advisorId
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockReturnValue(makeBuilder(null, null));
    const res2 = await GET(makeGet());

    const b1 = await res1.json() as { referral_code: string };
    const b2 = await res2.json() as { referral_code: string };
    expect(b1.referral_code).toBe(b2.referral_code);
  });
});

describe("GET /api/advisor-auth/referrals — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 500 when an unexpected error is thrown", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("unexpected boom");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/failed to fetch/i);
  });
});
