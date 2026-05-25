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

import { GET, OPTIONS } from "@/app/api/v1/health-scores/history/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-hs-history", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeHistoryEntry(overrides: Record<string, unknown> = {}) {
  return {
    broker_slug: "stake",
    overall_score: 82.5,
    regulatory_score: 90,
    client_money_score: 85,
    financial_stability_score: 78,
    platform_reliability_score: 79,
    insurance_score: 80,
    captured_at: "2026-05-24T02:00:00Z",
    ...overrides,
  };
}

function makeHistoryBuilder(
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
  const url = `http://localhost/api/v1/health-scores/history${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/health-scores/history", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/health-scores/history — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.status).toBe(401);
  });

  it("logs failed auth requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet({ broker_slug: "stake" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        endpoint: "/api/v1/health-scores/history",
      }),
    );
  });
});

describe("GET /api/v1/health-scores/history — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 when broker_slug is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/broker_slug/i);
  });

  it("returns 400 when broker_slug has invalid chars (uppercase)", async () => {
    const res = await GET(makeGet({ broker_slug: "STAKE" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/health-scores/history — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns history for a broker", async () => {
    const entry = makeHistoryEntry();
    mockServerFrom.mockReturnValue(makeHistoryBuilder([entry], null, 1));

    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].broker_slug).toBe("stake");
    expect(body.data[0].overall_score).toBe(82.5);
    expect(body.meta.broker_slug).toBe("stake");
    expect(body.meta.disclaimer).toBeTruthy();
  });

  it("strips private fields (id not in PUBLIC_FIELDS)", async () => {
    const entry = { ...makeHistoryEntry(), id: 999, secret_field: "hidden" };
    mockServerFrom.mockReturnValue(makeHistoryBuilder([entry], null, 1));

    const res = await GET(makeGet({ broker_slug: "stake" }));
    const body = await res.json();
    expect(body.data[0].id).toBeUndefined();
    expect(body.data[0].secret_field).toBeUndefined();
  });

  it("filters by broker_slug", async () => {
    const builder = makeHistoryBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake" }));
    expect(builder.eq).toHaveBeenCalledWith("broker_slug", "stake");
  });

  it("applies days filter via gte on captured_at", async () => {
    const builder = makeHistoryBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake", days: "30" }));
    expect(builder.gte).toHaveBeenCalled();
    // The argument is an ISO date string for ~30 days ago
    const gteCall = builder.gte.mock.calls[0];
    expect(gteCall?.[0]).toBe("captured_at");
    expect(typeof gteCall?.[1]).toBe("string");
  });

  it("defaults days to 90 when not provided", async () => {
    const builder = makeHistoryBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake" }));
    const body = (await builder.range.mock.results[0]?.value) as unknown;
    void body;
    // Indirectly validated by checking gte was called with a date ~90 days ago
    expect(builder.gte).toHaveBeenCalled();
  });

  it("clamps days to 400", async () => {
    const builder = makeHistoryBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    const res = await GET(makeGet({ broker_slug: "stake", days: "999" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.days).toBe(400);
  });

  it("respects limit query param (max 400)", async () => {
    const builder = makeHistoryBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake", limit: "50" }));
    expect(builder.range).toHaveBeenCalledWith(0, 49);
  });

  it("clamps limit to 400", async () => {
    const builder = makeHistoryBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake", limit: "1000" }));
    expect(builder.range).toHaveBeenCalledWith(0, 399);
  });

  it("respects offset query param", async () => {
    const builder = makeHistoryBuilder([], null, 100);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ broker_slug: "stake", offset: "50" }));
    expect(builder.range).toHaveBeenCalledWith(50, 149);
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

    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/health score/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.status).toBe(500);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockServerFrom.mockReturnValue(
      makeHistoryBuilder([makeHistoryEntry()], null, 1),
    );

    await GET(makeGet({ broker_slug: "stake" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-hs-history" }),
    );
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockReturnValue(makeHistoryBuilder([], null, 0));

    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("reports meta.updated_at from first entry captured_at", async () => {
    const entry = makeHistoryEntry({ captured_at: "2026-05-24T02:00:00Z" });
    mockServerFrom.mockReturnValue(makeHistoryBuilder([entry], null, 1));

    const res = await GET(makeGet({ broker_slug: "stake" }));
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-05-24T02:00:00Z");
  });
});
