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

import { GET, OPTIONS } from "@/app/api/v1/advisors/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeAdvisor(overrides = {}) {
  return {
    id: 42,
    slug: "jane-smith-cfp",
    name: "Jane Smith",
    firm_name: "Smith Financial",
    type: "financial_planner",
    specialties: ["retirement", "smsf"],
    location_state: "NSW",
    location_display: "Sydney, NSW",
    afsl_number: "123456",
    rating: 4.8,
    review_count: 24,
    verified: true,
    status: "active",
    updated_at: "2026-05-01T08:00:00Z",
    ...overrides,
  };
}

function makeAdvisorsBuilder(
  rows: unknown[] = [],
  error: unknown = null,
  count = rows.length,
) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(() => Promise.resolve({ data: rows, count, error })),
  };
  return builder;
}

function makeGet(params: Record<string, string> = {}): NextRequest {
  const sp = new URLSearchParams(params).toString();
  const url = `http://localhost/api/v1/advisors${sp ? `?${sp}` : ""}`;
  return new NextRequest(url, {
    headers: { Authorization: "Bearer ica_testkey123" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/advisors", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/advisors — auth", () => {
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

  it("logs failed auth requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, endpoint: "/api/v1/advisors" }),
    );
  });
});

describe("GET /api/v1/advisors — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns advisor list with meta", async () => {
    const advisor = makeAdvisor();
    mockServerFrom.mockReturnValue(makeAdvisorsBuilder([advisor], null, 1));

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Jane Smith");
    expect(body.meta.total).toBe(1);
    expect(body.meta.limit).toBe(20);
    expect(body.meta.offset).toBe(0);
  });

  it("strips private/PII fields from advisor rows", async () => {
    const advisor = {
      ...makeAdvisor(),
      email: "jane@smith.com",
      phone: "0412345678",
      stripe_customer_id: "cus_secret",
      admin_notes: "internal only",
      credit_balance_cents: 10000,
      total_leads: 55,
    };
    mockServerFrom.mockReturnValue(makeAdvisorsBuilder([advisor], null, 1));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.data[0].email).toBeUndefined();
    expect(body.data[0].phone).toBeUndefined();
    expect(body.data[0].stripe_customer_id).toBeUndefined();
    expect(body.data[0].admin_notes).toBeUndefined();
    expect(body.data[0].credit_balance_cents).toBeUndefined();
    expect(body.data[0].total_leads).toBeUndefined();
  });

  it("exposes allowed public fields", async () => {
    const advisor = makeAdvisor({
      afsl_number: "123456",
      rating: 4.8,
      verified: true,
      accepts_new_clients: true,
    });
    mockServerFrom.mockReturnValue(makeAdvisorsBuilder([advisor], null, 1));

    const res = await GET(makeGet());
    const body = await res.json();
    const row = body.data[0];
    expect(row.afsl_number).toBe("123456");
    expect(row.rating).toBe(4.8);
    expect(row.verified).toBe(true);
    expect(row.accepts_new_clients).toBe(true);
  });

  it("respects limit query param (max 100)", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "5" }));
    expect(builder.range).toHaveBeenCalledWith(0, 4);
  });

  it("clamps limit to 100 even if 200 requested", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "200" }));
    expect(builder.range).toHaveBeenCalledWith(0, 99);
  });

  it("defaults limit to 20 when invalid", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ limit: "abc" }));
    expect(builder.range).toHaveBeenCalledWith(0, 19);
  });

  it("respects offset query param", async () => {
    const builder = makeAdvisorsBuilder([], null, 100);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ offset: "20" }));
    expect(builder.range).toHaveBeenCalledWith(20, 39);
  });

  it("filters by type", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ type: "financial_planner" }));
    expect(builder.eq).toHaveBeenCalledWith("type", "financial_planner");
  });

  it("filters by location_state", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ location_state: "NSW" }));
    expect(builder.eq).toHaveBeenCalledWith("location_state", "NSW");
  });

  it("filters verified=true", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ verified: "true" }));
    expect(builder.eq).toHaveBeenCalledWith("verified", true);
  });

  it("filters verified=false", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ verified: "false" }));
    expect(builder.eq).toHaveBeenCalledWith("verified", false);
  });

  it("filters accepts_new_clients=true", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ accepts_new_clients: "true" }));
    expect(builder.eq).toHaveBeenCalledWith("accepts_new_clients", true);
  });

  it("filters accepts_new_clients=false", async () => {
    const builder = makeAdvisorsBuilder([], null, 0);
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ accepts_new_clients: "false" }));
    expect(builder.eq).toHaveBeenCalledWith("accepts_new_clients", false);
  });

  it("returns 500 on DB error", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(() =>
        Promise.resolve({ data: null, count: null, error: { message: "DB error" } }),
      ),
    };
    mockServerFrom.mockReturnValue(builder);

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/advisor/i);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("logs successful requests with apiKeyId", async () => {
    mockServerFrom.mockReturnValue(makeAdvisorsBuilder([makeAdvisor()], null, 1));

    await GET(makeGet());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockReturnValue(makeAdvisorsBuilder([], null, 0));

    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("computes meta.updated_at from most recent advisor", async () => {
    const advisors = [
      makeAdvisor({ updated_at: "2026-01-01T00:00:00Z" }),
      makeAdvisor({ name: "Bob Jones", updated_at: "2026-04-01T00:00:00Z" }),
    ];
    mockServerFrom.mockReturnValue(makeAdvisorsBuilder(advisors, null, 2));

    const res = await GET(makeGet());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-04-01T00:00:00Z");
  });
});
