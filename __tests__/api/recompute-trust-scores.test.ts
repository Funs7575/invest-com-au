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

import { GET } from "@/app/api/cron/recompute-trust-scores/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/cron/recompute-trust-scores", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

// Minimal professionals row that satisfies computeAdvisorTrustScore input
const PROF_ROW = {
  id: 1,
  verified: true,
  afsl_number: "123456",
  registration_number: null,
  verified_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
  years_experience: 5,
  bio: "A bio",
  photo_url: "https://example.com/photo.jpg",
  qualifications: ["CFP"],
  education: null,
  memberships: null,
  fee_structure: "percentage",
  fee_description: "1% AUM",
  linkedin_url: null,
  website: null,
  languages: null,
  rating: 4.9,
  review_count: 8,
  trust_score_version: 0,
};

function makeChain(selectResult: unknown, updateResult: unknown, upsertResult: unknown) {
  const selectChain: Record<string, ReturnType<typeof vi.fn>> = {};
  selectChain.select = vi.fn(() => selectChain);
  selectChain.eq = vi.fn(() => Promise.resolve(selectResult));

  const updateChain: Record<string, ReturnType<typeof vi.fn>> = {};
  updateChain.update = vi.fn(() => updateChain);
  updateChain.eq = vi.fn(() => Promise.resolve(updateResult));

  const upsertChain: Record<string, ReturnType<typeof vi.fn>> = {};
  upsertChain.upsert = vi.fn(() => Promise.resolve(upsertResult));

  let callIndex = 0;
  mockFrom.mockImplementation(() => {
    callIndex++;
    if (callIndex === 1) return selectChain;
    if (callIndex === 2) return updateChain;
    return upsertChain;
  });
}

describe("GET /api/cron/recompute-trust-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null); // pass auth
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response("Unauthorized", { status: 401 }));
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when professionals fetch errors", async () => {
    const errChain: Record<string, ReturnType<typeof vi.fn>> = {};
    errChain.select = vi.fn(() => errChain);
    errChain.eq = vi.fn(() => Promise.resolve({ data: null, error: { message: "db error" } }));
    mockFrom.mockReturnValueOnce(errChain);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 200 with stats for zero professionals", async () => {
    const emptyChain: Record<string, ReturnType<typeof vi.fn>> = {};
    emptyChain.select = vi.fn(() => emptyChain);
    emptyChain.eq = vi.fn(() => Promise.resolve({ data: [], error: null }));
    mockFrom.mockReturnValueOnce(emptyChain);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.updated).toBe(0);
  });

  it("updates trust score and awards elite badge for high-scoring advisor", async () => {
    makeChain(
      { data: [PROF_ROW], error: null },
      { error: null },
      { error: null },
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(body.badgesAwarded).toBeGreaterThanOrEqual(1);
  });

  it("skips badge award when score is below 40", async () => {
    const lowScoreRow = {
      ...PROF_ROW,
      verified: false,
      afsl_number: null,
      bio: null,
      photo_url: null,
      rating: null,
      review_count: 0,
      years_experience: 0,
      created_at: new Date().toISOString(),
    };

    const selectChain: Record<string, ReturnType<typeof vi.fn>> = {};
    selectChain.select = vi.fn(() => selectChain);
    selectChain.eq = vi.fn(() => Promise.resolve({ data: [lowScoreRow], error: null }));

    const updateChain: Record<string, ReturnType<typeof vi.fn>> = {};
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => Promise.resolve({ error: null }));

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return selectChain;
      return updateChain;
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated).toBe(1);
    expect(body.badgesAwarded).toBe(0);
  });

  it("counts errors when update fails", async () => {
    const selectChain: Record<string, ReturnType<typeof vi.fn>> = {};
    selectChain.select = vi.fn(() => selectChain);
    selectChain.eq = vi.fn(() => Promise.resolve({ data: [PROF_ROW], error: null }));

    const updateChain: Record<string, ReturnType<typeof vi.fn>> = {};
    updateChain.update = vi.fn(() => updateChain);
    updateChain.eq = vi.fn(() => Promise.resolve({ error: { message: "update failed" } }));

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return selectChain;
      return updateChain;
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.updated).toBe(0);
  });
});
