import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockListAllTmds = vi.fn();
const mockUpsertTmd = vi.fn();
vi.mock("@/lib/tmds", () => ({
  listAllTmds: () => mockListAllTmds(),
  upsertTmd: (...args: unknown[]) => mockUpsertTmd(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/admin/tmds/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const TMDS = [
  {
    id: 1,
    product_type: "broker",
    product_ref: "commsec",
    product_name: "CommSec",
    tmd_url: "https://commsec.com.au/tmd.pdf",
    tmd_version: "v2.1",
    reviewed_at: null,
    valid_from: null,
    valid_until: null,
  },
];

const VALID_POST_BODY = {
  product_type: "broker",
  product_ref: "commsec",
  product_name: "CommSec",
  tmd_url: "https://commsec.com.au/tmd.pdf",
  tmd_version: "v2.1",
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/tmds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupAuditMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "admin_audit_log") {
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    }
    return {};
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/tmds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with all TMDs", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListAllTmds.mockResolvedValue(TMDS);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].product_ref).toBe("commsec");
  });

  it("returns 200 with empty items when no TMDs exist", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockListAllTmds.mockResolvedValue([]);
    const res = await GET();
    const body = await res.json();
    expect(body.items).toEqual([]);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/tmds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ product_type: "broker" })); // missing others
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required/i);
  });

  it("returns 200 with id on successful upsert", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 42 });
    setupAuditMock();
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(42);
  });

  it("passes optional reviewed_at / valid_from / valid_until to upsertTmd", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 1 });
    setupAuditMock();
    await POST(
      makePost({
        ...VALID_POST_BODY,
        reviewed_at: "2026-01-01",
        valid_from: "2026-01-01",
        valid_until: "2027-01-01",
      })
    );
    expect(mockUpsertTmd).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewedAt: "2026-01-01",
        validFrom: "2026-01-01",
        validUntil: "2027-01-01",
      })
    );
  });

  it("returns 400 when upsertTmd returns ok:false", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: false, error: "duplicate_tmd_version" });
    const res = await POST(makePost(VALID_POST_BODY));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("duplicate_tmd_version");
  });

  it("writes audit log on success with entity_id as string", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    mockUpsertTmd.mockResolvedValue({ ok: true, id: 99 });
    const auditInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "admin_audit_log") return { insert: auditInsert };
      return {};
    });
    await POST(makePost(VALID_POST_BODY));
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "tmd:upserted",
        entity_type: "tmd",
        entity_id: "99",
        admin_email: "admin@test.com",
      })
    );
  });
});
