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

const mockRecordFinancialAudit = vi.fn();
vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: (...a: unknown[]) => mockRecordFinancialAudit(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST, PATCH } from "@/app/api/admin/sponsored-placements/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const PLACEMENTS = [
  {
    id: 1,
    professional_id: 10,
    tier: "boost",
    active: true,
    daily_cap_cents: 5000,
  },
];

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/sponsored-placements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/sponsored-placements", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupGetMock(data: unknown[] = PLACEMENTS, error: { message: string } | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRecordFinancialAudit.mockResolvedValue(undefined);
});

// ── GET ────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/sponsored-placements", () => {
  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns placements list on success", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupGetMock();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rows).toEqual(PLACEMENTS);
  });

  it("returns 500 on DB error", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupGetMock([], { message: "relation does not exist" });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST ───────────────────────────────────────────────────────────────────────

describe("POST /api/admin/sponsored-placements", () => {
  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await POST(makePost({ professional_id: 1, tier: "boost" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when professional_id missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ tier: "boost" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when tier is invalid", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await POST(makePost({ professional_id: 1, tier: "mega" }));
    expect(res.status).toBe(400);
  });

  it("creates placement and updates professional is_sponsored", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);

    const insertChain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
    };
    const profUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({}),
    };
    const auditChain = { insert: vi.fn().mockResolvedValue({}) };
    const adminAuditChain = { insert: vi.fn().mockResolvedValue({}) };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return insertChain;
      if (callCount === 2) return profUpdateChain;
      if (callCount === 3) return auditChain; // recordFinancialAudit uses its own client
      return adminAuditChain;
    });

    const res = await POST(
      makePost({ professional_id: 10, tier: "premium", daily_cap_cents: 8000 }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.id).toBe(99);
    expect(profUpdateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_sponsored: true, sponsored_boost: 14 }),
    );
    expect(mockRecordFinancialAudit).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: "sponsored_placement" }),
    );
  });

  it("returns 500 on insert DB error", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
    };
    mockFrom.mockReturnValue(chain);
    const res = await POST(makePost({ professional_id: 1, tier: "top" }));
    expect(res.status).toBe(500);
  });
});

// ── PATCH ──────────────────────────────────────────────────────────────────────

describe("PATCH /api/admin/sponsored-placements", () => {
  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await PATCH(makePatch({ id: 1, active: false }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ active: true }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when active missing", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const res = await PATCH(makePatch({ id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when placement not found", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    mockFrom.mockReturnValue(chain);
    const res = await PATCH(makePatch({ id: 99, active: false }));
    expect(res.status).toBe(404);
  });

  it("deactivates placement and clears is_sponsored when no other active rows", async () => {
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);

    const lookupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { professional_id: 10 } }),
    };
    const updatePlacementChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({}),
    };
    const checkActiveChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }), // no other active rows
    };
    const updateProfChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({}),
    };
    const auditChain = { insert: vi.fn().mockResolvedValue({}) };
    const adminAuditChain = { insert: vi.fn().mockResolvedValue({}) };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return lookupChain;
      if (callCount === 2) return updatePlacementChain;
      if (callCount === 3) return checkActiveChain;
      if (callCount === 4) return updateProfChain;
      if (callCount === 5) return auditChain;
      return adminAuditChain;
    });

    const res = await PATCH(makePatch({ id: 1, active: false }));
    expect(res.status).toBe(200);
    expect(updateProfChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_sponsored: false }),
    );
  });
});
