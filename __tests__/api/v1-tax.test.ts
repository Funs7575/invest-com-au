import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockStaticFrom = vi.fn();

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockStaticFrom })),
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { GET as withholdingGET, OPTIONS as withholdingOPTIONS } from "@/app/api/v1/tax/withholding/route";
import { GET as bracketsGET, OPTIONS as bracketsOPTIONS } from "@/app/api/v1/tax/brackets/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

/**
 * A thenable query builder: every chain method returns `this`, and the object
 * itself resolves to `{ data, count, error }` when awaited. This covers both
 * routes regardless of which method terminates the chain (withholding ends on
 * `.range()`, brackets ends on `.order()`/`.eq()`).
 */
function makeBuilder(rows: unknown[] = [], error: unknown = null, count = rows.length) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (resolve: (v: unknown) => unknown) =>
      resolve({ data: rows, count, error }),
  };
  return builder;
}

function makeDtaRow(overrides = {}) {
  return {
    country: "United States",
    country_code: "US",
    has_dta: true,
    dividend_wht: "15.00",
    interest_wht: "10.00",
    royalties_wht: "5.00",
    dta_effective_year: 1983,
    notes: "5% for companies with >=10% interest; 15% otherwise",
    ato_reference_url: null,
    updated_at: "2026-03-29T00:00:00Z",
    ...overrides,
  };
}

function makeBracketRow(overrides = {}) {
  return {
    tax_year: "2025-26",
    taxpayer_type: "non_resident",
    income_from: "0.00",
    income_to: "135000.00",
    rate: "30.00",
    description: "$0 - $135,000",
    sort_order: 1,
    updated_at: "2026-03-29T00:00:00Z",
    ...overrides,
  };
}

function makeReq(path: string, params: Record<string, string> = {}, withKey = true): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost${path}${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: withKey ? { Authorization: "Bearer ica_testkey123" } : {},
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/v1/tax/withholding
// ════════════════════════════════════════════════════════════════════════════════

describe("OPTIONS /api/v1/tax/withholding", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await withholdingOPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/tax/withholding — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("logs failed auth requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/tax/withholding" }),
    );
  });
});

describe("GET /api/v1/tax/withholding — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for an invalid country code", async () => {
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding", { country: "USA" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid query/i);
  });

  it("returns 400 for an out-of-range limit", async () => {
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding", { limit: "500" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/tax/withholding — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns DTA rates with meta and coerces numerics", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([makeDtaRow()], null, 1));
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].country_code).toBe("US");
    // string numerics from numeric() columns are coerced to numbers
    expect(body.data[0].dividend_wht).toBe(15);
    expect(body.data[0].interest_wht).toBe(10);
    expect(body.data[0].royalties_wht).toBe(5);
    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(100);
  });

  it("only returns active rows (filters is_active=true)", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(builder.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("uppercases and filters by country code", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    await withholdingGET(makeReq("/api/v1/tax/withholding", { country: "gb" }));
    expect(builder.eq).toHaveBeenCalledWith("country_code", "GB");
  });

  it("filters has_dta=false", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    await withholdingGET(makeReq("/api/v1/tax/withholding", { has_dta: "false" }));
    expect(builder.eq).toHaveBeenCalledWith("has_dta", false);
  });

  it("applies pagination range", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    await withholdingGET(makeReq("/api/v1/tax/withholding", { limit: "10", offset: "20" }));
    expect(builder.range).toHaveBeenCalledWith(20, 29);
  });

  it("does not expose internal columns (id, sort_order)", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([makeDtaRow()], null, 1));
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding"));
    const body = await res.json();
    expect(body.data[0].id).toBeUndefined();
    expect(body.data[0].sort_order).toBeUndefined();
    expect(body.data[0].is_active).toBeUndefined();
  });

  it("returns 500 on DB error", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder(null as unknown as unknown[], { message: "DB error" }, null as unknown as number));
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/withholding/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockStaticFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(res.status).toBe(500);
  });

  it("includes Cache-Control header on success", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([], null, 0));
    const res = await withholdingGET(makeReq("/api/v1/tax/withholding"));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// GET /api/v1/tax/brackets
// ════════════════════════════════════════════════════════════════════════════════

describe("OPTIONS /api/v1/tax/brackets", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await bracketsOPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/tax/brackets — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/tax/brackets — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for an invalid residency value", async () => {
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets", { residency: "alien" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed tax_year", async () => {
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets", { tax_year: "2025" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/tax/brackets — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("defaults to non_resident brackets", async () => {
    const builder = makeBuilder([makeBracketRow()], null, 1);
    mockStaticFrom.mockReturnValue(builder);
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(builder.eq).toHaveBeenCalledWith("taxpayer_type", "non_resident");
    expect(body.meta.residency).toBe("non_resident");
  });

  it("coerces numerics and preserves null income_to (top bracket)", async () => {
    const rows = [makeBracketRow({ income_from: "190001.00", income_to: null, rate: "45.00", description: "Over $190,000" })];
    mockStaticFrom.mockReturnValue(makeBuilder(rows, null, 1));
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets"));
    const body = await res.json();
    expect(body.data[0].income_from).toBe(190001);
    expect(body.data[0].income_to).toBeNull();
    expect(body.data[0].rate).toBe(45);
  });

  it("selects resident brackets when requested", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets", { residency: "resident" }));
    const body = await res.json();
    expect(builder.eq).toHaveBeenCalledWith("taxpayer_type", "resident");
    expect(body.meta.residency).toBe("resident");
  });

  it("filters by tax_year", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    await bracketsGET(makeReq("/api/v1/tax/brackets", { tax_year: "2025-26" }));
    expect(builder.eq).toHaveBeenCalledWith("tax_year", "2025-26");
  });

  it("only returns active rows", async () => {
    const builder = makeBuilder([], null, 0);
    mockStaticFrom.mockReturnValue(builder);
    await bracketsGET(makeReq("/api/v1/tax/brackets"));
    expect(builder.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("does not expose internal columns (sort_order)", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([makeBracketRow()], null, 1));
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets"));
    const body = await res.json();
    expect(body.data[0].sort_order).toBeUndefined();
  });

  it("returns 500 on DB error", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder(null as unknown as unknown[], { message: "DB error" }, null as unknown as number));
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets"));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/brackets/i);
  });

  it("includes Cache-Control header on success", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([], null, 0));
    const res = await bracketsGET(makeReq("/api/v1/tax/brackets"));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });
});
