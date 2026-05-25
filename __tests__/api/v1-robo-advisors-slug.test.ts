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

import { GET, OPTIONS } from "@/app/api/v1/robo-advisors/[slug]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = {
  id: "key-robo-slug",
  name: "Test",
  key_prefix: "ica_test",
};

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeRobo(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    name: "Stockspot",
    slug: "stockspot",
    platform_type: "robo_advisor",
    rating: 4.7,
    review_content: "Top robo-advisor for long-term investors.",
    fee_source_url: "https://stockspot.com.au/fees",
    smsf_support: true,
    status: "active",
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}

function makeChangelogEntry(overrides: Record<string, unknown> = {}) {
  return {
    field_name: "min_deposit",
    old_value: "1000",
    new_value: "2000",
    change_type: "update",
    changed_at: "2026-03-10T09:00:00Z",
    source: "fee_page_check",
    ...overrides,
  };
}

function makeSingleRoboBuilder(row: unknown | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: row, error })),
  };
}

function makeChangelogBuilder(rows: unknown[] = []) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: rows, error: null })),
  };
}

function makeGet(
  slug: string,
): { req: NextRequest; routeParams: Promise<{ slug: string }> } {
  const url = `http://localhost/api/v1/robo-advisors/${slug}`;
  return {
    req: new NextRequest(url, {
      headers: { Authorization: "Bearer ica_testkey123" },
    }),
    routeParams: Promise.resolve({ slug }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/robo-advisors/[slug]", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/robo-advisors/[slug] — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const { req, routeParams } = makeGet("stockspot");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/robo-advisors/[slug] — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue({ valid: true, apiKey: VALID_KEY });
  });

  it("returns 400 for slug with uppercase letters", async () => {
    const { req, routeParams } = makeGet("STOCKSPOT");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug/i);
  });

  it("returns 400 for empty slug", async () => {
    const { req, routeParams } = makeGet("");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/robo-advisors/[slug] — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns robo data with fee_changelog", async () => {
    const robo = makeRobo();
    const entry = makeChangelogEntry();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSingleRoboBuilder(robo);
      if (table === "broker_data_changes")
        return makeChangelogBuilder([entry]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("stockspot");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Stockspot");
    expect(body.data.fee_changelog).toHaveLength(1);
    expect(body.data.fee_changelog[0].field_name).toBe("min_deposit");
  });

  it("returns 404 when robo-advisor not found", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers")
        return makeSingleRoboBuilder(null, { message: "no rows" });
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("nonexistent");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/not found/i);
  });

  it("strips private fields from robo row", async () => {
    const robo = {
      ...makeRobo(),
      affiliate_url: "https://secret.example.com",
      commission_cents: 500,
    };
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSingleRoboBuilder(robo);
      if (table === "broker_data_changes") return makeChangelogBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("stockspot");
    const res = await GET(req, { params: routeParams });
    const body = await res.json();
    expect(body.data.affiliate_url).toBeUndefined();
    expect(body.data.commission_cents).toBeUndefined();
  });

  it("includes review_content in detail response", async () => {
    const robo = makeRobo();
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSingleRoboBuilder(robo);
      if (table === "broker_data_changes") return makeChangelogBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("stockspot");
    const res = await GET(req, { params: routeParams });
    const body = await res.json();
    expect(body.data.review_content).toBe("Top robo-advisor for long-term investors.");
  });

  it("includes Cache-Control header on success", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSingleRoboBuilder(makeRobo());
      if (table === "broker_data_changes") return makeChangelogBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("stockspot");
    const res = await GET(req, { params: routeParams });
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => {
      throw new Error("DB exploded");
    });

    const { req, routeParams } = makeGet("stockspot");
    const res = await GET(req, { params: routeParams });
    expect(res.status).toBe(500);
  });

  it("logs successful request with apiKeyId", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "brokers") return makeSingleRoboBuilder(makeRobo());
      if (table === "broker_data_changes") return makeChangelogBuilder([]);
      throw new Error(`unexpected table: ${table}`);
    });

    const { req, routeParams } = makeGet("stockspot");
    await GET(req, { params: routeParams });
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 200,
        apiKeyId: "key-robo-slug",
      }),
    );
  });

  it("returns 401 and logs failed requests", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth());
    const { req, routeParams } = makeGet("stockspot");
    await GET(req, { params: routeParams });
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });
});
