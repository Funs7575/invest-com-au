import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST, GET } from "@/app/api/webhooks/broker-signup/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SECRET = "test-postback-secret";

function makePost(body: unknown, auth?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth !== undefined) headers["authorization"] = `Bearer ${auth}`;
  return new NextRequest("http://localhost/api/webhooks/broker-signup", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGet(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/webhooks/broker-signup");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

type TableMocks = {
  click?: Record<string, unknown> | null;
  broker?: { id: number } | null;
  existingSignup?: { id: string } | null;
  insertResult?: { id: string } | null;
  insertError?: { message: string } | null;
};

function setupFromMock(opts: TableMocks = {}) {
  const {
    click = null,
    broker = { id: 42 },
    existingSignup = null,
    insertResult = { id: "signup-1" },
    insertError = null,
  } = opts;

  mockFrom.mockImplementation((table: string) => {
    if (table === "affiliate_clicks") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: click, error: null }),
      };
    }
    if (table === "brokers") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: broker, error: null }),
      };
    }
    if (table === "broker_signups") {
      let callCount = 0;
      const baseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          callCount++;
          // First maybeSingle is duplicate check; subsequent is insert result
          return Promise.resolve({ data: existingSignup, error: null });
        }),
      };
      // insert().select().single() path
      (baseChain.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: insertResult,
          error: insertError,
        }),
      });
      return baseChain;
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/broker-signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTBACK_SECRET = SECRET;
    delete process.env.PARTNER_API_KEY;
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/broker-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broker_slug: "commsec" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when no secret env var is configured", async () => {
    delete process.env.POSTBACK_SECRET;
    delete process.env.PARTNER_API_KEY;
    const res = await POST(makePost({ broker_slug: "commsec" }, "any-key"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when token does not match secret", async () => {
    const res = await POST(makePost({ broker_slug: "commsec" }, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when neither click_id nor broker_slug is provided", async () => {
    const res = await POST(makePost({}, SECRET));
    expect(res.status).toBe(400);
  });

  it("returns 400 when click_id resolves to no broker and no broker_slug given", async () => {
    setupFromMock({ click: null });
    // click not found, no broker_slug → cannot resolve broker
    const res = await POST(makePost({ click_id: "c1" }, SECRET));
    expect(res.status).toBe(400);
  });

  it("returns 200 with duplicate=true when external_ref already exists", async () => {
    setupFromMock({
      click: { broker_slug: "commsec", broker_id: 42, source: "page", page: "/brokers" },
      existingSignup: { id: "old-signup" },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "affiliate_clicks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { broker_slug: "commsec", broker_id: 42, source: "page", page: "/brokers" },
            error: null,
          }),
        };
      }
      if (table === "broker_signups") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: "old" }, error: null }),
        };
      }
      return {};
    });
    const res = await POST(makePost({ click_id: "c1", external_ref: "ext-1" }, SECRET));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });

  it("returns 200 with signup_id on successful insert via broker_slug", async () => {
    setupFromMock({
      click: null,
      broker: { id: 7 },
      existingSignup: null,
      insertResult: { id: "signup-abc" },
    });
    const res = await POST(makePost({ broker_slug: "commsec" }, SECRET));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.signup_id).toBe("signup-abc");
  });

  it("returns 500 on DB insert error", async () => {
    setupFromMock({
      click: null,
      existingSignup: null,
      insertResult: null,
      insertError: { message: "DB error" },
    });
    const res = await POST(makePost({ broker_slug: "commsec" }, SECRET));
    expect(res.status).toBe(500);
  });

  it("uses PARTNER_API_KEY as fallback when POSTBACK_SECRET absent", async () => {
    delete process.env.POSTBACK_SECRET;
    process.env.PARTNER_API_KEY = "partner-key";
    setupFromMock({ click: null, existingSignup: null, insertResult: { id: "s1" } });
    const res = await POST(makePost({ broker_slug: "commsec" }, "partner-key"));
    expect(res.status).toBe(200);
    delete process.env.PARTNER_API_KEY;
  });

  it("extracts UTM params from click page URL", async () => {
    let capturedInsert: Record<string, unknown> | null = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === "affiliate_clicks") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              broker_slug: "etoro",
              broker_id: 5,
              source: "google",
              page: "https://invest.com.au/brokers?utm_source=google&utm_medium=cpc&utm_campaign=brokers",
            },
            error: null,
          }),
        };
      }
      if (table === "broker_signups") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
            capturedInsert = data;
            return {
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { id: "s-utms" }, error: null }),
            };
          }),
        };
      }
      return {};
    });
    const res = await POST(makePost({ click_id: "cid" }, SECRET));
    expect(res.status).toBe(200);
    expect(capturedInsert?.utm_source).toBe("google");
    expect(capturedInsert?.utm_medium).toBe("cpc");
  });
});

describe("GET /api/webhooks/broker-signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.POSTBACK_SECRET = SECRET;
  });

  it("returns 400 when neither click_id nor broker param given", async () => {
    const res = await GET(makeGet({}));
    expect(res.status).toBe(400);
  });

  it("delegates to POST handler with broker param", async () => {
    // GET with broker+no auth → 401 (no auth header carried over)
    const res = await GET(makeGet({ broker: "commsec", click_id: "c1" }));
    // GET builds a new Request from fakeRequest — no auth header → 401
    expect(res.status).toBe(401);
  });
});
