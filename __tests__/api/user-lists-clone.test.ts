import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockIsRateLimited } = vi.hoisted(() => ({ mockIsRateLimited: vi.fn() }));
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/utils", () => ({
  slugify: vi.fn((s: string) => s.toLowerCase().replace(/\s+/g, "-")),
}));

// ── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/user-lists/[slug]/clone/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER = { id: "user-abc", email: "alice@example.com" };
const SLUG = "best-etfs-2026";

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/user-lists/${SLUG}/clone`, {
    method: "POST",
  });
}

/** Chain for .select().eq().single() (source list fetch) */
function makeSourceChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  return c;
}

/** Chain for .insert({}).select("id, slug").single() (new list create) */
function makeInsertListChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.insert = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

/** Chain for .select(...).eq() that resolves directly (items fetch) */
function makeItemsFetchChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  return c;
}

/** Chain for .insert([]) (items copy) */
function makeItemsInsertChain(result: { error: unknown }) {
  return { insert: vi.fn(() => Promise.resolve(result)) };
}

const SOURCE_LIST = {
  id: "src-list-1",
  title: "Best ETFs",
  description: "Top picks",
  is_public: true,
};
const NEW_LIST = { id: "new-list-1", slug: "copy-of-best-etfs-abc123" };
const ITEMS = [
  { item_type: "etf", item_ref: "vgs", label: "VGS", notes: null },
  { item_type: "etf", item_ref: "vdhg", label: "VDHG", notes: "diversified" },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/user-lists/[slug]/clone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
  });

  it("returns 404 when source list does not exist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSourceChain({ data: null }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(404);
  });

  it("returns 403 when source list is private", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSourceChain({ data: { ...SOURCE_LIST, is_public: false } }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "list_not_public" });
  });

  it("returns 500 when new list insert fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSourceChain({ data: SOURCE_LIST }))
      .mockReturnValueOnce(makeInsertListChain({ data: null, error: { message: "db error" } }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "clone_failed" });
  });

  it("returns 201 with new slug when clone succeeds with items", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSourceChain({ data: SOURCE_LIST }))
      .mockReturnValueOnce(makeInsertListChain({ data: NEW_LIST, error: null }))
      .mockReturnValueOnce(makeItemsFetchChain({ data: ITEMS }))
      .mockReturnValueOnce(makeItemsInsertChain({ error: null }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true, slug: NEW_LIST.slug });
  });

  it("returns 201 when source list has no items", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSourceChain({ data: SOURCE_LIST }))
      .mockReturnValueOnce(makeInsertListChain({ data: NEW_LIST, error: null }))
      .mockReturnValueOnce(makeItemsFetchChain({ data: [] }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true, slug: NEW_LIST.slug });
  });

  it("still returns 201 when item copy fails (non-fatal)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSourceChain({ data: SOURCE_LIST }))
      .mockReturnValueOnce(makeInsertListChain({ data: NEW_LIST, error: null }))
      .mockReturnValueOnce(makeItemsFetchChain({ data: ITEMS }))
      .mockReturnValueOnce(makeItemsInsertChain({ error: { message: "items insert failed" } }));
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("new list is created with owner_user_id of the authenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const insertChain = makeInsertListChain({ data: NEW_LIST, error: null });
    mockFrom
      .mockReturnValueOnce(makeSourceChain({ data: SOURCE_LIST }))
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(makeItemsFetchChain({ data: [] }));
    await POST(makeRequest());
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_user_id: USER.id, is_public: false }),
    );
  });

  it("new list title is truncated to 80 chars", async () => {
    const longTitle = "A".repeat(100);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const insertChain = makeInsertListChain({ data: NEW_LIST, error: null });
    mockFrom
      .mockReturnValueOnce(makeSourceChain({ data: { ...SOURCE_LIST, title: longTitle } }))
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(makeItemsFetchChain({ data: [] }));
    await POST(makeRequest());
    const call = insertChain.insert.mock.calls[0]?.[0] as { title: string };
    expect(call.title.length).toBeLessThanOrEqual(80);
  });
});
