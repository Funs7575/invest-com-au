import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockAdminFrom, mockStaticFrom, mockValidateApiKey, mockLogApiRequest, mockNormaliseAfslNumber } = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockStaticFrom: vi.fn(),
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
  mockNormaliseAfslNumber: vi.fn((n: string) => n),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockStaticFrom })),
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

vi.mock("@/lib/afsl-register", () => ({
  normaliseAfslNumber: (...args: unknown[]) => mockNormaliseAfslNumber(...args as [string]),
}));

import { GET, OPTIONS } from "@/app/api/v1/verify/route";

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
  const url = `http://localhost/api/v1/verify${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

/**
 * Build a chainable supabase builder for SELECT queries with one or two .eq()
 * calls followed by .maybeSingle().
 *
 * Handles both:
 *   .from().select().eq().eq().maybeSingle()   (admin: professionals / advisor_firms)
 *   .from().select().eq().maybeSingle()         (static: afsl_register)
 */
function makeMaybySingleBuilder(data: unknown = null, error: unknown = null) {
  const maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  // eq() returns an object that has both .eq() (for chaining) and .maybeSingle()
  const eqChain: { eq: typeof eqFn; maybeSingle: typeof maybySingleFn } = {} as never;
  const maybySingleFn = maybeSingle;
  const eqFn: (...args: unknown[]) => typeof eqChain = vi.fn(() => eqChain);
  eqChain.eq = eqFn;
  eqChain.maybeSingle = maybySingleFn;
  const select = vi.fn(() => eqChain);
  return { select };
}

const ADVISOR_ROW = {
  slug: "jane-smith-cfp",
  name: "Jane Smith CFP",
  type: "financial_planner",
  verified: true,
  afsl_number: "123456",
  abn: "12345678901",
  verified_at: "2026-01-15T00:00:00Z",
  verification_method: "document_check",
  status: "active",
};

const FIRM_ROW = {
  slug: "smith-financial",
  name: "Smith Financial Pty Ltd",
  afsl_number: "654321",
  abn: "98765432100",
  status: "active",
};

const AFSL_ROW = { status: "current" };

// ── OPTIONS ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/verify", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ── Auth failures ──────────────────────────────────────────────────────────────

describe("GET /api/v1/verify — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key is invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Invalid or inactive API key"));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(401);
  });

  it("logs auth failures", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/verify" }),
    );
  });
});

// ── Input validation ───────────────────────────────────────────────────────────

describe("GET /api/v1/verify — input validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 when type is missing", async () => {
    const res = await GET(makeGet({ slug: "jane-smith-cfp" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/type/i);
  });

  it("returns 400 when type is not advisor or firm", async () => {
    const res = await GET(makeGet({ type: "broker", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/"advisor" or "firm"/);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await GET(makeGet({ type: "advisor" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug/i);
  });

  it("returns 400 when slug contains invalid characters", async () => {
    const res = await GET(makeGet({ type: "advisor", slug: "INVALID SLUG!!" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug/i);
  });

  it("returns 400 when slug is empty string", async () => {
    const res = await GET(makeGet({ type: "advisor", slug: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug has uppercase letters", async () => {
    const res = await GET(makeGet({ type: "advisor", slug: "Jane-Smith" }));
    expect(res.status).toBe(400);
  });
});

// ── Advisor happy path ─────────────────────────────────────────────────────────

describe("GET /api/v1/verify — advisor success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
    mockNormaliseAfslNumber.mockImplementation((n: string) => n);
  });

  it("returns 200 with advisor verification data", async () => {
    // admin: professionals query
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(ADVISOR_ROW));
    // static: afsl_register query
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(AFSL_ROW));

    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("advisor");
    expect(body.slug).toBe("jane-smith-cfp");
    expect(body.name).toBe("Jane Smith CFP");
    expect(body.verified).toBe(true);
    expect(body.afsl_number).toBe("123456");
    expect(body.afsl_status).toBe("current");
    expect(body.abn).toBe("12345678901");
    expect(body.verified_at).toBe("2026-01-15T00:00:00Z");
    expect(body.verification_method).toBe("document_check");
    expect(body.profile_url).toContain("jane-smith-cfp");
    expect(body.trust_mark_embed).toContain("advisor");
    expect(body.trust_mark_embed).toContain("jane-smith-cfp");
  });

  it("includes Cache-Control: public, max-age=3600 on success", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(ADVISOR_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(AFSL_ROW));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("3600");
  });

  it("logs successful advisor request", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(ADVISOR_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(AFSL_ROW));
    await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("handles advisor without afsl_number (afsl_status is null)", async () => {
    const advisorNoAfsl = { ...ADVISOR_ROW, afsl_number: null };
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(advisorNoAfsl));
    // static client should NOT be called when afsl_number is null
    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.afsl_number).toBeNull();
    expect(body.afsl_status).toBeNull();
    // Static client not called
    expect(mockStaticFrom).not.toHaveBeenCalled();
  });

  it("handles afsl_register returning null (afsl_status null)", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(ADVISOR_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(null));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.afsl_status).toBeNull();
  });

  it("returns 404 when advisor not found", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(null));
    const res = await GET(makeGet({ type: "advisor", slug: "no-such-advisor" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Advisor not found/);
  });

  it("logs 404 for missing advisor", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(null));
    await GET(makeGet({ type: "advisor", slug: "missing" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

// ── Firm happy path ────────────────────────────────────────────────────────────

describe("GET /api/v1/verify — firm success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
    mockNormaliseAfslNumber.mockImplementation((n: string) => n);
  });

  it("returns 200 with firm verification data", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(FIRM_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(AFSL_ROW));

    const res = await GET(makeGet({ type: "firm", slug: "smith-financial" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("firm");
    expect(body.slug).toBe("smith-financial");
    expect(body.name).toBe("Smith Financial Pty Ltd");
    expect(body.afsl_number).toBe("654321");
    expect(body.afsl_status).toBe("current");
    expect(body.abn).toBe("98765432100");
    expect(body.status).toBe("active");
    expect(body.profile_url).toContain("smith-financial");
    expect(body.trust_mark_embed).toContain("firm");
    expect(body.trust_mark_embed).toContain("smith-financial");
  });

  it("includes Cache-Control: public, max-age=3600 on firm success", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(FIRM_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(AFSL_ROW));
    const res = await GET(makeGet({ type: "firm", slug: "smith-financial" }));
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("3600");
  });

  it("logs successful firm request", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(FIRM_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(AFSL_ROW));
    await GET(makeGet({ type: "firm", slug: "smith-financial" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("handles firm without afsl_number (afsl_status null, no static query)", async () => {
    const firmNoAfsl = { ...FIRM_ROW, afsl_number: null };
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(firmNoAfsl));
    const res = await GET(makeGet({ type: "firm", slug: "smith-financial" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.afsl_number).toBeNull();
    expect(body.afsl_status).toBeNull();
    expect(mockStaticFrom).not.toHaveBeenCalled();
  });

  it("handles afsl_register returning null for firm (afsl_status null)", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(FIRM_ROW));
    mockStaticFrom.mockReturnValue(makeMaybySingleBuilder(null));
    const res = await GET(makeGet({ type: "firm", slug: "smith-financial" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.afsl_status).toBeNull();
  });

  it("returns 404 when firm not found", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(null));
    const res = await GET(makeGet({ type: "firm", slug: "no-such-firm" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/Firm not found/);
  });

  it("logs 404 for missing firm", async () => {
    mockAdminFrom.mockReturnValue(makeMaybySingleBuilder(null));
    await GET(makeGet({ type: "firm", slug: "missing-firm" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

// ── Error paths ────────────────────────────────────────────────────────────────

describe("GET /api/v1/verify — unexpected errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 500 when admin client throws", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("admin client exploded");
    });
    const res = await GET(makeGet({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Internal server error/);
  });

  it("logs 500 on unexpected error", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    await GET(makeGet({ type: "firm", slug: "smith-financial" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});
