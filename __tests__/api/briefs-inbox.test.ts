import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockRequireAdvisorSession = vi.fn(async () => 42);

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

const mockIsAllowed = vi.fn(async () => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "127.0.0.1"),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

vi.mock("@/lib/briefs/mask", () => ({
  maskBriefForProvider: vi.fn((brief: unknown) => brief),
}));

import { GET } from "@/app/api/briefs/inbox/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/briefs/inbox", {
    method: "GET",
  });
}

describe("/api/briefs/inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
  });

  it("rejects unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns inbox for authenticated advisor", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("available");
    expect(json).toHaveProperty("accepted");
    expect(json).toHaveProperty("teamIds");
    expect(Array.isArray(json.available)).toBe(true);
    expect(Array.isArray(json.accepted)).toBe(true);
  });

  it("filters out non-direct briefs based on advisor_types", async () => {
    const openBrief = {
      flow_type: "accept",
      status: "open",
      risk_review_status: "clear",
      routing_mode: "any",
      provider_preference: "individual",
      advisor_types: ["financial_advisor"],
      target_professional_id: null,
      target_team_id: null,
      target_firm_id: null,
    };
    // First call: expert_team_members, second: professionals, third: openBriefs, fourth: acceptedBriefs
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 3) {
        return makeBuilder({ data: [openBrief], error: null });
      }
      return makeBuilder({ data: [], error: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });
});
