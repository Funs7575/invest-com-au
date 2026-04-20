import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Validation-layer tests for POST /api/advertise/create-checkout.
 *
 * Scope: input validation + rate-limit early-return only. Stripe /
 * Supabase integration is intentionally mocked to loose defaults so a
 * bad input returns 400 before anything real runs. Full happy-path
 * coverage would need fixture bookings + a fake Stripe session; add a
 * separate integration test if/when that pipeline is spun up.
 */

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const allowed = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => allowed(),
  ipKey: (_req: unknown) => "test-ip",
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://checkout.stripe.com/test" })),
      },
    },
  }),
}));

// Default: resolve to arbitrary fake data so happy-path smoke reaches
// Stripe; individual tests override via `supabaseMock.from` if they
// need specific behaviour.
const supabaseMock = {
  from: vi.fn((_table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({
      data: { id: 1, tier: "featured_partner", duration_days: 30, amount_cents: 50000, currency: "AUD", stripe_price_id: null, max_concurrent: 3, description: null, active: true, slug: "commsec", name: "CommSec" },
      error: null,
    })),
    then: undefined,
  })),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { POST } from "@/app/api/advertise/create-checkout/route";

function makeRequest(body: Record<string, unknown> | string) {
  const isString = typeof body === "string";
  return new NextRequest("http://localhost/api/advertise/create-checkout", {
    method: "POST",
    body: isString ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
  });
}

describe("POST /api/advertise/create-checkout — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allowed.mockResolvedValue(true);
  });

  it("429s when rate-limited", async () => {
    allowed.mockResolvedValueOnce(false);
    const res = await POST(makeRequest({ pricing_id: 1, broker_slug: "commsec", starts_at: "2099-01-01T00:00:00Z", email: "a@b.co" }));
    expect(res.status).toBe(429);
  });

  it("400s on invalid JSON", async () => {
    const res = await POST(makeRequest("{not json"));
    expect(res.status).toBe(400);
  });

  it("400s when pricing_id is missing or not finite", async () => {
    const res = await POST(makeRequest({ broker_slug: "commsec", starts_at: "2099-01-01T00:00:00Z", email: "a@b.co" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/pricing_id/i);
  });

  it("400s when broker_slug fails the slug regex", async () => {
    const res = await POST(makeRequest({ pricing_id: 1, broker_slug: "Not_A_Slug!", starts_at: "2099-01-01T00:00:00Z", email: "a@b.co" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/broker_slug/i);
  });

  it("400s on malformed email", async () => {
    const res = await POST(makeRequest({ pricing_id: 1, broker_slug: "commsec", starts_at: "2099-01-01T00:00:00Z", email: "not-an-email" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it("400s on unparseable starts_at", async () => {
    const res = await POST(makeRequest({ pricing_id: 1, broker_slug: "commsec", starts_at: "yesterday please", email: "a@b.co" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/starts_at/i);
  });

  it("400s when starts_at is beyond the 6-month booking window", async () => {
    const tenYearsOut = new Date(Date.now() + 10 * 365 * 86_400_000).toISOString();
    const res = await POST(makeRequest({ pricing_id: 1, broker_slug: "commsec", starts_at: tenYearsOut, email: "a@b.co" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/6 months/i);
  });
});
