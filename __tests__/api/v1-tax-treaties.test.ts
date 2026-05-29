import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { GET, OPTIONS } from "@/app/api/v1/tax/treaties/route";

// ── Helpers ──────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-tax-1", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key", statusCode?: number) {
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
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/tax/treaties — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Missing Authorization header");
  });

  it("honours a 403 tier-gate statusCode from validateApiKey", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Endpoint not on tier", 403));
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  it("honours a 429 daily-limit statusCode from validateApiKey", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Daily rate limit exceeded", 429));
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("logs failed auth requests with the failing status code", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/tax/treaties", apiKeyId: null }),
    );
  });

  it("returns CORS headers even on auth failure", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const res = await GET(makeGet());
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/tax/treaties — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns all treaties when no filter is given", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(14);
    expect(body.meta.count).toBe(body.data.length);
    expect(body.meta.disclaimer).toMatch(/not tax advice/i);
  });

  it("sets a 24h public Cache-Control header", async () => {
    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=86400");
  });

  it("returns the full US treaty record by country_code", async () => {
    const res = await GET(makeGet({ country_code: "US" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    const us = body.data[0];
    expect(us.country_code).toBe("US");
    expect(us.country_name).toBe("United States");
    expect(us.dividends_rate_pct).toBe(15);
    expect(us.w8ben_required).toBe(true);
    expect(us.fito_available).toBe(true);
    expect(us.capital_gains_notes).toMatch(/residence/i);
  });

  it("normalises a lowercase country_code", async () => {
    const res = await GET(makeGet({ country_code: "gb" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].country_code).toBe("GB");
  });

  it("returns 404 for a country with no treaty data", async () => {
    const res = await GET(makeGet({ country_code: "ZZ" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no treaty data/i);
  });

  it("escapes HTML in the 404 error for an unknown code (XSS guard)", async () => {
    const res = await GET(makeGet({ country_code: "<script>" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).not.toContain("<script>");
    expect(body.error).toContain("&lt;");
  });

  it("projects only dividend fields for category=dividends", async () => {
    const res = await GET(makeGet({ country_code: "US", category: "dividends" }));
    expect(res.status).toBe(200);
    const row = (await res.json()).data[0];
    expect(row.dividends_rate_pct).toBe(15);
    expect(row.dividends_notes).toBeDefined();
    expect(row.interest_rate_pct).toBeUndefined();
    expect(row.royalties_rate_pct).toBeUndefined();
  });

  it("projects only interest fields for category=interest", async () => {
    const res = await GET(makeGet({ country_code: "IN", category: "interest" }));
    const row = (await res.json()).data[0];
    expect(row.interest_rate_pct).toBe(15);
    expect(row.dividends_rate_pct).toBeUndefined();
  });

  it("projects only royalty fields for category=royalties", async () => {
    const res = await GET(makeGet({ country_code: "SG", category: "royalties" }));
    const row = (await res.json()).data[0];
    expect(row.royalties_rate_pct).toBe(10);
    expect(row.interest_rate_pct).toBeUndefined();
  });

  it("projects only capital-gains fields for category=capital_gains", async () => {
    const res = await GET(makeGet({ country_code: "US", category: "capital_gains" }));
    const row = (await res.json()).data[0];
    expect(row.capital_gains_notes).toMatch(/Form 1040/);
    expect(row.dividends_rate_pct).toBeUndefined();
    expect(row.royalties_rate_pct).toBeUndefined();
  });

  it("applies a category projection across all treaties when no country given", async () => {
    const res = await GET(makeGet({ category: "dividends" }));
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(14);
    for (const row of body.data) {
      expect(row.dividends_rate_pct).toBeDefined();
      expect(row.interest_rate_pct).toBeUndefined();
    }
  });

  it("returns 400 for an invalid category", async () => {
    const res = await GET(makeGet({ category: "wealth" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid category/i);
  });

  it("includes a treaty with no DTA (Saudi Arabia, default rates)", async () => {
    const res = await GET(makeGet({ country_code: "SA" }));
    const row = (await res.json()).data[0];
    expect(row.treaty_signed).toBeNull();
    expect(row.dividends_rate_pct).toBe(30);
    expect(row.fito_available).toBe(false);
  });

  it("logs the successful request with the apiKeyId", async () => {
    await GET(makeGet({ country_code: "US" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-tax-1" }),
    );
  });
});
