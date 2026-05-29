/**
 * Tests for GET /api/account/profile-share and POST /api/account/profile-share
 *
 * Auth: Both GET and POST require a Supabase Auth session.
 * Rate-limit: GET 30/min, POST 10/10min — both guarded by isAllowed().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(
  async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
    data: { user: { id: "u1", email: "u@e.com" } },
    error: null,
  }),
);

function makeBuilder(
  data: unknown = [],
  error: unknown = null,
): Record<string, unknown> {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt",
    "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "single", "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn((..._a: unknown[]) => c);
  }
  return c;
}

const mockServerFrom = vi.fn((..._a: unknown[]) => makeBuilder());
const mockAdminFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockIsAllowed = vi.fn(async (): Promise<boolean> => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._a: unknown[]) => mockIsAllowed(),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

import { GET, POST } from "@/app/api/account/profile-share/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(method: "GET" | "POST"): NextRequest {
  return new NextRequest("http://localhost/api/account/profile-share", {
    method,
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/account/profile-share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/too many/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("unauthorized");
  });

  it("returns 500 when query fails", async () => {
    mockServerFrom.mockImplementationOnce(() =>
      makeBuilder(null, { message: "db error" }),
    );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("fetch_failed");
  });

  it("returns tokens array for authenticated user", async () => {
    const tokens = [
      { id: 1, created_at: "2026-01-01", expires_at: "2026-02-01", consumed_at: null },
    ];
    mockServerFrom.mockImplementationOnce(() => makeBuilder(tokens));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json() as { tokens: unknown[] };
    expect(json).toHaveProperty("tokens");
    expect(json.tokens).toHaveLength(1);
  });

  it("returns empty tokens array when none exist", async () => {
    mockServerFrom.mockImplementationOnce(() => makeBuilder(null));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json() as { tokens: unknown[] };
    expect(json.tokens).toEqual([]);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/account/profile-share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    // Default all admin calls to succeed with null data
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(429);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/too many/i);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(401);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("unauthorized");
  });

  it("returns 500 when insert fails", async () => {
    // All 4 parallel snapshot queries succeed with null, insert fails
    let callCount = 0;
    mockAdminFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 5) {
        // 5th call is the insert
        return makeBuilder(null, { message: "insert error" });
      }
      return makeBuilder(null);
    });
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("insert_failed");
  });

  it("returns 201 with token, share_url, and expires_at on success", async () => {
    // All snapshot queries return null data; insert succeeds (no error)
    mockAdminFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null));
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(201);
    const json = await res.json() as { token: string; share_url: string; expires_at: string };
    expect(json).toHaveProperty("token");
    expect(typeof json.token).toBe("string");
    expect(json.token).toHaveLength(48); // 24 bytes hex → 48 chars
    expect(json).toHaveProperty("share_url");
    expect(json.share_url).toContain("/shared-profile/");
    expect(json.share_url).toContain(json.token);
    expect(json).toHaveProperty("expires_at");
  });

  it("includes snapshot data from admin queries in inserted record", async () => {
    const profileData = {
      is_fhb: true,
      is_pre_retiree: false,
      is_business_owner: false,
      is_cross_border: false,
      is_hnw: false,
      budget_band: "500k",
      experience_level: "intermediate",
      primary_vertical: "etf",
      display_name: "Alice",
    };
    let insertArgs: unknown = null;
    const insertCapture = {
      ...makeBuilder(null),
      insert: vi.fn((...args: unknown[]) => {
        insertArgs = args[0];
        return insertCapture;
      }),
    };

    let callIdx = 0;
    mockAdminFrom.mockImplementation((..._a: unknown[]) => {
      callIdx++;
      if (callIdx === 5) return insertCapture; // insert call
      if (callIdx === 1) return makeBuilder(profileData); // investor_profiles
      return makeBuilder(null);
    });

    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(201);
    // The snapshot_json inserted should contain the goals from profileData
    const inserted = insertArgs as { snapshot_json: { goals: unknown } } | null;
    expect(inserted).not.toBeNull();
    expect(inserted?.snapshot_json?.goals).toMatchObject({ is_fhb: true, display_name: "Alice" });
  });
});
