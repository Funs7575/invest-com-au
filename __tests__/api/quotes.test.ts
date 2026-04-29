import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: vi.fn(() => true),
  isDisposableEmail: vi.fn(() => false),
}));

vi.mock("@/lib/advisor-opt-ins", () => ({
  processAdvisorOptIns: vi.fn(() => Promise.resolve({ inserted: 1, results: [] })),
}));

vi.mock("@/lib/quote-emails", () => ({
  sendJobPostedConfirmation: vi.fn(() => Promise.resolve(true)),
  sendAdvisorNewPublicJobEmail: vi.fn(() => Promise.resolve(true)),
  sendConsumerBidReceivedEmail: vi.fn(() => Promise.resolve(true)),
  sendAdvisorBidAcceptedEmail: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// ── Mock admin DB ────────────────────────────────────────────────────────────

let mockAuction: Record<string, unknown> | null = null;
let mockBids: unknown[] = [];
let mockInsertResult: { data: unknown; error: unknown } = { data: { id: 1, slug: "test-slug" }, error: null };

const mockAdmin = {
  from(table: string) {
    if (table === "advisor_auctions") {
      return {
        select: () => ({
          eq: function () { return this; },
          gt: function () { return this; },
          order: function () { return this; },
          limit: function () { return this; },
          contains: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: mockAuction, error: null }),
          single: () => Promise.resolve({ data: mockAuction, error: null }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(mockInsertResult),
          }),
        }),
        update: () => ({
          eq: function () { return this; },
          neq: function () { return this; },
          then: (cb: (v: { data: null; error: null }) => void) => {
            cb({ data: null, error: null });
            return Promise.resolve();
          },
        }),
      };
    }
    if (table === "advisor_auction_bids") {
      return {
        select: () => ({
          in: function () { return this; },
          eq: function () { return this; },
          order: function () { return this; },
          limit: function () { return this; },
          neq: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: mockBids[0] ?? null, error: null }),
          then: (cb: (v: { data: unknown[]; error: null }) => void) => {
            cb({ data: mockBids, error: null });
            return Promise.resolve();
          },
        }),
        update: () => ({
          eq: function () { return this; },
          neq: function () { return this; },
          then: (cb: (v: { data: null; error: null }) => void) => {
            cb({ data: null, error: null });
            return Promise.resolve();
          },
        }),
      };
    }
    if (table === "professionals") {
      const proBuilder = {
        select: () => proBuilder,
        in: () => proBuilder,
        eq: () => proBuilder,
        not: () => proBuilder,
        limit: () => proBuilder,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (cb: (v: { data: unknown[]; error: null }) => void) => {
          cb({ data: [], error: null });
          return Promise.resolve();
        },
      };
      return proBuilder;
    }
    throw new Error(`Unexpected table: ${table}`);
  },
};

// ── Import routes after mocks ────────────────────────────────────────────────

import { POST } from "@/app/api/quotes/route";
import { GET as GET_DETAIL } from "@/app/api/quotes/[slug]/route";
import { POST as POST_ACCEPT } from "@/app/api/quotes/[slug]/accept/route";

// ── VALID body ────────────────────────────────────────────────────────────────

const VALID_POST_BODY = {
  job_title: "Need help with SMSF setup and strategy",
  job_description: "I have a $500k SMSF and need advice on investment strategy and compliance for the next financial year.",
  budget_band: "2k_5k",
  advisor_types: ["smsf_accountant", "financial_planner"],
  location_state: "NSW",
  contact_name: "Jane Test",
  contact_email: "jane@example.com",
};

// ── Tests: POST /api/quotes ──────────────────────────────────────────────────

describe("POST /api/quotes", () => {
  beforeEach(() => {
    mockInsertResult = { data: { id: 1, slug: "test-slug" }, error: null };
  });

  it("returns 200 and job data on valid body", async () => {
    const res = await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(typeof body.slug).toBe("string");
  });

  it("returns 400 if job_title is too short", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, job_title: "Short" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/8 characters/i);
  });

  it("returns 400 if job_description is too short", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, job_description: "Too short." }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/30 characters/i);
  });

  it("returns 400 for invalid budget_band", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, budget_band: "free" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid location_state", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, location_state: "ZZ" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid advisor_types", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, advisor_types: ["not_real"] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty advisor_types", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, advisor_types: [] }));
    expect(res.status).toBe(400);
  });

  it("silently succeeds for honeypot-filled requests", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, website: "http://spam.com" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.job_id).toBeNull();
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeRequest("/api/quotes", { ...VALID_POST_BODY, contact_email: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    const { isRateLimited } = await import("@/lib/rate-limit");
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const res = await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 500 when DB insert fails", async () => {
    mockInsertResult = { data: null, error: { message: "DB error" } };
    const res = await POST(makeRequest("/api/quotes", VALID_POST_BODY));
    expect(res.status).toBe(500);
  });
});

