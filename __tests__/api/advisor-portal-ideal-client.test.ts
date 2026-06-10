/**
 * Tests for GET + PUT /api/advisor-portal/ideal-client
 *
 * Auth: requireAdvisorSession
 * GET branches: 401, 500 (db error), 200 (existing criteria), 200 (null criteria + meta)
 * PUT (withValidatedBody): 400 (bad body), 401, 500 (db error), 200
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>().mockResolvedValue(7),
  mockAdminFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (..._args: unknown[]) => mockRequireAdvisorSession(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, PUT } from "@/app/api/advisor-portal/ideal-client/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "upsert", "eq", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/ideal-client", { method: "GET" });
}

function makePut(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/ideal-client", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/ideal-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(7);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/unauthorized/i);
  });

  it("returns 500 when the DB query fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    expect((await res.json() as Record<string, unknown>).error).toBe("fetch_failed");
  });

  it("returns 200 with null criteria when no record exists", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.criteria).toBeNull();
    expect(body.updated_at).toBeNull();
    // meta should include all valid enums
    const meta = body.meta as Record<string, unknown>;
    expect(Array.isArray(meta.valid_verticals)).toBe(true);
    expect(Array.isArray(meta.valid_budget_bands)).toBe(true);
    expect(Array.isArray(meta.valid_archetypes)).toBe(true);
    expect(Array.isArray(meta.valid_experience_levels)).toBe(true);
  });

  it("returns 200 with existing criteria and metadata", async () => {
    const criteria = {
      verticals: ["etf", "shares"],
      budget_bands: ["100k_250k"],
      archetypes: ["hnw"],
      experience_levels: ["intermediate"],
    };
    mockAdminFrom.mockReturnValue(
      makeBuilder({ criteria, updated_at: "2026-05-01T10:00:00Z" }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.criteria).toEqual(criteria);
    expect(body.updated_at).toBe("2026-05-01T10:00:00Z");
  });
});

// ── PUT tests ─────────────────────────────────────────────────────────────────

describe("PUT /api/advisor-portal/ideal-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(7);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-portal/ideal-client", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{bad-json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when verticals contains an invalid enum value", async () => {
    const res = await PUT(makePut({ verticals: ["not_valid_vertical"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when budget_bands exceeds the max count of 6", async () => {
    const bands = ["under_100k", "100k_250k", "250k_500k", "500k_1m", "1m_5m", "5m_plus", "under_100k"];
    const res = await PUT(makePut({ budget_bands: bands }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description exceeds 500 characters", async () => {
    const res = await PUT(makePut({ description: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when requireAdvisorSession returns null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PUT(makePut({ verticals: ["etf"] }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when upsert fails", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "upsert error" }));
    const res = await PUT(makePut({ verticals: ["etf"] }));
    expect(res.status).toBe(500);
    expect((await res.json() as Record<string, unknown>).error).toBe("upsert_failed");
  });

  it("returns 200 with success and criteria on successful upsert", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null)); // upsert success (no error)
    const criteria = {
      verticals: ["etf", "shares"],
      budget_bands: ["100k_250k", "250k_500k"],
      archetypes: ["hnw", "pre_retiree"],
      experience_levels: ["intermediate", "advanced"],
      description: "Looking for HNW investors",
    };
    const res = await PUT(makePut(criteria));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.criteria).toEqual(criteria);
  });

  it("accepts empty object body (all fields optional)", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await PUT(makePut({}));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.success).toBe(true);
  });
});
