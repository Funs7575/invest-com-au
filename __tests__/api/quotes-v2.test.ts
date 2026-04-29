import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeRequest } from "@/__tests__/helpers";
import { NextRequest } from "next/server";
import { createHmac } from "crypto";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

// ── Mock admin DB ────────────────────────────────────────────────────────────

let mockAuction: Record<string, unknown> | null = null;
let mockBid: Record<string, unknown> | null = null;
let mockAdvisor: Record<string, unknown> | null = null;
let mockQA: unknown[] = [];
let qaInsertResult: { data: { id: number } | null; error: { code?: string; message: string } | null } = {
  data: { id: 99 }, error: null,
};
let reviewInsertResult: { data: null; error: { code?: string; message: string } | null } = {
  data: null, error: null,
};
let auctionUpdateError: { message: string } | null = null;

const mockAdmin = {
  from(table: string) {
    if (table === "advisor_auctions") {
      return {
        select: () => ({
          eq: function () { return this; },
          neq: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: mockAuction, error: null }),
          single: () => Promise.resolve({ data: mockAuction, error: null }),
        }),
        update: () => ({
          eq: function () { return this; },
          then: (cb: (v: { data: null; error: unknown }) => void) => {
            cb({ data: null, error: auctionUpdateError });
            return Promise.resolve();
          },
        }),
      };
    }
    if (table === "advisor_auction_bids") {
      return {
        select: () => ({
          eq: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: mockBid, error: null }),
        }),
      };
    }
    if (table === "professionals") {
      return {
        select: () => ({
          eq: function () { return this; },
          maybeSingle: () => Promise.resolve({ data: mockAdvisor, error: null }),
        }),
      };
    }
    if (table === "quote_qa") {
      return {
        select: () => ({
          eq: function () { return this; },
          order: function () { return this; },
          then: (cb: (v: { data: unknown[]; error: null }) => void) => {
            cb({ data: mockQA, error: null });
            return Promise.resolve();
          },
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve(qaInsertResult),
          }),
        }),
      };
    }
    if (table === "quote_reviews") {
      return {
        insert: () => Promise.resolve(reviewInsertResult),
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  },
};

// ── Imports ─────────────────────────────────────────────────────────────────

import { POST as REOPEN } from "@/app/api/quotes/[slug]/reopen/route";
import { POST as QA_POST, GET as QA_GET } from "@/app/api/quotes/[slug]/qa/route";
import { POST as REVIEW } from "@/app/api/quotes/[slug]/review/route";

// ── Test fixtures ───────────────────────────────────────────────────────────

const SLUG = "test-slug";
const OWNER_EMAIL = "owner@example.com";

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret-1234567890";
  mockAuction = {
    id: 1, slug: SLUG, status: "expired", contact_email: OWNER_EMAIL, contact_name: "Owner",
    job_title: "Need help", winning_bid_id: null, reopened_count: 0,
  };
  mockBid = { advisor_id: 7 };
  mockAdvisor = { id: 7, name: "Jane Advisor" };
  mockQA = [];
  qaInsertResult = { data: { id: 99 }, error: null };
  reviewInsertResult = { data: null, error: null };
  auctionUpdateError = null;
});

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

// ── Reopen ──────────────────────────────────────────────────────────────────

describe("POST /api/quotes/[slug]/reopen", () => {
  it("returns 200 on valid reopen", async () => {
    const res = await REOPEN(makeRequest(`/api/quotes/${SLUG}/reopen`, { contact_email: OWNER_EMAIL }), ctx(SLUG));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reopened_count).toBe(1);
  });

  it("returns 403 when email mismatches", async () => {
    const res = await REOPEN(makeRequest(`/api/quotes/${SLUG}/reopen`, { contact_email: "other@example.com" }), ctx(SLUG));
    expect(res.status).toBe(403);
  });

  it("returns 404 when auction missing", async () => {
    mockAuction = null;
    const res = await REOPEN(makeRequest(`/api/quotes/${SLUG}/reopen`, { contact_email: OWNER_EMAIL }), ctx(SLUG));
    expect(res.status).toBe(404);
  });

  it("blocks reopen on awarded job", async () => {
    mockAuction = { ...mockAuction!, winning_bid_id: 42 };
    const res = await REOPEN(makeRequest(`/api/quotes/${SLUG}/reopen`, { contact_email: OWNER_EMAIL }), ctx(SLUG));
    expect(res.status).toBe(400);
  });

  it("blocks reopen at limit", async () => {
    mockAuction = { ...mockAuction!, reopened_count: 2 };
    const res = await REOPEN(makeRequest(`/api/quotes/${SLUG}/reopen`, { contact_email: OWNER_EMAIL }), ctx(SLUG));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid email", async () => {
    const res = await REOPEN(makeRequest(`/api/quotes/${SLUG}/reopen`, { contact_email: "notanemail" }), ctx(SLUG));
    expect(res.status).toBe(400);
  });
});

