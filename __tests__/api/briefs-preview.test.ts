import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockMask, mockGetAcceptCost } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockMask: vi.fn(),
    mockGetAcceptCost: vi.fn(),
  }));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/briefs/mask", () => ({
  maskBriefForProvider: mockMask,
}));

vi.mock("@/lib/briefs/credits", () => ({
  getAcceptCost: mockGetAcceptCost,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/briefs/[slug]/preview/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/briefs/b1/preview", { method: "GET" });
}
const ctx = { params: Promise.resolve({ slug: "b1" }) };

function makeChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "maybeSingle"]) chain[m] = vi.fn(() => chain);
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockRequireAdvisorSession.mockResolvedValue(42);
  mockMask.mockImplementation((row: { slug: string }) => ({
    slug: row.slug,
    brief_template: "tax",
    provider_preference: "individual",
    accept_credits_cost: 5,
  }));
});

describe("GET /api/briefs/[slug]/preview", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(429);
  });

  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(401);
  });

  it("404 when brief not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null }));
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(404);
  });

  it("returns held stub when risk review not cleared", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { slug: "b1", status: "open", risk_review_status: "pending" } }),
    );
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.held_for_review).toBe(true);
    expect(mockMask).not.toHaveBeenCalled();
  });

  it("happy path returns masked brief", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { slug: "b1", risk_review_status: "clear" } }),
    );
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.masked).toBe(true);
    expect(json.brief.slug).toBe("b1");
  });

  it("computes live accept cost when not stamped", async () => {
    mockMask.mockReturnValue({
      slug: "b1",
      brief_template: "tax",
      provider_preference: "firm",
      accept_credits_cost: null,
    });
    mockGetAcceptCost.mockResolvedValue(9);
    mockFrom.mockReturnValue(
      makeChain({ data: { slug: "b1", risk_review_status: "approved" } }),
    );
    const res = await GET(makeReq(), ctx);
    const json = await res.json();
    expect(mockGetAcceptCost).toHaveBeenCalledWith({
      briefTemplate: "tax",
      providerKind: "firm",
    });
    expect(json.brief.accept_credits_cost).toBe(9);
  });

  it("500 when query throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeReq(), ctx);
    expect(res.status).toBe(500);
  });
});
