/**
 * Tests for GET /api/v1/usage
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

type KeyRow = {
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

function defaultRow(overrides: Partial<KeyRow> = {}): KeyRow {
  return {
    id: "key-usage-1",
    name: "Usage Test Key",
    key_prefix: "ica_usag",
    owner_email: "dev@test.com",
    owner_name: "Dev",
    company_name: null,
    tier: "basic",
    rate_limit_per_minute: 120,
    rate_limit_per_day: 10_000,
    allowed_endpoints: ["*"],
    is_active: true,
    requests_today: 42,
    requests_total: 1500,
    requests_this_month: 310,
    last_used_at: "2026-05-25T10:00:00Z",
    expires_at: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-05-25T10:00:00Z",
    ...overrides,
  };
}

let dbKeyRow: KeyRow | null = null;
let dbError: { message: string } | null = null;
let updateCalled = false;

const mockFrom = vi.fn((table: string) => {
  if (table === "api_keys") {
    const chain = {
      select: (_cols: string) => chain,
      eq: (_col: string, _val: unknown) => chain,
      single: async () =>
        dbError ? { data: null, error: dbError } : { data: dbKeyRow, error: null },
      update: () => ({
        eq: async () => {
          updateCalled = true;
          return { error: null };
        },
      }),
    };
    return chain;
  }
  if (table === "api_request_log") {
    return { insert: async () => ({ error: null }) };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/v1/usage/route";

function makeReq(authHeader?: string): NextRequest {
  const headers: Record<string, string> = authHeader
    ? { authorization: authHeader }
    : {};
  return new NextRequest("http://localhost/api/v1/usage", { headers });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/v1/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbKeyRow = defaultRow();
    dbError = null;
    updateCalled = false;
    // Restore the default mockFrom implementation after any test that replaced it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockFrom as any).mockImplementation((table: string) => {
      if (table === "api_keys") {
        const chain: Record<string, unknown> = {
          select: (_cols: string) => chain,
          eq: (_col: string, _val: unknown) => chain,
          single: async () =>
            dbError ? { data: null, error: dbError } : { data: dbKeyRow, error: null },
          update: () => ({
            eq: async () => {
              updateCalled = true;
              return { error: null };
            },
          }),
        };
        return chain;
      }
      if (table === "api_request_log") {
        return { insert: async () => ({ error: null }) };
      }
      throw new Error(`unexpected table: ${table}`);
    });
  });

  it("returns 401 when no Authorization header is provided", async () => {
    dbKeyRow = null; // no key found
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns usage stats for a valid API key", async () => {
    const res = await GET(makeReq("Bearer ica_abcdefghijkl"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.tier).toBe("basic");
    expect(body.tier_label).toBe("Basic");
    expect(body.limits.per_minute).toBe(120);
    expect(body.limits.per_day).toBe(10_000);
    expect(body.limits.allowed_endpoints).toEqual(["*"]);

    expect(body.usage.today).toBe(42);
    expect(body.usage.this_month).toBe(310);
    expect(body.usage.total).toBe(1500);
    expect(body.usage.last_used_at).toBe("2026-05-25T10:00:00Z");

    expect(body.key.id).toBe("key-usage-1");
    expect(body.key.name).toBe("Usage Test Key");
    expect(body.key.prefix).toBe("ica_usag");
    expect(body.key.created_at).toBe("2026-01-15T00:00:00Z");

    // validateApiKey meters the request — the api_keys row is updated (counter increment)
    expect(updateCalled).toBe(true);
  });

  it("returns 0 for requests_this_month when column is absent (old row)", async () => {
    // Simulate a row from before the migration (no requests_this_month column)
    dbKeyRow = defaultRow({ requests_this_month: undefined as unknown as number });
    const res = await GET(makeReq("Bearer ica_abcdefghijkl"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage.this_month).toBe(0);
  });

  it("returns 500 when the DB query fails on reload", async () => {
    // First call succeeds (validateApiKey), second fails (fresh reload)
    let callCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockFrom as any).mockImplementation((table: string) => {
      if (table === "api_keys") {
        callCount++;
        const chain: Record<string, unknown> = {
          select: (_cols: string) => chain,
          eq: (_col: string, _val: unknown) => chain,
          single: async () => {
            if (callCount === 1) return { data: defaultRow(), error: null }; // validateApiKey
            return { data: null, error: { message: "timeout" } }; // fresh reload
          },
          update: () => ({ eq: async () => ({ error: null }) }),
        };
        return chain;
      }
      return { insert: async () => ({ error: null }) };
    });

    const res = await GET(makeReq("Bearer ica_abcdefghijkl"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("includes CORS headers on success", async () => {
    const res = await GET(makeReq("Bearer ica_abcdefghijkl"));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("includes free tier details when tier is free", async () => {
    dbKeyRow = defaultRow({
      tier: "free",
      rate_limit_per_minute: 30,
      rate_limit_per_day: 1_000,
      allowed_endpoints: ["/api/v1/brokers", "/api/v1/advisors"],
    });
    const res = await GET(makeReq("Bearer ica_abcdefghijkl"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe("free");
    expect(body.tier_label).toBe("Free");
    expect(body.limits.per_day).toBe(1_000);
  });
});
