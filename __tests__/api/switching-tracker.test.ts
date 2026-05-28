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

function makeChain(data: unknown, error: unknown = null, count?: number) {
  const c = count ?? (Array.isArray(data) ? data.length : data ? 1 : 0);
  const terminal = { data, error, count: c };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of [
    "select", "eq", "neq", "gte", "lt", "lte", "in", "not", "or",
    "order", "limit", "insert", "update", "delete", "upsert",
  ]) {
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

// Import after mocks
import { GET, POST } from "@/app/api/switching-tracker/route";
import { DELETE } from "@/app/api/switching-tracker/[productId]/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(url = "http://localhost/api/switching-tracker"): NextRequest {
  return new NextRequest(url);
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/switching-tracker", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(productId: string, reason?: string): NextRequest {
  const url = `http://localhost/api/switching-tracker/${productId}${reason ? `?reason=${reason}` : ""}`;
  return new NextRequest(url, { method: "DELETE" });
}

const VALID_POST_BODY = {
  productKind: "broker",
  brokerName: "CommSec",
  startedAt: "2023-01-15",
  estimatedTradesPa: 12,
};

// ── GET /api/switching-tracker ────────────────────────────────────────────────

describe("GET /api/switching-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    mockFromServer.mockReturnValue(makeChain([]));
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 500 on DB fetch error", async () => {
    mockFromServer.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("returns 200 with empty products list", async () => {
    mockFromServer.mockReturnValue(makeChain([]));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { products: unknown[] };
    expect(json.products).toEqual([]);
  });

  it("returns 200 with broker product (no comparison data for simple product)", async () => {
    const product = {
      id: "prod-1",
      product_kind: "broker",
      broker_id: null,
      broker_name: "CommSec",
      started_at: "2023-01-15",
      fee_text: "$19.95/trade",
      estimated_trades_pa: null,
      estimated_balance_cents: null,
      status: "active",
      created_at: "2026-05-01T00:00:00Z",
    };
    // No trades_pa so no comparison computed
    mockFromServer.mockReturnValue(makeChain([product]));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { products: Array<{ comparison: null }> };
    expect(json.products).toHaveLength(1);
    expect(json.products[0]?.comparison).toBeNull();
  });

  it("enriches broker product with comparison when trades_pa is set", async () => {
    const product = {
      id: "prod-1",
      product_kind: "broker",
      broker_id: 7,
      broker_name: "CommSec",
      started_at: "2023-01-15",
      fee_text: null,
      estimated_trades_pa: 12,
      estimated_balance_cents: null,
      status: "active",
      created_at: "2026-05-01T00:00:00Z",
    };

    let callIndex = 0;
    mockFromServer.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // user_current_products list
        return makeChain([product]);
      }
      if (callIndex === 2) {
        // current broker asx_fee_value
        return {
          ...makeChain({ asx_fee_value: 19.95 }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { asx_fee_value: 19.95 }, error: null }),
        };
      }
      // best broker
      return {
        ...makeChain({ name: "SelfWealth", slug: "selfwealth", asx_fee_value: 9.50 }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { name: "SelfWealth", slug: "selfwealth", asx_fee_value: 9.50 },
          error: null,
        }),
      };
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      products: Array<{ comparison: { annualSavingLabel: string; bestBrokerName: string } | null }>;
    };
    expect(json.products[0]?.comparison).not.toBeNull();
    expect(json.products[0]?.comparison?.bestBrokerName).toBe("SelfWealth");
  });
});

// ── POST /api/switching-tracker ────────────────────────────────────────────────

describe("POST /api/switching-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    mockFromServer.mockReturnValue(makeChain([], null, 0));
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makePost({ productKind: "broker" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid productKind", async () => {
    const res = await POST(
      makePost({ ...VALID_POST_BODY, productKind: "invalid_kind" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid startedAt format", async () => {
    const res = await POST(
      makePost({ ...VALID_POST_BODY, startedAt: "15-01-2023" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 422 when user already has 20 products", async () => {
    let callIndex = 0;
    mockFromServer.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // Count query
        const chain = makeChain([], null, 20);
        chain["then"] = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(resolve({ data: [], error: null, count: 20 }));
        return chain;
      }
      return makeChain(null, null);
    });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(422);
  });

  it("returns 500 on insert error", async () => {
    let callIndex = 0;
    mockFromServer.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        const chain = makeChain([], null, 0);
        chain["then"] = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(resolve({ data: [], error: null, count: 0 }));
        return chain;
      }
      // Insert fails
      return makeChain(null, { message: "insert error" });
    });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 201 with id on success", async () => {
    let callIndex = 0;
    mockFromServer.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        const chain = makeChain([], null, 0);
        chain["then"] = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(resolve({ data: [], error: null, count: 0 }));
        return chain;
      }
      return {
        ...makeChain({ id: "new-prod-1" }),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "new-prod-1" }, error: null }),
      };
    });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(201);
    const json = (await res.json()) as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    expect(json.id).toBe("new-prod-1");
  });

  it("accepts all valid productKind values", async () => {
    const kinds = ["broker", "savings_account", "term_deposit", "super", "crypto"];
    for (const kind of kinds) {
      vi.clearAllMocks();
      mockIsAllowed.mockResolvedValue(true);
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

      let callIndex = 0;
      mockFromServer.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          const chain = makeChain([], null, 0);
          chain["then"] = (resolve: (v: unknown) => unknown) =>
            Promise.resolve(resolve({ data: [], error: null, count: 0 }));
          return chain;
        }
        return {
          ...makeChain({ id: `prod-${kind}` }),
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: `prod-${kind}` }, error: null }),
        };
      });

      const res = await POST(makePost({ ...VALID_POST_BODY, productKind: kind }));
      expect(res.status).toBe(201);
    }
  });
});

// ── DELETE /api/switching-tracker/[productId] ─────────────────────────────────

describe("DELETE /api/switching-tracker/[productId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await DELETE(makeDelete("prod-1"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    mockFromServer.mockReturnValue(makeChain(null));
    const res = await DELETE(makeDelete("prod-1"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 with ok:true on success (default reason=closed)", async () => {
    mockFromServer.mockReturnValue(makeChain(null, null));
    const res = await DELETE(makeDelete("prod-1"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("accepts reason=switched", async () => {
    mockFromServer.mockReturnValue(makeChain(null, null));
    const res = await DELETE(makeDelete("prod-1", "switched"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("falls back to closed for unknown reason", async () => {
    mockFromServer.mockReturnValue(makeChain(null, null));
    const res = await DELETE(makeDelete("prod-1", "invalid_reason"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    expect(res.status).toBe(200);
  });

  it("returns 500 on DB error", async () => {
    mockFromServer.mockReturnValue(makeChain(null, { message: "update failed" }));
    const res = await DELETE(makeDelete("prod-1"), {
      params: Promise.resolve({ productId: "prod-1" }),
    });
    expect(res.status).toBe(500);
  });
});
