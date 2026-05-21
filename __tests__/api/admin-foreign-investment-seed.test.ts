import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@invest.com.au"],
}));

vi.mock("@/lib/foreign-investment-data", () => ({
  NON_RESIDENT_TAX_BRACKETS: [
    { from: 0, to: 120000, rate: 0.325, description: "First bracket" },
  ],
  RESIDENT_TAX_BRACKETS: [
    { from: 0, to: 18200, rate: 0, description: "Tax free threshold" },
  ],
  DTA_COUNTRIES: [
    {
      country: "United States",
      countryCode: "US",
      hasDTA: true,
      dividendWHT: 15,
      interestWHT: 10,
      royaltiesWHT: 5,
    },
  ],
  DASP_WITHHOLDING_RATES: [
    { componentType: "Taxed element", withholdingRate: 35, notes: "Standard rate" },
  ],
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

import { POST } from "@/app/api/admin/foreign-investment/seed/route";

const INTERNAL_KEY = "test-internal-key";

function makeReq(body?: unknown, authToken?: string): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authToken !== undefined) {
    headers["authorization"] = `Bearer ${authToken}`;
  }
  return new NextRequest("http://localhost/api/admin/foreign-investment/seed", {
    method: "POST",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers,
  });
}

describe("/api/admin/foreign-investment/seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("INTERNAL_API_KEY", INTERNAL_KEY);
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
  });

  it("POST returns 401 when no authorization header", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@invest.com.au" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 401 when wrong token", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@invest.com.au" }, "bad-key"));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(
      "http://localhost/api/admin/foreign-investment/seed",
      {
        method: "POST",
        body: "not-json",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${INTERNAL_KEY}`,
        },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST returns 400 when adminEmail missing", async () => {
    const res = await POST(makeReq({}, INTERNAL_KEY));
    expect(res.status).toBe(400);
  });

  it("POST returns 403 when email is not an admin", async () => {
    const res = await POST(makeReq({ adminEmail: "attacker@evil.com" }, INTERNAL_KEY));
    expect(res.status).toBe(403);
  });

  it("POST seeds data and returns ok when valid", async () => {
    const res = await POST(makeReq({ adminEmail: "admin@invest.com.au" }, INTERNAL_KEY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toBeDefined();
  });

  it("POST with resetFirst=true deletes and reseeds", async () => {
    const res = await POST(
      makeReq({ adminEmail: "admin@invest.com.au", resetFirst: true }, INTERNAL_KEY),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results.reset).toMatch(/truncated/);
  });
});
