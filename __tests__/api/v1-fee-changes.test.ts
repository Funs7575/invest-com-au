import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockAdminFrom, mockValidateApiKey, mockLogApiRequest } = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
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

import { GET, OPTIONS } from "@/app/api/v1/fee-changes/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test Key", key_prefix: "ica_test", tier: "basic" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg, statusCode: 401 };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/fee-changes${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

/**
 * Represents one row from broker_data_changes.
 */
function makeFeeChange(overrides: Record<string, unknown> = {}) {
  return {
    id: "chg-1",
    broker_slug: "stake",
    field_name: "asx_fee",
    old_value: "7.70",
    new_value: "5.00",
    change_type: "decrease",
    changed_at: "2026-04-01T10:00:00Z",
    source: "fee_check_cron",
    // fields that should NOT be exposed
    content_hash: "abc123",
    raw_html: "<table>...</table>",
    ...overrides,
  };
}

/**
 * Build a chainable supabase query builder that the fee-changes route uses.
 *
 * The route chains:
 *   .from().select(..., {count}).order().range().in()  OR  .eq()  then .eq() or .gte()
 *
 * The route builds the query incrementally with:
 *   let query = supabase.from(...).select(...).order(...).range(...)
 *   query = query.in(...) or query.eq(...)  [fieldParam branch]
 *   query = query.eq(...)                   [brokerSlug branch]
 *   query = query.gte(...)                  [sinceDate branch]
 *   const { data, count, error } = await query
 *
 * All intermediate calls must return `this` (the same object) so chaining works.
 * The final `await` resolves to { data, count, error }.
 */
function makeQueryBuilder(
  rows: unknown[] = [],
  count: number | null = null,
  error: unknown = null,
) {
  const resolveValue = Promise.resolve({ data: rows, count: count ?? rows.length, error });
  // All chain methods return `this`; the builder is also thenable so `await query` resolves.
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) => resolveValue.then(resolve),
  };
  return builder;
}

// ── OPTIONS ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/fee-changes", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ── Auth ───────────────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Invalid or inactive API key"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("logs auth failures with 401 status code and endpoint", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/fee-changes" }),
    );
  });
});

// ── Input validation ───────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for an unknown field param", async () => {
    const res = await GET(makeGet({ field: "credit_card_fee" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Unknown field/);
    expect(data.error).toContain("credit_card_fee");
  });

  it("returns 400 when broker_slug has invalid characters", async () => {
    // The route builds the query builder before checking broker_slug format,
    // so we need a chainable mock to prevent it from throwing while building.
    mockAdminFrom.mockReturnValue(makeQueryBuilder([]));
    const res = await GET(makeGet({ broker_slug: "INVALID Slug!!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid broker_slug format/);
  });

  it("accepts valid fee field params", async () => {
    const validFields = ["asx_fee", "asx_fee_value", "us_fee", "us_fee_value", "fx_rate", "inactivity_fee", "min_deposit"];
    for (const field of validFields) {
      const builder = makeQueryBuilder([]);
      mockAdminFrom.mockReturnValue(builder);
      const res = await GET(makeGet({ field }));
      expect(res.status).toBe(200);
    }
  });

  it("accepts valid broker_slug (lowercase + hyphens)", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    const res = await GET(makeGet({ broker_slug: "stake-au" }));
    expect(res.status).toBe(200);
  });
});

// ── Happy path — no filters ────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — success (no filters)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 200 with data array and meta", async () => {
    const rows = [makeFeeChange(), makeFeeChange({ id: "chg-2", broker_slug: "selfwealth" })];
    mockAdminFrom.mockReturnValue(makeQueryBuilder(rows, 2));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
    expect(body.meta.limit).toBe(50);
    expect(body.meta.offset).toBe(0);
  });

  it("sanitizes rows to only expose public fields", async () => {
    const rows = [makeFeeChange()];
    mockAdminFrom.mockReturnValue(makeQueryBuilder(rows, 1));
    const res = await GET(makeGet());
    const body = await res.json();
    const row = body.data[0];
    // Public fields present
    expect(row.id).toBe("chg-1");
    expect(row.broker_slug).toBe("stake");
    expect(row.field_name).toBe("asx_fee");
    expect(row.old_value).toBe("7.70");
    expect(row.new_value).toBe("5.00");
    expect(row.change_type).toBe("decrease");
    expect(row.changed_at).toBe("2026-04-01T10:00:00Z");
    expect(row.source).toBe("fee_check_cron");
    // Private fields NOT present
    expect(row.content_hash).toBeUndefined();
    expect(row.raw_html).toBeUndefined();
  });

  it("returns empty data array when no rows", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder([], 0));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it("includes meta.disclaimer", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder([]));
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.disclaimer).toContain("factual");
  });

  it("meta.updated_at is the changed_at of first row when rows exist", async () => {
    const rows = [makeFeeChange({ changed_at: "2026-05-01T00:00:00Z" })];
    mockAdminFrom.mockReturnValue(makeQueryBuilder(rows, 1));
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-05-01T00:00:00Z");
  });

  it("meta.updated_at falls back to current ISO date when no rows", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder([], 0));
    const res = await GET(makeGet());
    const body = await res.json();
    // Should be a valid ISO date string
    expect(() => new Date(body.meta.updated_at)).not.toThrow();
  });

  it("sets Cache-Control: private, max-age=900", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder([]));
    const res = await GET(makeGet());
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("private");
    expect(cc).toContain("900");
  });

  it("logs successful request with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder([]));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });
});

