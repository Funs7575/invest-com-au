import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockListAllTmds = vi.fn();
const mockUpsertTmd = vi.fn();
vi.mock("@/lib/tmds", () => ({
  listAllTmds: () => mockListAllTmds(),
  upsertTmd: (...a: unknown[]) => mockUpsertTmd(...a),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST } from "@/app/api/admin/tmds/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true as const, email: "admin@test.com", userId: "uid-1" };
const DENY_GUARD = {
  ok: false as const,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
};

const TMD_LIST = [
  {
    id: 1,
    product_type: "broker",
    product_ref: "commsec",
    product_name: "CommSec",
    tmd_url: "https://commsec.com/tmd",
    tmd_version: "v1",
    valid_from: null,
    valid_until: null,
  },
];

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/tmds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/admin/tmds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with items list", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListAllTmds.mockResolvedValue(TMD_LIST);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].product_ref).toBe("commsec");
  });

  it("returns 200 with empty items when none exist", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListAllTmds.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/admin/tmds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ product_type: "broker" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when product_type is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(
      makePost({ product_ref: "commsec", product_name: "CommSec", tmd_url: "https://x.com/tmd", tmd_version: "v1" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing/i);
  });

  it("returns 400 when tmd_url is missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(
      makePost({ product_type: "broker", product_ref: "commsec", product_name: "CommSec", tmd_version: "v1" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful upsert and writes audit log", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 5 });
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    const res = await POST(
      makePost({
        product_type: "broker",
        product_ref: "commsec",
        product_name: "CommSec",
        tmd_url: "https://commsec.com/tmd",
        tmd_version: "v2",
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(5);
    expect(mockFrom).toHaveBeenCalledWith("admin_audit_log");
  });

  it("upsertTmd receives optional fields when provided", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 6 });
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    await POST(
      makePost({
        product_type: "advisor",
        product_ref: "adviser-123",
        product_name: "Test Adviser",
        tmd_url: "https://example.com/tmd",
        tmd_version: "v1",
        reviewed_at: "2026-04-01",
        valid_from: "2026-01-01",
        valid_until: "2027-01-01",
      })
    );
    expect(mockUpsertTmd).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewedAt: "2026-04-01",
        validFrom: "2026-01-01",
        validUntil: "2027-01-01",
      })
    );
  });

  it("upsertTmd receives null for omitted optional fields", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 7 });
    mockFrom.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    await POST(
      makePost({
        product_type: "fund",
        product_ref: "vas",
        product_name: "Vanguard ASX",
        tmd_url: "https://vanguard.com.au/tmd",
        tmd_version: "v1",
      })
    );
    expect(mockUpsertTmd).toHaveBeenCalledWith(
      expect.objectContaining({ reviewedAt: null, validFrom: null, validUntil: null })
    );
  });

  it("returns 400 when upsertTmd returns ok=false", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: false, error: "invalid_product_type" });
    const res = await POST(
      makePost({
        product_type: "unknown_type",
        product_ref: "ref",
        product_name: "Name",
        tmd_url: "https://example.com/tmd",
        tmd_version: "v1",
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_product_type");
  });

  it("audit log includes product_type, product_ref, tmd_version", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 8 });
    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: auditInsertMock });
    await POST(
      makePost({
        product_type: "broker",
        product_ref: "westpac",
        product_name: "Westpac",
        tmd_url: "https://westpac.com/tmd",
        tmd_version: "v3",
      })
    );
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tmd:upserted",
        details: expect.objectContaining({
          product_type: "broker",
          product_ref: "westpac",
          tmd_version: "v3",
        }),
      })
    );
  });
});
