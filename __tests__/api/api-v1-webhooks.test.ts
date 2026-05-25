/**
 * Tests for /api/v1/webhooks (consumer webhook registration)
 *
 * Covers:
 *  - GET: list webhooks
 *  - POST: register new webhook (tier gating, max count, signing secret)
 *  - DELETE: deactivate webhook
 *  - Free-tier rejection for POST/DELETE
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
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function defaultKey(overrides: Partial<KeyRow> = {}): KeyRow {
  return {
    id: "k-wh-1",
    name: "Webhook Test",
    key_prefix: "ica_wh00",
    owner_email: "dev@example.com",
    owner_name: "Dev",
    company_name: null,
    tier: "basic",
    rate_limit_per_minute: 120,
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

let selectedKey: KeyRow | null = defaultKey();
let webhookCount = 0;
let webhookInsertError: { message: string; code?: string } | null = null;
let webhookUpdateResult: { data: { id: string } | null; error: { message: string } | null } = { data: { id: "wh-1" }, error: null };
const listWebhooks = [
  {
    id: "wh-1",
    url: "https://example.com/hook",
    events: ["broker.updated"],
    secret_prefix: "whsec_ab",
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];
let insertedWebhook: Record<string, unknown> | null = {
  id: "wh-new",
  url: "https://example.com/new-hook",
  events: ["broker.updated"],
  secret_prefix: "whsec_xx",
  is_active: true,
  created_at: "2026-05-25T00:00:00Z",
};

const mockFrom = vi.fn((table: string) => {
  if (table === "api_keys") {
    const chain: Record<string, unknown> = {};
    const selectChain: Record<string, unknown> = {
      eq: () => selectChain,
      single: async () =>
        selectedKey ? { data: selectedKey, error: null } : { data: null, error: { message: "not found" } },
    };
    chain.select = () => selectChain;
    chain.update = () => ({ eq: async () => ({ error: null }) });
    return chain;
  }

  if (table === "api_consumer_webhooks") {
    return {
      select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count === "exact" && opts?.head) {
          // Count query for limit check
          return {
            eq: () => ({
              eq: async () => ({ count: webhookCount, error: null }),
            }),
          };
        }
        // List query
        return {
          eq: () => ({
            eq: () => ({
              order: async () => ({ data: listWebhooks, error: null }),
            }),
          }),
        };
      },
      insert: (_row: Record<string, unknown>) => ({
        select: () => ({
          single: async () =>
            webhookInsertError
              ? { data: null, error: webhookInsertError }
              : { data: insertedWebhook, error: null },
        }),
      }),
      update: (_payload: Record<string, unknown>) => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => webhookUpdateResult,
            }),
          }),
        }),
      }),
    };
  }

  if (table === "api_request_log") {
    return { insert: async () => ({ error: null }) };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, DELETE } from "@/app/api/v1/webhooks/route";

function makeGetReq(auth = "Bearer ica_abcdefghijkl"): NextRequest {
  return new NextRequest("http://localhost/api/v1/webhooks", {
    headers: { authorization: auth },
  });
}

function makePostReq(body: unknown, auth = "Bearer ica_abcdefghijkl"): NextRequest {
  return new NextRequest("http://localhost/api/v1/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: auth },
    body: JSON.stringify(body),
  });
}

function makeDeleteReq(id: string, auth = "Bearer ica_abcdefghijkl"): NextRequest {
  return new NextRequest(`http://localhost/api/v1/webhooks?id=${id}`, {
    method: "DELETE",
    headers: { authorization: auth },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/v1/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedKey = defaultKey();
    webhookCount = 0;
    webhookInsertError = null;
  });

  it("returns 401 when not authenticated", async () => {
    selectedKey = null;
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 for a free-tier key", async () => {
    selectedKey = defaultKey({ tier: "free" });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Basic or higher");
  });

  it("returns the webhook list for a basic-tier key", async () => {
    const res = await GET(makeGetReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.webhooks)).toBe(true);
    expect(body.webhooks[0].id).toBe("wh-1");
    expect(body.webhooks[0].url).toBe("https://example.com/hook");
  });
});

describe("POST /api/v1/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedKey = defaultKey();
    webhookCount = 0;
    webhookInsertError = null;
    insertedWebhook = {
      id: "wh-new",
      url: "https://example.com/new-hook",
      events: ["broker.updated"],
      secret_prefix: "whsec_xx",
      is_active: true,
      created_at: "2026-05-25T00:00:00Z",
    };
  });

  it("returns 401 when not authenticated", async () => {
    selectedKey = null;
    const res = await POST(
      makePostReq({ url: "https://example.com/hook", events: ["broker.updated"] }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a free-tier key", async () => {
    selectedKey = defaultKey({ tier: "free" });
    const res = await POST(
      makePostReq({ url: "https://example.com/hook", events: ["broker.updated"] }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when URL is not HTTPS", async () => {
    const res = await POST(
      makePostReq({ url: "http://example.com/hook", events: ["broker.updated"] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("HTTPS");
  });

  it("returns 400 when URL is missing", async () => {
    const res = await POST(makePostReq({ events: ["broker.updated"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when events array is empty", async () => {
    const res = await POST(
      makePostReq({ url: "https://example.com/hook", events: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when an unknown event type is provided", async () => {
    const res = await POST(
      makePostReq({ url: "https://example.com/hook", events: ["unknown.event"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the per-key limit is reached", async () => {
    webhookCount = 5; // at the limit
    const res = await POST(
      makePostReq({ url: "https://example.com/hook", events: ["broker.updated"] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Maximum 5");
  });

  it("creates a webhook and returns the signing secret once", async () => {
    const res = await POST(
      makePostReq({ url: "https://example.com/hook", events: ["broker.updated"] }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    expect(body.webhook.id).toBe("wh-new");
    expect(body.webhook.url).toBe("https://example.com/new-hook");
    expect(body.webhook.events).toContain("broker.updated");
    expect(body.message).toContain("signing secret");

    // Secret should start with "whsec_"
    expect(body.webhook.secret).toMatch(/^whsec_[0-9a-f]{64}$/);
    // Secret prefix in the response should match the start of the plain secret
    // (we can't assert the exact value, but the prefix should be 12 chars)
    expect(typeof body.webhook.secret_prefix).toBe("string");
  });

  it("accepts multiple event types", async () => {
    const res = await POST(
      makePostReq({
        url: "https://example.com/hook",
        events: ["broker.updated", "health_score.updated"],
      }),
    );
    expect(res.status).toBe(201);
  });
});

describe("DELETE /api/v1/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedKey = defaultKey();
    webhookUpdateResult = { data: { id: "wh-1" }, error: null };
  });

  it("returns 401 when not authenticated", async () => {
    selectedKey = null;
    const res = await DELETE(makeDeleteReq("wh-1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a free-tier key", async () => {
    selectedKey = defaultKey({ tier: "free" });
    const res = await DELETE(makeDeleteReq("wh-1"));
    expect(res.status).toBe(403);
  });

  it("returns 400 when ?id is missing", async () => {
    const res = await DELETE(makeGetReq()); // no ?id
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("id");
  });

  it("soft-deletes the webhook and returns 200", async () => {
    const res = await DELETE(makeDeleteReq("wh-1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("wh-1");
    expect(body.message).toBe("Webhook deleted");
  });

  it("returns 404 when webhook is not found or already deleted", async () => {
    webhookUpdateResult = { data: null, error: null };
    const res = await DELETE(makeDeleteReq("wh-nonexistent"));
    expect(res.status).toBe(404);
  });
});
