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

const { mockIsAllowed, mockRequireAdvisorSession, mockFrom, mockRunBulkAction } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 42),
  mockFrom: vi.fn(),
  mockRunBulkAction: vi.fn(async () => ({
    results: [{ briefId: 1, ok: true }],
    summary: { total: 1, ok: 1, failed: 0 },
  })),
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

vi.mock("@/lib/squad-bulk-actions", () => ({
  runBulkAction: mockRunBulkAction,
  MAX_BULK: 50,
}));

import { POST } from "@/app/api/teams/[slug]/briefs/bulk/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/briefs/bulk", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad") {
  return { params: Promise.resolve({ slug }) };
}

const validBody = {
  action: "claim",
  brief_ids: [1, 2, 3],
};

describe("/api/teams/[slug]/briefs/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    // Default: team found, member found
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1 }, error: null });
      }
      if (table === "expert_team_members") {
        return makeBuilder({ data: { id: 10 }, error: null });
      }
      return makeBuilder();
    });
    mockRunBulkAction.mockResolvedValue({
      results: [{ briefId: 1, ok: true }],
      summary: { total: 1, ok: 1, failed: 0 },
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeReq({ action: "invalid_action", brief_ids: [1] }), makeCtx() as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty brief_ids", async () => {
    const res = await POST(makeReq({ action: "claim", brief_ids: [] }), makeCtx() as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(404);
  });

  it("returns 403 when not a team member", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1 }, error: null });
      }
      // expert_team_members: no member found
      return makeBuilder({ data: null, error: null });
    });
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("returns 400 for refer action without to_team_id", async () => {
    const res = await POST(makeReq({ action: "refer", brief_ids: [1] }), makeCtx() as any);
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful bulk action", async () => {
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.ok).toBe(1);
  });
});