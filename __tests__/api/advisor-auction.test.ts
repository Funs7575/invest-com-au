import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

// Idea #11 — the GET route now consults the auction_rounds flag to decide
// whether to run the (additive) sealed-bid lookup. Default it OFF so these
// existing tests see byte-identical behaviour (the lookup is fully skipped).
const mockIsFlagEnabled = vi.fn().mockResolvedValue(false);
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));

import { POST, GET } from "@/app/api/advisor-auction/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const INTERNAL_SECRET = "test-internal-secret";

beforeEach(() => {
  process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;
  // Default authenticated user so GET /advisor-auction passes the auth
  // gate at app/api/advisor-auction/route.ts:108. Tests that need to
  // exercise the unauthenticated path override with mockGetUser.mockResolvedValueOnce.
  mockGetUser.mockResolvedValue({ data: { user: { id: "test-user-1" } } });
  // Default the auction_rounds flag OFF; the one sealed test opts in.
  mockIsFlagEnabled.mockReset();
  mockIsFlagEnabled.mockResolvedValue(false);
});

function makePost(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auction", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function makeGet(advisorId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auction?advisor_id=${advisorId}`
  );
}

function makeSelectChain(results: Array<{ data?: unknown; error?: unknown }>) {
  let callCount = 0;
  return {
    select: vi.fn(function (this: unknown) { return this; }),
    eq: vi.fn(function (this: unknown) { return this; }),
    in: vi.fn(function (this: unknown) { return this; }),
    gt: vi.fn(function (this: unknown) { return this; }),
    order: vi.fn(function (this: unknown) { return this; }),
    limit: vi.fn(function (this: unknown) { return this; }),
    maybeSingle: vi.fn(() => {
      const r = results[callCount] ?? { data: null, error: null };
      callCount++;
      return Promise.resolve(r);
    }),
    single: vi.fn(() => {
      const r = results[callCount] ?? { data: null, error: null };
      callCount++;
      return Promise.resolve(r);
    }),
    insert: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        const r = results[callCount] ?? { data: null, error: null };
        callCount++;
        return Promise.resolve(r);
      }),
    })),
  };
}

// ── POST (createAuction) ───────────────────────────────────────────────────────

describe("POST /api/advisor-auction (createAuction)", () => {
  it("returns 403 when x-internal-secret is missing", async () => {
    const res = await POST(makePost({ lead_id: "lead-1", lead_type: "financial-advisor" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when x-internal-secret is wrong", async () => {
    const res = await POST(
      makePost(
        { lead_id: "lead-1", lead_type: "financial-advisor" },
        { "x-internal-secret": "wrong-secret" }
      )
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when lead_id is missing", async () => {
    const res = await POST(
      makePost({ lead_type: "financial-advisor" }, { "x-internal-secret": INTERNAL_SECRET })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when lead_type is missing", async () => {
    const res = await POST(
      makePost({ lead_id: "lead-1" }, { "x-internal-secret": INTERNAL_SECRET })
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when auction already exists for the lead", async () => {
    const chain = makeSelectChain([{ data: { id: "existing-auction" }, error: null }]);
    mockAdminFrom.mockReturnValue(chain);

    const res = await POST(
      makePost(
        { lead_id: "lead-1", lead_type: "financial-advisor" },
        { "x-internal-secret": INTERNAL_SECRET }
      )
    );
    expect(res.status).toBe(409);
  });

  it("creates auction and returns id + ends_at on success", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // maybeSingle → no existing auction
        return makeSelectChain([{ data: null, error: null }]);
      }
      // insert → new auction
      return {
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "new-auction-id", ends_at: "2026-04-28T01:46:09Z" },
            error: null,
          }),
        })),
      };
    });

    const res = await POST(
      makePost(
        { lead_id: "lead-1", lead_type: "financial-advisor", location: "Sydney" },
        { "x-internal-secret": INTERNAL_SECRET }
      )
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("new-auction-id");
    expect(json.status).toBe("open");
    expect(json.ends_at).toBeDefined();
  });

  it("returns 500 when DB insert fails", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeSelectChain([{ data: null, error: null }]);
      return {
        insert: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "insert failed" },
          }),
        })),
      };
    });

    const res = await POST(
      makePost(
        { lead_id: "lead-1", lead_type: "financial-advisor" },
        { "x-internal-secret": INTERNAL_SECRET }
      )
    );
    expect(res.status).toBe(500);
  });
});

// ── GET (getAuctions) ──────────────────────────────────────────────────────────

