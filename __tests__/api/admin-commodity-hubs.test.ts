import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockListActiveSectors = vi.fn();
const mockUpsertSector = vi.fn();
const mockUpsertStock = vi.fn();
const mockUpsertEtf = vi.fn();
vi.mock("@/lib/commodities", () => ({
  listActiveSectors: () => mockListActiveSectors(),
  upsertSector: (input: unknown) => mockUpsertSector(input),
  upsertStock: (input: unknown) => mockUpsertStock(input),
  upsertEtf: (input: unknown) => mockUpsertEtf(input),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}
const mockFrom = vi.fn(() => makeBuilder());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: vi.fn(() => makeBuilder()),
  })),
}));

import { GET, POST, PUT } from "@/app/api/admin/commodity-hubs/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/commodity-hubs", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/commodity-hubs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      ok: true,
      email: "admin@invest.com.au",
      userId: "u1",
    });
    mockListActiveSectors.mockResolvedValue([]);
    mockUpsertSector.mockResolvedValue({ ok: true, id: 1 });
    mockUpsertStock.mockResolvedValue({ ok: true });
    mockUpsertEtf.mockResolvedValue({ ok: true });
  });

  // GET
  it("GET denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns items when admin", async () => {
    mockListActiveSectors.mockResolvedValue([{ slug: "gold" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
  });

  // POST
  it("POST denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await POST(makeReq("POST", { slug: "gold", display_name: "Gold", hero_description: "Gold hub" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 when missing required fields", async () => {
    const res = await POST(makeReq("POST", { slug: "gold" }));
    expect(res.status).toBe(400);
  });

  it("POST creates sector when valid", async () => {
    const res = await POST(
      makeReq("POST", {
        slug: "gold",
        display_name: "Gold",
        hero_description: "Gold hub",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // PUT
  it("PUT denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await PUT(makeReq("PUT", { kind: "stock" }));
    expect(res.status).toBe(401);
  });

  it("PUT returns 400 when kind is invalid", async () => {
    const res = await PUT(makeReq("PUT", { kind: "unknown" }));
    expect(res.status).toBe(400);
  });

  it("PUT upserts stock when kind=stock", async () => {
    const res = await PUT(
      makeReq("PUT", {
        kind: "stock",
        sector_slug: "gold",
        ticker: "GLD",
        company_name: "Gold Corp",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("PUT upserts etf when kind=etf", async () => {
    const res = await PUT(
      makeReq("PUT", {
        kind: "etf",
        sector_slug: "gold",
        ticker: "GOLD",
        name: "Gold ETF",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
