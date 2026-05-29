import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const { mockValidateApiKey, mockLogApiRequest } = vi.hoisted(() => ({
  mockValidateApiKey: vi.fn(),
  mockLogApiRequest: vi.fn(),
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

import { GET, OPTIONS } from "@/app/api/v1/cohort-report/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = [], error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "gte", "order", "eq",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeEnterpriseKey(overrides: Record<string, unknown> = {}) {
  return { id: "key-ent-1", tier: "enterprise", name: "Enterprise Key", ...overrides };
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/v1/cohort-report");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), {
    headers: { Authorization: "Bearer ica_testkey" },
  });
}

const COHORT_ROW = {
  week_start: "2026-05-01",
  inferred_vertical: "broker-seeker",
  experience_level: "beginner",
  investment_range: "10k-50k",
  quiz_completions: 120,
  leads_captured: 35,
  conversion_rate: 0.29,
  top_utm_source: "google",
  computed_at: "2026-05-08T00:00:00Z",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/cohort-report", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/cohort-report — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key is missing or invalid", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "Invalid API key" });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 403 for non-enterprise tier", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: makeEnterpriseKey({ tier: "pro" }) });
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/enterprise/i);
  });

  it("returns 403 for basic tier", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: makeEnterpriseKey({ tier: "basic" }) });
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it("always returns 401 for any auth failure (does not honour custom statusCode)", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "limit", statusCode: 429 });
    const res = await GET(makeReq());
    // Route always emits 401 for !auth.valid (no statusCode passthrough in this route)
    expect(res.status).toBe(401);
  });

  it("logs failed auth with statusCode 401 and null apiKeyId", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: false, error: "nope" });
    await GET(makeReq());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, apiKeyId: null, method: "GET" }),
    );
  });

  it("logs 403 with apiKeyId when tier check fails", async () => {
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: makeEnterpriseKey({ tier: "pro" }) });
    await GET(makeReq());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, apiKeyId: "key-ent-1" }),
    );
  });
});

describe("GET /api/v1/cohort-report — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: makeEnterpriseKey() });
  });

  it("returns 200 with cohorts and meta", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([COHORT_ROW]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.cohorts)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta.disclaimer).toMatch(/anonymised/i);
  });

  it("returns private cache-control header on success", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([COHORT_ROW]));
    const res = await GET(makeReq());
    expect(res.headers.get("Cache-Control")).toContain("private");
  });

  it("includes total_rows in meta", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([COHORT_ROW, COHORT_ROW]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.meta.total_rows).toBe(2);
  });

  it("includes weeks in meta matching the default of 12", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([COHORT_ROW]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.meta.weeks).toBe(12);
  });

  it("includes updated_at from first row's computed_at", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([COHORT_ROW]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.meta.updated_at).toBe("2026-05-08T00:00:00Z");
  });

  it("returns updated_at=null when cohorts is empty", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.meta.updated_at).toBeNull();
  });

  it("returns empty cohorts array when no rows match", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([]));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.cohorts).toEqual([]);
  });

  it("logs the successful request with apiKeyId", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([COHORT_ROW]));
    await GET(makeReq());
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-ent-1" }),
    );
  });
});

describe("GET /api/v1/cohort-report — query params", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: makeEnterpriseKey() });
  });

  it("clamps ?weeks to max 52", async () => {
    const chain = makeBuilder([COHORT_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ weeks: "100" }));
    const body = await res.json();
    expect(body.meta.weeks).toBe(52);
  });

  it("defaults weeks to 12 when ?weeks is absent", async () => {
    const chain = makeBuilder([COHORT_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.meta.weeks).toBe(12);
  });

  it("defaults weeks to 12 when ?weeks=0", async () => {
    const chain = makeBuilder([COHORT_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ weeks: "0" }));
    const body = await res.json();
    expect(body.meta.weeks).toBe(12);
  });

  it("applies ?vertical= filter to query", async () => {
    const chain = makeBuilder([COHORT_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq({ vertical: "broker-seeker" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "inferred_vertical" && c[1] === "broker-seeker")).toBe(true);
  });

  it("does NOT apply vertical filter when ?vertical= is absent", async () => {
    const chain = makeBuilder([COHORT_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "inferred_vertical")).toBe(false);
  });
});

describe("GET /api/v1/cohort-report — error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: makeEnterpriseKey() });
  });

  it("returns 500 on DB error", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "db fail" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to fetch cohort report");
  });

  it("returns 500 and logs on unexpected thrown error", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("unexpected"); });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("includes CORS headers in 500 response", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null, { message: "oops" }));
    const res = await GET(makeReq());
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
