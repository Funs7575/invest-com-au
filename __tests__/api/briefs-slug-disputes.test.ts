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
  mockRequireAdvisorSession: vi.fn(async () => null as number | null),
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

const mockGetUser = vi.fn(async () => ({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: vi.fn(async () => false),
}));

const mockOpenDispute = vi.fn(async () => ({ id: 1, brief_id: 1, reason: "test" }));

vi.mock("@/lib/disputes", () => ({
  openDispute: (...args: unknown[]) => mockOpenDispute(...args),
  DisputeError: class DisputeError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/api-schemas", () => ({
  OpenDisputeRequest: {
    safeParse: (v: unknown) => {
      if (v && typeof v === "object" && "reason" in v) {
        return { success: true, data: v as Record<string, unknown>, error: null };
      }
      return { success: false, error: { issues: [{ message: "reason is required" }] } };
    },
  },
}));

import { POST } from "@/app/api/briefs/[slug]/disputes/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/disputes", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const validBrief = {
  id: 1,
  contact_email: "consumer@test.com",
  accepted_at: "2026-05-01T00:00:00Z",
  accepted_by_professional_id: 42,
  accepted_by_team_id: null,
};

describe("/api/briefs/[slug]/disputes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validBrief, error: null }));
    mockOpenDispute.mockResolvedValue({ id: 1, brief_id: 1, reason: "test" });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq({ reason: "fraud" }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 400 when no body", async () => {
    const req = new Request("http://localhost/api/briefs/x/disputes", { method: "POST" }) as unknown as NextRequest;
    const res = await POST(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 400 when reason missing", async () => {
    const res = await POST(makeReq({}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq({ reason: "fraud" }), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 401 when neither advisor nor consumer matches", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "other@test.com" } }, error: null });
    const res = await POST(makeReq({ reason: "fraud" }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 200 when consumer opens dispute", async () => {
    const res = await POST(makeReq({ reason: "fraud" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.dispute).toBeDefined();
  });
});
