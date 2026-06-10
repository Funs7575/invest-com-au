import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: vi.fn(async () => true),
  ipKey: () => "test-ip",
}));

let rows: Record<string, unknown>[] = [];
const mockFrom = vi.fn((table: string) => {
  if (table !== "professionals") throw new Error(`unexpected table ${table}`);
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: rows, error: null }),
  };
  return chain;
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { POST } from "@/app/api/advisor-match/route";

const make = (body: unknown) => ({ json: async () => body }) as unknown as NextRequest;

beforeEach(() => {
  rows = [];
  vi.clearAllMocks();
});

describe("POST /api/advisor-match", () => {
  it("400s on an invalid body (missing advisorType)", async () => {
    const res = await POST(make({}));
    expect(res.status).toBe(400);
  });

  it("scores + ranks candidates and never leaks PII / internal columns", async () => {
    rows = [
      {
        id: 1, slug: "a", name: "A", type: "tax_agent", email: "secret@x.com", phone: "0400000000",
        rating: 4.5, review_count: 20, specialties: ["Crypto Tax"], trust_score_overall: 88,
        country_eligibility: { blocked_countries: [] }, location_state: "NSW",
      },
      {
        id: 2, slug: "b", name: "B", type: "tax_agent", email: "secret2@x.com", phone: "0401000000",
        rating: 4.9, review_count: 2, specialties: ["Aged Care"], location_state: "WA",
      },
    ];
    const res = await POST(make({ advisorType: "tax-agent", goal: "crypto", state: "NSW", amount: "medium" }));
    expect(res.status).toBe(200);

    const json = (await res.json()) as { advisors: Array<Record<string, unknown>> };
    expect(json.advisors).toHaveLength(2);
    // "a" (crypto-tax specialty + local) outranks "b" despite "b"'s higher rating.
    expect(json.advisors[0]?.slug).toBe("a");
    expect(json.advisors[0]).toHaveProperty("matchScore");
    expect(json.advisors[0]).toHaveProperty("confidence");

    const keys = Object.keys(json.advisors[0] ?? {});
    for (const leaked of ["email", "phone", "trust_score_overall", "country_eligibility", "min_investment_cents"]) {
      expect(keys).not.toContain(leaked);
    }
  });

  it("applies the country-eligibility gate for international users", async () => {
    rows = [
      { id: 1, slug: "blocked", name: "Blocked", type: "tax_agent", country_eligibility: { blocked_countries: ["GB"] }, available_in_countries: ["uk"] },
      { id: 2, slug: "open", name: "Open", type: "tax_agent", available_in_countries: ["uk"] },
    ];
    const res = await POST(make({ advisorType: "tax-agent", isInternational: true, investorCountry: "uk" }));
    const json = (await res.json()) as { advisors: Array<Record<string, unknown>> };
    expect(json.advisors.map((a) => a.slug)).toEqual(["open"]);
  });

  it("honours the limit", async () => {
    rows = Array.from({ length: 8 }, (_, i) => ({ id: i, slug: `a${i}`, name: `A${i}`, type: "tax_agent" }));
    const res = await POST(make({ advisorType: "tax-agent", limit: 3 }));
    const json = (await res.json()) as { advisors: unknown[] };
    expect(json.advisors).toHaveLength(3);
  });
});
