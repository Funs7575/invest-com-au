import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/widget/types", () => ({
  getWidgetCatalogueEntry: (slug: string) => {
    const MAP: Record<string, { heading: string; filter: string }> = {
      "top-crypto": { heading: "Top AU Crypto Exchanges", filter: "crypto" },
      "savings-rates": { heading: "Best Savings Rates", filter: "savings" },
      "term-deposits": { heading: "Best Term Deposits", filter: "term-deposits" },
      "cheapest-brokers": { heading: "Cheapest Australian Brokers", filter: "asx" },
    };
    return MAP[slug];
  },
}));

import { GET, OPTIONS } from "@/app/api/widget/licensed/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "in", "is", "not", "order", "limit",
    "single", "maybeSingle",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const BROKER_ROW = {
  name: "Stake",
  slug: "stake",
  asx_fee: "$3",
  us_fee: "$0",
  fx_rate: "0.6%",
  rating: 4.5,
  chess_sponsored: true,
  platform_type: "broker",
  logo_url: null,
  color: "#7c3aed",
  icon: "S",
  deal: null,
  deal_text: null,
};

const LICENSE_ROW = { id: "lic-1", allowed_domains: [] };

function makeReq(params: Record<string, string> = {}, headers: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/licensed");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { headers });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/widget/licensed", () => {
  it("returns 204 with CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });
});

describe("GET /api/widget/licensed — public (no license)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFrom.mockReturnValue(makeBuilder([BROKER_ROW]));
  });

  it("returns 200 application/javascript with public cache", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("includes branding footer when no license token", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("invest.com.au");
    // Branded footer JS call present
    expect(body).not.toContain("white-label: attribution footer omitted");
  });

  it("embeds broker data in the JS payload", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("BROKERS");
    expect(body).toContain("Stake");
  });

  it("uses table layout by default", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain('"table"');
  });

  it("switches to compact layout when ?type=compact", async () => {
    const res = await GET(makeReq({ type: "compact" }));
    const body = await res.text();
    expect(body).toContain('"compact"');
  });

  it("clamps limit to 10 when ?limit=99", async () => {
    const chain = makeBuilder([BROKER_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "99" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(10);
  });

  it("passes ?brokers= slugs via .in() filter", async () => {
    const chain = makeBuilder([BROKER_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq({ brokers: "stake,commsec" }));
    const inCalls = (chain.in as ReturnType<typeof vi.fn>).mock.calls;
    expect(inCalls[0]).toEqual(["slug", ["stake", "commsec"]]);
  });

  it("applies crypto filter for ?widget=top-crypto", async () => {
    const chain = makeBuilder([BROKER_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq({ widget: "top-crypto" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "platform_type" && c[1] === "crypto_exchange")).toBe(true);
  });

  it("applies savings filter for ?widget=savings-rates", async () => {
    const chain = makeBuilder([BROKER_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq({ widget: "savings-rates" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "platform_type" && c[1] === "savings_account")).toBe(true);
  });

  it("renders custom heading from catalogue entry", async () => {
    const res = await GET(makeReq({ widget: "top-crypto" }));
    const body = await res.text();
    expect(body).toContain("Top AU Crypto Exchanges");
  });

  it("defaults to Broker Comparison heading when no widget param", async () => {
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Broker Comparison");
  });

  it("handles empty broker result gracefully", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BROKERS = []");
  });

  it("does not apply .in() when no brokers param", async () => {
    const chain = makeBuilder([BROKER_ROW]);
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeReq());
    const inCalls = (chain.in as ReturnType<typeof vi.fn>).mock.calls;
    expect(inCalls).toHaveLength(0);
  });
});

describe("GET /api/widget/licensed — with valid license token", () => {
  beforeEach(() => vi.clearAllMocks());

  it("omits attribution footer when license is valid and domain matches", async () => {
    // First call: widget_licenses lookup, second: broker data
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(LICENSE_ROW))
      .mockReturnValueOnce(makeBuilder([BROKER_ROW]));

    const res = await GET(
      makeReq({ license: "wlt_validtoken123" }, { origin: "https://partner.com" })
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("white-label: attribution footer omitted");
  });

  it("uses private cache when license is valid", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(LICENSE_ROW))
      .mockReturnValueOnce(makeBuilder([BROKER_ROW]));

    const res = await GET(
      makeReq({ license: "wlt_validtoken123" }, { origin: "https://partner.com" })
    );
    expect(res.headers.get("Cache-Control")).toMatch(/private/);
  });

  it("shows branding when license token does not start with wlt_", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([BROKER_ROW]));
    const res = await GET(makeReq({ license: "bad_token" }));
    const body = await res.text();
    expect(body).not.toContain("white-label: attribution footer omitted");
  });

  it("shows branding (fails open) when license row not found", async () => {
    // First call: license lookup returns null, second: broker data
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(null))
      .mockReturnValueOnce(makeBuilder([BROKER_ROW]));

    const res = await GET(makeReq({ license: "wlt_unknowntoken" }));
    const body = await res.text();
    expect(body).not.toContain("white-label: attribution footer omitted");
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("enforces domain allowlist when allowed_domains is set", async () => {
    const licensedRow = { id: "lic-2", allowed_domains: ["allowed.com"] };
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(licensedRow))
      .mockReturnValueOnce(makeBuilder([BROKER_ROW]));

    // Request from a domain that is completely unrelated to allowed.com
    const res = await GET(
      makeReq({ license: "wlt_domainlimited" }, { origin: "https://differentsite.io" })
    );
    const body = await res.text();
    // Domain check fails → showBranding stays true → footer present
    expect(body).not.toContain("white-label: attribution footer omitted");
  });
});

describe("GET /api/widget/licensed — dark theme", () => {
  it("embeds dark theme when ?theme=dark", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder([BROKER_ROW]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });
});
