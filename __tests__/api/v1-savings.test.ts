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

import { GET, OPTIONS } from "@/app/api/v1/savings/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-savings", name: "Test", key_prefix: "ica_test" };

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
 * Makes a chainable builder for the brokers table query.
 * Ends with .range() returning a promise.
 */
function makePlatformsBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
  };
  return builder;
}

/**
 * Makes a builder for the savings_rate_snapshots table query.
 *
 * The route calls:
 *   .select(...).in(...).order(...)  — terminal when no product_kind filter
 *   .select(...).in(...).order(...).eq(...)  — terminal when product_kind filter set
 *
 * Both order() and eq() need to resolve as Promises (awaited directly on the
 * query builder), while also being chainable when eq() is appended after order().
 */
function makeRatesBuilder(rows: unknown[] = [], error: unknown = null) {
  const resolved = Promise.resolve({ data: rows, error });
  // A thenable object: calling .then() on it behaves like a resolved promise,
  // but it also exposes .eq() for the chained-filter case.
  const thenableResult = {
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
    finally: resolved.finally.bind(resolved),
    eq: vi.fn(() => Promise.resolve({ data: rows, error })),
  };
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn(() => thenableResult),
    // Expose thenableResult so tests can spy on .eq
    _thenableResult: thenableResult,
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/savings${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/savings", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/savings — auth", () => {
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
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/savings" }),
    );
  });
});

describe("GET /api/v1/savings — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns platform list with rates and meta", async () => {
    const platform = makePlatform();
    const rate = makeRate();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([platform], null, 1);
      if (table === "savings_rate_snapshots") return makeRatesBuilder([rate]);
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("ING Savings Maximiser");
    expect(body.data[0].latest_rates).toHaveLength(1);
    expect(body.data[0].latest_rates[0].rate_bps).toBe(550);
    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
    expect(body.meta.rate_note).toBeTruthy();
  });

  it("strips private fields (e.g. affiliate_url)", async () => {
    const platform = {
      ...makePlatform(),
      affiliate_url: "https://secret.example.com",
      commission_cents: 1200,
    };
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([platform], null, 1);
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].affiliate_url).toBeUndefined();
    expect(body.data[0].commission_cents).toBeUndefined();
  });

  it("respects limit query param", async () => {
    const platformsBuilder = makePlatformsBuilder([], null, 0);
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return platformsBuilder;
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await GET(makeGet({ limit: "5" }));
    expect(platformsBuilder.range).toHaveBeenCalledWith(0, 4);
  });

  it("clamps limit to 100 even if 200 requested", async () => {
    const platformsBuilder = makePlatformsBuilder([], null, 0);
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return platformsBuilder;
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await GET(makeGet({ limit: "200" }));
    expect(platformsBuilder.range).toHaveBeenCalledWith(0, 99);
  });

  it("defaults limit to 20 when invalid", async () => {
    const platformsBuilder = makePlatformsBuilder([], null, 0);
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return platformsBuilder;
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await GET(makeGet({ limit: "abc" }));
    expect(platformsBuilder.range).toHaveBeenCalledWith(0, 19);
  });

  it("respects offset query param", async () => {
    const platformsBuilder = makePlatformsBuilder([], null, 100);
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return platformsBuilder;
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await GET(makeGet({ offset: "20" }));
    expect(platformsBuilder.range).toHaveBeenCalledWith(20, 39);
  });

  it("filters rates by product_kind when specified", async () => {
    const platform = makePlatform();
    const ratesBuilder = makeRatesBuilder([]);
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([platform], null, 1);
      if (table === "savings_rate_snapshots") return ratesBuilder;
      throw new Error(`unexpected table: ${table}`);
    });

    await GET(makeGet({ product_kind: "savings_account" }));
    // The eq() is called on the thenable returned by order()
    expect(ratesBuilder._thenableResult.eq).toHaveBeenCalledWith(
      "product_kind",
      "savings_account",
    );
  });

  it("excludes platforms with no matching rates when product_kind filter is set", async () => {
    const platform = makePlatform();
    // No rates returned for this kind
    const ratesBuilder = makeRatesBuilder([]);
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([platform], null, 1);
      if (table === "savings_rate_snapshots") return ratesBuilder;
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet({ product_kind: "term_deposit" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Platform has no term_deposit rates → filtered out
    expect(body.data).toHaveLength(0);
  });

  it("includes platform when product_kind filter matches", async () => {
    const platform = makePlatform();
    const rate = makeRate({ product_kind: "term_deposit" });
    // Override the eq() mock to return the rate
    const ratesBuilder = makeRatesBuilder([rate]);
    // Make the .eq() on the thenable return the rate
    ratesBuilder._thenableResult.eq.mockResolvedValue({
      data: [rate],
      error: null,
    });
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([platform], null, 1);
      if (table === "savings_rate_snapshots") return ratesBuilder;
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet({ product_kind: "term_deposit" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it("returns 500 on DB error fetching platforms", async () => {
    const errorBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() =>
        Promise.resolve({
          data: null,
          count: null,
          error: { message: "DB error" },
        }),
      ),
    };
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return errorBuilder;
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/savings/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([makePlatform()], null, 1);
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-savings" }),
    );
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([], null, 0);
      if (table === "savings_rate_snapshots") return makeRatesBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("deduplicates rates per (broker_id, product_kind)", async () => {
    const platform = makePlatform();
    // Two rows with same broker_id + product_kind — only first should appear
    const rate1 = makeRate({ id: "uuid-1", captured_at: "2026-05-20T00:00:00Z" });
    const rate2 = makeRate({ id: "uuid-2", captured_at: "2026-05-19T00:00:00Z" });
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makePlatformsBuilder([platform], null, 1);
      if (table === "savings_rate_snapshots")
        return makeRatesBuilder([rate1, rate2]);
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].latest_rates).toHaveLength(1);
  });
});
