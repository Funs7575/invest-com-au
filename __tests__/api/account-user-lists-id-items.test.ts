/**
 * Tests for GET/POST/DELETE /api/account/user-lists/[id]/items
 *
 * Auth: GET is accessible to list owner or when is_public=true (no user required).
 *       POST and DELETE require an authenticated user who owns the list.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(
  async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
    data: { user: { id: "u1", email: "u@e.com" } },
    error: null,
  }),
);

function makeBuilder(
  data: unknown = [],
  error: unknown = null,
): Record<string, unknown> {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt",
    "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "single", "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn((..._a: unknown[]) => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

import { GET, POST, DELETE } from "@/app/api/account/user-lists/[id]/items/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown, listId = "5"): NextRequest {
  return new NextRequest(
    `http://localhost/api/account/user-lists/${listId}/items`,
    {
      method,
      ...(body !== undefined
        ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
        : {}),
    },
  );
}

const validItem = {
  item_type: "broker",
  item_ref: "stake",
  label: "Stake",
  notes: "Good broker",
};

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/account/user-lists/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("returns 400 when listId is not a valid integer", async () => {
    const res = await GET(makeReq("GET", undefined, "abc"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_id");
  });

  it("returns 404 when list does not exist", async () => {
    // First from() call is user_lists single → null
    mockFrom.mockImplementationOnce(() => makeBuilder(null));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("not_found");
  });

  it("returns 403 when list is private and user is not owner", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "other-user" } }, error: null });
    // List exists but owned by u1, not public
    mockFrom.mockImplementationOnce(() =>
      makeBuilder({ id: 5, owner_user_id: "u1", is_public: false }),
    );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("forbidden");
  });

  it("returns 403 when unauthenticated user requests private list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom.mockImplementationOnce(() =>
      makeBuilder({ id: 5, owner_user_id: "u1", is_public: false }),
    );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(403);
  });

  it("returns items for the owner of a private list", async () => {
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ id: 5, owner_user_id: "u1", is_public: false }),
      )
      .mockImplementationOnce(() =>
        makeBuilder([{ id: 1, item_type: "broker", item_ref: "stake", label: "", notes: "", added_at: "2026-01-01" }]),
      );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json() as { items: unknown[] };
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items).toHaveLength(1);
  });

  it("returns items for a public list even when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ id: 5, owner_user_id: "u1", is_public: true }),
      )
      .mockImplementationOnce(() => makeBuilder([]));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = await res.json() as { items: unknown[] };
    expect(json.items).toEqual([]);
  });

  it("returns 500 when items query fails", async () => {
    mockFrom
      .mockImplementationOnce(() =>
        makeBuilder({ id: 5, owner_user_id: "u1", is_public: true }),
      )
      .mockImplementationOnce(() => makeBuilder(null, { message: "db error", code: "XXXXX" }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fetch_failed");
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/account/user-lists/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", validItem));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 400 when item_type is invalid", async () => {
    const res = await POST(makeReq("POST", { ...validItem, item_type: "unknown_type" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when item_ref is missing", async () => {
    const res = await POST(makeReq("POST", { item_type: "broker" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/account/user-lists/5/items", {
      method: "POST",
      body: "not-json{",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid listId", async () => {
    const res = await POST(makeReq("POST", validItem, "0"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_id");
  });

  it("returns 404 when user does not own the list", async () => {
    // ownership check returns null (not found for this user)
    mockFrom.mockImplementationOnce(() => makeBuilder(null));
    const res = await POST(makeReq("POST", validItem));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("not_found");
  });

  it("returns 409 on duplicate item (unique constraint violation)", async () => {
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ id: 5, owner_user_id: "u1" }))
      .mockImplementationOnce(() => makeBuilder(null, { code: "23505", message: "dup" }));
    const res = await POST(makeReq("POST", validItem));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("already_in_list");
  });

  it("returns 500 on other insert errors", async () => {
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ id: 5, owner_user_id: "u1" }))
      .mockImplementationOnce(() => makeBuilder(null, { code: "XXXXX", message: "db fail" }));
    const res = await POST(makeReq("POST", validItem));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("insert_failed");
  });

  it("returns 201 with item on success", async () => {
    const newItem = { id: 99, ...validItem, added_at: "2026-05-01T00:00:00Z" };
    mockFrom
      .mockImplementationOnce(() => makeBuilder({ id: 5, owner_user_id: "u1" }))
      .mockImplementationOnce(() => makeBuilder(newItem));
    const res = await POST(makeReq("POST", validItem));
    expect(res.status).toBe(201);
    const json = await res.json() as { item: typeof newItem };
    expect(json).toHaveProperty("item");
    expect(json.item.item_ref).toBe("stake");
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe("DELETE /api/account/user-lists/[id]/items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("DELETE", { item_type: "broker", item_ref: "stake" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 400 for invalid listId", async () => {
    const res = await DELETE(makeReq("DELETE", { item_type: "broker", item_ref: "stake" }, "nan"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_id");
  });

  it("returns 400 when item_type is missing", async () => {
    const res = await DELETE(makeReq("DELETE", { item_ref: "stake" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when item_ref is missing", async () => {
    const res = await DELETE(makeReq("DELETE", { item_type: "broker" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when delete query fails", async () => {
    mockFrom.mockImplementationOnce(() => makeBuilder(null, { message: "delete error" }));
    const res = await DELETE(makeReq("DELETE", { item_type: "broker", item_ref: "stake" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("delete_failed");
  });

  it("returns 200 ok on successful delete", async () => {
    mockFrom.mockImplementationOnce(() => makeBuilder(null, null));
    const res = await DELETE(makeReq("DELETE", { item_type: "broker", item_ref: "stake" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });
});
