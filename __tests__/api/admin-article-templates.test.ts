import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/admin/article-templates/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_GUARD = { ok: true, email: "admin@test.com", userId: "uid-1" } as const;
const DENY_GUARD = {
  ok: false,
  response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
} as const;

const TEMPLATES = [
  { id: 1, slug: "broker-review", display_order: 1, status: "active", name: "Broker Review" },
  { id: 2, slug: "how-to-guide", display_order: 2, status: "active", name: "How-To Guide" },
];

function setupFromMock(data: typeof TEMPLATES | null, error: { message: string } | null = null) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/article-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(ADMIN_GUARD);
    setupFromMock(TEMPLATES);
  });

  it("returns 401 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue(DENY_GUARD);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with items array on success", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.items[0].slug).toBe("broker-review");
  });

  it("returns empty items array when no templates exist", async () => {
    setupFromMock([]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
  });

  it("returns empty items array when DB returns null", async () => {
    setupFromMock(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    setupFromMock(null, { message: "connection refused" });
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/connection refused/);
  });

  it("queries article_templates table with status=active filter", async () => {
    await GET();
    expect(mockFrom).toHaveBeenCalledWith("article_templates");
  });
});
