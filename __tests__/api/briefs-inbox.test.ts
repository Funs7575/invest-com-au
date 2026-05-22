import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockMask } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockRequireAdvisorSession: vi.fn(),
  mockMask: vi.fn((row: unknown) => ({ masked: true, ...(row as object) })),
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

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/briefs/inbox/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/briefs/inbox", { method: "GET" });
}

// Generic thenable chain — every chain method returns the chain; the chain
// itself is awaitable and resolves to `result`. Lets us drive every terminal
// call (.order().limit(), .maybeSingle()) without knowing the exact tail.
function makeChain(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "eq", "in", "is", "or", "order", "limit", "maybeSingle", "single",
  ];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockRequireAdvisorSession.mockResolvedValue(42);
  mockMask.mockImplementation((row: unknown) => ({ masked: true, ...(row as object) }));
});

describe("GET /api/briefs/inbox", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq());
    expect(res.status).toBe(429);
  });

  it("401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("happy path returns available + accepted buckets", async () => {
    const openBrief = {
      slug: "b1",
      routing_mode: "broadcast",
      provider_preference: "any",
      flow_type: "accept",
      status: "open",
    };
    // Calls in order: expert_team_members, professionals, advisor_auctions(open),
    // advisor_auctions(accepted).
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [{ team_id: 7 }] }))
      .mockReturnValueOnce(makeChain({ data: { type: "accountant", firm_id: null } }))
      .mockReturnValueOnce(makeChain({ data: [openBrief] }))
      .mockReturnValueOnce(makeChain({ data: [{ id: 1, slug: "acc1" }] }));

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.available).toHaveLength(1);
    expect(json.available[0].masked).toBe(true);
    expect(json.accepted).toHaveLength(1);
    expect(json.teamIds).toEqual([7]);
  });

  it("filters out direct-targeted briefs not aimed at the caller", async () => {
    const directBrief = {
      slug: "d1",
      routing_mode: "direct",
      target_professional_id: 999,
      target_team_id: null,
      target_firm_id: null,
    };
    mockFrom
      .mockReturnValueOnce(makeChain({ data: [] }))
      .mockReturnValueOnce(makeChain({ data: { type: null, firm_id: null } }))
      .mockReturnValueOnce(makeChain({ data: [directBrief] }))
      .mockReturnValueOnce(makeChain({ data: [] }));

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.available).toHaveLength(0);
  });

  it("500 when a query throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("db down");
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
