import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockStaticFrom } = vi.hoisted(() => ({ mockStaticFrom: vi.fn() }));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockStaticFrom })),
}));

vi.mock("@/lib/seo", () => ({
  CURRENT_YEAR: 2026,
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  SITE_NAME: "invest.com.au",
}));

import { GET, OPTIONS } from "@/app/api/widget/best-rates/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "order", "limit", "single", "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const RATE_ROW = {
  rate_bps: 500,
  intro_rate_bps: null,
  intro_term_months: null,
  product_kind: "savings_account",
  term_months: null,
  broker_id: 1,
  brokers: { name: "ING Direct", slug: "ing-direct", logo_url: null },
};

const TERM_DEPOSIT_ROW = {
  rate_bps: 480,
  intro_rate_bps: null,
  intro_term_months: null,
  product_kind: "term_deposit",
  term_months: 12,
  broker_id: 2,
  brokers: { name: "Bankwest", slug: "bankwest", logo_url: null },
};

const ADVISOR_ROW = { name: "Jane Smith CFP", slug: "jane-smith-cfp" };

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/best-rates");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/widget/best-rates", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/widget/best-rates — response shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaticFrom.mockReturnValue(makeBuilder([RATE_ROW]));
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("embeds rate row data in ROWS variable inside the JS payload", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("ROWS");
    expect(body).toContain("ING Direct");
    expect(body).toContain("5.00"); // 500 bps = 5.00%
  });

  it("contains the standard IIFE wrapper", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("(function()");
    expect(body).toContain('"use strict"');
  });
});

describe("GET /api/widget/best-rates — product type", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to savings heading when ?type is absent", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([RATE_ROW]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Best Savings Accounts");
  });

  it("uses term deposit heading for ?type=term_deposit", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([TERM_DEPOSIT_ROW]));
    const res = await GET(makeReq({ type: "term_deposit" }));
    const body = await res.text();
    expect(body).toContain("Best Term Deposits");
  });

  it("uses combined heading for ?type=all", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([RATE_ROW]));
    const res = await GET(makeReq({ type: "all" }));
    const body = await res.text();
    expect(body).toContain("Best Savings Rates");
  });

  it("calls .eq('product_kind') for savings (not 'all')", async () => {
    const chain = makeBuilder([RATE_ROW]);
    mockStaticFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "savings" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "product_kind" && c[1] === "savings_account")).toBe(true);
  });

  it("does NOT call .eq('product_kind') for ?type=all", async () => {
    const chain = makeBuilder([RATE_ROW]);
    mockStaticFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "all" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "product_kind")).toBe(false);
  });
});

describe("GET /api/widget/best-rates — limit clamping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaticFrom.mockReturnValue(makeBuilder([RATE_ROW]));
  });

  it("clamps limit to 10 when ?limit=20", async () => {
    const chain = makeBuilder([RATE_ROW]);
    mockStaticFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "20" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(10);
  });

  it("clamps limit to 1 when ?limit=0", async () => {
    const chain = makeBuilder([RATE_ROW]);
    mockStaticFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "0" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(1);
  });

  it("defaults to limit=5 when ?limit is NaN", async () => {
    const chain = makeBuilder([RATE_ROW]);
    mockStaticFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "abc" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(5);
  });
});

describe("GET /api/widget/best-rates — advisor co-branding", () => {
  it("queries professionals when ?for_advisor_slug is present", async () => {
    // First call: professionals query (advisor lookup), second: rate data
    const advisorChain = makeBuilder(ADVISOR_ROW);
    const rateChain = makeBuilder([RATE_ROW]);
    mockStaticFrom
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(rateChain);

    const res = await GET(makeReq({ for_advisor_slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("ADVISOR_NAME");
    expect(body).toContain("Jane Smith CFP");
  });

  it("does not include advisor branding when slug not found", async () => {
    // First call: advisor not found, second: rate data
    mockStaticFrom
      .mockReturnValueOnce(makeBuilder(null))
      .mockReturnValueOnce(makeBuilder([RATE_ROW]));

    const res = await GET(makeReq({ for_advisor_slug: "ghost" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("ADVISOR_NAME = null");
  });

  it("does not query professionals when for_advisor_slug is absent", async () => {
    vi.clearAllMocks();
    const chain = makeBuilder([RATE_ROW]);
    mockStaticFrom.mockReturnValue(chain);
    await GET(makeReq());
    // mockStaticFrom called once: only for savings_rate_snapshots (no advisor lookup)
    const tableNames = mockStaticFrom.mock.calls.map((c) => c[0]);
    expect(tableNames).not.toContain("professionals");
  });
});

describe("GET /api/widget/best-rates — theme and ref", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaticFrom.mockReturnValue(makeBuilder([RATE_ROW]));
  });

  it("embeds dark theme variable when ?theme=dark", async () => {
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("uses custom ref param when ?ref= is set", async () => {
    const res = await GET(makeReq({ ref: "partner123" }));
    const body = await res.text();
    expect(body).toContain("partner123");
  });

  it("uses default ref=widget when no ref param", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("ref=widget");
  });

  it("renders no-data message when ROWS is empty", async () => {
    mockStaticFrom.mockReturnValue(makeBuilder([]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("No rate data available");
  });
});
