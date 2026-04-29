import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "127.0.0.1");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

vi.mock("@/lib/ticker-sectors", () => ({
  lookupTicker: vi.fn(() => ({ dividend_yield_est: 0.04 })),
  isFrankedDividend: vi.fn(() => false),
  estimatedFrankingRate: vi.fn(() => 0),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/tax-optimizer/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/tax-optimizer", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

const TODAY = new Date();
function daysAgo(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

const GAIN_HOLDING = {
  ticker: "CBA",
  name: "Commonwealth Bank",
  buy_date: daysAgo(400), // >365 → CGT discount eligible
  buy_price: 80,
  current_price: 120,
  quantity: 10,
};

const LOSS_HOLDING = {
  ticker: "XYZ",
  name: "XYZ Corp",
  buy_date: daysAgo(200),
  buy_price: 50,
  current_price: 30,
  quantity: 5,
};

const NEAR_DISCOUNT_HOLDING = {
  ticker: "BHP",
  name: "BHP Group",
  buy_date: daysAgo(300), // 66 days to CGT discount
  buy_price: 40,
  current_price: 55,
  quantity: 20,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/tax-optimizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ income_bracket: "45k-120k", holdings: [GAIN_HOLDING] }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when income_bracket is missing", async () => {
    const res = await POST(makePost({ holdings: [GAIN_HOLDING] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/income bracket/i);
  });

  it("returns 400 when holdings array is empty", async () => {
    const res = await POST(makePost({ income_bracket: "45k-120k", holdings: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when holdings is missing entirely", async () => {
    const res = await POST(makePost({ income_bracket: "45k-120k" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with correct CGT for gain holding held >365 days (50% discount)", async () => {
    const res = await POST(makePost({ income_bracket: "45k-120k", holdings: [GAIN_HOLDING] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.income_bracket).toBe("45k-120k");
    expect(body.marginal_rate).toBe(0.325);
    // gain = (120-80)*10 = 400. With discount: 400*0.5*0.325 = 65
    const holding = body.holdings[0];
    expect(holding.cgt_discount_eligible).toBe(true);
    expect(holding.unrealised_gain).toBe(400);
    expect(holding.estimated_cgt).toBeCloseTo(65, 0);
  });

  it("returns estimated_cgt without 50% discount for holdings < 365 days", async () => {
    const recentHolding = { ...GAIN_HOLDING, buy_date: daysAgo(100) };
    const res = await POST(makePost({ income_bracket: "45k-120k", holdings: [recentHolding] }));
    const body = await res.json();
    const holding = body.holdings[0];
    expect(holding.cgt_discount_eligible).toBe(false);
    // gain = 400. Without discount: 400 * 0.325 = 130
    expect(holding.estimated_cgt).toBeCloseTo(130, 0);
  });

  it("identifies tax-loss harvesting candidates", async () => {
    const res = await POST(
      makePost({ income_bracket: "45k-120k", holdings: [GAIN_HOLDING, LOSS_HOLDING] }),
    );
    const body = await res.json();
    expect(body.tax_loss_candidates.length).toBeGreaterThan(0);
    const candidate = body.tax_loss_candidates[0];
    expect(candidate.ticker).toBe("XYZ");
    expect(candidate.loss_amount).toBeGreaterThan(0);
    expect(candidate.wash_sale_warning).toBe(true);
  });

  it("produces CGT discount alert for holding within 90 days of discount", async () => {
    const res = await POST(
      makePost({ income_bracket: "45k-120k", holdings: [NEAR_DISCOUNT_HOLDING] }),
    );
    const body = await res.json();
    expect(body.cgt_discount_alerts.length).toBeGreaterThan(0);
    expect(body.cgt_discount_alerts[0].ticker).toBe("BHP");
    expect(body.cgt_discount_alerts[0].days_remaining).toBeGreaterThan(0);
    expect(body.cgt_discount_alerts[0].days_remaining).toBeLessThanOrEqual(90);
  });

  it("returns cgt_summary with total_gains and net_gain", async () => {
    const res = await POST(
      makePost({ income_bracket: "45k-120k", holdings: [GAIN_HOLDING, LOSS_HOLDING] }),
    );
    const body = await res.json();
    expect(body.cgt_summary).toMatchObject({
      total_gains: expect.any(Number),
      total_losses: expect.any(Number),
      net_gain: expect.any(Number),
    });
    expect(body.cgt_summary.total_losses).toBeGreaterThan(0);
  });

  it("uses 0.325 as default marginal_rate for unrecognised bracket", async () => {
    const res = await POST(makePost({ income_bracket: "unknown-bracket", holdings: [GAIN_HOLDING] }));
    expect(res.status).toBe(200);
    expect((await res.json()).marginal_rate).toBe(0.325);
  });

  it("returns top_moves array capped at 3", async () => {
    const res = await POST(
      makePost({
        income_bracket: "45k-120k",
        holdings: [GAIN_HOLDING, LOSS_HOLDING, NEAR_DISCOUNT_HOLDING],
      }),
    );
    const body = await res.json();
    expect(body.top_moves.length).toBeLessThanOrEqual(3);
  });

  it("returns 500 on unexpected throw", async () => {
    mockIsAllowed.mockRejectedValue(new Error("rate limit DB down"));
    const res = await POST(makePost({ income_bracket: "45k-120k", holdings: [GAIN_HOLDING] }));
    expect(res.status).toBe(500);
  });
});
