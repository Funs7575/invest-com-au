import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

// vi.hoisted() — vi.mock factories are hoisted; the captured fn must be too.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GET } from "@/app/api/advisor-auth/referrals/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/referrals", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

/**
 * Wire the two admin queries the route makes:
 *  - professionals .maybeSingle() -> profile (email + stored credit)
 *  - referral_rewards .eq() (terminal) -> rewards rows
 */
function setupAdmin(opts: {
  profile: Record<string, unknown> | null;
  rewards?: Array<Record<string, unknown>> | null;
}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: opts.profile, error: null }),
      );
    }
    if (table === "referral_rewards") {
      // The rewards query terminates on the final .eq("referrer_email", ...).
      b.eq = vi.fn(() => {
        supabaseCalls[table]?.push({ method: "eq", args: [] });
        return Promise.resolve({ data: opts.rewards ?? null, error: null });
      });
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockRequireAdvisorSession.mockResolvedValue(null);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns a deterministic referral code and url", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    setupAdmin({ profile: { email: "a@b.com", referral_credit_cents: 0 } });

    const res1 = await GET(makeGet());
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.referral_code).toMatch(/^ADV[A-Z0-9]{0,6}$/);
    expect(json1.referral_url).toBe(
      `https://invest.com.au/advisor-signup?ref=${json1.referral_code}`,
    );

    // Same advisor ID -> identical code on a second call.
    const res2 = await GET(makeGet());
    const json2 = await res2.json();
    expect(json2.referral_code).toBe(json1.referral_code);
  });

  it("computes stats from paid referral rewards", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    setupAdmin({
      profile: { email: "a@b.com", referral_credit_cents: 0 },
      rewards: [
        { status: "paid", reward_cents: 1000 },
        { status: "paid", reward_cents: 1500 },
        { status: "pending", reward_cents: 2000 },
      ],
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.total_referred).toBe(3);
    expect(json.stats.active_referrals).toBe(2);
    expect(json.stats.credits_earned_cents).toBe(2500);
  });

  it("falls back to stored credit when it exceeds paid rewards", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    setupAdmin({
      profile: { email: "a@b.com", referral_credit_cents: 9999 },
      rewards: [{ status: "paid", reward_cents: 1000 }],
    });

    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.stats.credits_earned_cents).toBe(9999);
  });

  it("returns zeroed stats when the advisor has no email/profile", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    setupAdmin({ profile: null });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats).toEqual({
      total_referred: 0,
      active_referrals: 0,
      credits_earned_cents: 0,
    });
  });
});
