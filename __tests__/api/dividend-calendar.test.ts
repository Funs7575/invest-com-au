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
  for (const m of ["select", "eq", "gte", "lte", "order"]) {
    chain[m] = vi.fn(() => chain);
  }
  return chain;
}

const mockFromAdmin = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFromAdmin })),
}));

import { GET } from "@/app/api/dividend-calendar/route";

const SAMPLE_DISTRIBUTIONS = [
  {
    etf_slug: "vas",
    etf_name: "Vanguard Australian Shares Index ETF",
    ex_date: "2026-06-25",
    pay_date: "2026-07-09",
    amount_cents: 58,
    franking_pct: 75,
    distribution_type: "income",
  },
  {
    etf_slug: "vgs",
    etf_name: "Vanguard MSCI Index International Shares ETF",
    ex_date: "2026-06-18",
    pay_date: "2026-07-02",
    amount_cents: 42,
    franking_pct: 0,
    distribution_type: "income",
  },
];

const KNOWN_ETFS = [
  { etf_slug: "vas", etf_name: "Vanguard Australian Shares Index ETF" },
  { etf_slug: "vgs", etf_name: "Vanguard MSCI Index International Shares ETF" },
];

function makeGet(url = "http://localhost/api/dividend-calendar"): NextRequest {
  return new NextRequest(url);
}

describe("GET /api/dividend-calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    let call = 0;
    mockFromAdmin.mockImplementation(() => {
      call++;
      return call === 1 ? makeChain(SAMPLE_DISTRIBUTIONS) : makeChain(KNOWN_ETFS);
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 500 on DB error", async () => {
    mockFromAdmin.mockReturnValue(makeChain(null, { message: "db fail" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("returns 200 with distributions", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { distributions: unknown[] };
    expect(json.distributions).toHaveLength(2);
  });

  it("returns camelCase fields", async () => {
    const res = await GET(makeGet());
    const json = (await res.json()) as {
      distributions: Array<{ etfSlug: string; exDate: string; frankingPct: number }>;
    };
    const first = json.distributions[0]!;
    expect(first.etfSlug).toBeDefined();
    expect(first.exDate).toBeDefined();
    expect(first.frankingPct).toBeDefined();
  });

  it("defaults to 3-month window", async () => {
    const res = await GET(makeGet());
    const json = (await res.json()) as { windowMonths: number };
    expect(json.windowMonths).toBe(3);
  });

  it("respects ?months param", async () => {
    const res = await GET(makeGet("http://localhost/api/dividend-calendar?months=6"));
    const json = (await res.json()) as { windowMonths: number };
    expect(json.windowMonths).toBe(6);
  });

  it("caps months at 12", async () => {
    const res = await GET(makeGet("http://localhost/api/dividend-calendar?months=99"));
    const json = (await res.json()) as { windowMonths: number };
    expect(json.windowMonths).toBe(12);
  });

  it("floors months at 1", async () => {
    const res = await GET(makeGet("http://localhost/api/dividend-calendar?months=0"));
    const json = (await res.json()) as { windowMonths: number };
    expect(json.windowMonths).toBe(1);
  });

  it("returns knownEtfs list", async () => {
    const res = await GET(makeGet());
    const json = (await res.json()) as { knownEtfs: Array<{ slug: string; name: string }> };
    expect(json.knownEtfs.length).toBeGreaterThan(0);
    expect(json.knownEtfs[0]).toHaveProperty("slug");
    expect(json.knownEtfs[0]).toHaveProperty("name");
  });

  it("returns a disclaimer", async () => {
    const res = await GET(makeGet());
    const json = (await res.json()) as { disclaimer: string };
    expect(json.disclaimer).toContain("not personal financial advice");
  });

  it("handles NaN months gracefully (defaults to 3)", async () => {
    const res = await GET(makeGet("http://localhost/api/dividend-calendar?months=abc"));
    const json = (await res.json()) as { windowMonths: number };
    expect(json.windowMonths).toBe(3);
  });
});
