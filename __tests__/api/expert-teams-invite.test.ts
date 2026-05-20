import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const mockGetInvitationByToken = vi.fn(async () => ({
  id: 1,
  team_id: 1,
  email: "invited@test.com",
  name: "Invited Pro",
  invited_role: "member",
  status: "pending",
  expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
}));

vi.mock("@/lib/expert-teams", () => ({
  getInvitationByToken: (...args: unknown[]) => mockGetInvitationByToken(...args),
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
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/expert-teams/invite/route";

function makeReq(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/expert-teams/invite?token=${encodeURIComponent(token)}`
    : "http://localhost/api/expert-teams/invite";
  return new NextRequest(url, { method: "GET" });
}

const validTeam = { id: 1, name: "Alpha Team", slug: "alpha-team", team_category: "financial_advice" };

describe("/api/expert-teams/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetInvitationByToken.mockResolvedValue({
      id: 1,
      team_id: 1,
      email: "invited@test.com",
      name: "Invited Pro",
      invited_role: "member",
      status: "pending",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    mockAdminFrom.mockReturnValue(makeBuilder({ data: validTeam, error: null }));
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq("test-token"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when no token provided", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("returns 404 when invitation not found", async () => {
    mockGetInvitationByToken.mockResolvedValue(null);
    const res = await GET(makeReq("invalid-token"));
    expect(res.status).toBe(404);
  });

  it("returns 410 when invitation already used", async () => {
    mockGetInvitationByToken.mockResolvedValue({
      id: 1,
      team_id: 1,
      email: "invited@test.com",
      name: "Invited Pro",
      invited_role: "member",
      status: "accepted",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    const res = await GET(makeReq("used-token"));
    expect(res.status).toBe(410);
  });

  it("returns 410 when invitation expired", async () => {
    mockGetInvitationByToken.mockResolvedValue({
      id: 1,
      team_id: 1,
      email: "invited@test.com",
      name: "Invited Pro",
      invited_role: "member",
      status: "pending",
      expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
    });
    const res = await GET(makeReq("expired-token"));
    expect(res.status).toBe(410);
  });

  it("returns 200 with invitation details on valid token", async () => {
    const res = await GET(makeReq("valid-token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe("invited@test.com");
    expect(json.role).toBe("member");
    expect(json.team).toBeDefined();
  });
});
