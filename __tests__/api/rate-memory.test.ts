import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsRateLimited, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockGetUser: vi.fn<
    () => Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }>
  >(async () => ({ data: { user: { id: "u1", email: "u@e.com" } }, error: null })),
  mockFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

/**
 * withValidatedBody — real Zod validation pass-through for testing all schema paths.
 */
vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (
    schema: {
      safeParse: (
        v: unknown,
      ) => { success: boolean; data?: unknown; error?: { issues: Array<{ message: string }> } };
    },
    handler: (req: NextRequest, body: unknown) => unknown,
  ) =>
    async (req: NextRequest) => {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = schema.safeParse(rawBody);
      if (!parsed.success) {
        const { NextResponse } = await import("next/server");
        const firstMsg = parsed.error?.issues[0]?.message ?? "Validation error";
        return NextResponse.json(
          { error: firstMsg, code: "validation_error", issues: parsed.error?.issues ?? [] },
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

const VALID_BODY = {
  brokerId: 1,
  productKind: "savings_account" as const,
  currentRateBps: 475,
};

function makePostReq(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/rate-memory", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

// ── Route under test (imported after all mocks) ───────────────────────────────
import { POST } from "@/app/api/rate-memory/route";

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/rate-memory
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/rate-memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    // Default: no existing record (maybeSingle returns null), upsert succeeds
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null }); // SELECT existing
      return makeChain({ data: null, error: null }); // UPSERT
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePostReq(VALID_BODY));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("passes the correct rate-limit key with IP", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    await POST(makePostReq(VALID_BODY, "9.9.9.9"));
    expect(mockIsRateLimited).toHaveBeenCalledWith("rate_memory:9.9.9.9", 30, 60);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makePostReq(VALID_BODY));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthenticated/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/rate-memory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when brokerId is missing", async () => {
    const res = await POST(makePostReq({ productKind: "savings_account", currentRateBps: 400 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
  });

  it("returns 400 when brokerId is not a positive integer", async () => {
    const res = await POST(makePostReq({ brokerId: -1, productKind: "savings_account", currentRateBps: 400 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when productKind is invalid", async () => {
    const res = await POST(makePostReq({ brokerId: 1, productKind: "mortgage", currentRateBps: 400 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when currentRateBps is negative", async () => {
    const res = await POST(makePostReq({ brokerId: 1, productKind: "savings_account", currentRateBps: -1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when currentRateBps exceeds max (99999)", async () => {
    const res = await POST(makePostReq({ brokerId: 1, productKind: "savings_account", currentRateBps: 100000 }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with previousRateBps=null when no prior record exists", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null }); // no existing record
      return makeChain({ data: null, error: null }); // upsert
    });
    const res = await POST(makePostReq(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.previousRateBps).toBeNull();
    expect(body.currentRateBps).toBe(475);
  });

  it("returns 200 with previousRateBps from existing record", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: { last_seen_rate_bps: 450 }, error: null }); // existing record
      return makeChain({ data: null, error: null }); // upsert
    });
    const res = await POST(makePostReq(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.previousRateBps).toBe(450);
    expect(body.currentRateBps).toBe(475);
  });

  it("accepts 'term_deposit' as a valid productKind", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq({ brokerId: 2, productKind: "term_deposit", currentRateBps: 500 }));
    expect(res.status).toBe(200);
  });

  it("accepts 'savings_account' as a valid productKind", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq({ brokerId: 3, productKind: "savings_account", currentRateBps: 0 }));
    expect(res.status).toBe(200);
  });

  it("queries existing record scoped to correct user_id, broker_id, product_kind", async () => {
    const chain1 = makeChain({ data: null, error: null });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return chain1;
      return makeChain({ data: null, error: null });
    });
    await POST(makePostReq({ brokerId: 5, productKind: "savings_account", currentRateBps: 300 }));
    const eqFn = chain1.eq as ReturnType<typeof vi.fn>;
    expect(eqFn).toHaveBeenCalledWith("user_id", "u1");
    expect(eqFn).toHaveBeenCalledWith("broker_id", 5);
    expect(eqFn).toHaveBeenCalledWith("product_kind", "savings_account");
  });

  it("returns 400 when brokerId is a float (non-integer)", async () => {
    const res = await POST(makePostReq({ brokerId: 1.5, productKind: "savings_account", currentRateBps: 400 }));
    expect(res.status).toBe(400);
  });

  it("accepts currentRateBps=0 (boundary min)", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq({ brokerId: 1, productKind: "savings_account", currentRateBps: 0 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentRateBps).toBe(0);
  });

  it("accepts currentRateBps=99999 (boundary max)", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeChain({ data: null, error: null });
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq({ brokerId: 1, productKind: "savings_account", currentRateBps: 99999 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentRateBps).toBe(99999);
  });
});
