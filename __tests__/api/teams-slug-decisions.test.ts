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

const { mockIsAllowed, mockRequireAdvisorSession, mockFrom, mockRecordDecision, mockClearDecision } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockFrom: vi.fn(),
  mockRecordDecision: vi.fn(async () => ({ id: 1, decision: "not_for_us" })),
  mockClearDecision: vi.fn(async () => undefined),
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

vi.mock("@/lib/team-brief-decisions", () => ({
  recordDecision: mockRecordDecision,
  clearDecision: mockClearDecision,
}));

import { POST, DELETE } from "@/app/api/teams/[slug]/decisions/route";

function makePostReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/decisions", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeDeleteReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/decisions", {
    method: "DELETE",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad") {
  return { params: Promise.resolve({ slug }) };
}

const validPostBody = { briefId: 1, decision: "not_for_us" };
const validDeleteBody = { briefId: 1 };

describe("/api/teams/[slug]/decisions", () => {
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
  });

  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireAdvisorSession.mockResolvedValue(null);
      const res = await POST(makePostReq(validPostBody), makeCtx() as any);
      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockIsAllowed.mockResolvedValue(false);
      const res = await POST(makePostReq(validPostBody), makeCtx() as any);
      expect(res.status).toBe(429);
    });

    it("returns 400 for invalid decision value", async () => {
      const res = await POST(makePostReq({ briefId: 1, decision: "bad_value" }), makeCtx() as any);
      expect(res.status).toBe(400);
    });

    it("returns 400 when briefId missing", async () => {
      const res = await POST(makePostReq({ decision: "not_for_us" }), makeCtx() as any);
      expect(res.status).toBe(400);
    });

    it("returns 404 when team not found", async () => {
      mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
      const res = await POST(makePostReq(validPostBody), makeCtx() as any);
      expect(res.status).toBe(404);
    });

    it("returns 403 when not team member", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "expert_teams") {
          return makeBuilder({ data: { id: 1 }, error: null });
        }
        return makeBuilder({ data: null, error: null });
      });
      const res = await POST(makePostReq(validPostBody), makeCtx() as any);
      expect(res.status).toBe(403);
    });

    it("returns 200 with decision on success", async () => {
      const res = await POST(makePostReq(validPostBody), makeCtx() as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("decision");
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not authenticated", async () => {
      mockRequireAdvisorSession.mockResolvedValue(null);
      const res = await DELETE(makeDeleteReq(validDeleteBody), makeCtx() as any);
      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid briefId", async () => {
      const res = await DELETE(makeDeleteReq({ briefId: -1 }), makeCtx() as any);
      expect(res.status).toBe(400);
    });

    it("returns 200 on success", async () => {
      const res = await DELETE(makeDeleteReq(validDeleteBody), makeCtx() as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});