/**
 * Tests for GET /api/office-hours
 *
 * Auth: none (public)
 * Branches: 500 (db error), 200 (default filter), 200 (valid status param),
 *           200 (invalid status param → defaults to upcoming/live/transcript),
 *           200 (limit clamped), Cache-Control header present
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: (..._args: unknown[]) => mockFrom() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/office-hours/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = [], error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/office-hours");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const SESSION = {
  id: 1,
  title: "AMA: ETF Basics",
  scheduled_at: "2026-06-01T10:00:00Z",
  ends_at: null,
  status: "upcoming",
  max_questions: 20,
  rsvp_count: 5,
  advisor_id: 42,
  professionals: { id: 42, name: "Jane Smith", slug: "jane-smith", type: "planner", firm_name: "AusSuper", headshot_url: null },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/office-hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([SESSION]));
  });

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "db error" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 with sessions array on success", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.sessions)).toBe(true);
    expect((body.sessions as unknown[]).length).toBe(1);
  });

  it("returns empty sessions array when data is null", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.sessions).toEqual([]);
  });

  it("applies valid status filter", async () => {
    const b = makeBuilder([{ ...SESSION, status: "live" }]);
    const eqSpy = b.eq as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => b);
    const res = await GET(makeReq({ status: "live" }));
    expect(res.status).toBe(200);
    // eq("status", "live") should have been called
    expect(eqSpy).toHaveBeenCalledWith("status", "live");
  });

  it("falls back to default filter for invalid status param", async () => {
    const b = makeBuilder([SESSION]);
    const inSpy = b.in as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => b);
    const res = await GET(makeReq({ status: "invalid_status" }));
    expect(res.status).toBe(200);
    expect(inSpy).toHaveBeenCalledWith("status", ["upcoming", "live", "transcript"]);
  });

  it("clamps limit to 50 when given a larger value", async () => {
    const b = makeBuilder([SESSION]);
    const limitSpy = b.limit as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => b);
    await GET(makeReq({ limit: "100" }));
    expect(limitSpy).toHaveBeenCalledWith(50);
  });

  it("defaults to 20 when limit param is 0 (falsy → fallback)", async () => {
    // parseInt("0") = 0, which is falsy → 0 || 20 = 20, then Math.max(1,20) = 20
    const b = makeBuilder([SESSION]);
    const limitSpy = b.limit as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => b);
    await GET(makeReq({ limit: "0" }));
    expect(limitSpy).toHaveBeenCalledWith(20);
  });

  it("defaults limit to 20 when param is missing", async () => {
    const b = makeBuilder([SESSION]);
    const limitSpy = b.limit as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => b);
    await GET(makeReq());
    expect(limitSpy).toHaveBeenCalledWith(20);
  });

  it("includes Cache-Control header", async () => {
    const res = await GET(makeReq());
    expect(res.headers.get("Cache-Control")).toContain("public");
  });
});
