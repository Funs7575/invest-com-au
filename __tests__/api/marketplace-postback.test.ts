import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/marketplace/postback/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, apiKey?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-forwarded-for": "10.0.0.1",
  };
  if (apiKey) headers["x-api-key"] = apiKey;
  return new NextRequest("http://localhost/api/marketplace/postback", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_API_KEY = "broker-api-key-123";
const VALID_BODY = {
  click_id: "click-uuid-abc",
  event_type: "funded",
  conversion_value_cents: 10000,
  metadata: { plan: "premium" },
};
const BROKER_ACCOUNT = { broker_slug: "commsec", status: "active" };
const CLICK = { click_id: "click-uuid-abc", broker_slug: "commsec" };
const CONVERSION = { id: "conv-1", created_at: "2026-04-28T00:00:00Z" };

function setupFromMock(overrides: {
  account?: typeof BROKER_ACCOUNT | null;
  click?: typeof CLICK | null;
  existingConversion?: typeof CONVERSION | null;
  insertError?: { code?: string; message?: string } | null;
  insertData?: typeof CONVERSION | null;
} = {}) {
  const {
    account = BROKER_ACCOUNT,
    click = CLICK,
    existingConversion = null,
    insertError = null,
    insertData = CONVERSION,
  } = overrides;

  mockFrom.mockImplementation((table: string) => {
    if (table === "broker_accounts") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: account, error: null }),
      };
    }
    if (table === "affiliate_clicks") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: click, error: null }),
      };
    }
    if (table === "conversion_events") {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingConversion, error: null }),
        single: vi.fn().mockResolvedValue({ data: insertData, error: insertError }),
      };
      return builder;
    }
    if (table === "campaign_events") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    if (table === "webhook_delivery_queue") {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    if (table === "campaign_daily_stats") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/marketplace/postback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("IP_HASH_SALT", "test-salt");
    setupFromMock();
  });

  it("returns 401 when X-API-Key header is missing", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 403 when API key is not found in broker_accounts", async () => {
    setupFromMock({ account: null });
    const res = await POST(makePost(VALID_BODY, "nonexistent-key"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or inactive/i);
  });

  it("returns 403 when broker account status is not active", async () => {
    setupFromMock({ account: { broker_slug: "commsec", status: "suspended" } });
    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(403);
  });

  it("returns 400 when JSON is invalid", async () => {
    const req = new NextRequest("http://localhost/api/marketplace/postback", {
      method: "POST",
      headers: { "x-api-key": VALID_API_KEY, "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when click_id is missing", async () => {
    const res = await POST(makePost({ event_type: "funded" }, VALID_API_KEY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/click_id/i);
  });

  it("returns 400 when event_type is invalid", async () => {
    const res = await POST(makePost({ click_id: "abc", event_type: "hacked" }, VALID_API_KEY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/event_type/i);
  });

  it("returns 404 when click_id not found in affiliate_clicks", async () => {
    setupFromMock({ click: null });
    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/click_id not found/i);
  });

  it("returns 403 when click belongs to different broker", async () => {
    setupFromMock({ click: { click_id: "click-uuid-abc", broker_slug: "other-broker" } });
    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/does not belong/i);
  });

  it("returns 200 already_recorded when conversion was previously recorded", async () => {
    setupFromMock({ existingConversion: CONVERSION });
    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.already_recorded).toBe(true);
    expect(body.conversion_id).toBe("conv-1");
  });

  it("returns 200 with conversion_id on successful new conversion", async () => {
    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.already_recorded).toBeUndefined();
    expect(body.conversion_id).toBe("conv-1");
  });

  it("returns 200 already_recorded on 23505 unique constraint race", async () => {
    setupFromMock({
      insertError: { code: "23505", message: "unique violation" },
      insertData: null,
    });
    // After race, a lookup should return the existing row
    mockFrom.mockImplementation((table: string) => {
      if (table === "broker_accounts") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: BROKER_ACCOUNT, error: null }),
        };
      }
      if (table === "affiliate_clicks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: CLICK, error: null }),
        };
      }
      if (table === "conversion_events") {
        let callCount = 0;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockImplementation(() => {
            callCount++;
            // First call: no existing (pre-check), second call: after race conflict (re-query)
            return Promise.resolve({ data: callCount === 2 ? CONVERSION : null, error: null });
          }),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "23505", message: "unique" } }),
        };
      }
      if (table === "campaign_events") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.already_recorded).toBe(true);
  });

  it("returns 500 on non-duplicate insert error", async () => {
    setupFromMock({
      insertError: { code: "50000", message: "db error" },
      insertData: null,
    });
    const res = await POST(makePost(VALID_BODY, VALID_API_KEY));
    expect(res.status).toBe(500);
  });

  it("accepts all valid event_type values", async () => {
    for (const event_type of ["opened", "funded", "first_trade", "custom"]) {
      setupFromMock();
      const res = await POST(makePost({ ...VALID_BODY, event_type }, VALID_API_KEY));
      expect(res.status).toBe(200);
    }
  });
});
