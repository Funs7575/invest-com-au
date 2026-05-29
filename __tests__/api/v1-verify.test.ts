import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockValidateApiKey, mockLogApiRequest, mockAdminFrom, mockStaticFrom } = vi.hoisted(() => ({
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockStaticFrom: vi.fn(),
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

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockStaticFrom })),
}));

// normaliseAfslNumber is a pure function; use the real implementation via a
// pass-through mock so we don't lose AFSL-lookup test coverage.
vi.mock("@/lib/afsl-register", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/afsl-register")>();
  return { normaliseAfslNumber: actual.normaliseAfslNumber };
});

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET, OPTIONS } from "@/app/api/v1/verify/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(result: { data?: unknown; error?: unknown } = {}) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "in", "gte", "order", "limit", "maybeSingle", "single",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: result.data ?? null, error: result.error ?? null }),
    );
  return b;
}

const VALID_KEY = { id: "key-1", tier: "pro", name: "Test" };

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/verify${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/verify", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/verify — auth failures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "Missing Authorization header" });
    const res = await GET(makeGet({ type: "advisor", slug: "test-slug" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing Authorization header");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("always returns 401 for any auth failure (route hardcodes 401, ignores statusCode)", async () => {
    // Note: unlike some other v1 routes, /api/v1/verify hardcodes 401 for all
    // auth failures rather than forwarding auth.statusCode. This test documents
    // the actual behaviour.
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "Tier too low", statusCode: 403 });
    const res = await GET(makeGet({ type: "advisor", slug: "test-slug" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 even when validateApiKey signals a 429 (route hardcodes status)", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "limit", statusCode: 429 });
    const res = await GET(makeGet({ type: "advisor", slug: "test-slug" }));
    expect(res.status).toBe(401);
  });

  it("logs failed auth with null apiKeyId and 401 statusCode", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "bad key" });
    await GET(makeGet({ type: "advisor", slug: "test-slug" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, apiKeyId: null, endpoint: "/api/v1/verify" }),
    );
  });
});

describe("GET /api/v1/verify — parameter validation (auth passes)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 400 when ?type is missing", async () => {
    const res = await GET(makeGet({ slug: "some-slug" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/type/i);
  });

  it("returns 400 when ?type is an unknown value", async () => {
    const res = await GET(makeGet({ type: "broker", slug: "some-slug" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when ?slug is missing", async () => {
    const res = await GET(makeGet({ type: "advisor" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/slug/i);
  });

  it("returns 400 when ?slug has invalid characters", async () => {
    const res = await GET(makeGet({ type: "advisor", slug: "bad slug!" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/verify — type=advisor success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 404 when the advisor is not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET(makeGet({ type: "advisor", slug: "unknown-advisor" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, apiKeyId: VALID_KEY.id }),
    );
  });

  it("returns 200 with advisor fields when found (no AFSL lookup needed)", async () => {
    const pro = {
      slug: "jane-doe",
      name: "Jane Doe",
      type: "financial-planner",
      verified: true,
      afsl_number: null,
      abn: "123456789",
      verified_at: "2026-01-01T00:00:00Z",
      verification_method: "asic_check",
      status: "active",
    };
    mockAdminFrom.mockReturnValue(makeBuilder({ data: pro, error: null }));

    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.type).toBe("advisor");
    expect(body.slug).toBe("jane-doe");
    expect(body.verified).toBe(true);
    expect(body.afsl_number).toBeNull();
    expect(body.afsl_status).toBeNull();
    expect(body.profile_url).toContain("jane-doe");
    expect(body.trust_mark_embed).toContain("advisor");
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: VALID_KEY.id }),
    );
  });

  it("returns 200 and looks up AFSL status when advisor has an AFSL number", async () => {
    const pro = {
      slug: "john-smith",
      name: "John Smith",
      type: "financial-planner",
      verified: true,
      afsl_number: "AFSL 235 654",
      abn: null,
      verified_at: null,
      verification_method: null,
      status: "active",
    };
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder({ data: pro, error: null });
      return makeBuilder({ data: null, error: null });
    });
    // AFSL status comes from the static (public) supabase client
    mockStaticFrom.mockReturnValue(makeBuilder({ data: { status: "current" }, error: null }));

    const res = await GET(makeGet({ type: "advisor", slug: "john-smith" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.afsl_status).toBe("current");
    expect(body.afsl_number).toBe("AFSL 235 654");
  });
});

describe("GET /api/v1/verify — type=firm success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 404 when firm is not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ data: null, error: null }));
    const res = await GET(makeGet({ type: "firm", slug: "no-firm" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 200 with firm fields when found (no AFSL)", async () => {
    const firm = {
      slug: "acme-financial",
      name: "Acme Financial",
      afsl_number: null,
      abn: "987654321",
      status: "active",
    };
    mockAdminFrom.mockReturnValue(makeBuilder({ data: firm, error: null }));

    const res = await GET(makeGet({ type: "firm", slug: "acme-financial" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("firm");
    expect(body.slug).toBe("acme-financial");
    expect(body.name).toBe("Acme Financial");
    expect(body.afsl_status).toBeNull();
    expect(body.profile_url).toContain("acme-financial");
    expect(body.trust_mark_embed).toContain("firm");
  });

  it("returns 200 with AFSL status when firm has AFSL number", async () => {
    const firm = {
      slug: "licensed-firm",
      name: "Licensed Firm",
      afsl_number: "111222",
      abn: "111222333",
      status: "active",
    };
    mockAdminFrom.mockReturnValue(makeBuilder({ data: firm, error: null }));
    mockStaticFrom.mockReturnValue(makeBuilder({ data: { status: "cancelled" }, error: null }));

    const res = await GET(makeGet({ type: "firm", slug: "licensed-firm" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.afsl_status).toBe("cancelled");
  });
});

describe("GET /api/v1/verify — 500 (DB throws)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 500 when the DB query throws unexpectedly", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("connection refused");
    });
    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});
