import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "127.0.0.1",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

function makeChain(data: unknown, error: unknown = null) {
  const terminal = { data, error };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of ["select", "eq", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  return chain;
}

const mockFromAdmin = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFromAdmin })),
}));

import { GET } from "@/app/api/etf-overlap/route";

const VGS_HOLDINGS = [
  { ticker: "AAPL", security_name: "Apple Inc", weight_bps: 520, etf_name: "Vanguard MSCI Index International Shares ETF" },
  { ticker: "MSFT", security_name: "Microsoft Corporation", weight_bps: 490, etf_name: "Vanguard MSCI Index International Shares ETF" },
  { ticker: "NVDA", security_name: "NVIDIA Corporation", weight_bps: 420, etf_name: "Vanguard MSCI Index International Shares ETF" },
];

const NDQ_HOLDINGS = [
  { ticker: "MSFT", security_name: "Microsoft Corporation", weight_bps: 850, etf_name: "BetaShares NASDAQ 100 ETF" },
  { ticker: "AAPL", security_name: "Apple Inc", weight_bps: 830, etf_name: "BetaShares NASDAQ 100 ETF" },
  { ticker: "NVDA", security_name: "NVIDIA Corporation", weight_bps: 780, etf_name: "BetaShares NASDAQ 100 ETF" },
];

function makeReq(a: string, b: string): NextRequest {
  return new NextRequest(`http://localhost/api/etf-overlap?a=${a}&b=${b}`);
}

describe("GET /api/etf-overlap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeReq("vgs", "ndq"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when 'a' is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/etf-overlap?b=ndq"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'b' is missing", async () => {
    const res = await GET(new NextRequest("http://localhost/api/etf-overlap?a=vgs"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when both slugs are the same", async () => {
    const res = await GET(makeReq("vgs", "vgs"));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    mockFromAdmin.mockReturnValue(makeChain(null, { message: "db fail" }));
    const res = await GET(makeReq("vgs", "ndq"));
    expect(res.status).toBe(500);
  });

  it("returns 404 when ETF A has no holdings", async () => {
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain([]) : makeChain(NDQ_HOLDINGS);
    });
    const res = await GET(makeReq("unknown", "ndq"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when ETF B has no holdings", async () => {
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain(VGS_HOLDINGS) : makeChain([]);
    });
    const res = await GET(makeReq("vgs", "unknown"));
    expect(res.status).toBe(404);
  });

  it("returns 200 with overlap data for VGS vs NDQ", async () => {
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain(VGS_HOLDINGS) : makeChain(NDQ_HOLDINGS);
    });
    const res = await GET(makeReq("vgs", "ndq"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      overlapPct: number;
      overlappingHoldings: unknown[];
      etfA: { slug: string };
      etfB: { slug: string };
    };
    expect(json.etfA.slug).toBe("vgs");
    expect(json.etfB.slug).toBe("ndq");
    expect(json.overlappingHoldings).toHaveLength(3);
    expect(json.overlapPct).toBeGreaterThan(0);
  });

  it("returns correct overlap bps using min(wA, wB)", async () => {
    // AAPL: min(520, 830) = 520, MSFT: min(490, 850) = 490, NVDA: min(420, 780) = 420
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain(VGS_HOLDINGS) : makeChain(NDQ_HOLDINGS);
    });
    const res = await GET(makeReq("vgs", "ndq"));
    const json = (await res.json()) as { overlapBps: number };
    expect(json.overlapBps).toBe(520 + 490 + 420);
  });

  it("normalises slug to lowercase", async () => {
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain(VGS_HOLDINGS) : makeChain(NDQ_HOLDINGS);
    });
    const res = await GET(makeReq("VGS", "NDQ"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { etfA: { slug: string } };
    expect(json.etfA.slug).toBe("vgs");
  });

  it("returns a disclaimer", async () => {
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain(VGS_HOLDINGS) : makeChain(NDQ_HOLDINGS);
    });
    const res = await GET(makeReq("vgs", "ndq"));
    const json = (await res.json()) as { disclaimer: string };
    expect(json.disclaimer).toContain("not personal financial advice");
  });
});
