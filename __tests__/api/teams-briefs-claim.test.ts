import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const requireAdvisorSessionMock = vi.fn<() => Promise<number | null>>();
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: () => requireAdvisorSessionMock(),
}));

const resolveSquadRouteContextMock = vi.fn();
const listOtherActiveMembersMock = vi.fn(async () => []);
vi.mock("@/lib/team-brief-routes", () => ({
  resolveSquadRouteContext: (...args: unknown[]) => resolveSquadRouteContextMock(...args),
  listOtherActiveMembers: (...args: unknown[]) => listOtherActiveMembersMock(...args),
}));

const claimBriefForMemberMock = vi.fn();
vi.mock("@/lib/team-brief-assignments", () => ({
  claimBriefForMember: (...args: unknown[]) => claimBriefForMemberMock(...args),
}));

vi.mock("@/lib/marketplace-squad-emails", () => ({
  sendSquadClaimNotification: vi.fn(async () => undefined),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { name: "Bob" } })) })),
      })),
    })),
  })),
}));

import { POST } from "@/app/api/teams/[slug]/briefs/[briefId]/claim/route";

const ROUTE = {
  teamId: 5,
  teamSlug: "alpha-squad",
  teamName: "Alpha Squad",
  briefId: 42,
  briefSlug: "brief-42",
  briefTitle: "Tax help",
};

function ctx(slug = "alpha-squad", briefId = "42") {
  return { params: Promise.resolve({ slug, briefId }) };
}

function postReq(body: unknown = {}): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/briefs/42/claim", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teams/[slug]/briefs/[briefId]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(postReq(), ctx());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    const res = await POST(postReq(), ctx());
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    const res = await POST(postReq({ notes: 123 }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when route context cannot be resolved", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(null);
    const res = await POST(postReq(), ctx());
    expect(res.status).toBe(404);
  });

  it("returns 409 when another member already claimed", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    claimBriefForMemberMock.mockResolvedValueOnce({ ok: false, reason: "already_claimed" });
    const res = await POST(postReq(), ctx());
    expect(res.status).toBe(409);
  });

  it("claims the brief and returns success", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    claimBriefForMemberMock.mockResolvedValueOnce({ ok: true, created: true, row: { id: 9 } });
    const res = await POST(postReq({ notes: "mine" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, created: true, assignment: { id: 9 } });
  });

  it("returns 500 when the claim helper throws", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    claimBriefForMemberMock.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(postReq(), ctx());
    expect(res.status).toBe(500);
  });
});
