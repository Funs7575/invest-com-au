import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  chain.catch = () => chain;
  return chain;
}

/**
 * The route reads type/ref from the URL pathname directly, not from route params.
 * We must build a real URL so req.nextUrl.pathname is correct.
 */
function makeReq(type: string, ref: string): NextRequest {
  return new NextRequest(`http://localhost/api/verified-count/${type}/${ref}`, {
    method: "GET",
  });
}

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET } from "@/app/api/verified-count/[type]/[ref]/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/verified-count/[type]/[ref]
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/verified-count/[type]/[ref]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
  });

  it("returns 400 for an invalid type", async () => {
    const res = await GET(makeReq("invalid-type", "some-ref"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_params");
  });

  it("returns 400 for empty ref", async () => {
    // We can't pass empty string in URL path — simulate with a space-only ref
    // that decodes to empty-ish. Use a direct pathname query instead.
    const req = new NextRequest("http://localhost/api/verified-count/broker/", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_params");
  });

  it("returns 400 for unknown type 'stock'", async () => {
    const res = await GET(makeReq("stock", "CBA"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET(makeReq("broker", "commsec"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 with verified_count=0 when no row found (maybeSingle null)", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq("broker", "commsec"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified_count).toBe(0);
    expect(body.product_type).toBe("broker");
    expect(body.product_ref).toBe("commsec");
  });

  it("returns 200 with verified_count from DB row", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 42 }, error: null }));
    const res = await GET(makeReq("etf", "vgs"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified_count).toBe(42);
    expect(body.product_type).toBe("etf");
    expect(body.product_ref).toBe("vgs");
  });

  it("returns Cache-Control header with correct values", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 5 }, error: null }));
    const res = await GET(makeReq("advisor", "jane-smith"));
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=300");
  });

  it("accepts 'broker' as a valid type", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 1 }, error: null }));
    const res = await GET(makeReq("broker", "nabtrade"));
    expect(res.status).toBe(200);
  });

  it("accepts 'etf' as a valid type", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 2 }, error: null }));
    const res = await GET(makeReq("etf", "iwld"));
    expect(res.status).toBe(200);
  });

  it("accepts 'advisor' as a valid type", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 10 }, error: null }));
    const res = await GET(makeReq("advisor", "john-doe"));
    expect(res.status).toBe(200);
  });

  it("accepts 'property' as a valid type", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 3 }, error: null }));
    const res = await GET(makeReq("property", "prop-123"));
    expect(res.status).toBe(200);
  });

  it("URL-decodes the ref correctly", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { verified_count: 7 }, error: null }));
    const res = await GET(makeReq("broker", "some%20broker"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.product_ref).toBe("some broker");
  });

  it("queries the DB with correct product_type and product_ref filters", async () => {
    const chain = makeChain({ data: { verified_count: 5 }, error: null });
    mockFrom.mockReturnValue(chain);
    await GET(makeReq("broker", "pearler"));
    const eqFn = chain.eq as ReturnType<typeof vi.fn>;
    expect(eqFn).toHaveBeenCalledWith("product_type", "broker");
    expect(eqFn).toHaveBeenCalledWith("product_ref", "pearler");
  });
});
