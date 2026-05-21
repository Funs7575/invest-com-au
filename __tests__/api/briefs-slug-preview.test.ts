import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(async () => 42 as number | null),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockAdminFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, rpc: vi.fn(() => makeBuilder()) })),
}));

const mockMaskBrief = vi.fn((b: unknown) => b);
const mockGetAcceptCost = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 3);

vi.mock("@/lib/briefs/mask", () => ({
  maskBriefForProvider: (b: unknown) => mockMaskBrief(b),
}));

vi.mock("@/lib/briefs/credits", () => ({
  getAcceptCost: (...args: unknown[]) => mockGetAcceptCost(...args),
}));

import { GET } from "@/app/api/briefs/[slug]/preview/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/briefs/x/preview", {
    method: "GET",
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const clearBrief = {
  id: 1,
  slug: "x",
  status: "open",
  risk_review_status: "clear",
  brief_template: "general",
  accept_credits_cost: null,
  provider_preference: null,
};

describe("/api/briefs/[slug]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockReturnValue(makeBuilder({ data: clearBrief, error: null }));
    mockMaskBrief.mockImplementation((b) => ({ ...(b as object), accept_credits_cost: null }));
    mockGetAcceptCost.mockResolvedValue(3);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET(makeReq(), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns stub when brief is risk-held", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({
      data: { ...clearBrief, risk_review_status: "pending" },
      error: null,
    }));
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.held_for_review).toBe(true);
  });

  it("returns 200 with masked brief when clear", async () => {
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.masked).toBe(true);
    expect(json.brief).toBeDefined();
  });
});
