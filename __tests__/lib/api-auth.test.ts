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
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function defaultKey(overrides: Partial<ApiKeyRowFixture> = {}): ApiKeyRowFixture {
  return {
    id: "k1",
    name: "Test Key",
    key_prefix: "ica_1234",
    owner_email: "owner@example.com",
    owner_name: "Owner",
    company_name: "Co",
    tier: "pro",
    rate_limit_per_minute: 60,
    rate_limit_per_day: 10_000,
    allowed_endpoints: ["*"],
    is_active: true,
    requests_today: 0,
    requests_total: 0,
    last_used_at: null,
    expires_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// DB stub state
let selectedKey: ApiKeyRowFixture | null = null;
let selectError: { message: string } | null = null;
let updateError: { message: string } | null = null;
let insertError: { message: string } | null = null;
const updateCalls: { id: string; payload: Record<string, unknown> }[] = [];
const insertCalls: Record<string, unknown>[] = [];

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
      insert: async (row: Record<string, unknown>) => {
        insertCalls.push(row);
        return { data: null, error: insertError };
      },
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/x", { headers });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("validateApiKey", () => {
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

  it("rejects requests with no Authorization header", async () => {
    const res = await validateApiKey(makeReq());
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Missing Authorization header");
  });

  it("rejects an Authorization header that is not Bearer-prefixed", async () => {
    const res = await validateApiKey(makeReq({ authorization: "Basic abc" }));
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Invalid Authorization format");
  });

  it("rejects a key without the ica_ prefix", async () => {
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer sk_abcdefghij" }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid API key format");
  });

  it("rejects a key that is too short", async () => {
    const res = await validateApiKey(makeReq({ authorization: "Bearer ica_" }));
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid API key format");
  });

  it("rejects an unknown key (DB miss)", async () => {
    selectedKey = null;
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid API key");
  });

  it("rejects a deactivated key", async () => {
    selectedKey = defaultKey({ is_active: false });
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toBe("API key is deactivated");
    expect(updateCalls).toHaveLength(0);
  });

  it("rejects an expired key", async () => {
    selectedKey = defaultKey({
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toBe("API key has expired");
  });

  it("allows a key whose expires_at is in the future", async () => {
    selectedKey = defaultKey({
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(true);
    expect(res.apiKey?.id).toBe("k1");
  });

  it("rejects when the daily rate limit is already hit", async () => {
    selectedKey = defaultKey({
      requests_today: 10_000,
      rate_limit_per_day: 10_000,
    });
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Daily rate limit exceeded");
    // No counter increment when rejected
    expect(updateCalls).toHaveLength(0);
  });

  it("validates a healthy key and increments counters", async () => {
    selectedKey = defaultKey({ requests_today: 5, requests_total: 1234 });
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(true);
    expect(res.apiKey?.id).toBe("k1");

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]?.payload).toMatchObject({
      requests_today: 6,
      requests_total: 1235,
    });
    expect(updateCalls[0]?.payload.last_used_at).toEqual(expect.any(String));
    expect(updateCalls[0]?.payload.updated_at).toEqual(expect.any(String));
  });

  it("still validates when counter update fails (non-fatal)", async () => {
    selectedKey = defaultKey();
    updateError = { message: "write conflict" };
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(true);
    expect(res.apiKey?.id).toBe("k1");
  });

  it("returns an error result when the DB select throws", async () => {
    selectError = { message: "DB down" };
    const res = await validateApiKey(
      makeReq({ authorization: "Bearer ica_abcdefghijkl" }),
    );
    expect(res.valid).toBe(false);
    expect(res.error).toBe("Invalid API key");
  });
});

describe("logApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    insertError = null;
  });

  it("inserts a row with all fields populated", async () => {
    await logApiRequest({
      apiKeyId: "k1",
      endpoint: "/api/v1/planners",
      method: "GET",
      statusCode: 200,
      responseTimeMs: 123,
      ipAddress: "1.2.3.4",
      userAgent: "test-agent",
    });

    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).toMatchObject({
      api_key_id: "k1",
      endpoint: "/api/v1/planners",
      method: "GET",
      status_code: 200,
      response_time_ms: 123,
      ip_address: "1.2.3.4",
      user_agent: "test-agent",
    });
  });

  it("swallows insert errors (fire-and-forget)", async () => {
    insertError = { message: "relation does not exist" };
    await expect(
      logApiRequest({
        apiKeyId: null,
        endpoint: "/x",
        method: "POST",
        statusCode: 500,
        responseTimeMs: 0,
        ipAddress: "",
        userAgent: "",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("API_CORS_HEADERS", () => {
  it("is frozen and permits the public API origins + methods", () => {
    expect(API_CORS_HEADERS["Access-Control-Allow-Origin"]).toBe("*");
    expect(API_CORS_HEADERS["Access-Control-Allow-Methods"]).toContain("GET");
    expect(API_CORS_HEADERS["Access-Control-Allow-Methods"]).toContain("POST");
    expect(API_CORS_HEADERS["Access-Control-Allow-Methods"]).toContain("OPTIONS");
    expect(API_CORS_HEADERS["Access-Control-Allow-Headers"]).toContain(
      "Authorization",
    );
  });
});
