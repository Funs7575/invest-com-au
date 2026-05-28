import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockValidateApiKey = vi.fn();
const mockLogApiRequest = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  logApiRequest: (...args: unknown[]) => mockLogApiRequest(...args),
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { GET, OPTIONS } from "@/app/api/v1/cohort-report/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeKey(tier = "enterprise") {
  return { id: "key-cr", name: "Test", key_prefix: "ica_test", tier };
}

function makeValidAuth(tier = "enterprise") {
  return { valid: true, apiKey: makeKey(tier) };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    week_start: "2026-05-18",
    inferred_vertical: "broker-seeker",
    experience_level: "beginner",
    investment_range: "1k-10k",
    quiz_completions: 42,
    leads_captured: 7,
    conversion_rate: 0.167,
    top_utm_source: "google",
    computed_at: "2026-05-25T02:00:00Z",
    ...overrides,
  };
}

/**
 * The route awaits the assembled query directly, so the builder is a thenable
 * whose chain methods return `this`.
 */
function makeCohortBuilder(rows: unknown[] = [], error: unknown = null) {
  const result = { data: rows, error };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  return builder;
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/cohort-report${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/cohort-report", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/cohort-report — auth & tier", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Missing Authorization header");
  });

  it("logs failed auth requests with null apiKeyId", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/cohort-report", apiKeyId: null }),
    );
  });

  it("returns 403 for a valid key on a non-enterprise tier", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuth("pro"));
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/enterprise/i);
    // Must not hit the DB once tier is rejected.
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("logs the 403 tier rejection with the key id", async () => {
    mockValidateApiKey.mockResolvedValue(makeValidAuth("basic"));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, apiKeyId: "key-cr" }),
    );
  });
});

describe("GET /api/v1/cohort-report — success (enterprise)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth("enterprise"));
  });

  it("returns cohort snapshots with meta envelope", async () => {
    mockAdminFrom.mockReturnValue(makeCohortBuilder([makeSnapshot()]));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cohorts).toHaveLength(1);
    expect(body.cohorts[0].inferred_vertical).toBe("broker-seeker");
    expect(body.meta.total_rows).toBe(1);
    expect(body.meta.weeks).toBe(12);
    expect(body.meta.updated_at).toBe("2026-05-25T02:00:00Z");
    expect(body.meta.disclaimer).toBeTruthy();
  });

  it("defaults weeks to 12 and clamps to 52", async () => {
    const builder = makeCohortBuilder([]);
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET(makeGet({ weeks: "999" }));
    const body = await res.json();
    expect(body.meta.weeks).toBe(52);
    expect(builder.gte).toHaveBeenCalledWith("week_start", expect.any(String));
  });

  it("filters by vertical when provided", async () => {
    const builder = makeCohortBuilder([]);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ vertical: "robo-seeker" }));
    expect(builder.eq).toHaveBeenCalledWith("inferred_vertical", "robo-seeker");
  });

  it("does not filter by vertical when omitted", async () => {
    const builder = makeCohortBuilder([]);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet());
    expect(builder.eq).not.toHaveBeenCalled();
  });

  it("returns null updated_at when there are no rows", async () => {
    mockAdminFrom.mockReturnValue(makeCohortBuilder([]));
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.cohorts).toEqual([]);
    expect(body.meta.updated_at).toBeNull();
  });

  it("includes a private Cache-Control header", async () => {
    mockAdminFrom.mockReturnValue(makeCohortBuilder([]));
    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("logs successful requests with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeCohortBuilder([makeSnapshot()]));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-cr" }),
    );
  });

  it("returns 500 on a DB error", async () => {
    mockAdminFrom.mockReturnValue(makeCohortBuilder([], { message: "DB error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/cohort report/i);
  });

  it("returns 500 on an unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/internal server error/i);
  });
});