// ── Q&A ─────────────────────────────────────────────────────────────────────

describe("/api/quotes/[slug]/qa", () => {
  it("GET returns 200 with empty array", async () => {
    const req = new NextRequest(`http://localhost/api/quotes/${SLUG}/qa`);
    const res = await QA_GET(req, ctx(SLUG));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.qa)).toBe(true);
  });

  it("GET 404 when auction missing", async () => {
    mockAuction = null;
    const req = new NextRequest(`http://localhost/api/quotes/${SLUG}/qa`);
    const res = await QA_GET(req, ctx(SLUG));
    expect(res.status).toBe(404);
  });

  it("POST 401 when no auth and no email", async () => {
    const res = await QA_POST(makeRequest(`/api/quotes/${SLUG}/qa`, { body: "Hello there friend" }), ctx(SLUG));
    expect(res.status).toBe(401);
  });

  it("POST 200 when owner email matches", async () => {
    const res = await QA_POST(
      makeRequest(`/api/quotes/${SLUG}/qa`, {
        body: "Owner answer here.", contact_email: OWNER_EMAIL, display_name: "Jane",
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(200);
  });

  it("POST 400 on too-short body", async () => {
    const res = await QA_POST(
      makeRequest(`/api/quotes/${SLUG}/qa`, { body: "hi", contact_email: OWNER_EMAIL }),
      ctx(SLUG),
    );
    expect(res.status).toBe(400);
  });
});

// ── Review ──────────────────────────────────────────────────────────────────

function makeToken(auctionId: number, email: string): string {
  return createHmac("sha256", process.env.CRON_SECRET!)
    .update(`${auctionId}|${email.toLowerCase()}`)
    .digest("hex").slice(0, 32);
}

describe("POST /api/quotes/[slug]/review", () => {
  beforeEach(() => {
    mockAuction = { ...mockAuction!, winning_bid_id: 42 };
  });

  it("returns 200 with valid token + email + rating", async () => {
    const token = makeToken(1, OWNER_EMAIL);
    const res = await REVIEW(
      makeRequest(`/api/quotes/${SLUG}/review`, {
        token, reviewer_email: OWNER_EMAIL, rating: 5, body: "Great work",
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(200);
  });

  it("returns 403 with mismatched token", async () => {
    const res = await REVIEW(
      makeRequest(`/api/quotes/${SLUG}/review`, {
        token: "00000000000000000000000000000000",
        reviewer_email: OWNER_EMAIL, rating: 5,
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 with mismatched email", async () => {
    const token = makeToken(1, "different@example.com");
    const res = await REVIEW(
      makeRequest(`/api/quotes/${SLUG}/review`, {
        token, reviewer_email: "different@example.com", rating: 5,
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when no winning bid", async () => {
    mockAuction = { ...mockAuction!, winning_bid_id: null };
    const token = makeToken(1, OWNER_EMAIL);
    const res = await REVIEW(
      makeRequest(`/api/quotes/${SLUG}/review`, {
        token, reviewer_email: OWNER_EMAIL, rating: 5,
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when rating out of range", async () => {
    const token = makeToken(1, OWNER_EMAIL);
    const res = await REVIEW(
      makeRequest(`/api/quotes/${SLUG}/review`, {
        token, reviewer_email: OWNER_EMAIL, rating: 6,
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate review", async () => {
    reviewInsertResult = { data: null, error: { code: "23505", message: "dup" } };
    const token = makeToken(1, OWNER_EMAIL);
    const res = await REVIEW(
      makeRequest(`/api/quotes/${SLUG}/review`, {
        token, reviewer_email: OWNER_EMAIL, rating: 4,
      }),
      ctx(SLUG),
    );
    expect(res.status).toBe(409);
  });
});
