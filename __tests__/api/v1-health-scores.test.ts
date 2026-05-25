import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { mockServerFrom } = vi.hoisted(() => ({ mockServerFrom: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockServerFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => s),
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

import { GET, OPTIONS } from "@/app/api/v1/health-scores/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-hs", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeScore(overrides: Record<string, unknown> = {}) {
  return {
    broker_slug: "stake",
    afsl_number: "123456",
    afsl_status: "active",
    overall_score: 82.5,
    regulatory_score: 90,
    regulatory_notes: "AFSL active, no breaches on record",
    financial_stability_score: 78,
    financial_stability_notes: "Adequate capital buffer",
    client_money_score: 85,
    client_money_notes: "Segregated trust accounts confirmed",
    insurance_score: 80,
    insurance_notes: "PI insurance current",
    platform_reliability_score: 79,
    platform_reliability_notes: "Two minor outages in past 12 months",
    last_reviewed_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function makeScoresBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/health-scores${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/health-scores", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/health-scores — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("logs failed auth requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        endpoint: "/api/v1/health-scores",
      }),
    );
  });
});

describe("GET /api/v1/health-scores — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns health scores with meta", async () => {
    const score = makeScore();
    mockServerFrom.mockReturnValue(makeScoresBuilder([score], null, 1));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].broker_slug).toBe("stake");
    expect(body.data[0].overall_score).toBe(82.5);
    expect(body.meta.total).toBe(1);
    expect(body.meta.disclaimer).toBeTruthy();
  });

  it("strips private fields (id column not in PUBLIC_FIELDS)", async () => {
    const score = { ...makeScore(), id: 999, secret_field: "hidden" };
    mockServerFrom.mockReturnValue(makeScoresBuilder([score], null, 1));

    const res = await GET(makeGet());
    const body = await res.json();
    // id is not in PUBLIC_FIELDS for health scores
    expect(body.data[0].id).toBeUndefined();
    expect(body.data[0].secret_field).toBeUndefined();
  });

  it("filters by broker_slug when provided", async () => {
    const builder = makeScoresBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake" }));
    expect(builder.eq).toHaveBeenCalledWith("broker_slug", "stake");
  });

  it("applies min_score filter", async () => {
    const builder = makeScoresBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ min_score: "70" }));
    expect(builder.gte).toHaveBeenCalledWith("overall_score", 70);
  });

  it("ignores non-numeric min_score", async () => {
    const builder = makeScoresBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ min_score: "invalid" }));
    // Should not call gte with NaN
    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("respects limit query param (max 100)", async () => {
    const builder = makeScoresBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "5" }));
    expect(builder.range).toHaveBeenCalledWith(0, 4);
  });

  it("clamps limit to 100 when 200 requested", async () => {
    const builder = makeScoresBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "200" }));
    expect(builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("respects offset query param", async () => {
    const builder = makeScoresBuilder([], null, 100);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ offset: "20" }));
    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it("returns 500 on DB error", async () => {
    const errorBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() =>
        Promise.resolve({
          data: null,
          count: null,
          error: { message: "DB error" },
        }),
      ),
    };
    mockServerFrom.mockReturnValue(errorBuilder);

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/health score/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockServerFrom.mockReturnValue(makeScoresBuilder([makeScore()], null, 1));

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-hs" }),
    );
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockReturnValue(makeScoresBuilder([], null, 0));

    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("computes meta.updated_at from most recent score", async () => {
    const scores = [
      makeScore({ broker_slug: "stake", updated_at: "2026-01-01T00:00:00Z" }),
      makeScore({ broker_slug: "commsec", updated_at: "2026-04-01T00:00:00Z" }),
    ];
    mockServerFrom.mockReturnValue(makeScoresBuilder(scores, null, 2));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-04-01T00:00:00Z");
  });
});
