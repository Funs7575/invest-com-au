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

const releaseBriefAssignmentMock = vi.fn();
vi.mock("@/lib/team-brief-assignments", () => ({
  releaseBriefAssignment: (...args: unknown[]) => releaseBriefAssignmentMock(...args),
}));

import { POST } from "@/app/api/teams/[slug]/briefs/[briefId]/release/route";

const ROUTE = { teamId: 5, briefId: 42, briefSlug: "b", briefTitle: "T", teamSlug: "a", teamName: "A" };

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad", briefId: "42" }) };
}

function postReq(body: unknown = {}): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/briefs/42/release", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/teams/[slug]/briefs/[briefId]/release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
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
    expect((await POST(postReq({ note: 5 }), ctx())).status).toBe(400);
  });

  it("returns 404 when route context cannot be resolved", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(), ctx())).status).toBe(404);
  });

  it("returns 409 when no claim exists", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    releaseBriefAssignmentMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(), ctx())).status).toBe(409);
  });

  it("releases the assignment and returns success", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    releaseBriefAssignmentMock.mockResolvedValueOnce({ id: 9, status: "released" });
    const res = await POST(postReq(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, assignment: { id: 9 } });
  });

  it("returns 500 when the helper throws", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    resolveSquadRouteContextMock.mockResolvedValueOnce(ROUTE);
    releaseBriefAssignmentMock.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(postReq(), ctx())).status).toBe(500);
  });
});
