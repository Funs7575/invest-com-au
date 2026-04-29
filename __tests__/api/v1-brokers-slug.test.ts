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

import { GET, OPTIONS } from "@/app/api/v1/brokers/[slug]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };
const SLUG = "stake";

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeBroker(overrides = {}) {
  return {
    id: 1,
    name: "Stake",
    slug: SLUG,
    asx_fee: "0.01%",
    asx_fee_value: 0.01,
    status: "active",
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}

function makeChangelogEntry() {
  return {
    field_name: "asx_fee",
    old_value: "0.02%",
    new_value: "0.01%",
    change_type: "decrease",
    changed_at: "2026-04-01T00:00:00Z",
    source: "editorial",
  };
}

function makeGet(slug = SLUG): NextRequest {
  const url = `http://localhost/api/v1/brokers/${slug}`;
  return new NextRequest(url, { headers: { Authorization: "Bearer ica_testkey123" } });
}

function makeBrokerBuilder(brokerData: unknown, changelogData: unknown[] = [], brokerError: unknown = null) {
  let callCount = 0;
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => {
      callCount++;
      return Promise.resolve(callCount === 1
        ? { data: brokerData, error: brokerError }
        : { data: brokerData, error: brokerError });
    }),
    then: vi.fn((cb: (v: { data: unknown[]; error: null }) => void) => {
      cb({ data: changelogData, error: null });
      return Promise.resolve();
    }),
  };
  return builder;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/brokers/[slug]", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/brokers/[slug] — auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when API key missing", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("No API key"));
    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("No API key");
  });

  it("returns 401 when API key invalid", async () => {
    mockValidateApiKey.mockResolvedValue(makeInvalidAuth("Invalid key"));
    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/brokers/[slug] — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for invalid slug format (uppercase)", async () => {
    const res = await GET(makeGet("STAKE"), { params: Promise.resolve({ slug: "STAKE" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid.*slug/i);
  });

  it("returns 400 for invalid slug with special chars", async () => {
    const res = await GET(makeGet("stake_au"), { params: Promise.resolve({ slug: "stake_au" }) });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/brokers/[slug] — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns broker profile with changelog", async () => {
    const broker = makeBroker();
    const changelog = [makeChangelogEntry()];
    let tableCallCount = 0;
    mockAdminFrom.mockImplementation(() => {
      tableCallCount++;
      if (tableCallCount === 1) {
        // brokers table
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: broker, error: null })),
        };
      }
      // broker_data_changes table
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: changelog, error: null })),
      };
    });

    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Stake");
    expect(body.data.fee_changelog).toHaveLength(1);
  });

  it("strips private fields from broker response", async () => {
    const broker = { ...makeBroker(), stripe_customer_id: "cus_secret", internal_notes: "hidden" };
    let tableCallCount = 0;
    mockAdminFrom.mockImplementation(() => {
      tableCallCount++;
      if (tableCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: broker, error: null })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    const body = await res.json();
    expect(body.data.stripe_customer_id).toBeUndefined();
    expect(body.data.internal_notes).toBeUndefined();
  });

  it("returns 404 when broker not found", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: { message: "not found" } })),
    });
    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(404);
  });

  it("includes Cache-Control header on success", async () => {
    let tableCallCount = 0;
    mockAdminFrom.mockImplementation(() => {
      tableCallCount++;
      if (tableCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: makeBroker(), error: null })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("logs successful request with apiKeyId", async () => {
    let tableCallCount = 0;
    mockAdminFrom.mockImplementation(() => {
      tableCallCount++;
      if (tableCallCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: makeBroker(), error: null })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
    });

    await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(mockLogApiRequest).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200, apiKeyId: "key-1" }),
    );
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(500);
  });
});