// ── Pagination ─────────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("uses default limit=50 and offset=0", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet());
    expect(builder.range).toHaveBeenCalledWith(0, 49);
  });

  it("respects custom limit param", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ limit: "10" }));
    expect(builder.range).toHaveBeenCalledWith(0, 9);
    const res = await GET(makeGet({ limit: "10" }));
    const body = await res.json();
    expect(body.meta.limit).toBe(10);
  });

  it("clamps limit to max 200", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ limit: "500" }));
    expect(builder.range).toHaveBeenCalledWith(0, 199);
  });

  it("falls back to 50 when limit is invalid", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ limit: "not-a-number" }));
    expect(builder.range).toHaveBeenCalledWith(0, 49);
  });

  it("respects offset param", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ offset: "50" }));
    expect(builder.range).toHaveBeenCalledWith(50, 99);
    const res = await GET(makeGet({ offset: "50" }));
    const body = await res.json();
    expect(body.meta.offset).toBe(50);
  });

  it("clamps negative offset to 0", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ offset: "-10" }));
    expect(builder.range).toHaveBeenCalledWith(0, 49);
  });
});

// ── Filters ────────────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("applies broker_slug eq filter", async () => {
    const builder = makeQueryBuilder([makeFeeChange()]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ broker_slug: "stake" }));
    expect(builder.eq).toHaveBeenCalledWith("broker_slug", "stake");
  });

  it("applies field eq filter when field param provided", async () => {
    const builder = makeQueryBuilder([makeFeeChange()]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ field: "asx_fee" }));
    expect(builder.eq).toHaveBeenCalledWith("field_name", "asx_fee");
  });

  it("uses .in() filter when no field param provided (fee fields whitelist)", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet());
    expect(builder.in).toHaveBeenCalledWith(
      "field_name",
      expect.arrayContaining(["asx_fee", "us_fee", "fx_rate", "inactivity_fee", "min_deposit"]),
    );
  });

  it("applies since filter as .gte() when valid date provided", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ since: "2026-01-01" }));
    expect(builder.gte).toHaveBeenCalledWith("changed_at", expect.stringContaining("2026-01-01"));
  });

  it("ignores invalid since date (no gte applied)", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ since: "not-a-date" }));
    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("can combine broker_slug + field + since filters", async () => {
    const builder = makeQueryBuilder([makeFeeChange()]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ broker_slug: "stake", field: "asx_fee", since: "2026-01-01" }));
    expect(builder.eq).toHaveBeenCalledWith("field_name", "asx_fee");
    expect(builder.eq).toHaveBeenCalledWith("broker_slug", "stake");
    expect(builder.gte).toHaveBeenCalled();
  });

  it("result rows for us_fee field are correctly sanitized", async () => {
    const rows = [makeFeeChange({ field_name: "us_fee", old_value: "0.01", new_value: "0.00" })];
    mockAdminFrom.mockReturnValue(makeQueryBuilder(rows, 1));
    const res = await GET(makeGet({ field: "us_fee" }));
    const body = await res.json();
    expect(body.data[0].field_name).toBe("us_fee");
    expect(body.data[0].old_value).toBe("0.01");
    expect(body.data[0].new_value).toBe("0.00");
  });
});

// ── Error paths ────────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 500 when DB query fails", async () => {
    // Build a builder that resolves with an error
    const errorBuilder = makeQueryBuilder([], null, { message: "DB connection failed" });
    mockAdminFrom.mockReturnValue(errorBuilder);
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Failed to fetch fee changes/);
  });

  it("logs 500 on DB failure", async () => {
    const errorBuilder = makeQueryBuilder([], null, { message: "timeout" });
    mockAdminFrom.mockReturnValue(errorBuilder);
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, endpoint: "/api/v1/fee-changes" }),
    );
  });

  it("returns 500 on unexpected throw in try block", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("admin client exploded");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Internal server error/);
  });

  it("logs 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────────

describe("GET /api/v1/fee-changes — edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("limit=1 is respected (min positive value)", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ limit: "1" }));
    expect(builder.range).toHaveBeenCalledWith(0, 0);
  });

  it("non-string field values are passed through unsanitized (numeric ids etc)", async () => {
    const rows = [makeFeeChange({ id: 999 })];
    mockAdminFrom.mockReturnValue(makeQueryBuilder(rows, 1));
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].id).toBe(999);
  });

  it("returns 200 when count is null (falls back to sanitized.length)", async () => {
    const rows = [makeFeeChange()];
    mockAdminFrom.mockReturnValue(makeQueryBuilder(rows, null));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.total).toBe(1);
  });

  it("all valid fee fields are accepted: fx_rate", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    const res = await GET(makeGet({ field: "fx_rate" }));
    expect(res.status).toBe(200);
  });

  it("all valid fee fields are accepted: min_deposit", async () => {
    const builder = makeQueryBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    const res = await GET(makeGet({ field: "min_deposit" }));
    expect(res.status).toBe(200);
  });
});
