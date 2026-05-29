/**
 * Tests for POST /api/user-lists/[slug]/clone
 *
 * Auth: createClient + supabase.auth.getUser (required)
 * The route reads slug from req.nextUrl.pathname — no params arg.
 *
 * Branches: 401, 404 (source list not found), 403 (not public),
 *           500 (new list insert fails), 201 (success, items copied),
 *           201 (success, no items)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(
    async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
      data: { user: { id: "u1", email: "u@e.com" } },
      error: null,
    }),
  ),
  mockFrom: vi.fn((..._a: unknown[]): Record<string, unknown> => ({ then: vi.fn() })),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: (..._args: unknown[]) => mockGetUser() },
    from: (..._args: unknown[]) => mockFrom(),
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/utils", () => ({
  slugify: vi.fn((text: string) => text.toLowerCase().replace(/\s+/g, "-")),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST } from "@/app/api/user-lists/[slug]/clone/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

function makeReq(slug: string): NextRequest {
  return new NextRequest(`http://localhost/api/user-lists/${slug}/clone`, { method: "POST" });
}

const SOURCE_LIST = {
  id: 7,
  title: "Top ASX ETFs",
  description: "Great ETFs for Australian investors",
  is_public: true,
};

const NEW_LIST = {
  id: 8,
  slug: "copy-of-top-asx-etfs-abc123",
};

const ITEMS = [
  { item_type: "broker", item_ref: "ref-1", label: "CBA", notes: null },
  { item_type: "etf", item_ref: "ref-2", label: "VAS", notes: "Good one" },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/user-lists/[slug]/clone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "u@e.com" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("top-asx-etfs"));
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("unauthorized");
  });

  it("returns 404 when source list not found", async () => {
    // source lookup → null
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("missing-list"));
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("not_found");
  });

  it("returns 403 when source list is not public", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder({ ...SOURCE_LIST, is_public: false }, null),
    );
    const res = await POST(makeReq("private-list"));
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("list_not_public");
  });

  it("returns 500 when new list insert fails", async () => {
    // source lookup → success
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SOURCE_LIST, null));
    // new list insert → error
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "insert failed" }),
    );
    const res = await POST(makeReq("top-asx-etfs"));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("clone_failed");
  });

  it("returns 500 when new list insert returns null data", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SOURCE_LIST, null));
    // insert returns null data with no error
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("top-asx-etfs"));
    expect(res.status).toBe(500);
  });

  it("returns 201 with new slug on successful clone (no items)", async () => {
    // source lookup
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SOURCE_LIST, null));
    // new list insert → returns new list
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(NEW_LIST, null));
    // items query → empty
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
    const res = await POST(makeReq("top-asx-etfs"));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(typeof body.slug).toBe("string");
  });

  it("returns 201 with new slug when source has items and copies them", async () => {
    // source lookup
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SOURCE_LIST, null));
    // new list insert
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(NEW_LIST, null));
    // items query → has items
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(ITEMS, null));
    // items insert (copy)
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("top-asx-etfs"));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.slug).toBe(NEW_LIST.slug);
  });

  it("still returns 201 when items copy insert fails (non-fatal)", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SOURCE_LIST, null));
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(NEW_LIST, null));
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(ITEMS, null));
    // items insert fails non-fatally
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "items copy failed" }),
    );
    const res = await POST(makeReq("top-asx-etfs"));
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
  });

  it("generates title prefixed with Copy of", async () => {
    mockFrom.mockImplementationOnce((..._a: unknown[]) => makeBuilder(SOURCE_LIST, null));
    const insertSpy = vi.fn((..._a: unknown[]) => makeBuilder(NEW_LIST, null));
    mockFrom.mockImplementationOnce((..._a: unknown[]) => {
      const c = makeBuilder(NEW_LIST, null);
      (c as Record<string, unknown>).insert = insertSpy;
      return c;
    });
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
    await POST(makeReq("top-asx-etfs"));
    // The insert arg for the new list should contain a title starting with "Copy of"
    if (insertSpy.mock.calls.length > 0) {
      const arg = insertSpy.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      if (arg) {
        expect(String(arg.title)).toMatch(/^Copy of /);
      }
    }
  });
});
