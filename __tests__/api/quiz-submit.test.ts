import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIsValidEmail = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => mockIsValidEmail(email),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { POST } from "@/app/api/quiz/submit/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/quiz/submit", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

interface BrokerRow {
  id: number;
  slug: string;
  name: string;
  rating: number;
  is_crypto: boolean;
  platform_type: string;
  chess_sponsored: boolean;
  smsf_support: boolean;
  asx_fee_value: number | null;
  us_fee_value: number | null;
  fx_rate: number | null;
  status: string;
}

function makeBroker(overrides: Partial<BrokerRow>): BrokerRow {
  return {
    id: 1,
    slug: "test-broker",
    name: "Test Broker",
    rating: 4,
    is_crypto: false,
    platform_type: "share_broker",
    chess_sponsored: false,
    smsf_support: false,
    asx_fee_value: 9.5,
    us_fee_value: 6.95,
    fx_rate: 0.65,
    status: "active",
    ...overrides,
  };
}

function setupAdminMocks(opts: {
  brokers?: BrokerRow[];
  quizLeadError?: null | { message: string };
}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "brokers") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: opts.brokers ?? [] })),
        })),
      };
    }
    if (table === "quiz_leads") {
      return {
        insert: vi.fn(() =>
          Promise.resolve({ error: opts.quizLeadError ?? null }),
        ),
      };
    }
    return {};
  });
}

describe("POST /api/quiz/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ email: "a@b.com", answers: {} }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    setupAdminMocks({});
    const res = await POST(makePost("not-json{"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when answers is missing", async () => {
    setupAdminMocks({});
    const res = await POST(makePost({ email: "a@b.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/answers/i);
  });

  it("returns 400 when answers is an array", async () => {
    setupAdminMocks({});
    const res = await POST(makePost({ email: "a@b.com", answers: ["x"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    setupAdminMocks({});
    const res = await POST(makePost({ email: "not-an-email", answers: {} }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 500 when quiz_leads insert fails", async () => {
    setupAdminMocks({ brokers: [], quizLeadError: { message: "constraint violated" } });
    const res = await POST(makePost({ email: "user@test.com", answers: {} }));
    expect(res.status).toBe(500);
  });

  it("returns ok=true with match slugs on success", async () => {
    const broker = makeBroker({ slug: "chess-broker", chess_sponsored: true, rating: 5 });
    setupAdminMocks({ brokers: [broker] });
    const res = await POST(
      makePost({ email: "user@test.com", answers: { trading_interest: "etf" } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.matches).toContain("chess-broker");
  });

  it("boosts crypto broker when trading_interest=crypto", async () => {
    const cryptoBroker = makeBroker({ id: 1, slug: "crypto-broker", is_crypto: true, rating: 3 });
    const nonCryptoBroker = makeBroker({ id: 2, slug: "regular-broker", is_crypto: false, rating: 3 });
    setupAdminMocks({ brokers: [cryptoBroker, nonCryptoBroker] });
    const res = await POST(
      makePost({ email: "user@test.com", answers: { trading_interest: "crypto" } }),
    );
    const json = await res.json();
    expect(json.matches[0]).toBe("crypto-broker");
  });

  it("penalizes non-crypto broker when trading_interest=crypto", async () => {
    const nonCrypto = makeBroker({ id: 1, slug: "shares-only", is_crypto: false, rating: 5 });
    const cryptoBroker = makeBroker({ id: 2, slug: "crypto-ok", is_crypto: true, rating: 3 });
    setupAdminMocks({ brokers: [nonCrypto, cryptoBroker] });
    const res = await POST(
      makePost({ email: "user@test.com", answers: { trading_interest: "crypto" } }),
    );
    const json = await res.json();
    // crypto-ok should beat shares-only despite lower rating
    expect(json.matches[0]).toBe("crypto-ok");
  });

  it("penalizes CFD broker for beginner experience", async () => {
    const cfdBroker = makeBroker({ id: 1, slug: "cfd-broker", platform_type: "cfd_forex", rating: 5 });
    const shareBroker = makeBroker({ id: 2, slug: "share-broker", platform_type: "share_broker", rating: 4 });
    setupAdminMocks({ brokers: [cfdBroker, shareBroker] });
    const res = await POST(
      makePost({ email: "user@test.com", answers: { experience_level: "beginner" } }),
    );
    const json = await res.json();
    // share broker should beat CFD despite lower rating because beginner penalty
    expect(json.matches[0]).toBe("share-broker");
  });

  it("boosts smsf_support broker when smsf=true", async () => {
    const smsfBroker = makeBroker({ id: 1, slug: "smsf-broker", smsf_support: true, rating: 3 });
    const noSmsfBroker = makeBroker({ id: 2, slug: "no-smsf", smsf_support: false, rating: 5 });
    setupAdminMocks({ brokers: [smsfBroker, noSmsfBroker] });
    const res = await POST(
      makePost({ email: "user@test.com", answers: { smsf: true } }),
    );
    const json = await res.json();
    // smsf-broker: +5 bonus (SMSF match) offsets lower rating → should come first
    // noSmsfBroker: -6 penalty despite higher rating
    expect(json.matches[0]).toBe("smsf-broker");
  });

  it("returns up to 3 matches ordered by score", async () => {
    const brokers = [
      makeBroker({ id: 1, slug: "broker-a", rating: 5 }),
      makeBroker({ id: 2, slug: "broker-b", rating: 4 }),
      makeBroker({ id: 3, slug: "broker-c", rating: 3 }),
      makeBroker({ id: 4, slug: "broker-d", rating: 2 }),
    ];
    setupAdminMocks({ brokers });
    const res = await POST(makePost({ email: "user@test.com", answers: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matches).toHaveLength(3);
    expect(json.matchDetails).toHaveLength(3);
    // highest rating comes first
    expect(json.matches[0]).toBe("broker-a");
  });
});
