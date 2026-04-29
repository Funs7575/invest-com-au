import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockListActiveSectors = vi.fn();
const mockUpsertSector = vi.fn();
const mockUpsertStock = vi.fn();
const mockUpsertEtf = vi.fn();
vi.mock("@/lib/commodities", () => ({
  listActiveSectors: () => mockListActiveSectors(),
  upsertSector: (...a: unknown[]) => mockUpsertSector(...a),
  upsertStock: (...a: unknown[]) => mockUpsertStock(...a),
  upsertEtf: (...a: unknown[]) => mockUpsertEtf(...a),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, PUT } from "@/app/api/admin/commodity-hubs/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY_GUARD = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

function makeRequest(method: "POST" | "PUT", body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/commodity-hubs", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_SECTOR = {
  slug: "gold",
  display_name: "Gold",
  hero_description: "The gold investment sector",
};

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/commodity-hubs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns sector list", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListActiveSectors.mockResolvedValue([{ id: 1, slug: "gold" }, { id: 2, slug: "silver" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].slug).toBe("gold");
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/commodity-hubs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makeRequest("POST", VALID_SECTOR));
    expect(res.status).toBe(401);
  });

  it("returns 400 when slug is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makeRequest("POST", { display_name: "Gold", hero_description: "desc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when hero_description is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makeRequest("POST", { slug: "gold", display_name: "Gold" }));
    expect(res.status).toBe(400);
  });

  it("creates sector and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertSector.mockResolvedValue({ ok: true, id: 5 });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    const res = await POST(makeRequest("POST", VALID_SECTOR));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(5);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "commodity_sector:upserted", entity_name: "Gold" })
    );
  });

  it("returns 400 when upsertSector returns ok=false", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertSector.mockResolvedValue({ ok: false, error: "slug_conflict" });
    const res = await POST(makeRequest("POST", VALID_SECTOR));
    expect(res.status).toBe(400);
  });
});

// ── PUT ───────────────────────────────────────────────────────────────────────

describe("PUT /api/admin/commodity-hubs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PUT(makeRequest("PUT", { kind: "stock", ticker: "GLD" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for unknown kind", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PUT(makeRequest("PUT", { kind: "crypto" }));
    expect(res.status).toBe(400);
  });

  it("stock: calls upsertStock and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertStock.mockResolvedValue({ ok: true });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    const res = await PUT(
      makeRequest("PUT", {
        kind: "stock",
        ticker: "NCM",
        company_name: "Newcrest Mining",
        sector_slug: "gold",
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsertStock).toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "commodity_stock:upserted", entity_name: "NCM" })
    );
  });

  it("stock: returns 400 when upsertStock fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertStock.mockResolvedValue({ ok: false, error: "invalid_ticker" });
    const res = await PUT(makeRequest("PUT", { kind: "stock", ticker: "X", company_name: "X", sector_slug: "gold" }));
    expect(res.status).toBe(400);
  });

  it("etf: calls upsertEtf and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertEtf.mockResolvedValue({ ok: true });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsert });
    const res = await PUT(
      makeRequest("PUT", {
        kind: "etf",
        ticker: "GOLD",
        name: "ETFS Metal Securities",
        sector_slug: "gold",
      })
    );
    expect(res.status).toBe(200);
    expect(mockUpsertEtf).toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "commodity_etf:upserted", entity_name: "GOLD" })
    );
  });

  it("etf: returns 400 when upsertEtf fails", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertEtf.mockResolvedValue({ ok: false, error: "sector_not_found" });
    const res = await PUT(makeRequest("PUT", { kind: "etf", ticker: "GOLD", name: "Gold ETF", sector_slug: "gold" }));
    expect(res.status).toBe(400);
  });
});
