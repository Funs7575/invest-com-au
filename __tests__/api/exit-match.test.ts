import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSupabaseFrom = vi.fn();
const mockCookieStoreGet = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieStoreGet })),
}));

import { GET } from "@/app/api/exit-match/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const BROKER_A = {
  id: 1,
  slug: "commsec",
  name: "CommSec",
  color: "#ff0000",
  icon: "CS",
  logo_url: "/commsec.png",
  rating: 4.8,
  asx_fee: "$29.95",
  asx_fee_value: 2995,
  us_fee: "$9.95",
  pros: ["Reliable", "Trusted"],
  affiliate_url: "https://affiliate.commsec.com",
  deal: false,
  deal_text: null,
  platform_type: "share_broker",
  cpa_value: 100,
  status: "active",
};

const BROKER_B = {
  id: 2,
  slug: "stake",
  name: "Stake",
  color: "#00ff00",
  icon: "SK",
  logo_url: "/stake.png",
  rating: 4.5,
  asx_fee: "$3",
  asx_fee_value: 300,
  us_fee: "$0",
  pros: ["Low cost"],
  affiliate_url: "https://stake.com.au/ref/123",
  deal: true,
  deal_text: "Get $10 free stocks",
  platform_type: "share_broker",
  cpa_value: 80,
  status: "active",
};

function makeBrokersChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.order = vi.fn().mockResolvedValue(result);
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/exit-match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieStoreGet.mockReturnValue(undefined);
    mockSupabaseFrom.mockReturnValue(
      makeBrokersChain({ data: [BROKER_A, BROKER_B], error: null }),
    );
  });

  it("returns 500 when DB returns an error", async () => {
    mockSupabaseFrom.mockReturnValue(
      makeBrokersChain({ data: null, error: { message: "DB down" } }),
    );
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/no brokers/i);
  });

  it("returns 500 when brokers array is empty", async () => {
    mockSupabaseFrom.mockReturnValue(
      makeBrokersChain({ data: [], error: null }),
    );
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns 200 with broker and reason when no cookies set", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.broker).toBeDefined();
    expect(json.broker.slug).toBeDefined();
    expect(json.reason).toBeDefined();
  });

  it("scores shortlisted broker higher and returns shortlist reason", async () => {
    mockCookieStoreGet.mockImplementation((name: string) => {
      if (name === "shortlist") return { value: JSON.stringify(["stake"]) };
      return undefined;
    });
    const res = await GET();
    const json = await res.json();
    expect(json.broker.slug).toBe("stake");
    expect(json.reason).toMatch(/shortlist/i);
  });

  it("scores quiz-matching platform_type higher", async () => {
    // Use brokers without deals/affiliates so quiz match (+5) is the decisive signal.
    const PLAIN_A = { ...BROKER_A, id: 10, slug: "plain-a", deal: false, deal_text: null, affiliate_url: null, cpa_value: 0, platform_type: "share_broker" };
    const PLAIN_B = { ...BROKER_B, id: 11, slug: "plain-b", deal: false, deal_text: null, affiliate_url: null, cpa_value: 0, platform_type: "share_broker" };
    const CRYPTO_BROKER = { ...BROKER_A, id: 12, slug: "btcmarkets", platform_type: "crypto_exchange", rating: 3.5, cpa_value: 0, deal: false, deal_text: null, affiliate_url: null };
    mockSupabaseFrom.mockReturnValue(
      makeBrokersChain({ data: [PLAIN_A, PLAIN_B, CRYPTO_BROKER], error: null }),
    );
    mockCookieStoreGet.mockImplementation((name: string) => {
      if (name === "quiz_result") return { value: JSON.stringify({ platform_type: "crypto_exchange" }) };
      return undefined;
    });
    const res = await GET();
    const json = await res.json();
    expect(json.broker.slug).toBe("btcmarkets");
    expect(json.reason).toContain("crypto");
  });

  it("includes deal reason when top broker has active deal", async () => {
    const DEAL_BROKER = { ...BROKER_A, id: 4, slug: "deal-broker", rating: 5, deal: true, deal_text: "Free trade", cpa_value: 0 };
    mockSupabaseFrom.mockReturnValue(
      makeBrokersChain({ data: [DEAL_BROKER], error: null }),
    );
    const res = await GET();
    const json = await res.json();
    expect(json.reason).toMatch(/deal/i);
  });

  it("gracefully ignores malformed shortlist cookie JSON", async () => {
    mockCookieStoreGet.mockImplementation((name: string) => {
      if (name === "shortlist") return { value: "not-valid-json" };
      return undefined;
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.broker).toBeDefined();
  });

  it("gracefully ignores malformed quiz_result cookie JSON", async () => {
    mockCookieStoreGet.mockImplementation((name: string) => {
      if (name === "quiz_result") return { value: "{broken" };
      return undefined;
    });
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns US share reason when page_history contains us-shares", async () => {
    const US_BROKER = { ...BROKER_A, slug: "interactive-brokers", us_fee: "$0", rating: 4.2, cpa_value: 0, deal: false, deal_text: null };
    mockSupabaseFrom.mockReturnValue(
      makeBrokersChain({ data: [US_BROKER], error: null }),
    );
    mockCookieStoreGet.mockImplementation((name: string) => {
      if (name === "page_history") return { value: JSON.stringify(["/us-shares/guide"]) };
      return undefined;
    });
    const res = await GET();
    const json = await res.json();
    expect(json.reason).toMatch(/us shares/i);
  });

  it("returns broker fields needed by the exit modal", async () => {
    const res = await GET();
    const json = await res.json();
    const { broker } = json;
    expect(broker).toHaveProperty("slug");
    expect(broker).toHaveProperty("name");
    expect(broker).toHaveProperty("rating");
    expect(broker).toHaveProperty("asx_fee");
    expect(broker).toHaveProperty("affiliate_url");
  });
});
