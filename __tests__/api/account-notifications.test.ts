import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/notifications", () => ({
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
  markRead: (...args: unknown[]) => mockMarkRead(...args),
  markAllRead: (...args: unknown[]) => mockMarkAllRead(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, PATCH } from "@/app/api/account/notifications/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/account/notifications");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, { method: "GET" });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Fluent chain that is thenable — mirrors the Supabase QueryBuilder contract.
function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "order", "limit"]) c[m] = vi.fn(() => c);
  c.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve(result);
    return Promise.resolve(result);
  });
  return c;
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/account/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Unauthorized" });
  });

  it("returns { unread } in count-only mode without querying the DB", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockGetUnreadCount.mockResolvedValueOnce(7);
    const res = await GET(makeGet({ count: "1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ unread: 7 });
    expect(mockGetUnreadCount).toHaveBeenCalledWith(USER.id);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns { unread, items } in full mode with correct shape", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockGetUnreadCount.mockResolvedValueOnce(3);
    const items = [
      { id: 1, type: "info", title: "Hi", body: "text", link_url: null, read_at: null, created_at: "2026-01-01T00:00:00Z" },
    ];
    mockAdminFrom.mockReturnValue(makeChain({ data: items, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unread).toBe(3);
    expect(body.items).toEqual(items);
  });

  it("returns empty array when query returns null data", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockGetUnreadCount.mockResolvedValueOnce(0);
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect((await res.json()).items).toEqual([]);
  });

  it("returns 500 when admin DB query errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "DB failure" } }));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed to load notifications" });
  });

  it("returns 500 when createAdminClient throws", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockAdminFrom.mockImplementation(() => { throw new Error("unexpected crash"); });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "internal" });
  });

  it("scopes the DB query to the authenticated user's id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockGetUnreadCount.mockResolvedValueOnce(0);
    const chain = makeChain({ data: [], error: null });
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeGet());
    expect(chain.eq).toHaveBeenCalledWith("user_id", USER.id);
  });
});

// ── PATCH tests ───────────────────────────────────────────────────────────────

describe("PATCH /api/account/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makePatch({ all: true }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Unauthorized" });
  });

  it("calls markAllRead and returns { ok: true } when all=true", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockMarkAllRead.mockResolvedValueOnce(undefined);
    const res = await PATCH(makePatch({ all: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockMarkAllRead).toHaveBeenCalledWith(USER.id);
  });

  it("calls markRead with correct args and returns { ok: true }", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockMarkRead.mockResolvedValueOnce(undefined);
    const res = await PATCH(makePatch({ id: 42 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockMarkRead).toHaveBeenCalledWith(USER.id, 42);
  });

  it("returns 400 when body has neither id nor all", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PATCH(makePatch({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing id or all" });
  });

  it("returns 400 when id is a string instead of number", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PATCH(makePatch({ id: "42" }));
    expect(res.status).toBe(400);
  });

  it("gracefully handles malformed JSON by treating body as empty object", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/account/notifications", {
      method: "PATCH",
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
