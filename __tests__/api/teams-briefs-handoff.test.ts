import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
vi.mock("@/lib/team-brief-routes", () => ({
  resolveSquadRouteContext: (...args: unknown[]) => resolveSquadRouteContextMock(...args),
}));

const handoffBriefAssignmentMock = vi.fn();
vi.mock("@/lib/team-brief-assignments", () => ({
  handoffBriefAssignment: (...args: unknown[]) => handoffBriefAssignmentMock(...args),
}));

// Admin client used only for the to_professional_id membership check.
const memberMaybeSingleMock = vi.fn(async () => ({ data: { id: 3, status: "active" } }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: () => memberMaybeSingleMock() })),
        })),
      })),
    })),
  })),
}));

import { POST } from "@/app/api/teams/[slug]/briefs/[briefId]/handoff/route";

const ROUTE = { teamId: 5, briefId: 42, briefSlug: "b", briefTitle: "T", teamSlug: "a", teamName: "A" };

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad", briefId: "42" }) };
}

function postReq(body: unknown = {}): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/briefs/42/handoff", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teams/[slug]/briefs/[briefId]/handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    memberMaybeSingleMock.mockResolvedValue({ data: { id: 3, status: "active" } });
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    expect((await POST(postReq(), ctx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(), ctx())).status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    expect((await POST(postReq({ to_professional_id: -1 }), ctx())).status).toBe(400);
  });

  it("returns 404 when route context cannot be resolved", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(), ctx())).status).toBe(404);
  });

  it("returns 400 when handoff target is not an active member", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    memberMaybeSingleMock.mockResolvedValueOnce({ data: { id: 3, status: "invited" } });
    const res = await POST(postReq({ to_professional_id: 7 }), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 409 when caller has no active claim", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    handoffBriefAssignmentMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(), ctx())).status).toBe(409);
  });

  it("hands off the brief and returns from/to rows", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    handoffBriefAssignmentMock.mockResolvedValueOnce({
      fromRow: { id: 1, status: "handed_off" },
      toRow: { id: 2, status: "claimed" },
    });
    const res = await POST(postReq({ to_professional_id: 7, note: "yours now" }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, from: { id: 1 }, to: { id: 2 } });
  });

  it("returns 500 when the helper throws", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    handoffBriefAssignmentMock.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(postReq(), ctx())).status).toBe(500);
  });
});
