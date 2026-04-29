import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/community/categories/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCategoriesBuilder(rows: unknown[] = [], error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: rows, error })),
  };
}

function makeCategory(overrides = {}) {
  return {
    id: Math.random(),
    slug: "investing",
    name: "Investing",
    description: "General investing",
    icon: "📈",
    color: "#2563eb",
    sort_order: 1,
    thread_count: 10,
    post_count: 42,
    last_thread_id: null,
    last_post_at: null,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/community/categories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty list when no categories", async () => {
    mockAdminFrom.mockReturnValue(makeCategoriesBuilder([]));
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.categories).toEqual([]);
  });

  it("returns list of active categories", async () => {
    const cats = [makeCategory({ slug: "investing" }), makeCategory({ slug: "super", sort_order: 2 })];
    mockAdminFrom.mockReturnValue(makeCategoriesBuilder(cats));
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.categories).toHaveLength(2);
    expect(data.categories[0].slug).toBe("investing");
  });

  it("filters by status=active", async () => {
    const builder = makeCategoriesBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET();
    expect(builder.eq).toHaveBeenCalledWith("status", "active");
  });

  it("orders by sort_order ascending", async () => {
    const builder = makeCategoriesBuilder([]);
    mockAdminFrom.mockReturnValue(builder);
    await GET();
    expect(builder.order).toHaveBeenCalledWith("sort_order", { ascending: true });
  });

  it("returns 500 on DB error", async () => {
    mockAdminFrom.mockReturnValue(makeCategoriesBuilder([], { message: "DB error" }));
    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
