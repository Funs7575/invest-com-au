import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: vi.fn(() => "test-ip"),
}));

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) b[m] = vi.fn(() => b);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

let tableResults: Record<string, unknown> = {};
const mockFrom = vi.fn((table: string) => makeBuilder(tableResults[table] ?? { data: [], error: null }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/quiz/score/route";
import { isAllowed } from "@/lib/rate-limit-db";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/quiz/score", {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const BROKERS = [
  {
    slug: "stake", name: "Stake", status: "active", platform_type: "share_broker",
    rating: 4.5, is_crypto: false, sponsorship_tier: null,
    cpa_value: 400, monthly_sponsorship_fee: 1500, commission_type: "cpa",
  },
  {
    slug: "australian-super", name: "AustralianSuper", status: "active",
    platform_type: "super_fund", rating: 4.2, sponsorship_tier: null, cpa_value: 100,
  },
];

const WEIGHTS = [
  { broker_slug: "stake", beginner_weight: 8, low_fee_weight: 8, us_shares_weight: 9, smsf_weight: 3, crypto_weight: 0, advanced_weight: 4, property_weight: 0, robo_weight: 0 },
  { broker_slug: "australian-super", beginner_weight: 8, low_fee_weight: 8, us_shares_weight: 2, smsf_weight: 0, crypto_weight: 0, advanced_weight: 2, property_weight: 4, robo_weight: 7 },
];

describe("POST /api/quiz/score", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isAllowed as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    tableResults = {
      brokers: { data: BROKERS, error: null },
      quiz_weights: { data: WEIGHTS, error: null },
    };
  });

  it("rejects an invalid body", async () => {
    const res = await POST(makeReq({ answers: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    (isAllowed as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await POST(makeReq({ answers: ["grow"] }));
    expect(res.status).toBe(429);
  });

  it("returns 502 when the broker read fails", async () => {
    tableResults = { brokers: { data: null, error: { message: "boom" } } };
    const res = await POST(makeReq({ answers: ["grow"] }));
    expect(res.status).toBe(502);
  });

  it("scores server-side and never leaks weights or commercial fields", async () => {
    const res = await POST(makeReq({ answers: ["grow"], amount: "medium", goal: "grow" }));
    expect(res.status).toBe(200);
    const json = await res.json();

    // "grow" → beginner weight; stake (8 × rating nudge) outranks the super fund.
    expect(json.results[0].slug).toBe("stake");
    // Raw weights are never returned.
    expect(json).not.toHaveProperty("quiz_weights");
    // The scored broker is sanitised.
    const broker = json.results[0].broker;
    expect(broker.name).toBe("Stake");
    expect(broker).not.toHaveProperty("cpa_value");
    expect(broker).not.toHaveProperty("monthly_sponsorship_fee");
    expect(broker).not.toHaveProperty("commission_type");
  });

  it("computes wealth-stack results when requested, with sanitised brokers", async () => {
    const res = await POST(
      makeReq({
        answers: ["grow"],
        goal: "grow",
        stack: { superInterest: true, goal: "grow", amount: "medium" },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stackResults.super_fund).toBeTruthy();
    expect(json.stackResults.super_fund[0].slug).toBe("australian-super");
    expect(json.stackResults.super_fund[0].broker).not.toHaveProperty("cpa_value");
  });

  it("omits stack results when no stack inputs are sent", async () => {
    const res = await POST(makeReq({ answers: ["grow"] }));
    const json = await res.json();
    expect(json.stackResults).toEqual({});
  });
});
