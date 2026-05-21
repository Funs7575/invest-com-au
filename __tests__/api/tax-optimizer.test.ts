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

// ── Tests ──────────────────────────────────────────────────────────────────────

// This endpoint is disabled (410 Gone): it emitted imperative tax directives
// with no compliance filter and had no live UI caller. The behavioural assertions
// for the (retained) analysis impl are intentionally dropped — re-add them if the
// endpoint is rebuilt behind a compliance gate.
describe("POST /api/tax-optimizer (disabled)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 410 Gone regardless of input", async () => {
    const res = await POST(makePost({ income_bracket: "45k-120k", holdings: [GAIN_HOLDING] }));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toMatch(/no longer available/i);
  });

  it("returns 410 even for empty/invalid bodies (no analysis runs)", async () => {
    const res = await POST(makePost({ holdings: [] }));
    expect(res.status).toBe(410);
  });

  it("does not consume the rate limiter when disabled", async () => {
    await POST(makePost({ income_bracket: "45k-120k", holdings: [LOSS_HOLDING] }));
    expect(mockIsAllowed).not.toHaveBeenCalled();
  });
});
