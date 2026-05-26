import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "127.0.0.1",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

function makeChain(data: unknown, error: unknown = null) {
  const terminal = { data, error };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of ["select", "eq", "neq", "gte", "lt", "not", "order", "limit", "insert"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["maybeSingle"] = vi.fn(async () => terminal);
  chain["single"] = vi.fn(async () => terminal);
  return chain;
}

const mockFromServer = vi.fn();
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromServer,
  })),
}));

const mockFromAdmin = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFromAdmin,
  })),
}));

import { POST, GET } from "@/app/api/broker-reliability/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_POST_BODY = {
  brokerId: 7,
  eventType: "platform_outage",
  description: "Couldn't log in for 2 hours on Monday.",
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/broker-reliability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(params = "brokerId=7"): NextRequest {
  return new NextRequest(`http://localhost/api/broker-reliability?${params}`);
}

function setupPostMocks(opts: {
  existingReport?: boolean;
  insertError?: boolean;
} = {}) {
  let callIndex = 0;
  mockFromServer.mockImplementation(() => {
    callIndex++;
    switch (callIndex) {
      case 1: // dedup check
        return makeChain(opts.existingReport ? [{ id: "dup" }] : []);
      case 2: // insert
        return makeChain(null, opts.insertError ? { message: "db error" } : null);
      default:
        return makeChain(null);
    }
  });
}

// ── POST Tests ─────────────────────────────────────────────────────────────────

describe("POST /api/broker-reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@test.com" } },
      error: null,
    });
    setupPostMocks();
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 when brokerId is missing", async () => {
    const res = await POST(makePost({ eventType: "platform_outage" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when eventType is invalid", async () => {
    const res = await POST(makePost({ ...VALID_POST_BODY, eventType: "scam_report" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description exceeds 500 chars", async () => {
    const res = await POST(makePost({ ...VALID_POST_BODY, description: "x".repeat(501) }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when the same event was already reported within 24h", async () => {
    setupPostMocks({ existingReport: true });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(409);
  });

  it("returns 500 when insert fails", async () => {
    setupPostMocks({ insertError: true });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 200 on success", async () => {
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("accepts a positive_experience report without description", async () => {
    const res = await POST(makePost({ brokerId: 7, eventType: "positive_experience" }));
    expect(res.status).toBe(200);
  });

  it("accepts all valid event types", async () => {
    const eventTypes = [
      "platform_outage",
      "hidden_fees",
      "withdrawal_delay",
      "poor_support",
      "positive_experience",
    ];
    for (const eventType of eventTypes) {
      vi.clearAllMocks();
      mockIsAllowed.mockResolvedValue(true);
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      });
      setupPostMocks();
      const res = await POST(makePost({ brokerId: 7, eventType }));
      expect(res.status).toBe(200);
    }
  });
});

// ── GET Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/broker-reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    // Default: two verified reports — one outage, one positive — from two different users
    mockFromAdmin.mockReturnValue(
      makeChain([
        { event_type: "platform_outage", user_id: "user-1" },
        { event_type: "positive_experience", user_id: "user-2" },
      ]),
    );
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 400 when brokerId is missing", async () => {
    const res = await GET(makeGet(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 when brokerId is not a number", async () => {
    const res = await GET(makeGet("brokerId=abc"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with score, label, components, and totalReports", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("brokerId", 7);
    expect(json).toHaveProperty("score");
    expect(json).toHaveProperty("label");
    expect(json).toHaveProperty("totalReports");
    expect(json.components).toHaveProperty("uptime");
    expect(json.components).toHaveProperty("feeTransparency");
    expect(json.components).toHaveProperty("withdrawal");
    expect(json.components).toHaveProperty("support");
    expect(json.components).toHaveProperty("sentiment");
  });

  it("returns totalReports 0 and neutral score when no reports", async () => {
    mockFromAdmin.mockReturnValue(makeChain([]));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalReports).toBe(0);
    // No reports → neutral defaults
    expect(json.score).toBe(80);
  });

  it("returns 500 when admin DB query fails", async () => {
    mockFromAdmin.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("deduplicates reporters by user_id for totalReporters calculation", async () => {
    // Same user submitted two different report types
    mockFromAdmin.mockReturnValue(
      makeChain([
        { event_type: "platform_outage", user_id: "user-1" },
        { event_type: "hidden_fees", user_id: "user-1" },
      ]),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    // totalReporters=1, totalReports=2
    // uptime: 100 - (1/1)*200 → clamped to 0
    // hiddenFees: 100 - (1/1)*200 → 0
    // withdrawal, support: 100
    // sentiment(0, 2) = 50
    // score = 0*0.25 + 0*0.25 + 100*0.25 + 100*0.15 + 50*0.1 = 0 + 0 + 25 + 15 + 5 = 45
    const json = await res.json();
    expect(json.totalReports).toBe(2);
    expect(json.score).toBe(45);
  });
});
