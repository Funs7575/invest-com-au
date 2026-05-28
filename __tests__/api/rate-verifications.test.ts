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

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
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

const mockFrom = vi.fn();
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { POST, GET } from "@/app/api/rate-verifications/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_POST_BODY = {
  brokerId: 5,
  productKind: "savings",
  verifiedRateBps: 475,
  comment: "Got this after calling their customer service.",
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/rate-verifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGet(params = "brokerId=5&productKind=savings"): NextRequest {
  return new NextRequest(`http://localhost/api/rate-verifications?${params}`);
}

function setupPostMocks(opts: {
  existingVerification?: boolean;
  insertError?: boolean;
} = {}) {
  let callIndex = 0;
  mockFrom.mockImplementation(() => {
    callIndex++;
    switch (callIndex) {
      case 1: // duplicate check
        return makeChain(opts.existingVerification ? [{ id: "existing" }] : []);
      case 2: // insert
        return makeChain(null, opts.insertError ? { message: "insert failed" } : null);
      case 3: // broker name
        return makeChain({ name: "CommBank Saver" });
      case 4: // best rate
        return makeChain({ rate_bps: 510, brokers: { name: "ING" } });
      default:
        return makeChain(null);
    }
  });
}

// ── POST Tests ─────────────────────────────────────────────────────────────────

describe("POST /api/rate-verifications", () => {
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
    const res = await POST(makePost({ productKind: "savings", verifiedRateBps: 475 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when verifiedRateBps is out of range", async () => {
    const res = await POST(makePost({ ...VALID_POST_BODY, verifiedRateBps: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when productKind is invalid", async () => {
    const res = await POST(makePost({ ...VALID_POST_BODY, productKind: "crypto" }));
    expect(res.status).toBe(400);
  });

  it("returns 409 when duplicate verification within 24h", async () => {
    setupPostMocks({ existingVerification: true });
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

  it("returns 200 when best rate not found (no comparison email data)", async () => {
    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return makeChain([]);
      if (callIndex === 2) return makeChain(null);
      if (callIndex === 3) return makeChain({ name: "Test Bank" });
      return makeChain(null); // no best rate
    });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(200);
  });
});

// ── GET Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/rate-verifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockFrom.mockReturnValue(
      makeChain([
        { verified_rate_bps: 475, term_months: null, created_at: "2026-05-20T00:00:00Z" },
        { verified_rate_bps: 490, term_months: null, created_at: "2026-05-19T00:00:00Z" },
      ]),
    );
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 400 when brokerId is missing", async () => {
    const res = await GET(makeGet("productKind=savings"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when productKind is invalid", async () => {
    const res = await GET(makeGet("brokerId=5&productKind=crypto"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with aggregate stats", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("count");
    expect(json).toHaveProperty("avgRateBps");
    expect(json).toHaveProperty("recent");
    expect(json.count).toBe(2);
    expect(json.avgRateBps).toBe(483); // Math.round((475 + 490) / 2) = 483
  });

  it("returns count 0 and avgRateBps null when no verifications", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.count).toBe(0);
    expect(json.avgRateBps).toBeNull();
  });
});
