import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: (...args: unknown[]) => mockServerFrom(...args) }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/partner/status/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_KEY = "test-partner-api-key-32chars!!!!";

function makeGet(apiKey?: string): NextRequest {
  const url = new URL("http://localhost/api/partner/status");
  if (apiKey !== undefined) url.searchParams.set("api_key", apiKey);
  return new NextRequest(url);
}

function makeCountBuilder(count: number | null, error: unknown = null) {
  const b: Record<string, unknown> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.then = vi.fn((cb: (v: { count: typeof count; error: typeof error }) => void) => {
    cb({ count, error });
    return Promise.resolve({ count, error });
  });
  return b;
}

function makeSelectBuilder(data: unknown[], error: unknown = null) {
  const b: Record<string, unknown> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.then = vi.fn((cb: (v: { data: typeof data; error: typeof error }) => void) => {
    cb({ data, error });
    return Promise.resolve({ data, error });
  });
  return b;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/partner/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PARTNER_API_KEY = VALID_KEY;
  });

  afterEach(() => {
    delete process.env.PARTNER_API_KEY;
  });

  it("returns 401 when api_key is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/invalid api key/i);
  });

  it("returns 401 when PARTNER_API_KEY env var is not set", async () => {
    delete process.env.PARTNER_API_KEY;
    const res = await GET(makeGet("some-key"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when api_key does not match", async () => {
    const res = await GET(makeGet("wrong-key"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with status fields when key is valid", async () => {
    mockServerFrom
      .mockReturnValueOnce(makeCountBuilder(42))
      .mockReturnValueOnce(makeSelectBuilder([{ credit_balance_cents: 1000 }, { credit_balance_cents: 500 }]));

    const res = await GET(makeGet(VALID_KEY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toBe(true);
    expect(data.leads_delivered_total).toBe(42);
    expect(data.credits_remaining).toBe(1500);
  });

  it("returns 500 when lead count query fails", async () => {
    mockServerFrom.mockReturnValueOnce(makeCountBuilder(null, { message: "DB error" }));
    const res = await GET(makeGet(VALID_KEY));
    expect(res.status).toBe(500);
  });

  it("returns 0 leads when count is null but no error", async () => {
    mockServerFrom
      .mockReturnValueOnce(makeCountBuilder(null))
      .mockReturnValueOnce(makeSelectBuilder([]));

    const res = await GET(makeGet(VALID_KEY));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.leads_delivered_total).toBe(0);
    expect(data.credits_remaining).toBe(0);
  });

  it("returns 500 on unexpected throw", async () => {
    mockServerFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await GET(makeGet(VALID_KEY));
    expect(res.status).toBe(500);
  });
});
