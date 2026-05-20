/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockResolveSquadRouteContext, mockClaimBriefForMember } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockResolveSquadRouteContext: vi.fn(async () => ({
    teamId: 1,
    teamSlug: "test-squad",
    teamName: "Test Squad",
    briefId: 10,
    briefTitle: "Test Brief",
  })),
  mockClaimBriefForMember: vi.fn(async () => ({ ok: true, created: true, row: { id: 5 } })),
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
  listOtherActiveMembers: vi.fn(async () => []),
}));

vi.mock("@/lib/team-brief-assignments", () => ({
  claimBriefForMember: mockClaimBriefForMember,
}));

vi.mock("@/lib/api-schemas", () => ({
  SquadClaimBriefRequest: {
    safeParse: vi.fn((v: unknown) => ({ success: true, data: v })),
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { name: "Advisor" }, error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/marketplace-squad-emails", () => ({
  sendSquadClaimNotification: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/teams/[slug]/briefs/[briefId]/claim/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/briefs/10/claim", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad", briefId = "10") {
  return { params: Promise.resolve({ slug, briefId }) };
}

describe("/api/teams/[slug]/briefs/[briefId]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockResolveSquadRouteContext.mockResolvedValue({
      teamId: 1,
      teamSlug: "test-squad",
      teamName: "Test Squad",
      briefId: 10,
      briefTitle: "Test Brief",
    });
    mockClaimBriefForMember.mockResolvedValue({ ok: true, created: true, row: { id: 5 } });
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

  it("returns 409 when another member has already claimed", async () => {
    mockClaimBriefForMember.mockResolvedValue({ ok: false, reason: "already_claimed" });
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful claim", async () => {
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});