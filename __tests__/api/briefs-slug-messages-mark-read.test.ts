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

const mockMarkRead = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 3);

vi.mock("@/lib/brief-messages", () => ({
  markRead: (...args: unknown[]) => mockMarkRead(...args),
  BriefMessageError: class BriefMessageError extends Error {
    status: number;
    constructor(msg: string, status = 400) {
      super(msg);
      this.status = status;
    }
  },
}));

import { POST } from "@/app/api/briefs/[slug]/messages/mark-read/route";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/briefs/x/messages/mark-read", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x") {
  return { params: Promise.resolve({ slug }) } as { params: Promise<{ slug: string }> };
}

const acceptedBrief = {
  id: 1,
  contact_email: "consumer@test.com",
  accepted_at: "2026-05-01T00:00:00Z",
  accepted_by_professional_id: 42,
  accepted_by_team_id: null,
};

const notAcceptedBrief = {
  ...acceptedBrief,
  accepted_at: null,
};

describe("/api/briefs/[slug]/messages/mark-read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null });
    mockAdminFrom.mockReturnValue(makeBuilder({ data: acceptedBrief, error: null }));
    mockMarkRead.mockResolvedValue(3);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(429);
  });

  it("returns 404 when brief not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq(), makeCtx("notfound"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated=0 when not yet accepted", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: notAcceptedBrief, error: null }));
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(0);
  });

  it("returns 401 when neither advisor nor consumer matches", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "other@test.com" } }, error: null });
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(401);
  });

  it("returns 200 when consumer matches", async () => {
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.updated).toBe(3);
  });

  it("returns 200 when advisor is the accepted pro", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
  });
});
