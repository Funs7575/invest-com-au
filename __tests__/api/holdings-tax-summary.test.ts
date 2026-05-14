import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Use vi.hoisted so `mockX` is defined before vi.mock() factories execute
// (per CLAUDE.md "Vitest vi.mock() hoisting" note).

const { mockGetUser, mockServerFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockServerFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

import { GET } from "@/app/api/account/holdings/tax-summary/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(taxYear?: number | string): NextRequest {
  const url = new URL("http://localhost/api/account/holdings/tax-summary");
  if (taxYear !== undefined) url.searchParams.set("tax_year", String(taxYear));
  return new NextRequest(url, { method: "GET" });
}

function authedUser(id = "user-abc") {
  mockGetUser.mockResolvedValue({ data: { user: { id, email: "x@test.com" } } });
}

function setupHoldingsChain(result: {
  data: Array<Record<string, unknown>> | null;
  error: null | { message: string };
}) {
  const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};
  const chain = createChainableBuilder("investor_holdings", supabaseCalls);
  // The route awaits the chain directly after .order() — wire `then` to
  // resolve with our supplied result rather than the helper's empty default.
  chain.then = vi.fn((cb: (v: { data: typeof result.data; error: typeof result.error }) => void) => {
    cb(result);
    return Promise.resolve();
  });
  mockServerFrom.mockReturnValue(chain);
  return { chain, supabaseCalls };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/account/holdings/tax-summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns CSV with header row + content-type when authenticated", async () => {
    authedUser();
    setupHoldingsChain({
      data: [
        {
          ticker: "BHP",
          exchange: "ASX",
          shares: 100,
          cost_basis_per_share_cents: 4500,
          acquired_at: "2023-08-12",
          broker_slug: "commsec",
          notes: null,
        },
      ],
      error: null,
    });
    const res = await GET(makeGet(2025));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/);
    expect(res.headers.get("content-disposition")).toContain(
      'filename="invest-com-au-tax-summary-2025.csv"',
    );
    const text = await res.text();
    expect(text.split("\r\n")[0]).toBe(
      "Ticker,Exchange,Broker,Shares,Cost Basis Per Share (AUD),Total Cost Basis (AUD),Acquired Date,Notes",
    );
    expect(text).toContain("BHP,ASX,commsec");
  });

  it("returns header-only CSV when user has no holdings", async () => {
    authedUser();
    setupHoldingsChain({ data: [], error: null });
    const res = await GET(makeGet(2026));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe(
      "Ticker,Exchange,Broker,Shares,Cost Basis Per Share (AUD),Total Cost Basis (AUD),Acquired Date,Notes\r\n",
    );
  });

  it("filters via supabase .lte('acquired_at', <tax-year-end>) when tax_year is given", async () => {
    authedUser();
    const { supabaseCalls } = setupHoldingsChain({ data: [], error: null });
    await GET(makeGet(2024));
    const lteCall = supabaseCalls["investor_holdings"]?.find(
      (c) => c.method === "lte",
    );
    expect(lteCall).toBeDefined();
    expect(lteCall?.args).toEqual(["acquired_at", "2024-06-30"]);
  });

  it("defaults to current AU tax year when tax_year omitted", async () => {
    authedUser();
    const { supabaseCalls } = setupHoldingsChain({ data: [], error: null });
    const res = await GET(makeGet()); // no tax_year query
    expect(res.status).toBe(200);
    const lteCall = supabaseCalls["investor_holdings"]?.find(
      (c) => c.method === "lte",
    );
    expect(lteCall).toBeDefined();
    const boundEnd = lteCall?.args[1] as string;
    expect(boundEnd).toMatch(/^\d{4}-06-30$/);
    // Filename should reflect the same year used for the bound
    const expectedYear = boundEnd.slice(0, 4);
    expect(res.headers.get("content-disposition")).toContain(
      `tax-summary-${expectedYear}.csv`,
    );
  });

  it("returns 400 on out-of-range tax_year", async () => {
    authedUser();
    setupHoldingsChain({ data: [], error: null });
    const res = await GET(makeGet(1900));
    expect(res.status).toBe(400);
  });

  it("returns 500 when supabase fetch errors", async () => {
    authedUser();
    setupHoldingsChain({ data: null, error: { message: "boom" } });
    const res = await GET(makeGet(2025));
    expect(res.status).toBe(500);
  });
});
