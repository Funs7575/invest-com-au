import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const mockStaticFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockStaticFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/afsl-register", () => ({
  normaliseAfslNumber: vi.fn((s: string) => s),
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

import { GET, OPTIONS } from "@/app/api/v1/verify/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-vf", name: "Test", key_prefix: "ica_test", tier: "basic" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

/** Builder whose `.eq()` chains return `this` and `.maybeSingle()` resolves. */
function makeSingleBuilder(row: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: row, error })),
  };
  return builder;
}

function makeAdvisor(overrides: Record<string, unknown> = {}) {
  return {
    slug: "jane-doe",
    name: "Jane Doe",
    type: "financial_adviser",
    verified: true,
    afsl_number: "123456",
    abn: "11222333444",
    verified_at: "2026-04-01T00:00:00Z",
    verification_method: "asic_register",
    status: "active",
    ...overrides,
  };
}

function makeFirm(overrides: Record<string, unknown> = {}) {
  return {
    slug: "acme-advisory",
    name: "Acme Advisory",
    afsl_number: "654321",
    abn: "55666777888",
    status: "active",
    ...overrides,
  };
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/verify${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/verify", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/verify — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Missing Authorization header"));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Missing Authorization header");
  });

  it("logs failed auth requests with null apiKeyId", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/verify", apiKeyId: null }),
    );
  });

  it("passes the endpoint to validateApiKey for tier gating", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(mockValidateApiKey).toHaveBeenCalledWith(expect.anything(), "/api/v1/verify");
  });
});

describe("GET /api/v1/verify — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 when type is missing or invalid", async () => {
    const res = await GET(makeGet({ slug: "jane-doe" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/type/i);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await GET(makeGet({ type: "advisor" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug/i);
  });

  it("returns 400 when slug has invalid characters", async () => {
    const res = await GET(makeGet({ type: "advisor", slug: "Jane Doe!" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/verify — advisor lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 404 when advisor not found", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/advisor not found/i);
  });

  it("returns advisor verification data with afsl_status resolved", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeAdvisor()));
    mockStaticFrom.mockReturnValue(makeSingleBuilder({ status: "current" }));

    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("advisor");
    expect(body.slug).toBe("jane-doe");
    expect(body.name).toBe("Jane Doe");
    expect(body.professional_type).toBe("financial_adviser");
    expect(body.verified).toBe(true);
    expect(body.afsl_number).toBe("123456");
    expect(body.afsl_status).toBe("current");
    expect(body.profile_url).toContain("/advisor/jane-doe");
    expect(body.trust_mark_embed).toContain("trust-mark");
  });

  it("returns null afsl_status when advisor has no afsl_number", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeAdvisor({ afsl_number: null })));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    const body = await res.json();
    expect(body.afsl_status).toBeNull();
    // Register should not be queried when there's no AFSL to look up.
    expect(mockStaticFrom).not.toHaveBeenCalled();
  });

  it("sets a public Cache-Control header", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeAdvisor({ afsl_number: null })));
    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("logs successful advisor lookups with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeAdvisor({ afsl_number: null })));
    await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-vf" }),
    );
  });
});

describe("GET /api/v1/verify — firm lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 404 when firm not found", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(null));
    const res = await GET(makeGet({ type: "firm", slug: "acme-advisory" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/firm not found/i);
  });

  it("returns firm verification data", async () => {
    mockAdminFrom.mockReturnValue(makeSingleBuilder(makeFirm()));
    mockStaticFrom.mockReturnValue(makeSingleBuilder({ status: "current" }));

    const res = await GET(makeGet({ type: "firm", slug: "acme-advisory" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.type).toBe("firm");
    expect(body.slug).toBe("acme-advisory");
    expect(body.afsl_number).toBe("654321");
    expect(body.afsl_status).toBe("current");
    expect(body.status).toBe("active");
    expect(body.profile_url).toContain("/firm/acme-advisory");
  });
});

describe("GET /api/v1/verify — errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 500 on an unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeGet({ type: "advisor", slug: "jane-doe" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/internal server error/i);
  });
});
