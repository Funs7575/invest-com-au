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

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeFeeChange(overrides = {}) {
  return {
    id: "fc-1",
    broker_slug: "stake",
    field_name: "asx_fee",
    old_value: "0.02%",
    new_value: "0.01%",
    change_type: "decrease",
    changed_at: "2026-04-01T00:00:00Z",
    source: "editorial",
    ...overrides,
  };
}

/**
 * Build a Supabase query builder that returns (data, count, error) from .range()
 * and supports the full chain: .select().order().gte().eq().range()
 */
function makeChangesBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
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

  it("logs failed auth with statusCode 401", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/fee-changes" }),
    );
  });
});

describe("GET /api/v1/fee-changes — parameter validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("rejects invalid ISO timestamp in ?since", async () => {
    const res = await GET(makeGet({ since: "not-a-date" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid/i);
  });

  it("rejects slug with uppercase letters", async () => {
    const res = await GET(makeGet({ slug: "STAKE" }));
    expect(res.status).toBe(400);
  });

  it("rejects slug with underscores", async () => {
    const res = await GET(makeGet({ slug: "stake_au" }));
    expect(res.status).toBe(400);
  });

  it("rejects field_name with uppercase", async () => {
    const res = await GET(makeGet({ field_name: "ASX_FEE" }));
    expect(res.status).toBe(400);
  });

  it("rejects limit > 100", async () => {
    const res = await GET(makeGet({ limit: "200" }));
    expect(res.status).toBe(400);
  });

  it("rejects negative offset", async () => {
    const res = await GET(makeGet({ offset: "-5" }));
    expect(res.status).toBe(400);
  });

  it("logs 400 on invalid params", async () => {
    await GET(makeGet({ since: "bad" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

describe("GET /api/v1/fee-changes — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns fee change list with meta envelope", async () => {
    const change = makeFeeChange();
    mockAdminFrom.mockReturnValue(makeChangesBuilder([change], null, 1));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].broker_slug).toBe("stake");
    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
    expect(body.meta.generated_at).toBeDefined();
  });

  it("defaults to empty array when no rows", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([], null, 0));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });

  it("applies ?since filter via .gte() on changed_at", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    const since = "2026-01-01T00:00:00Z";
    await GET(makeGet({ since }));
    expect(builder.gte).toHaveBeenCalledWith("changed_at", since);
  });

  it("applies ?slug filter via .eq()", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ slug: "selfwealth" }));
    expect(builder.eq).toHaveBeenCalledWith("broker_slug", "selfwealth");
  });

  it("applies ?field_name filter via .eq()", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ field_name: "asx_fee" }));
    expect(builder.eq).toHaveBeenCalledWith("field_name", "asx_fee");
  });

  it("respects ?limit and paginates correctly", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "5" }));
    expect(builder.range).toHaveBeenCalledWith(0, 4);
  });

  it("respects ?offset", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ offset: "40" }));
    expect(builder.range).toHaveBeenCalledWith(40, 59);
  });

  it("caps limit at 100", async () => {
    // limit=100 is the max allowed — boundary check
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "100" }));
    expect(builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("does NOT apply .gte() when ?since is absent", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet());
    expect(builder.gte).not.toHaveBeenCalled();
  });

  it("does NOT apply broker .eq() when ?slug is absent", async () => {
    const builder = makeChangesBuilder([], null, 0);
    mockAdminFrom.mockReturnValue(builder);

    await GET(makeGet());
    expect(builder.eq).not.toHaveBeenCalled();
  });

  it("logs successful request with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([makeFeeChange()], null, 1));

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("includes Cache-Control header with short TTL on success", async () => {
    mockAdminFrom.mockReturnValue(makeChangesBuilder([], null, 0));

    const res = await GET(makeGet());
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("max-age=");
  });

  it("returns 500 on DB error", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      range: vi.fn(() =>
        Promise.resolve({ data: null, count: null, error: { message: "DB error" } }),
      ),
    };
    mockAdminFrom.mockReturnValue(builder);

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/fee changes/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("does not expose internal auto_applied columns", async () => {
    const change = { ...makeFeeChange(), auto_applied_at: "2026-04-01T00:00:00Z", auto_applied_tier: "auto_apply" };
    mockAdminFrom.mockReturnValue(makeChangesBuilder([change], null, 1));

    const res = await GET(makeGet());
    const body = await res.json();
    // Route selects only PUBLIC_COLUMNS — the DB won't return these cols;
    // verify they are not present in the first data item if somehow present
    expect(body.data[0].auto_applied_tier).toBeUndefined();
    expect(body.data[0].auto_applied_at).toBeUndefined();
  });
});
