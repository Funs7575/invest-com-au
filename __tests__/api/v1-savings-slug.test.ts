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

import { GET, OPTIONS } from "@/app/api/v1/savings/[slug]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-savings-slug", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makePlatform(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: "ING Savings Maximiser",
    slug: "ing-savings-maximiser",
    platform_type: "savings",
    rating: 4.6,
    review_content: "ING is a top savings pick.",
    status: "active",
    updated_at: "2026-05-01T00:00:00Z",
    ...overrides,
  };
}

function makeRate(overrides: Record<string, unknown> = {}) {
  return {
    id: "uuid-1",
    broker_id: 5,
    product_kind: "savings_account",
    rate_bps: 550,
    intro_rate_bps: null,
    intro_term_months: null,
    min_balance_cents: 0,
    max_balance_cents: null,
    term_months: null,
    captured_at: "2026-05-20T02:00:00Z",
    notes: "Requires monthly deposit",
    ...overrides,
  };
}

/**
 * Makes a builder for single-row brokers query (.single() terminates the chain).
 */
function makeSinglePlatformBuilder(
  row: unknown | null,
  error: unknown = null,
) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: row, error })),
  };
}

function makeRatesBuilder(rows: unknown[] = []) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: rows, error: null })),
  };
}

function makeGet(
  slug: string,
  params: Record<string, string> = {},
): { req: NextRequest; routeParams: Promise<{ slug: string }> } {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/savings/${slug}${sp ? `?${sp}` : ""}`;
  return {
    req: new NextRequest(url, {
      headers: { Authorization: "Bearer ica_testkey123" },
    }),
    routeParams: Promise.resolve({ slug }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/savings/[slug]", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/savings/[slug] — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const { req, routeParams } = makeGet("ing-savings-maximiser");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/savings/[slug] — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 400 for invalid slug (capitals)", async () => {
    const { req, routeParams } = makeGet("ING-SAVINGS");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug/i);
  });

  it("returns 400 for empty slug", async () => {
    const { req, routeParams } = makeGet("");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/savings/[slug] — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns platform data with rates_by_kind", async () => {
    const platform = makePlatform();
    const rate = makeRate();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSinglePlatformBuilder(platform);
      if (table === "savings_rate_snapshots") return makeRatesBuilder([rate]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("ing-savings-maximiser");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("ING Savings Maximiser");
    expect(body.data.rates_by_kind).toBeDefined();
    expect(body.data.rates_by_kind.savings_account).toHaveLength(1);
    expect(body.data.rate_note).toBeTruthy();
  });

  it("returns 404 when platform not found", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers")
        return makeSinglePlatformBuilder(null, { message: "no rows" });
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("nonexistent-slug");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it("groups rate history by product_kind", async () => {
    const platform = makePlatform();
    const savingsRate = makeRate({ product_kind: "savings_account" });
    const tdRate = makeRate({ product_kind: "term_deposit", term_months: 12 });
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSinglePlatformBuilder(platform);
      if (table === "savings_rate_snapshots")
        return makeRatesBuilder([savingsRate, tdRate]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("ing-savings-maximiser");
    const res = await GET(req, { params: routeParams });
    const body = await res.json();
    expect(body.data.rates_by_kind.savings_account).toHaveLength(1);
    expect(body.data.rates_by_kind.term_deposit).toHaveLength(1);
  });

  it("strips private fields", async () => {
    const platform = {
      ...makePlatform(),
      affiliate_url: "https://secret.example.com",
      commission_cents: 1200,
    };
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSinglePlatformBuilder(platform);
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("ing-savings-maximiser");
    const res = await GET(req, { params: routeParams });
    const body = await res.json();
    expect(body.data.affiliate_url).toBeUndefined();
    expect(body.data.commission_cents).toBeUndefined();
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSinglePlatformBuilder(makePlatform());
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("ing-savings-maximiser");
    const res = await GET(req, { params: routeParams });
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("DB exploded");
    });

    const { req, routeParams } = makeGet("ing-savings-maximiser");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(500);
  });

  it("logs successful request with apiKeyId", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSinglePlatformBuilder(makePlatform());
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("ing-savings-maximiser");
    await GET(req, { params: routeParams });
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 200,
        apiKeyId: "key-savings-slug",
      }),
    );
  });
});
