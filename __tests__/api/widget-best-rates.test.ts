import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

const { mockCurrentYear } = vi.hoisted(() => ({ mockCurrentYear: { value: 2026 } }));
vi.mock("@/lib/seo", () => ({
  get CURRENT_YEAR() {
    return mockCurrentYear.value;
  },
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
  SITE_NAME: "invest.com.au",
}));

import { GET, OPTIONS } from "@/app/api/widget/best-rates/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Then-able query chain. `data` is returned for every awaited query. When two
// different awaited results are needed (advisor lookup + rate rows), pass a
// queue of results and each `then` shifts the next one.
function makeChain(results: unknown[] = [[]]) {
  const queue = [...results];
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in", "not"];
  for (const m of methods) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => {
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return Promise.resolve({ data: next, error: null });
  });
  c.then = (resolve: (v: { data: unknown; error: null }) => unknown) => {
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return Promise.resolve(resolve({ data: next, error: null }));
  };
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/best-rates");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const RATE_ROW = {
  rate_bps: 525,
  intro_rate_bps: 575,
  intro_term_months: 4,
  product_kind: "savings_account",
  term_months: null,
  broker_id: 7,
  brokers: { name: "ING", slug: "ing", logo_url: null },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/best-rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentYear.value = 2026;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 200 application/javascript with CORS + cache headers", async () => {
    mockFrom.mockReturnValue(makeChain([[RATE_ROW]]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Vary")).toBe("Origin");
    expect(res.headers.get("Cache-Control")).toMatch(/public, max-age=3600/);
  });

  it("embeds rate rows (converted bps→pct) in the JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([[RATE_ROW]]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("ROWS");
    expect(body).toContain("ING");
    expect(body).toContain("5.25"); // 525 bps → 5.25%
    expect(body).toContain("5.75"); // intro 575 bps → 5.75%
  });

  it("uses the savings heading by default", async () => {
    mockFrom.mockReturnValue(makeChain([[RATE_ROW]]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Best Savings Accounts");
  });

  it("filters product_kind=term_deposit and uses the term-deposit heading", async () => {
    const chain = makeChain([[RATE_ROW]]);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ type: "term_deposit" }));
    const body = await res.text();
    expect(body).toContain("Best Term Deposits");
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "product_kind" && c[1] === "term_deposit")).toBe(true);
  });

  it("does not filter product_kind when ?type=all (combined heading)", async () => {
    const chain = makeChain([[RATE_ROW]]);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ type: "all" }));
    const body = await res.text();
    expect(body).toContain("Best Savings Rates & Term Deposits");
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "product_kind")).toBe(false);
  });

  it("clamps limit to 10 when ?limit=50", async () => {
    const chain = makeChain([[RATE_ROW]]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "50" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(10);
  });

  it("defaults limit to 5 when ?limit is non-numeric", async () => {
    const chain = makeChain([[RATE_ROW]]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "abc" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(5);
  });

  it("dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeChain([[RATE_ROW]]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("co-brands when ?for_advisor_slug matches an active advisor", async () => {
    // First awaited query = advisor lookup (.maybeSingle), second = rate rows.
    mockFrom.mockReturnValue(
      makeChain([{ name: "Jane Adviser", slug: "jane" }, [RATE_ROW]]),
    );
    const res = await GET(makeReq({ for_advisor_slug: "jane" }));
    const body = await res.text();
    expect(body).toContain("Jane Adviser");
    expect(body).toContain("https://invest.com.au/advisor/jane");
  });

  it("omits co-branding when advisor slug does not resolve", async () => {
    mockFrom.mockReturnValue(makeChain([null, [RATE_ROW]]));
    const res = await GET(makeReq({ for_advisor_slug: "ghost" }));
    const body = await res.text();
    expect(body).toContain("var ADVISOR_NAME = null;");
  });

  it("threads partner ?ref= into REF_PARAM (url-encoded)", async () => {
    mockFrom.mockReturnValue(makeChain([[RATE_ROW]]));
    const res = await GET(makeReq({ ref: "p x&y" }));
    const body = await res.text();
    expect(body).toContain("p%20x%26y");
    expect(body).toContain("source=widget-best-rates");
  });

  it("renders empty-state JS when no rate rows", async () => {
    mockFrom.mockReturnValue(makeChain([[]]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("var ROWS = [];");
  });

  it("includes the not-personal-advice disclaimer with current year", async () => {
    mockCurrentYear.value = 2030;
    mockFrom.mockReturnValue(makeChain([[RATE_ROW]]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Not personal financial advice");
    expect(body).toContain("2030");
  });
});

describe("OPTIONS /api/widget/best-rates", () => {
  it("returns 204 with CORS preflight headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
