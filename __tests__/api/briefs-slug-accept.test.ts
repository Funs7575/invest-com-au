import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockIsAllowed = vi.fn(async () => true);
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

const mockAcceptBrief = vi.fn(async () => ({
  accepted: true,
  creditsSpent: 1,
  balanceAfterCents: 100,
  brief: {},
}));

vi.mock("@/lib/briefs/credits", () => ({
  acceptBrief: (...args: unknown[]) => mockAcceptBrief(...args),
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: vi.fn(async () => false),
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendConsumerProviderAccepted: vi.fn(async () => {}),
}));

vi.mock("@/lib/user-notifications", () => ({
  enqueueUserNotificationByEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/pro-affiliate/track", () => ({
  attributeBriefAccepted: vi.fn(async () => {}),
}));

vi.mock("@/lib/api-schemas", () => ({
  AcceptBriefRequest: {
    safeParse: (v: unknown) => ({ success: true, data: (v && typeof v === "object" ? v : {}) as Record<string, unknown>, error: null }),
  },
}));

import { POST } from "@/app/api/briefs/[slug]/accept/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/accept", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

describe("/api/briefs/[slug]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    mockAcceptBrief.mockResolvedValue({ accepted: true, creditsSpent: 1, balanceAfterCents: 100, brief: {} });
  });

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({}), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 200 on successful accept", async () => {
    const briefData = {
      id: 1,
      slug: "x",
      job_title: "Test Brief",
      contact_email: "consumer@test.com",
      contact_name: "Consumer",
      contact_phone: "0400000000",
    };
    mockAdminFrom.mockReturnValue(makeBuilder({ data: briefData, error: null }));
    mockAcceptBrief.mockResolvedValue({ accepted: true, creditsSpent: 2, balanceAfterCents: 50, brief: briefData });

    const res = await POST(makeReq({}), makeCtx("x"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 402 when insufficient credits", async () => {
    const briefData = { id: 1, slug: "x", job_title: "Test", contact_email: null, contact_name: null, contact_phone: null };
    mockAdminFrom.mockReturnValue(makeBuilder({ data: briefData, error: null }));
    mockAcceptBrief.mockResolvedValue({ accepted: false, reason: "insufficient_credits" });

    const res = await POST(makeReq({}), makeCtx("x"));
    expect(res.status).toBe(402);
  });

  it("returns 409 when already accepted", async () => {
    const briefData = { id: 1, slug: "x", job_title: "Test", contact_email: null, contact_name: null, contact_phone: null };
    mockAdminFrom.mockReturnValue(makeBuilder({ data: briefData, error: null }));
    mockAcceptBrief.mockResolvedValue({ accepted: false, reason: "already_accepted" });

    const res = await POST(makeReq({}), makeCtx("x"));
    expect(res.status).toBe(409);
  });
});
