/**
 * Tests for GET + PUT /api/advisor-portal/session-pricing
 *
 * Auth: Supabase server client (auth.getUser) + admin client for advisor lookup
 * GET branches: 401 (no user), 404 (advisor not found), 200 (returns pricing)
 * PUT branches: 429, 401, 400 (bad body), 404 (advisor not found), 500 (db error),
 *               200 (sets price), 200 (null/0 = free)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockGetUser, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { email: string } | null } }>>().mockResolvedValue({
    data: { user: { email: "advisor@example.com" } },
  }),
  mockAdminFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => mockIsRateLimited(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET, PUT } from "@/app/api/advisor-portal/session-pricing/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "eq", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/session-pricing", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makePut(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/session-pricing", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/advisor-portal/session-pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/authentication required/i);
  });

  it("returns 404 when advisor is not found in professionals table", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet());
    expect(res.status).toBe(404);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/advisor not found/i);
  });

  it("returns 200 with sessionPriceCents and priceInDollars when price is set", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ session_price_cents: 15000 }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.sessionPriceCents).toBe(15000);
    expect(body.priceInDollars).toBe(150);
  });

  it("returns 200 with null prices when advisor has no session price", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ session_price_cents: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.sessionPriceCents).toBeNull();
    expect(body.priceInDollars).toBeNull();
  });
});

// ── PUT tests ─────────────────────────────────────────────────────────────────

describe("PUT /api/advisor-portal/session-pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@example.com" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await PUT(makePut({ priceInDollars: 150 }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PUT(makePut({ priceInDollars: 150 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/advisor-portal/session-pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "{bad-json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when priceInDollars exceeds max (10000)", async () => {
    const res = await PUT(makePut({ priceInDollars: 99999 }));
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/invalid request/i);
  });

  it("returns 400 when priceInDollars is negative", async () => {
    const res = await PUT(makePut({ priceInDollars: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when advisor is not found", async () => {
    // maybeSingle returns null for getAdvisorId lookup
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await PUT(makePut({ priceInDollars: 150 }));
    expect(res.status).toBe(404);
  });

  it("returns 500 when update fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: 7 }); // getAdvisorId
      return makeBuilder(null, { message: "update error" }); // update
    });
    const res = await PUT(makePut({ priceInDollars: 150 }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with sessionPriceCents set to dollars*100", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: 7 });
      return makeBuilder(null); // update success
    });
    const res = await PUT(makePut({ priceInDollars: 200 }));
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.sessionPriceCents).toBe(20000);
  });

  it("returns 200 with null sessionPriceCents when priceInDollars is null (free)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: 7 });
      return makeBuilder(null);
    });
    const res = await PUT(makePut({ priceInDollars: null }));
    expect(res.status).toBe(200);
    expect((await res.json() as Record<string, unknown>).sessionPriceCents).toBeNull();
  });

  it("returns 200 with null sessionPriceCents when priceInDollars is 0 (free)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: 7 });
      return makeBuilder(null);
    });
    const res = await PUT(makePut({ priceInDollars: 0 }));
    expect(res.status).toBe(200);
    expect((await res.json() as Record<string, unknown>).sessionPriceCents).toBeNull();
  });
});
