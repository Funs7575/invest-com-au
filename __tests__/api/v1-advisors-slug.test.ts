import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
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

import { GET, OPTIONS } from "@/app/api/v1/advisors/[slug]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = { id: "key-1", name: "Test", key_prefix: "ica_test" };
const SLUG = "jane-smith-cfp";

function makeValidAuth() {
  return { valid: true, apiKey: VALID_KEY };
}

function makeInvalidAuth(msg = "Invalid API key") {
  return { valid: false, error: msg };
}

function makeAdvisor(overrides = {}) {
  return {
    id: 42,
    slug: SLUG,
    name: "Jane Smith",
    firm_name: "Smith Financial",
    type: "financial_planner",
    specialties: ["retirement"],
    rating: 4.8,
    review_count: 5,
    verified: true,
    status: "active",
    updated_at: "2026-05-01T08:00:00Z",
    ...overrides,
  };
}

function makeReview() {
  return {
    id: 1,
    rating: 5,
    headline: "Excellent advice",
    body: "Jane helped us structure our SMSF.",
    reviewer_name: "Michael T.",
    created_at: "2026-04-10T09:00:00Z",
  };
}

function makeGet(slug = SLUG): NextRequest {
  const url = `http://localhost/api/v1/advisors/${slug}`;
  return new NextRequest(url, { headers: { Authorization: "Bearer ica_testkey123" } });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/advisors/[slug]", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/advisors/[slug] — auth", () => {
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

describe("GET /api/v1/advisors/[slug] — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns 400 for invalid slug format (uppercase)", async () => {
    const res = await GET(makeGet("Jane-Smith"), {
      params: Promise.resolve({ slug: "Jane-Smith" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid.*slug/i);
  });

  it("returns 400 for invalid slug with special chars", async () => {
    const res = await GET(makeGet("jane_smith"), {
      params: Promise.resolve({ slug: "jane_smith" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/advisors/[slug] — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiKey.mockResolvedValue(makeValidAuth());
  });

  it("returns advisor profile with reviews", async () => {
    const advisor = makeAdvisor();
    const reviews = [makeReview()];
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // professionals table
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: advisor, error: null })),
        };
      }
      // professional_reviews table
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: reviews, error: null })),
      };
    });

    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Jane Smith");
    expect(body.data.reviews).toHaveLength(1);
    expect(body.data.reviews[0].headline).toBe("Excellent advice");
  });

  it("strips private/PII fields from advisor response", async () => {
    const advisor = {
      ...makeAdvisor(),
      email: "jane@smith.com",
      phone: "0412345678",
      stripe_customer_id: "cus_secret",
      admin_notes: "hidden",
      credit_balance_cents: 5000,
    };
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: advisor, error: null })),
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
    expect(body.data.email).toBeUndefined();
    expect(body.data.phone).toBeUndefined();
    expect(body.data.stripe_customer_id).toBeUndefined();
    expect(body.data.admin_notes).toBeUndefined();
    expect(body.data.credit_balance_cents).toBeUndefined();
  });

  it("returns 404 when advisor not found", async () => {
    mockServerFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() =>
        Promise.resolve({ data: null, error: { message: "not found" } }),
      ),
    });
    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("includes Cache-Control header on success", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null })),
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
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null })),
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
    mockServerFrom.mockImplementation(() => {
      throw new Error("boom");
    });
    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(500);
  });

  it("returns empty reviews array when none exist", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(() => Promise.resolve({ data: makeAdvisor(), error: null })),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    });

    const res = await GET(makeGet(), { params: Promise.resolve({ slug: SLUG }) });
    const body = await res.json();
    expect(body.data.reviews).toEqual([]);
  });
});
