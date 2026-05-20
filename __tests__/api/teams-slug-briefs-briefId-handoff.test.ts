/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const { mockIsAllowed, mockRequireAdvisorSession, mockResolveSquadRouteContext, mockHandoffBriefAssignment, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockResolveSquadRouteContext: vi.fn(async () => ({
    teamId: 1,
    teamSlug: "test-squad",
    teamName: "Test Squad",
    briefId: 10,
    briefTitle: "Test Brief",
  })),
  mockHandoffBriefAssignment: vi.fn(async () => ({ fromRow: { id: 5, status: "handed_off" }, toRow: null })),
  mockFrom: vi.fn(),
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
  handoffBriefAssignment: mockHandoffBriefAssignment,
}));

vi.mock("@/lib/api-schemas", () => ({
  SquadHandoffBriefRequest: {
    safeParse: vi.fn((v: unknown) => ({ success: true, data: { note: null, to_professional_id: null, ...((v as Record<string, unknown>) ?? {}) } })),
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/teams/[slug]/briefs/[briefId]/handoff/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/briefs/10/handoff", {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad", briefId = "10") {
  return { params: Promise.resolve({ slug, briefId }) };
}

describe("/api/teams/[slug]/briefs/[briefId]/handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockResolveSquadRouteContext.mockResolvedValue({
      teamId: 1, teamSlug: "test-squad", teamName: "Test Squad", briefId: 10, briefTitle: "Test Brief",
    });
    mockHandoffBriefAssignment.mockResolvedValue({ fromRow: { id: 5 }, toRow: null });
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
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

  it("returns 409 when caller has no active claim", async () => {
    mockHandoffBriefAssignment.mockResolvedValue(null);
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(409);
  });

  it("returns 200 on successful handoff", async () => {
    const res = await POST(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});