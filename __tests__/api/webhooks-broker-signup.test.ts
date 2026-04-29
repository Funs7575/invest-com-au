import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST, GET } from "@/app/api/webhooks/broker-signup/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = "test-postback-secret-xyz";

function makePost(body: unknown, key?: string): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/broker-signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(key !== undefined ? { authorization: `Bearer ${key}` } : {}),
    },
  });
}

function makeGet(params: Record<string, string>, key?: string): NextRequest {
  const url = new URL("http://localhost/api/webhooks/broker-signup");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    headers: key ? { authorization: `Bearer ${key}` } : {},
  });
}

function chainFor(results: unknown[]): ReturnType<typeof vi.fn> {
  let callIndex = 0;
  return vi.fn(() => {
    const result = results[callIndex] ?? results.at(-1);
    callIndex++;
    const c: Record<string, unknown> = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.insert = vi.fn(() => c);
    c.single = vi.fn().mockResolvedValue(result);
    c.maybeSingle = vi.fn().mockResolvedValue(result);
    return c;
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/broker-signup", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, POSTBACK_SECRET: VALID_KEY };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 401 when authorization header is absent", async () => {
    const res = await POST(makePost({ click_id: "c1" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when no key is configured in env", async () => {
    delete process.env.POSTBACK_SECRET;
    delete process.env.PARTNER_API_KEY;
    const res = await POST(makePost({ click_id: "c1" }, VALID_KEY));
    expect(res.status).toBe(401);
  });

  it("returns 401 when key does not match", async () => {
    const res = await POST(makePost({ click_id: "c1" }, "wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when both click_id and broker_slug are absent", async () => {
    const res = await POST(makePost({ revenue_cents: 5000 }, VALID_KEY));
    expect(res.status).toBe(400);
  });

  it("returns 200 with duplicate:true when external_ref already recorded", async () => {
    // affiliate_clicks → null click; broker → null; broker_signups maybeSingle → existing row
    mockAdminFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.insert = vi.fn(() => c);
      c.single = vi.fn().mockResolvedValue({ data: null, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 99 }, error: null });
      return c;
    });

    const res = await POST(
      makePost({ broker_slug: "commsec", external_ref: "ext-001", revenue_cents: 4900 }, VALID_KEY)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
  });

  it("returns 400 when broker_slug cannot be resolved from click_id and broker_slug is missing", async () => {
    // click lookup returns null, no broker_slug provided
    mockAdminFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.single = vi.fn().mockResolvedValue({ data: null, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return c;
    });
    const res = await POST(makePost({ click_id: "unknown-click" }, VALID_KEY));
    expect(res.status).toBe(400);
  });

  it("inserts broker_signup record and returns signup_id on success", async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: 42 }, error: null });
    const fromImpl = vi.fn().mockImplementation((table: string) => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.insert = vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) }));
      c.single = vi.fn().mockResolvedValue(
        table === "brokers" ? { data: { id: 7 }, error: null } : { data: null, error: null }
      );
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return c;
    });
    mockAdminFrom.mockImplementation((t: string) => fromImpl(t));

    const res = await POST(
      makePost({ broker_slug: "commsec", revenue_cents: 4900, commission_type: "cpa" }, VALID_KEY)
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.signup_id).toBe(42);
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.insert = vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: "db fail" } }) })),
      }));
      c.single = vi.fn().mockResolvedValue({ data: { id: 3 }, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return c;
    });

    const res = await POST(makePost({ broker_slug: "commsec" }, VALID_KEY));
    expect(res.status).toBe(500);
  });

  it("accepts PARTNER_API_KEY when POSTBACK_SECRET is absent", async () => {
    delete process.env.POSTBACK_SECRET;
    process.env.PARTNER_API_KEY = VALID_KEY;

    const insertSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    mockAdminFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.insert = vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) }));
      c.single = vi.fn().mockResolvedValue({ data: { id: 5 }, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return c;
    });

    const res = await POST(makePost({ broker_slug: "selfwealth" }, VALID_KEY));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/webhooks/broker-signup", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...OLD_ENV, POSTBACK_SECRET: VALID_KEY };
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("returns 400 when click_id and broker are both absent", async () => {
    const res = await GET(makeGet({}, VALID_KEY));
    expect(res.status).toBe(400);
  });

  it("delegates to POST logic when broker query param is provided", async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: 99 }, error: null });
    mockAdminFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.insert = vi.fn(() => ({ select: vi.fn(() => ({ single: insertSingle })) }));
      c.single = vi.fn().mockResolvedValue({ data: { id: 2 }, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return c;
    });

    const res = await GET(makeGet({ broker: "commsec", amount: "49.00" }, VALID_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("converts amount query param to revenue_cents (×100 rounded)", async () => {
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    let capturedBody: Record<string, unknown> | null = null;

    mockAdminFrom.mockImplementation(() => {
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.insert = vi.fn((row: Record<string, unknown>) => {
        capturedBody = row;
        return { select: vi.fn(() => ({ single: insertSingle })) };
      });
      c.single = vi.fn().mockResolvedValue({ data: { id: 8 }, error: null });
      c.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      return c;
    });

    await GET(makeGet({ broker: "tiger-brokers", amount: "29.99" }, VALID_KEY));
    expect((capturedBody as unknown as Record<string, unknown>)?.revenue_cents).toBe(2999);
  });
});
