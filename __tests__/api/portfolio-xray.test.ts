import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown"),
}));

const mockLookupTicker = vi.fn();
const TICKER_MAP_FIXTURE = {
  VAS: { sector: "ETF-AU", country: "AU", dividend_yield_est: 0.04 },
  IVV: { sector: "ETF-US", country: "US", dividend_yield_est: 0.015 },
};

vi.mock("@/lib/ticker-sectors", () => ({
  lookupTicker: (...args: unknown[]) => mockLookupTicker(...args),
  TICKER_MAP: {
    VAS: { sector: "ETF-AU", country: "AU", dividend_yield_est: 0.04 },
    IVV: { sector: "ETF-US", country: "US", dividend_yield_est: 0.015 },
  },
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/portfolio-xray/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/portfolio-xray", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const AU_HOLDING = { ticker: "VAS", name: "Vanguard ASX 300", quantity: 100, price: 100, value: 10000 };
const US_HOLDING = { ticker: "IVV", name: "iShares S&P 500", quantity: 10, price: 500, value: 5000 };
const UNKNOWN_HOLDING = { ticker: "XYZ", name: "Unknown Co", quantity: 50, price: 20, value: 1000 };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/portfolio-xray", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockLookupTicker.mockImplementation((ticker: string) => {
      return TICKER_MAP_FIXTURE[ticker as keyof typeof TICKER_MAP_FIXTURE] ?? null;
    });
    // Default: no brokers (fee drag not calculated)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ holdings: [AU_HOLDING] }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when holdings is absent", async () => {
    const res = await POST(makePost({ current_broker_slug: "abc" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/holding/i);
  });

  it("returns 400 when holdings is empty array", async () => {
    const res = await POST(makePost({ holdings: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when total portfolio value is zero", async () => {
    const res = await POST(makePost({ holdings: [{ ...AU_HOLDING, value: 0 }] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/positive total value/i);
  });

  it("returns 200 with correct structure for a valid portfolio", async () => {
    const res = await POST(makePost({ holdings: [AU_HOLDING, US_HOLDING] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_value).toBe(15000);
    expect(body.holdings).toHaveLength(2);
    expect(body.sectors).toBeDefined();
    expect(body.geographic).toBeDefined();
    expect(typeof body.diversification_score).toBe("number");
    expect(body.recommendations).toBeDefined();
  });

  it("resolves country and sector from ticker map", async () => {
    const res = await POST(makePost({ holdings: [AU_HOLDING] }));
    const body = await res.json();
    const holding = body.holdings[0];
    expect(holding.country).toBe("AU");
    expect(holding.resolved_sector).toBe("ETF-AU");
  });

  it("falls back to 'AU' country and 'Other' sector for unknown ticker", async () => {
    const res = await POST(makePost({ holdings: [UNKNOWN_HOLDING] }));
    const body = await res.json();
    const holding = body.holdings[0];
    expect(holding.country).toBe("AU");
    expect(holding.resolved_sector).toBe("Other");
  });

  it("weights holdings correctly as percentage of total value", async () => {
    // VAS = $10000, IVV = $5000, total = $15000
    const res = await POST(makePost({ holdings: [AU_HOLDING, US_HOLDING] }));
    const body = await res.json();
    const vas = body.holdings.find((h: { ticker: string }) => h.ticker === "VAS");
    expect(vas.weight).toBeCloseTo(66.67, 1);
  });

  it("emits concentration warning when a single holding exceeds 20%", async () => {
    // One $9000 holding out of $10000 total = 90%
    const bigHolding = { ticker: "VAS", name: "Vanguard", quantity: 90, price: 100, value: 9000 };
    const smallHolding = { ticker: "IVV", name: "iShares", quantity: 10, price: 100, value: 1000 };
    const res = await POST(makePost({ holdings: [bigHolding, smallHolding] }));
    const body = await res.json();
    const holdingWarnings = body.concentration_warnings.filter(
      (w: { type: string }) => w.type === "holding"
    );
    expect(holdingWarnings.length).toBeGreaterThan(0);
  });

  it("calculates dividend yield based on ticker map estimates", async () => {
    // VAS has 4% yield on $10000 → $400/yr; IVV has 1.5% on $5000 → $75/yr
    const res = await POST(makePost({ holdings: [AU_HOLDING, US_HOLDING] }));
    const body = await res.json();
    expect(body.total_annual_dividends_est).toBeCloseTo(475, 0);
    expect(body.portfolio_dividend_yield).toBeCloseTo(3.17, 0);
  });

  it("returns fee_drag null when no current_broker_slug provided and no brokers found", async () => {
    const res = await POST(makePost({ holdings: [AU_HOLDING] }));
    const body = await res.json();
    expect(body.fee_drag).toBeNull();
  });

  it("includes geo breakdown with correct countries", async () => {
    const res = await POST(makePost({ holdings: [AU_HOLDING, US_HOLDING] }));
    const body = await res.json();
    const countries = body.geographic.map((g: { country: string }) => g.country);
    expect(countries).toContain("AU");
    expect(countries).toContain("US");
  });

  it("returns 500 on unexpected error inside try block", async () => {
    // lookupTicker is called inside the try block; throwing there triggers the 500 handler
    mockLookupTicker.mockImplementation(() => { throw new Error("lookup failed"); });
    const res = await POST(makePost({ holdings: [AU_HOLDING] }));
    expect(res.status).toBe(500);
  });
});
