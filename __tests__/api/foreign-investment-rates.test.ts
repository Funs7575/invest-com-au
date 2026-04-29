import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/foreign-investment/rates/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/foreign-investment/rates");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

const RATE_ROWS = [
  {
    id: 1,
    rate_type: "withholding_tax",
    country_code: "GB",
    country_name: "United Kingdom",
    state: null,
    category: "dividends",
    rate_percent: 15,
    threshold_cents: null,
    fee_cents: null,
    notes: null,
    effective_from: "2026-01-01",
  },
  {
    id: 2,
    rate_type: "firb_threshold",
    country_code: "GB",
    country_name: "United Kingdom",
    state: null,
    category: "residential",
    rate_percent: null,
    threshold_cents: 128000000,
    fee_cents: null,
    notes: null,
    effective_from: "2026-01-01",
  },
];

const COUNTRY_ROWS = [
  { country_code: "GB", country_name: "United Kingdom" },
  { country_code: "JP", country_name: "Japan" },
  { country_code: "SG", country_name: "Singapore" },
];

function makeQueryChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  // Both .not() and .order() are terminal depending on the code path:
  // country list ends with .not(), country rates end with .order().
  c.not = vi.fn().mockResolvedValue(result);
  c.order = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/foreign-investment/rates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns country list when no country param given", async () => {
    const chain = makeQueryChain({ data: COUNTRY_ROWS, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.countries)).toBe(true);
    expect(json.countries).toHaveLength(3);
  });

  it("returns country list sorted alphabetically by name", async () => {
    const chain = makeQueryChain({ data: COUNTRY_ROWS, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet());
    const json = await res.json();
    const names = json.countries.map((c: { name: string }) => c.name);
    expect(names).toEqual([...names].sort());
  });

  it("deduplicates countries when multiple rate rows exist for same code", async () => {
    const dupeRows = [
      { country_code: "GB", country_name: "United Kingdom" },
      { country_code: "GB", country_name: "United Kingdom" },
      { country_code: "JP", country_name: "Japan" },
    ];
    const chain = makeQueryChain({ data: dupeRows, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.countries.filter((c: { code: string }) => c.code === "GB")).toHaveLength(1);
  });

  it("returns 500 when DB error fetching country list", async () => {
    const chain = makeQueryChain({ data: null, error: { message: "DB error" } });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns rates for specific country code", async () => {
    const chain = makeQueryChain({ data: RATE_ROWS, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ country: "GB" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.country).toBe("GB");
    expect(Array.isArray(json.rates)).toBe(true);
    expect(json.rates).toHaveLength(2);
  });

  it("upcases country code from query param", async () => {
    const chain = makeQueryChain({ data: RATE_ROWS, error: null });
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeGet({ country: "gb" }));
    expect(chain.eq).toHaveBeenCalledWith("country_code", "GB");
  });

  it("slices country param to max 3 characters", async () => {
    const chain = makeQueryChain({ data: [], error: null });
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeGet({ country: "GBXX" }));
    expect(chain.eq).toHaveBeenCalledWith("country_code", "GBX");
  });

  it("returns 500 when DB error fetching country rates", async () => {
    const chain = makeQueryChain({ data: null, error: { message: "connection refused" } });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ country: "GB" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns empty rates array when no rates found for country", async () => {
    const chain = makeQueryChain({ data: null, error: null });
    mockAdminFrom.mockReturnValue(chain);
    const res = await GET(makeGet({ country: "ZZ" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rates).toEqual([]);
  });
});
