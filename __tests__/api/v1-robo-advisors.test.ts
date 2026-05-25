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

import { GET, OPTIONS } from "@/app/api/v1/robo-advisors/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-robo", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeRobo(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    name: "Stockspot",
    slug: "stockspot",
    platform_type: "robo_advisor",
    rating: 4.7,
    min_deposit: "$2,000",
    status: "active",
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}

function makeRobosBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/robo-advisors${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/robo-advisors", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/robo-advisors — auth", () => {
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
        endpoint: "/api/v1/robo-advisors",
      }),
    );
  });
});

describe("GET /api/v1/robo-advisors — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns robo list with meta", async () => {
    const robo = makeRobo();
    mockServerFrom.mockReturnValue(makeRobosBuilder([robo], null, 1));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Stockspot");
    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });

  it("strips private fields", async () => {
    const robo = {
      ...makeRobo(),
      affiliate_url: "https://secret.example.com",
      commission_cents: 500,
    };
    mockServerFrom.mockReturnValue(makeRobosBuilder([robo], null, 1));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].affiliate_url).toBeUndefined();
    expect(body.data[0].commission_cents).toBeUndefined();
  });

  it("respects limit query param (max 100)", async () => {
    const builder = makeRobosBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "5" }));
    expect(builder.range).toHaveBeenCalledWith(0, 4);
  });

  it("clamps limit to 100 even if 200 requested", async () => {
    const builder = makeRobosBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "200" }));
    expect(builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("defaults limit to 20 when invalid", async () => {
    const builder = makeRobosBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "abc" }));
    expect(builder.range).toHaveBeenCalledWith(0, 19);
  });

  it("respects offset query param", async () => {
    const builder = makeRobosBuilder([], null, 100);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ offset: "20" }));
    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it("filters smsf_support=true", async () => {
    const builder = makeRobosBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ smsf_support: "true" }));
    expect(builder.eq).toHaveBeenCalledWith("smsf_support", true);
  });

  it("filters smsf_support=false", async () => {
    const builder = makeRobosBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ smsf_support: "false" }));
    expect(builder.eq).toHaveBeenCalledWith("smsf_support", false);
  });

  it("returns 500 on DB error", async () => {
    const errorBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
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
    expect(data.error).toMatch(/robo-advisor/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockServerFrom.mockReturnValue(makeRobosBuilder([makeRobo()], null, 1));

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-robo" }),
    );
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockReturnValue(makeRobosBuilder([], null, 0));

    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("computes meta.updated_at from most recent robo row", async () => {
    const robos = [
      makeRobo({ updated_at: "2026-01-01T00:00:00Z" }),
      makeRobo({ name: "Raiz", slug: "raiz", updated_at: "2026-04-01T00:00:00Z" }),
    ];
    mockServerFrom.mockReturnValue(makeRobosBuilder(robos, null, 2));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-04-01T00:00:00Z");
  });
});
