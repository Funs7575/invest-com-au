/**
 * Tests for tier-based enforcement in lib/api-auth.ts:
 *   - endpoint gating (step 5 in validateApiKey)
 *   - rate limit branching per tier
 *   - requests_this_month increment
 *   - statusCode on rejection responses
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

type ApiKeyRowFixture = {
  id: string;
  name: string;
  key_prefix: string;
  owner_email: string;
  owner_name: string | null;
  company_name: string | null;
  tier: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  allowed_endpoints: string[];
  is_active: boolean;
  requests_today: number;
  requests_total: number;
  requests_this_month: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function makeKey(overrides: Partial<ApiKeyRowFixture> = {}): ApiKeyRowFixture {
  return {
    id: "k1",
    name: "Test Key",
    key_prefix: "ica_1234",
    owner_email: "owner@example.com",
    owner_name: "Owner",
    company_name: "Co",
    tier: "free",
    rate_limit_per_minute: 30,
    rate_limit_per_day: 1_000,
    allowed_endpoints: ["/api/v1/brokers", "/api/v1/brokers/:slug", "/api/v1/advisors", "/api/v1/advisors/:slug"],
    is_active: true,
    requests_today: 0,
    requests_total: 0,
    requests_this_month: 0,
    last_used_at: null,
    expires_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

let selectedKey: ApiKeyRowFixture | null = null;
let selectError: { message: string } | null = null;
let updateError: { message: string } | null = null;
const updateCalls: { id: string; payload: Record<string, unknown> }[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "api_keys") {
    return {
      select: () => ({
        eq: () => ({
          single: async () =>
            selectError
              ? { data: null, error: selectError }
              : selectedKey
                ? { data: selectedKey, error: null }
                : { data: null, error: { message: "row_not_found" } },
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => {
          updateCalls.push({ id, payload });
          return { data: null, error: updateError };
        },
      }),
    };
  }
  if (table === "api_request_log") {
    return {
      insert: async () => ({ data: null, error: null }),
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { validateApiKey } from "@/lib/api-auth";

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/brokers", { headers });
}

const VALID_BEARER = { authorization: "Bearer ica_abcdefghijkl" };

// ── Endpoint gating ────────────────────────────────────────────────────

describe("validateApiKey — endpoint gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedKey = null;
    selectError = null;
    updateError = null;
    updateCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("allows an endpoint that is in the allowed list", async () => {
    selectedKey = makeKey({
      allowed_endpoints: ["/api/v1/brokers", "/api/v1/brokers/:slug"],
    });
    const res = await validateApiKey(makeReq(VALID_BEARER), "/api/v1/brokers");
    expect(res.valid).toBe(true);
  });

  it("allows a slug endpoint when :slug pattern is in the list", async () => {
    selectedKey = makeKey({
      allowed_endpoints: ["/api/v1/brokers/:slug"],
    });
    const res = await validateApiKey(makeReq(VALID_BEARER), "/api/v1/brokers/commsec");
    expect(res.valid).toBe(true);
  });

  it("blocks an endpoint not in the allowed list (free tier gating)", async () => {
    selectedKey = makeKey({
      tier: "free",
      allowed_endpoints: ["/api/v1/brokers", "/api/v1/brokers/:slug"],
    });
    const res = await validateApiKey(makeReq(VALID_BEARER), "/api/v1/health-scores");
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toContain("not available on your current API tier");
    expect(res.error).toContain("free");
    // Counter must NOT be incremented on a rejected request
    expect(updateCalls).toHaveLength(0);
  });

  it("blocks /api/v1/fee-index for a free-tier key", async () => {
    selectedKey = makeKey({
      tier: "free",
      allowed_endpoints: ["/api/v1/brokers", "/api/v1/advisors"],
    });
    const res = await validateApiKey(makeReq(VALID_BEARER), "/api/v1/fee-index");
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("allows any endpoint for a pro-tier key with wildcard", async () => {
    selectedKey = makeKey({
      tier: "pro",
      rate_limit_per_day: 100_000,
      rate_limit_per_minute: 600,
      allowed_endpoints: ["*"],
    });
    const endpoints = [
      "/api/v1/brokers",
      "/api/v1/health-scores",
      "/api/v1/fee-index",
      "/api/v1/savings",
      "/api/v1/robo-advisors",
    ];
    for (const ep of endpoints) {
      vi.clearAllMocks();
      updateCalls.length = 0;
      const res = await validateApiKey(makeReq(VALID_BEARER), ep);
      expect(res.valid).toBe(true);
    }
  });

  it("skips endpoint check when no endpoint argument is provided", async () => {
    selectedKey = makeKey({
      allowed_endpoints: ["/api/v1/brokers"], // would block health-scores
    });
    // No endpoint arg — no gating, passes through
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.valid).toBe(true);
  });

  it("skips endpoint check when allowed_endpoints is empty", async () => {
    selectedKey = makeKey({ allowed_endpoints: [] });
    // Empty list + no gate = pass through (preserves backward compat)
    const res = await validateApiKey(makeReq(VALID_BEARER), "/api/v1/brokers");
    expect(res.valid).toBe(true);
  });
});

// ── Rate limits per tier ───────────────────────────────────────────────

describe("validateApiKey — per-tier rate limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedKey = null;
    updateError = null;
    updateCalls.length = 0;
  });

  it("blocks a free-tier key that has hit its 1,000/day limit", async () => {
    selectedKey = makeKey({
      tier: "free",
      requests_today: 1_000,
      rate_limit_per_day: 1_000,
    });
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.valid).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.error).toContain("Daily rate limit exceeded");
    expect(res.error).toContain("1000/day");
  });

  it("blocks a basic-tier key that has hit its 10,000/day limit", async () => {
    selectedKey = makeKey({
      tier: "basic",
      requests_today: 10_000,
      rate_limit_per_day: 10_000,
      allowed_endpoints: ["*"],
    });
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.valid).toBe(false);
    expect(res.error).toContain("10000/day");
  });

  it("allows a basic-tier key one request below the limit", async () => {
    selectedKey = makeKey({
      tier: "basic",
      requests_today: 9_999,
      rate_limit_per_day: 10_000,
      allowed_endpoints: ["*"],
    });
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.valid).toBe(true);
  });

  it("increments requests_this_month alongside requests_today and requests_total", async () => {
    selectedKey = makeKey({
      requests_today: 0,
      requests_total: 50,
      requests_this_month: 20,
    });
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.valid).toBe(true);
    expect(updateCalls).toHaveLength(1);
    const payload = updateCalls[0]!.payload;
    expect(payload.requests_today).toBe(1);
    expect(payload.requests_total).toBe(51);
    expect(payload.requests_this_month).toBe(21);
  });
});

// ── statusCode field on validation result ──────────────────────────────

describe("validateApiKey — statusCode on failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedKey = null;
    updateError = null;
    updateCalls.length = 0;
  });

  it("returns statusCode 403 for endpoint gating", async () => {
    selectedKey = makeKey({ tier: "free", allowed_endpoints: ["/api/v1/brokers"] });
    const res = await validateApiKey(makeReq(VALID_BEARER), "/api/v1/fee-index");
    expect(res.statusCode).toBe(403);
  });

  it("returns statusCode 429 for daily rate limit", async () => {
    selectedKey = makeKey({ requests_today: 1_000, rate_limit_per_day: 1_000 });
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.statusCode).toBe(429);
  });

  it("does not set statusCode for a successful validation", async () => {
    selectedKey = makeKey();
    const res = await validateApiKey(makeReq(VALID_BEARER));
    expect(res.valid).toBe(true);
    expect(res.statusCode).toBeUndefined();
  });
});
