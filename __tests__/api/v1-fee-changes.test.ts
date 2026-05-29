import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────
// Must be hoisted so they are available inside vi.mock factory bodies.

const { mockValidateApiKey, mockLogApiRequest, mockAdminFrom } = vi.hoisted(() => ({
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/api-auth", () => ({
  validateApiKey: (...args: unknown[]) => mockValidateApiKey(...args),
  logApiRequest: (...args: unknown[]) => mockLogApiRequest(...args),
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// escapeHtml is pure; use the real impl so XSS-guard tests remain meaningful.
vi.mock("@/lib/html-escape", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/html-escape")>();
  return { escapeHtml: actual.escapeHtml };
});

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET, OPTIONS } from "@/app/api/v1/fee-changes/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase query-builder stub. Every method returns the same object;
 * awaiting anywhere in the chain resolves to `result`. Use
 * `mockReturnValueOnce` to script multi-query handlers.
 */
function makeBuilder(
  result: { data?: unknown; error?: unknown; count?: number | null } = {},
) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "in", "gte", "order", "limit", "range",
    "insert", "update", "maybeSingle", "single",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({
        data: result.data ?? null,
        error: result.error ?? null,
        count: result.count ?? null,
      }),
    );
  return b;
}

const VALID_KEY = { id: "key-fee-1", tier: "basic", name: "Test" };

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/fee-changes${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

const SAMPLE_ROW = {
  id: 1,
  broker_slug: "stake",
  field_name: "asx_fee",
  old_value: "9.50",
  new_value: "7.99",
  change_type: "decrease",
  changed_at: "2026-05-01T10:00:00Z",
  source: "scraper",
  // internal field that should NOT appear in output
  internal_hash: "abc123",
};

// ── OPTIONS ───────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/fee-changes", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ── Auth failures ─────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — auth failures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing", async () => {
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      error: "Missing Authorization header",
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing Authorization header");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "Invalid API key" });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Invalid API key");
  });

  it("always returns 401 for any auth failure (route hardcodes 401, ignores statusCode)", async () => {
    // Note: this route hardcodes status:401 for all auth failures rather than
    // forwarding auth.statusCode. This test documents the actual behaviour.
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      error: "Endpoint not available on free tier",
      statusCode: 403,
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 401 even when validateApiKey signals a 429 (route hardcodes status)", async () => {
    mockValidateApiKey.mockResolvedValue({
      valid: false,
      error: "Daily limit exceeded",
      statusCode: 429,
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("logs failed auth with null apiKeyId and 401 statusCode", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "bad" });
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        apiKeyId: null,
        endpoint: "/api/v1/fee-changes",
        method: "GET",
      }),
    );
  });
});

// ── Parameter validation ──────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — parameter validation (auth passes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
    // Provide a default chain so the query builder is valid even when the route
    // returns 400 before awaiting the query (e.g., broker_slug validation).
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
  });

  it("returns 400 for an unrecognised ?field value", async () => {
    const res = await GET(makeGet({ field: "mystery_fee" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Unknown field/i);
    expect(body.error).toContain("mystery_fee");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 400 for a broker_slug with invalid characters", async () => {
    const res = await GET(makeGet({ broker_slug: "Stake<>Corp" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid broker_slug/i);
  });

  it("accepts a valid ?field value without 400", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ field: "asx_fee" }));
    expect(res.status).toBe(200);
  });

  it("accepts a valid ?broker_slug without 400", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ broker_slug: "stake" }));
    expect(res.status).toBe(200);
  });
});

// ── Success paths ─────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 200 with data + meta when the DB returns rows", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: [SAMPLE_ROW], error: null, count: 1 }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);

    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(50);   // default
    expect(body.meta.offset).toBe(0);   // default
    expect(body.meta.disclaimer).toMatch(/not financial advice/i);
  });

  it("strips internal fields (internal_hash must not appear in output)", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: [SAMPLE_ROW], error: null, count: 1 }),
    );
    const res = await GET(makeGet());
    const row = (await res.json()).data[0];
    expect(row).not.toHaveProperty("internal_hash");
    // Only PUBLIC_FIELDS keys should be present
    expect(Object.keys(row)).not.toContain("internal_hash");
  });

  it("escapes HTML in string fields (XSS guard)", async () => {
    const xssRow = {
      ...SAMPLE_ROW,
      broker_slug: "<evil>",
      old_value: '<script>alert("xss")</script>',
    };
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: [xssRow], error: null, count: 1 }),
    );
    const res = await GET(makeGet());
    const row = (await res.json()).data[0];
    expect(row.broker_slug).not.toContain("<evil>");
    expect(row.broker_slug).toContain("&lt;");
    expect(row.old_value).not.toContain("<script>");
  });

  it("respects custom ?limit and ?offset pagination params", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: [], error: null, count: 100 }),
    );
    const res = await GET(makeGet({ limit: "10", offset: "20" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.limit).toBe(10);
    expect(body.meta.offset).toBe(20);
    expect(body.meta.total).toBe(100);
  });

  it("caps ?limit at 200", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ limit: "999" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.limit).toBe(200);
  });

  it("falls back to limit=50 for a negative ?limit", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ limit: "-5" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.limit).toBe(50);
  });

  it("falls back to offset=0 for a negative ?offset", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ offset: "-10" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.offset).toBe(0);
  });

  it("uses sanitized.length as total when count is null", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: [SAMPLE_ROW], error: null, count: null }),
    );
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.total).toBe(1); // falls back to sanitized.length
  });

  it("sets Cache-Control: private, max-age=900", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet());
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("private");
    expect(cc).toContain("max-age=900");
  });

  it("includes CORS headers on successful response", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet());
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("logs a successful request with the apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 200,
        apiKeyId: VALID_KEY.id,
        endpoint: "/api/v1/fee-changes",
        method: "GET",
      }),
    );
  });

  it("returns valid ?since filter: only passes through ISO-parseable dates", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ since: "2026-01-01" }));
    expect(res.status).toBe(200);
  });

  it("silently ignores an invalid ?since value and still returns 200", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null, count: 0 }));
    const res = await GET(makeGet({ since: "not-a-date" }));
    expect(res.status).toBe(200);
  });
});

// ── DB error path ─────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — DB error (500)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 500 when the DB query returns an error", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: null, error: { message: "connection refused" }, count: null }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Failed to fetch fee changes/i);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("logs the 500 with the apiKeyId when the DB query fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: null, error: { message: "db boom" }, count: null }),
    );
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        apiKeyId: VALID_KEY.id,
        endpoint: "/api/v1/fee-changes",
      }),
    );
  });

  it("returns 500 when the DB client throws unexpectedly (outer catch)", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("unexpected db crash");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal server error/i);
  });
});
