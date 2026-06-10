/**
 * Tests for POST + DELETE /api/clubs/[clubId]/watchlist
 *
 * Auth: Supabase server client (auth.getUser)
 * POST (withValidatedBody, ctx-forwarded):
 *   429, 400 (bad body), 401, 403 (not_member), 409 (duplicate), 500 (db error), 200
 * DELETE:
 *   429, 401, 400 (missing itemId), 403 (not_member),
 *   404 (item not found), 403 (not owner + not adder), 500 (db error), 200
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>().mockResolvedValue({
    data: { user: { id: "user-1" } },
  }),
  mockFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => mockIsAllowed(),
  ipKey: () => "ip:test",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom }),
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────
// Uses the real withValidatedBody, which forwards the Next.js route context
// ({ params }) to the handler as its 3rd arg — so the tests call POST(req, ctx).

import { POST, DELETE } from "@/app/api/clubs/[clubId]/watchlist/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

const CLUB_ID = "club-wl";
const PARAMS = { params: Promise.resolve({ clubId: CLUB_ID }) };

function makePost(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/clubs/${CLUB_ID}/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeDelete(itemId?: string): NextRequest {
  const url = new URL(`http://localhost/api/clubs/${CLUB_ID}/watchlist`);
  if (itemId) url.searchParams.set("itemId", itemId);
  return new NextRequest(url.toString(), { method: "DELETE" });
}

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/clubs/[clubId]/watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ brokerId: 1 }), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/clubs/${CLUB_ID}/watchlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 400 when brokerId is missing from body", async () => {
    const res = await POST(makePost({ notes: "hello" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ brokerId: 5 }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a club member", async () => {
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await POST(makePost({ brokerId: 5 }), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json() as Record<string, unknown>).error).toBe("not_member");
  });

  it("returns 409 when broker is already on watchlist (unique constraint)", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1" }); // membership
      return makeBuilder(null, { code: "23505", message: "duplicate" }); // insert
    });
    const res = await POST(makePost({ brokerId: 5 }), PARAMS);
    expect(res.status).toBe(409);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/already on watchlist/i);
  });

  it("returns 500 when insert fails with non-duplicate error", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1" });
      return makeBuilder(null, { code: "500", message: "db error" });
    });
    const res = await POST(makePost({ brokerId: 5 }), PARAMS);
    expect(res.status).toBe(500);
  });

  it("returns 200 on successful watchlist add", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1" });
      return makeBuilder(null); // insert success (no error)
    });
    const res = await POST(makePost({ brokerId: 5, notes: "Good broker" }), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json() as Record<string, unknown>).ok).toBe(true);
  });
});

// ── DELETE tests ──────────────────────────────────────────────────────────────

describe("DELETE /api/clubs/[clubId]/watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 400 when itemId query param is missing", async () => {
    const res = await DELETE(makeDelete(), PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/itemId is required/i);
  });

  it("returns 403 when user is not a club member", async () => {
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json() as Record<string, unknown>).error).toBe("not_member");
  });

  it("returns 404 when item is not found", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1", role: "member" }); // membership
      return makeBuilder(null); // item not found
    });
    const res = await DELETE(makeDelete("missing-item"), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-owner tries to remove another member's item", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1", role: "member" });
      // item was added by different member
      return makeBuilder({ id: "item-1", added_by_member_id: "mem-other" });
    });
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json() as Record<string, unknown>).error).toBe("forbidden");
  });

  it("returns 200 when owner removes another member's item", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1", role: "owner" });
      if (call === 2) return makeBuilder({ id: "item-1", added_by_member_id: "mem-other" });
      return makeBuilder(null); // delete succeeds
    });
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json() as Record<string, unknown>).ok).toBe(true);
  });

  it("returns 200 when member removes their own item", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1", role: "member" });
      if (call === 2) return makeBuilder({ id: "item-1", added_by_member_id: "mem-1" });
      return makeBuilder(null); // delete
    });
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(200);
  });

  it("returns 500 when delete query fails", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1", role: "owner" });
      if (call === 2) return makeBuilder({ id: "item-1", added_by_member_id: "mem-other" });
      return makeBuilder(null, { message: "db error" });
    });
    const res = await DELETE(makeDelete("item-1"), PARAMS);
    expect(res.status).toBe(500);
  });
});
