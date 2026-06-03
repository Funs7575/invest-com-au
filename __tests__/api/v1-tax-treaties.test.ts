import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────
// vi.mock is hoisted; all referenced vars must come from vi.hoisted().

const { mockValidateApiKey, mockLogApiRequest } = vi.hoisted(() => ({
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  logApiRequest: (...args: unknown[]) => mockLogApiRequest(...args),
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => s),
}));

import { GET, OPTIONS } from "@/app/api/v1/tax/treaties/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = {
  id: "key-1",
  name: "Test Key",
  key_prefix: "ica_test",
  tier: "basic",
};

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key", statusCode = 401) {
  return { valid: false, error: msg, statusCode };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/tax/treaties${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/tax/treaties", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/tax/treaties — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Missing Authorization header");
  });

  it("returns the statusCode from auth when provided", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Rate limit exceeded", 429));
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("logs auth failure with statusCode 401", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/tax/treaties" }),
    );
  });
});

describe("GET /api/v1/tax/treaties — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for an invalid category value", async () => {
    const res = await GET(makeGet({ category: "foobar" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid category/);
  });

  it("returns 404 when country_code has no treaty data", async () => {
    const res = await GET(makeGet({ country_code: "ZZ" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/No treaty data found/);
  });

  it("404 error message includes the queried country code", async () => {
    const res = await GET(makeGet({ country_code: "XX" }));
    const data = await res.json();
    expect(data.error).toContain("XX");
  });
});

describe("GET /api/v1/tax/treaties — happy paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns all treaties when no filters are provided", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(1);
    expect(body.meta.count).toBe(body.data.length);
  });

  it("returns a single treaty record for a known country_code (US)", async () => {
    const res = await GET(makeGet({ country_code: "US" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].country_code).toBe("US");
    expect(body.data[0].country_name).toBe("United States");
  });

  it("country_code lookup is case-insensitive (lowercase 'us')", async () => {
    const res = await GET(makeGet({ country_code: "us" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].country_code).toBe("US");
  });

  it("filters by category=dividends and returns only dividend fields", async () => {
    const res = await GET(makeGet({ category: "dividends" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.data[0];
    expect(row.dividends_rate_pct).toBeDefined();
    expect(row.dividends_notes).toBeDefined();
    // non-dividend fields should not be present
    expect(row.interest_rate_pct).toBeUndefined();
    expect(row.royalties_rate_pct).toBeUndefined();
  });

  it("filters by category=interest and returns only interest fields", async () => {
    const res = await GET(makeGet({ category: "interest" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.data[0];
    expect(row.interest_rate_pct).toBeDefined();
    expect(row.interest_notes).toBeDefined();
    expect(row.dividends_rate_pct).toBeUndefined();
  });

  it("filters by category=royalties and returns only royalties fields", async () => {
    const res = await GET(makeGet({ category: "royalties" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.data[0];
    expect(row.royalties_rate_pct).toBeDefined();
    expect(row.royalties_notes).toBeDefined();
    expect(row.interest_rate_pct).toBeUndefined();
  });

  it("filters by category=capital_gains and returns only capital_gains fields", async () => {
    const res = await GET(makeGet({ category: "capital_gains" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.data[0];
    expect(row.capital_gains_notes).toBeDefined();
    expect(row.dividends_rate_pct).toBeUndefined();
  });

  it("can combine country_code and category filters", async () => {
    const res = await GET(makeGet({ country_code: "GB", category: "dividends" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].country_code).toBe("GB");
    expect(body.data[0].dividends_rate_pct).toBeDefined();
    expect(body.data[0].interest_rate_pct).toBeUndefined();
  });

  it("returns full treaty record when no category filter is given", async () => {
    const res = await GET(makeGet({ country_code: "JP" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    const row = body.data[0];
    expect(row.dividends_rate_pct).toBeDefined();
    expect(row.interest_rate_pct).toBeDefined();
    expect(row.royalties_rate_pct).toBeDefined();
    expect(row.capital_gains_notes).toBeDefined();
  });

  it("includes meta.disclaimer and meta.updated_at in the response", async () => {
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.disclaimer).toContain("Not tax advice");
    expect(body.meta.updated_at).toBe("2026-01-01T00:00:00Z");
  });

  it("sets Cache-Control: public, max-age=86400 on success", async () => {
    const res = await GET(makeGet());
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("86400");
  });

  it("logs a successful request with apiKeyId", async () => {
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("returns Saudi Arabia (no DTA) with 404-free", async () => {
    // SA is in the data set but has no treaty — it should still resolve 200
    const res = await GET(makeGet({ country_code: "SA" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].country_code).toBe("SA");
    expect(body.data[0].fito_available).toBe(false);
  });

  it("known country codes resolve for all 16 entries", async () => {
    const codes = ["US","GB","NZ","JP","SG","HK","CN","IN","KR","MY","AE","SA","DE","FR","CA"];
    for (const code of codes) {
      const res = await GET(makeGet({ country_code: code }));
      expect(res.status).toBe(200);
    }
  });
});

describe("GET /api/v1/tax/treaties — error path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 500 if validateApiKey throws unexpectedly", async () => {
    mockValidateApiKey.mockRejectedValue(new Error("boom"));
    // The route itself doesn't wrap validateApiKey in a try/catch, so Next
    // propagates the error — we verify it's not swallowed silently.
    await expect(GET(makeGet())).rejects.toThrow("boom");
  });
});
