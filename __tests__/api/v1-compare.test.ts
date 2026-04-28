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

import { GET, OPTIONS } from "@/app/api/v1/compare/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-99", name: "Partner", key_prefix: "ica_abc" };

function makeGet(slugs: string | null, apiKey = "Bearer ica_test"): NextRequest {
  const url = new URL("http://localhost/api/v1/compare");
  if (slugs !== null) url.searchParams.set("slugs", slugs);
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: {
      Authorization: apiKey,
      "x-forwarded-for": "10.0.0.1",
    },
  });
}

function makeBroker(slug: string, overrides = {}) {
  return {
    id: Math.random(),
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    slug,
    tagline: "Test broker",
    asx_fee: "0.01%",
    asx_fee_value: 0.01,
    status: "active",
    rating: 4.5,
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeBrokersBuilder(rows: unknown[], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn(() => Promise.resolve({ data: rows, error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/compare", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "Invalid API key" });
    const res = await GET(makeGet("stake,commsec"));
    expect(res.status).toBe(401);
    expect(mockLogApiRequest).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it("returns 400 when slugs param is missing", async () => {
    const res = await GET(makeGet(null));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/slugs/i);
  });

  it("returns 400 when no valid slugs after sanitization", async () => {
    const res = await GET(makeGet("INVALID!,@@##"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid.*slug/i);
  });

  it("returns 400 when more than 5 slugs requested", async () => {
    const res = await GET(makeGet("a,b,c,d,e,f"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/5/);
  });

  it("returns 404 when no matching brokers found", async () => {
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([]));
    const res = await GET(makeGet("nonexistent-broker"));
    expect(res.status).toBe(404);
  });

  it("returns comparison data for valid slugs", async () => {
    const brokers = [makeBroker("stake"), makeBroker("commsec")];
    mockAdminFrom.mockReturnValue(makeBrokersBuilder(brokers));
    const res = await GET(makeGet("stake,commsec"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.meta.requested).toEqual(["stake", "commsec"]);
    expect(json.meta.found).toBe(2);
  });

  it("orders results by original slug order", async () => {
    const brokers = [makeBroker("commsec"), makeBroker("stake")];
    mockAdminFrom.mockReturnValue(makeBrokersBuilder(brokers));
    const res = await GET(makeGet("stake,commsec"));
    const json = await res.json();
    expect((json.data[0] as Record<string, unknown>).slug).toBe("stake");
    expect((json.data[1] as Record<string, unknown>).slug).toBe("commsec");
  });

  it("reports not_found slugs in meta when some are missing", async () => {
    const brokers = [makeBroker("stake")];
    mockAdminFrom.mockReturnValue(makeBrokersBuilder(brokers));
    const res = await GET(makeGet("stake,missing-broker"));
    const json = await res.json();
    expect(json.meta.not_found).toContain("missing-broker");
  });

  it("deduplicates slugs before querying", async () => {
    const brokers = [makeBroker("stake")];
    mockAdminFrom.mockReturnValue(makeBrokersBuilder(brokers));
    const res = await GET(makeGet("stake,stake,stake"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta.requested).toHaveLength(1);
  });

  it("sets Cache-Control header to public max-age=3600", async () => {
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([makeBroker("commsec")]));
    const res = await GET(makeGet("commsec"));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("strips non-public fields from response", async () => {
    const brokers = [{ ...makeBroker("stake"), internal_cost: 999, secret_notes: "redacted" }];
    mockAdminFrom.mockReturnValue(makeBrokersBuilder(brokers));
    const res = await GET(makeGet("stake"));
    const json = await res.json();
    expect((json.data[0] as Record<string, unknown>).internal_cost).toBeUndefined();
    expect((json.data[0] as Record<string, unknown>).secret_notes).toBeUndefined();
  });

  it("logs API request on success", async () => {
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([makeBroker("stake")]));
    await GET(makeGet("stake"));
    expect(mockLogApiRequest).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 200 }));
  });

  it("returns 500 on DB error", async () => {
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([], { message: "timeout" }));
    const res = await GET(makeGet("stake"));
    expect(res.status).toBe(500);
    expect(mockLogApiRequest).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("Unexpected"); });
    const res = await GET(makeGet("stake"));
    expect(res.status).toBe(500);
  });
});
