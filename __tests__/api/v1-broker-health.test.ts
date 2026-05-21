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

import { GET, OPTIONS } from "@/app/api/v1/broker-health/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeHealthScore(overrides = {}) {
  return {
    broker_slug: "stake",
    overall_score: 85,
    regulatory_score: 90,
    regulatory_notes: "ASIC licensed",
    financial_stability_score: 80,
    financial_stability_notes: null,
    client_money_score: 88,
    client_money_notes: null,
    platform_reliability_score: 82,
    platform_reliability_notes: null,
    insurance_score: 75,
    insurance_notes: null,
    afsl_number: "509799",
    afsl_status: "active",
    last_reviewed_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}

/**
 * Builder for single-broker lookup (uses .single() terminal).
 */
function makeSingleBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

/**
 * Builder for list query (uses .range() terminal).
 */
function makeListBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/broker-health${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/broker-health", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/broker-health — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Invalid or inactive API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("logs failed auth with statusCode 401", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/broker-health" }),
    );
  });
});

describe("GET /api/v1/broker-health — parameter validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("rejects slug with uppercase letters", async () => {
    const res = await GET(makeGet({ slug: "STAKE" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid/i);
  });

  it("rejects slug with underscores", async () => {
    const res = await GET(makeGet({ slug: "stake_au" }));
    expect(res.status).toBe(400);
  });

  it("rejects limit > 100", async () => {
    const res = await GET(makeGet({ limit: "101" }));
    expect(res.status).toBe(400);
  });

  it("rejects negative offset", async () => {
    const res = await GET(makeGet({ offset: "-1" }));
    expect(res.status).toBe(400);
  });

  it("logs 400 on invalid params", async () => {
    await GET(makeGet({ slug: "INVALID_SLUG" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

describe("GET /api/v1/broker-health — single broker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns health score for a known slug", async () => {
    const score = makeHealthScore();
    mockAdminFrom.mockReturnValue(makeSingleBuilder(score));

    const res = await GET(makeGet({ slug: "stake" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.broker_slug).toBe("stake");
    expect(body.data.overall_score).toBe(85);
    expect(body.meta.generated_at).toBeDefined();
    // list-only meta keys should be absent
    expect(body.meta.total).toBeUndefined();
    expect(body.meta.limit).toBeUndefined();
  });

  it("returns all public score columns", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeHealthScore()));
    const res = await GET(makeGet({ slug: "stake" }));
    const body = await res.json();
    const d = body.data;
    expect(d.regulatory_score).toBeDefined();
    expect(d.financial_stability_score).toBeDefined();
    expect(d.client_money_score).toBeDefined();
    expect(d.platform_reliability_score).toBeDefined();
    expect(d.insurance_score).toBeDefined();
    expect(d.afsl_number).toBe("509799");
    expect(d.afsl_status).toBe("active");
    expect(d.last_reviewed_at).toBeDefined();
  });

  it("returns 404 when broker slug not in broker_health_scores", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null, { message: "not found" }));
    const res = await GET(makeGet({ slug: "unknown-broker" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it("includes Cache-Control header on single-broker success", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeHealthScore()));
    const res = await GET(makeGet({ slug: "stake" }));
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("max-age=3600");
  });

  it("logs successful single-broker request with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeHealthScore()));
    await GET(makeGet({ slug: "stake" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });
});

describe("GET /api/v1/broker-health — list (no slug)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns paginated list with meta when no slug", async () => {
    const scores = [makeHealthScore(), makeHealthScore({ broker_slug: "selfwealth", overall_score: 72 })];
    mockAdminFrom.mockReturnValue(makeListBuilder(scores, null, 2));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
    expect(body.meta.generated_at).toBeDefined();
  });

  it("returns empty list when no scores exist", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([], null, 0));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it("respects ?limit", async () => {
    const builder = makeListBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "5" }));
    expect(builder.range).toHaveBeenCalledWith(0, 4);
  });

  it("respects ?offset", async () => {
    const builder = makeListBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ offset: "20" }));
    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it("caps list at 100 results", async () => {
    const builder = makeListBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "100" }));
    expect(builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("includes Cache-Control header on list success", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([], null, 0));
    const res = await GET(makeGet());
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("max-age=3600");
  });

  it("logs successful list request with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeListBuilder([makeHealthScore()], null, 1));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("returns 500 on DB error", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() =>
        Promise.resolve({ data: null, count: null, error: { message: "connection refused" } }),
      ),
    };
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/health scores/i);
  });
});

describe("GET /api/v1/broker-health — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 500 on unexpected throw (list path)", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/internal server error/i);
  });

  it("returns 500 on unexpected throw (single path)", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeGet({ slug: "stake" }));
    expect(res.status).toBe(500);
  });
});
