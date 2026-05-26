import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireCronAuth, mockFrom } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(async (_name: string, fn: () => Promise<{ response: Response }>) => {
    const result = await fn();
    return result.response;
  }),
}));

vi.mock("@/lib/advisor-match-ranking", () => ({
  fetchAdvisorOutcomeStats: vi.fn(async () => []),
  rankByOutcomes: vi.fn((candidates: Array<{ id: number; matchScore: number }>) =>
    candidates.map((c) => ({ ...c, _outcomesScore: c.matchScore })),
  ),
}));

import { GET } from "@/app/api/cron/advisor-match-scores/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/cron/advisor-match-scores", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

const ADVISOR_ROW = {
  id: 10,
  specialties: ["property", "fhb"],
  min_investment_cents: null,
  minimum_investment_cents: null,
  location_state: "NSW",
  office_states: ["NSW", "VIC"],
  accepts_new_clients: true,
  advisor_tier: "growth",
  rating: 4.7,
  review_count: 12,
};

const PROFILE_ROW = {
  auth_user_id: "user-uuid-abc",
  primary_vertical: "property",
  budget_band: "100k_250k",
  is_fhb: true,
  is_hnw: false,
  is_pre_retiree: false,
  experience_level: "beginner",
};

describe("GET /api/cron/advisor-match-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response("Unauthorized", { status: 401 }));
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when investor_profiles fetch errors", async () => {
    const errChain2 = { select: vi.fn(() => Promise.resolve({ data: null, error: { message: "db error" } })) };
    mockFrom.mockReturnValueOnce(errChain2);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 200 with zero profiles when no users have preferences", async () => {
    const profileChain = { select: vi.fn(() => Promise.resolve({ data: [], error: null })) };
    let eqCount = 0;
    const advChain: Record<string, unknown> = {};
    advChain.select = vi.fn(() => advChain);
    advChain.eq = vi.fn(() => {
      eqCount++;
      return eqCount >= 2 ? Promise.resolve({ data: [], error: null }) : advChain;
    });

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return profileChain;
      return advChain;
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profiles).toBe(0);
  });

  it("computes and upserts match scores for active profiles", async () => {
    const profileChain = {
      select: vi.fn(() => Promise.resolve({ data: [PROFILE_ROW], error: null })),
    };

    // Second call (advisors): needs chained .eq().eq() before resolving
    let advCallCount = 0;
    const advChain: Record<string, unknown> = {};
    advChain.select = vi.fn(() => advChain);
    advChain.eq = vi.fn(() => {
      advCallCount++;
      return advCallCount >= 2 ? Promise.resolve({ data: [ADVISOR_ROW], error: null }) : advChain;
    });

    const upsertChain = {
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    };

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return profileChain;
      if (callIndex === 2) return advChain;
      return upsertChain;
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.advisors).toBeGreaterThanOrEqual(0);
  });
});

// ── computeAdvisorProfileMatch unit tests ─────────────────────────────────────

import { computeAdvisorProfileMatch } from "@/lib/advisor-profile-match";

describe("computeAdvisorProfileMatch", () => {
  const baseUser = {
    primary_vertical: "property",
    budget_band: "100k_250k",
    is_fhb: true,
    is_hnw: false,
    is_pre_retiree: false,
    experience_level: "beginner",
    location_state: "NSW",
  };

  const baseAdvisor = {
    id: 1,
    specialties: ["property", "first home buyers"],
    min_investment_cents: null,
    minimum_investment_cents: null,
    location_state: "NSW",
    office_states: ["NSW"],
    accepts_new_clients: true,
    advisor_tier: "pro",
    rating: 4.8,
    review_count: 20,
  };

  it("returns a score between 0 and 100", () => {
    const score = computeAdvisorProfileMatch(baseUser, baseAdvisor);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("scores higher when vertical matches", () => {
    const matching = computeAdvisorProfileMatch(baseUser, baseAdvisor);
    const nonMatching = computeAdvisorProfileMatch(
      { ...baseUser, primary_vertical: "etf" },
      { ...baseAdvisor, specialties: ["smsf"] },
    );
    expect(matching).toBeGreaterThan(nonMatching);
  });

  it("scores well when budget fits advisor minimum", () => {
    const accessible = computeAdvisorProfileMatch(baseUser, { ...baseAdvisor, min_investment_cents: 50_000_00 });
    const tooExpensive = computeAdvisorProfileMatch(baseUser, { ...baseAdvisor, min_investment_cents: 5_000_000_00 });
    expect(accessible).toBeGreaterThan(tooExpensive);
  });

  it("handles null specialties without error", () => {
    const score = computeAdvisorProfileMatch(baseUser, { ...baseAdvisor, specialties: null });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
