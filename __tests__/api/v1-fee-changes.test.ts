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

import { GET, OPTIONS } from "@/app/api/v1/fee-changes/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-fc", name: "Test", key_prefix: "ica_test", tier: "basic" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeChange(overrides: Record<string, unknown> = {}) {
  return {
    id: "chg-1",
    broker_slug: "stake",
    field_name: "asx_fee",
    old_value: "3.00",
    new_value: "5.00",
    change_type: "update",
    changed_at: "2026-05-20T00:00:00Z",
    source: "cron",
    ...overrides,
  };
}

/**
 * The route awaits the assembled query directly (not a terminal method), so the
 * builder must be a thenable whose chain methods return `this`.
 */
function makeChangesBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  const result = { data: rows, count, error };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    then: (resolve: (v: unknown) => unknown) => resolve(result),
  };
  return builder;
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/fee-changes${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/fee-changes", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/fee-changes — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Missing Authorization header");
  });

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("logs failed auth requests with null apiKeyId", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        endpoint: "/api/v1/fee-changes",
        apiKeyId: null,
      }),
    );
  });
});

describe("GET /api/v1/fee-changes — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for an unknown field filter", async () => {
    const res = await GET(makeGet({ field: "made_up_fee" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Unknown field/i);
  });

  it("returns 400 for an invalid broker_slug format", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([], null, 0));
    const res = await GET(makeGet({ broker_slug: "Not Valid!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid broker_slug/i);
  });
});

describe("GET /api/v1/fee-changes — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns fee changes with meta envelope", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([makeChange()], null, 1));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].broker_slug).toBe("stake");
    expect(body.data[0].field_name).toBe("asx_fee");
    expect(body.meta.total).toBe(1);
    expect(body.meta.updated_at).toBe("2026-05-20T00:00:00Z");
    expect(body.meta.disclaimer).toBeTruthy();
  });

  it("strips fields not in PUBLIC_FIELDS", async () => {
    const row = { ...makeChange(), value_hash: "deadbeef", internal_note: "secret" };
    mockAdminFrom.mockReturnValue(makeChangesBuilder([row], null, 1));
    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].value_hash).toBeUndefined();
    expect(body.data[0].internal_note).toBeUndefined();
  });

  it("filters to recognised fee fields by default (uses .in)", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet());
    expect(builder.in).toHaveBeenCalledWith("field_name", expect.arrayContaining(["asx_fee"]));
  });

  it("filters to a single field with .eq when ?field= is valid", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ field: "us_fee" }));
    expect(builder.eq).toHaveBeenCalledWith("field_name", "us_fee");
    expect(builder.in).not.toHaveBeenCalled();
  });

  it("filters by broker_slug when valid", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ broker_slug: "stake" }));
    expect(builder.eq).toHaveBeenCalledWith("broker_slug", "stake");
  });

  it("applies a since filter for a valid ISO date", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ since: "2026-01-01" }));
    expect(builder.gte).toHaveBeenCalledWith("changed_at", "2026-01-01T00:00:00.000Z");
  });

  it("ignores an unparseable since value", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ since: "not-a-date" }));
    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("respects limit and offset (range), clamping limit to 200", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet({ limit: "500", offset: "10" }));
    expect(builder.range).toHaveBeenCalledWith(10, 209);
  });

  it("includes a private Cache-Control header on success", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([], null, 0));
    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=900");
  });

  it("logs successful requests with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([makeChange()], null, 1));
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-fc" }),
    );
  });

  it("returns 500 on a DB error", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder(null as unknown as unknown[], { message: "DB error" }, 0));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/fee changes/i);
  });

  it("returns 500 on an unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/internal server error/i);
  });
});
