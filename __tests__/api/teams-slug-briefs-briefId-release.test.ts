/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockResolveSquadRouteContext, mockReleaseBriefAssignment } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true),
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42),
  mockResolveSquadRouteContext: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
    teamId: 1,
    teamSlug: "test-squad",
    teamName: "Test Squad",
    briefId: 10,
    briefTitle: "Test Brief",
  })),
  mockReleaseBriefAssignment: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ id: 5, status: "released" })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/team-brief-routes", () => ({
  resolveSquadRouteContext: mockResolveSquadRouteContext,
}));

vi.mock("@/lib/team-brief-assignments", () => ({
  releaseBriefAssignment: mockReleaseBriefAssignment,
}));

vi.mock("@/lib/api-schemas", () => ({
  SquadReleaseBriefRequest: {
    safeParse: vi.fn((v: unknown) => ({ success: true, data: v })),
  },
}));

import { POST } from "@/app/api/teams/[slug]/briefs/[briefId]/release/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/briefs/10/release", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad", briefId = "10") {
  return { params: Promise.resolve({ slug, briefId }) };
}

describe("/api/teams/[slug]/briefs/[briefId]/release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockResolveSquadRouteContext.mockResolvedValue({
      teamId: 1, teamSlug: "test-squad", teamName: "Test Squad", briefId: 10, briefTitle: "Test Brief",
    });
    mockReleaseBriefAssignment.mockResolvedValue({ id: 5, status: "released" });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(), makeCtx() as any);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(), makeCtx() as any);
    expect(res.status).toBe(429);
  });

  it("returns 404 when brief not found for team", async () => {
    mockResolveSquadRouteContext.mockResolvedValue(null);
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(404);
  });

  it("returns 409 when caller has no claim on brief", async () => {
    mockReleaseBriefAssignment.mockResolvedValue(null);
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful release", async () => {
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});