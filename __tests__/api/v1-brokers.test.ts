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

import { GET, OPTIONS } from "@/app/api/v1/brokers/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeBroker(overrides = {}) {
  return {
    id: 1,
    name: "Stake",
    slug: "stake",
    tagline: "Zero-cost US shares",
    asx_fee: "0.01%",
    asx_fee_value: 0.01,
    status: "active",
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}

function makeBrokersBuilder(rows: unknown[] = [], error: unknown = null, count = rows.length) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
  };
  return builder;
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/brokers${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/brokers", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/brokers — auth", () => {
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

  it("logs failed requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/brokers" }),
    );
  });
});

describe("GET /api/v1/brokers — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns broker list with meta", async () => {
    const broker = makeBroker();
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([broker], null, 1));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Stake");
    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });

  it("strips private fields from broker rows", async () => {
    const broker = { ...makeBroker(), stripe_customer_id: "cus_secret", internal_notes: "hidden" };
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([broker], null, 1));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].stripe_customer_id).toBeUndefined();
    expect(body.data[0].internal_notes).toBeUndefined();
  });

  it("respects limit query param (max 100)", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "5" }));
    expect(builder.range).toHaveBeenCalledWith(0, 4);
  });

  it("clamps limit to 100 even if 200 requested", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "200" }));
    expect(builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("defaults limit to 20 when invalid", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "abc" }));
    expect(builder.range).toHaveBeenCalledWith(0, 19);
  });

  it("respects offset query param", async () => {
    const builder = makeBrokersBuilder([], null, 100);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ offset: "20" }));
    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it("filters by platform_type", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ platform_type: "share_broker" }));
    expect(builder.eq).toHaveBeenCalledWith("platform_type", "share_broker");
  });

  it("filters chess_sponsored=true", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ chess_sponsored: "true" }));
    expect(builder.eq).toHaveBeenCalledWith("chess_sponsored", true);
  });

  it("filters chess_sponsored=false", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ chess_sponsored: "false" }));
    expect(builder.eq).toHaveBeenCalledWith("chess_sponsored", false);
  });

  it("filters smsf_support=true", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ smsf_support: "true" }));
    expect(builder.eq).toHaveBeenCalledWith("smsf_support", true);
  });

  it("filters is_crypto=true", async () => {
    const builder = makeBrokersBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ is_crypto: "true" }));
    expect(builder.eq).toHaveBeenCalledWith("is_crypto", true);
  });

  it("returns 500 on DB error", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() => Promise.resolve({ data: null, count: null, error: { message: "DB error" } })),
    };
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/broker/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("boom"); });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([makeBroker()], null, 1));

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("includes Cache-Control header on success", async () => {
    mockAdminFrom.mockReturnValue(makeBrokersBuilder([], null, 0));

    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("computes meta.updated_at from most recent broker", async () => {
    const brokers = [
      makeBroker({ updated_at: "2026-01-01T00:00:00Z" }),
      makeBroker({ name: "SelfWealth", updated_at: "2026-04-01T00:00:00Z" }),
    ];
    mockAdminFrom.mockReturnValue(makeBrokersBuilder(brokers, null, 2));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-04-01T00:00:00Z");
  });
});