// ── Tests: GET /api/quotes/[slug] ────────────────────────────────────────────

describe("GET /api/quotes/[slug]", () => {
  function makeGetRequest(slug: string): NextRequest {
    return new NextRequest(`http://localhost/api/quotes/${slug}`, {
      method: "GET",
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
  }

  it("returns 404 when auction not found", async () => {
    mockAuction = null;
    const res = await GET_DETAIL(makeGetRequest("missing-slug"), {
      params: Promise.resolve({ slug: "missing-slug" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with job and bids when found", async () => {
    mockAuction = {
      id: 1, slug: "test-slug", job_title: "Test job",
      job_description: "A detailed description",
      budget_band: "2k_5k", advisor_types: ["financial_planner"],
      location: "NSW", status: "open", ends_at: new Date(Date.now() + 86400000).toISOString(),
      winning_bid_id: null, created_at: new Date().toISOString(), contact_name: "Jane",
    };
    mockBids = [];
    const res = await GET_DETAIL(makeGetRequest("test-slug"), {
      params: Promise.resolve({ slug: "test-slug" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.job.slug).toBe("test-slug");
    expect(Array.isArray(body.bids)).toBe(true);
  });

  it("returns 429 when rate limited", async () => {
    const { isRateLimited } = await import("@/lib/rate-limit");
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const res = await GET_DETAIL(makeGetRequest("any-slug"), {
      params: Promise.resolve({ slug: "any-slug" }),
    });
    expect(res.status).toBe(429);
  });
});

// ── Tests: POST /api/quotes/[slug]/accept ────────────────────────────────────

describe("POST /api/quotes/[slug]/accept", () => {
  function makeAcceptRequest(slug: string, body: Record<string, unknown>): NextRequest {
    return makeRequest(`/api/quotes/${slug}/accept`, body);
  }

  beforeEach(() => {
    mockAuction = {
      id: 1, slug: "test-slug", contact_email: "jane@example.com",
      contact_name: "Jane", status: "open",
    };
    mockBids = [{
      id: 42, advisor_id: 7, bid_amount: 25000, auction_id: 1, status: "active",
    }];
  });

  it("returns 400 for missing bid_id", async () => {
    const res = await POST_ACCEPT(
      makeAcceptRequest("test-slug", { contact_email: "jane@example.com" }),
      { params: Promise.resolve({ slug: "test-slug" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST_ACCEPT(
      makeAcceptRequest("test-slug", { bid_id: 42, contact_email: "notanemail" }),
      { params: Promise.resolve({ slug: "test-slug" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when email does not match auction owner", async () => {
    const res = await POST_ACCEPT(
      makeAcceptRequest("test-slug", { bid_id: 42, contact_email: "wrong@example.com" }),
      { params: Promise.resolve({ slug: "test-slug" }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when auction not found", async () => {
    mockAuction = null;
    const res = await POST_ACCEPT(
      makeAcceptRequest("ghost", { bid_id: 42, contact_email: "jane@example.com" }),
      { params: Promise.resolve({ slug: "ghost" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 200 and winning_bid_id on valid accept", async () => {
    const res = await POST_ACCEPT(
      makeAcceptRequest("test-slug", { bid_id: 42, contact_email: "jane@example.com" }),
      { params: Promise.resolve({ slug: "test-slug" }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.winning_bid_id).toBe(42);
  });

  it("returns 429 when rate limited", async () => {
    const { isRateLimited } = await import("@/lib/rate-limit");
    vi.mocked(isRateLimited).mockResolvedValueOnce(true);
    const res = await POST_ACCEPT(
      makeAcceptRequest("test-slug", { bid_id: 42, contact_email: "jane@example.com" }),
      { params: Promise.resolve({ slug: "test-slug" }) }
    );
    expect(res.status).toBe(429);
  });
});