describe("GET /api/advisor-auction (getAuctions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: "advisor@test.com" } } });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet("99"));
    expect(res.status).toBe(401);
  });

  // NB: there is intentionally no "advisor_id is required" test — the handler
  // resolves the advisor from the authenticated session and ignores any
  // client-supplied ?advisor_id= (that param was an IDOR; see route comment).

  it("returns 404 when advisor profile not found", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain([{ data: null, error: null }]));
    const res = await GET(makeGet("99"));
    expect(res.status).toBe(404);
  });

  it("returns active and won auction lists on success", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // advisor lookup
        return makeSelectChain([
          { data: { id: 99, type: "financial-advisor", location_state: "NSW", location_suburb: "Sydney" }, error: null },
        ]);
      }
      if (callCount === 2) {
        // open auctions
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.gt = vi.fn(() => c);
        c.order = vi.fn(() => Promise.resolve({
          data: [
            { id: 1, lead_type: "financial-advisor", location: "Sydney", budget_range: "100k+", status: "open", ends_at: "2099-01-01T00:00:00Z", created_at: "2026-04-28T00:00:00Z" },
          ],
          error: null,
        }));
        return c;
      }
      if (callCount === 3) {
        // bids for auction 1
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.order = vi.fn(() => c);
        c.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
        return c;
      }
      // won bids
      // Won bids: route does `.select().eq().eq()` then awaits the chain.
      // Both eq() calls must return the chain; the chain awaits to the
      // final result. We use a `then` that resolves to {data:[], error:null}.
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.then = (resolve: (v: unknown) => void) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      };
      return c;
    });

    const res = await GET(makeGet("99"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("active");
    expect(json).toHaveProperty("won");
    expect(Array.isArray(json.active)).toBe(true);
    expect(Array.isArray(json.won)).toBe(true);
    // Regression guard: advisor resolved from `professionals`, not `advisors`.
    expect(mockAdminFrom).toHaveBeenCalledWith("professionals");
    expect(mockAdminFrom).not.toHaveBeenCalledWith("advisors");
  });

  it("idea #11 — hides the competing high bid on a SEALED open auction (flag on)", async () => {
    mockIsFlagEnabled.mockResolvedValue(true);
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // advisor lookup
        return makeSelectChain([
          { data: { id: 99, type: "financial-advisor", location_state: "NSW", location_suburb: "Sydney" }, error: null },
        ]);
      }
      if (callCount === 2) {
        // open auctions — one auction id 1
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.gt = vi.fn(() => c);
        c.order = vi.fn(() => Promise.resolve({
          data: [{ id: 1, lead_type: null, location: "Sydney", budget_range: null, status: "open", ends_at: "2099-01-01T00:00:00Z", created_at: "2026-04-28T00:00:00Z" }],
          error: null,
        }));
        return c;
      }
      if (callCount === 3) {
        // sealed-set lookup → auction 1 is sealed. select().in().eq().eq() awaited.
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.in = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.then = (resolve: (v: unknown) => void) => {
          resolve({ data: [{ id: 1, bid_visibility: "sealed" }], error: null });
          return Promise.resolve({ data: [{ id: 1, bid_visibility: "sealed" }], error: null });
        };
        return c;
      }
      if (callCount === 4) {
        // bids for auction 1 — a competing high bid exists.
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.order = vi.fn(() => c);
        c.limit = vi.fn(() => Promise.resolve({ data: [{ id: 7, bid_amount: 99999, advisor_id: 42 }], error: null }));
        return c;
      }
      // won bids
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.then = (resolve: (v: unknown) => void) => { resolve({ data: [], error: null }); return Promise.resolve({ data: [], error: null }); };
      return c;
    });

    const res = await GET(makeGet("99"));
    expect(res.status).toBe(200);
    const json = await res.json();
    const auction = json.active[0];
    expect(auction.sealed).toBe(true);
    // The competing high bid is hidden; only the count is exposed.
    expect(auction.high_bid_cents).toBeNull();
    expect(auction.bid_count).toBe(1);
    expect(auction.is_leading).toBe(false);
  });

  it("enriches active auctions with bid_count and my_bid_cents", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectChain([
          { data: { id: 99, type: "financial-advisor", location_state: "NSW", location_suburb: "Sydney" }, error: null },
        ]);
      }
      if (callCount === 2) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.gt = vi.fn(() => c);
        c.order = vi.fn(() => Promise.resolve({
          data: [
            { id: 7, lead_type: "financial-advisor", location: "Sydney", budget_range: null, status: "open", ends_at: "2099-01-01T00:00:00Z", created_at: "2026-04-28T00:00:00Z" },
          ],
          error: null,
        }));
        return c;
      }
      if (callCount === 3) {
        const c: Record<string, unknown> = {};
        c.select = vi.fn(() => c);
        c.eq = vi.fn(() => c);
        c.order = vi.fn(() => c);
        c.limit = vi.fn(() => Promise.resolve({
          data: [
            { id: "bid-1", bid_amount: 10000, advisor_id: 99 },
            { id: "bid-2", bid_amount: 7500, advisor_id: 55 },
          ],
          error: null,
        }));
        return c;
      }
      // Won bids: route does `.select().eq().eq()` then awaits the chain.
      // Both eq() calls must return the chain; the chain awaits to the
      // final result. We use a `then` that resolves to {data:[], error:null}.
      const c: Record<string, unknown> = {};
      c.select = vi.fn(() => c);
      c.eq = vi.fn(() => c);
      c.then = (resolve: (v: unknown) => void) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      };
      return c;
    });

    const res = await GET(makeGet("99"));
    const json = await res.json();
    const auction = json.active[0];
    expect(auction.bid_count).toBe(2);
    expect(auction.high_bid_cents).toBe(10000);
    expect(auction.my_bid_cents).toBe(10000);
    expect(auction.is_leading).toBe(true);
  });
});
