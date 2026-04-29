import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST } from "@/app/api/portfolio/route";

function makeRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { "x-forwarded-for": "1.2.3.4", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeBrokersBuilder(rows: unknown[], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: rows, error })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: rows[0] ?? null, error })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
});

describe("GET /api/portfolio", () => {
  it("returns 400 when email missing", async () => {
    const res = await GET(makeRequest("GET", "http://localhost/api/portfolio"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeRequest("GET", "http://localhost/api/portfolio?email=a@b.com"));
    expect(res.status).toBe(429);
  });

  it("returns {portfolio: null} when no portfolio found", async () => {
    const portfolioBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
    };
    mockFrom.mockReturnValue(portfolioBuilder);
    const res = await GET(makeRequest("GET", "http://localhost/api/portfolio?email=a@b.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ portfolio: null });
  });

  it("returns portfolio with alerts when found", async () => {
    const fakePortfolio = { id: 1, email: "a@b.com", holdings: [] };
    const fakeAlerts = [{ id: 10, alert_type: "fee_change" }];
    const portfolioBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: fakePortfolio })),
    };
    const alertsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: fakeAlerts })),
    };
    mockFrom
      .mockReturnValueOnce(portfolioBuilder)
      .mockReturnValueOnce(alertsBuilder);

    const res = await GET(makeRequest("GET", "http://localhost/api/portfolio?email=A@B.COM"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.portfolio).toEqual(fakePortfolio);
    expect(body.alerts).toEqual(fakeAlerts);
  });
});

describe("POST /api/portfolio", () => {
  it("returns 400 when email missing", async () => {
    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { holdings: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when holdings missing", async () => {
    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when holdings not an array", async () => {
    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { email: "a@b.com", holdings: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { email: "a@b.com", holdings: [] }));
    expect(res.status).toBe(429);
  });

  it("calculates fees and upserts existing portfolio", async () => {
    const holdings = [{ broker_slug: "comsec", balance: 10000, trades_per_year: 12, us_allocation: 20 }];
    const broker = { slug: "comsec", name: "CommSec", asx_fee_value: 19.95, us_fee_value: 29.95, fx_rate: 0.6, inactivity_fee: 0, rating: 3.5 };
    const allBrokers = [{ slug: "cheap", name: "Cheap", asx_fee_value: 5, us_fee_value: 5, fx_rate: 0.3, inactivity_fee: 0, rating: 4 }];

    const brokersInBuilder = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn(() => Promise.resolve({ data: [broker] })),
    };
    const allBrokersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: allBrokers })),
    };
    const existingBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 42 } })),
    };
    const mockUpdateEq = vi.fn(() => Promise.resolve({}));
    const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));

    mockFrom
      .mockReturnValueOnce(brokersInBuilder)   // brokers in
      .mockReturnValueOnce(allBrokersBuilder)  // all brokers
      .mockReturnValueOnce(existingBuilder)    // existing portfolio
      .mockImplementation(() => ({ update: mockUpdate }));

    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { email: "a@b.com", holdings, name: "My Portfolio" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.portfolio_id).toBe(42);
    expect(typeof body.annual_fees).toBe("number");
    expect(typeof body.savings).toBe("number");
    expect(body.optimal_broker).toBe("cheap");
  });

  it("inserts new portfolio when none exists", async () => {
    const holdings = [{ broker_slug: "comsec", balance: 5000 }];
    const brokersInBuilder = { select: vi.fn().mockReturnThis(), in: vi.fn(() => Promise.resolve({ data: [] })) };
    const allBrokersBuilder = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn(() => Promise.resolve({ data: [] })),
    };
    const existingBuilder = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null })),
    };
    const insertBuilder = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: { id: 99 } })),
    };
    mockFrom
      .mockReturnValueOnce(brokersInBuilder)
      .mockReturnValueOnce(allBrokersBuilder)
      .mockReturnValueOnce(existingBuilder)
      .mockReturnValueOnce(insertBuilder);

    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { email: "b@c.com", holdings }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.portfolio_id).toBe(99);
  });

  it("returns 500 on unexpected error", async () => {
    mockFrom.mockImplementation(() => { throw new Error("DB exploded"); });
    const res = await POST(makeRequest("POST", "http://localhost/api/portfolio", { email: "a@b.com", holdings: [] }));
    expect(res.status).toBe(500);
  });
});
