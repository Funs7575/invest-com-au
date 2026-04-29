import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@test.com"],
}));

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock("@/lib/foreign-investment-data", () => ({
  NON_RESIDENT_TAX_BRACKETS: [{ from: 0, to: 18200, rate: 0, description: "Tax free" }],
  RESIDENT_TAX_BRACKETS: [{ from: 0, to: 18200, rate: 0, description: "Tax free" }],
  DTA_COUNTRIES: [{ country: "USA", countryCode: "US", hasDTA: true, dividendWHT: 15, interestWHT: 10, royaltiesWHT: 5 }],
  DASP_WITHHOLDING_RATES: [{ componentType: "Standard", withholdingRate: 35, notes: "Standard rate" }],
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/foreign-investment/seed/route";

function makeChain() {
  return {
    delete: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

function makeReq(body: unknown, token = "secret-key"): NextRequest {
  return new NextRequest("http://localhost/api/admin/foreign-investment/seed", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.INTERNAL_API_KEY = "secret-key";
  mockFrom.mockReturnValue(makeChain());
});

describe("POST /api/admin/foreign-investment/seed", () => {
  it("returns 401 when bearer token is missing or wrong", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/seed", {
      method: "POST",
      body: JSON.stringify({ adminEmail: "admin@test.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when email not in admin list", async () => {
    const res = await POST(makeReq({ adminEmail: "notadmin@test.com" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/foreign-investment/seed", {
      method: "POST",
      headers: { authorization: "Bearer secret-key" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("seeds all fi tables and returns ok with results map", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@test.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveProperty("fi_tax_brackets");
    expect(body.results).toHaveProperty("fi_dta_countries");
    expect(body.results).toHaveProperty("fi_dasp_rates");
    expect(mockRevalidateTag).toHaveBeenCalledWith("fi-data", {});
  });

  it("runs delete before upsert when resetFirst=true", async () => {
    const chain = makeChain();
    mockFrom.mockReturnValue(chain);
    const res = await POST(makeReq({ adminEmail: "admin@test.com", resetFirst: true }));
    expect(res.status).toBe(200);
    // delete should have been called for the 3 reset tables
    expect(chain.delete).toHaveBeenCalled();
  });

  it("reports upsert errors in the results map without 500", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({ neq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: { message: "constraint violation" } }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const res = await POST(makeReq({ adminEmail: "admin@test.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Error message surfaced in results
    expect(body.results.fi_tax_brackets).toMatch(/ERROR/i);
  });
});
