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

const { mockIsAllowed, mockRequireAdvisorSession, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { PATCH } from "@/app/api/teams/[slug]/ops-settings/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/ops-settings", {
    method: "PATCH",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad") {
  return { params: Promise.resolve({ slug }) };
}

describe("/api/teams/[slug]/ops-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    // Default: team found, member found, update succeeds
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1 }, error: null });
      }
      if (table === "expert_team_members") {
        return makeBuilder({ data: { id: 10 }, error: null });
      }
      return makeBuilder({ data: {}, error: null });
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makeReq({ specialty_tags: ["tax"] }), makeCtx() as any);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makeReq({ specialty_tags: ["tax"] }), makeCtx() as any);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid auto_claim_mode", async () => {
    const res = await PATCH(makeReq({ auto_claim_mode: "invalid_mode" }), makeCtx() as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await PATCH(makeReq({ specialty_tags: ["tax"] }), makeCtx() as any);
    expect(res.status).toBe(404);
  });

  it("returns 403 when not a team member", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1 }, error: null });
      }
      // expert_team_members returns null
      return makeBuilder({ data: null, error: null });
    });
    const res = await PATCH(makeReq({ specialty_tags: ["tax"] }), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("returns 200 on success with specialty_tags", async () => {
    const res = await PATCH(makeReq({ specialty_tags: ["tax", "super"] }), makeCtx() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 200 with empty body (no-op)", async () => {
    const res = await PATCH(makeReq({}), makeCtx() as any);
    expect(res.status).toBe(200);
  });
});