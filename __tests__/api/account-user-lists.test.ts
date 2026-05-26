import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/utils", () => ({
  slugify: vi.fn((text: string) => text.toLowerCase().replace(/\s+/g, "-")),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/account/user-lists/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/user-lists", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeUpdateChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

const VALID_LIST = { title: "Best ETFs for beginners", description: "A curated list", is_public: false };

describe("GET /api/account/user-lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the user's lists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const lists = [{ id: 1, title: "My list", slug: "my-list-abc" }];
    mockFrom.mockReturnValueOnce(makeGetChain({ data: lists, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lists });
  });

  it("returns empty array when data is null", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeGetChain({ data: null, error: null }));
    const res = await GET();
    const body = await res.json() as { lists: unknown[] };
    expect(body.lists).toEqual([]);
  });
});

describe("POST /api/account/user-lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq("POST", VALID_LIST));
    expect(res.status).toBe(401);
  });

  it("creates a list and returns 201", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const created = { id: 1, slug: "best-etfs-for-beginners-abc123", ...VALID_LIST };
    mockFrom.mockReturnValueOnce(makeInsertChain({ data: created, error: null }));
    const res = await POST(makeReq("POST", VALID_LIST));
    expect(res.status).toBe(201);
    const body = await res.json() as { list: unknown };
    expect(body.list).toEqual(created);
  });

  it("returns 400 for empty title", async () => {
    const res = await POST(makeReq("POST", { ...VALID_LIST, title: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for title exceeding 80 characters", async () => {
    const res = await POST(makeReq("POST", { ...VALID_LIST, title: "a".repeat(81) }));
    expect(res.status).toBe(400);
  });

  it("defaults is_public to false when omitted", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const created = { id: 2, slug: "test-abc", title: "Test", description: "", is_public: false };
    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: created, error: null }),
      }),
    });
    mockFrom.mockReturnValueOnce({ insert: insertSpy });
    const res = await POST(makeReq("POST", { title: "Test" }));
    expect(res.status).toBe(201);
    const insertArg = insertSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(insertArg.is_public).toBe(false);
  });
});

describe("PATCH /api/account/user-lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { id: 1, is_public: true }));
    expect(res.status).toBe(401);
  });

  it("updates a list and returns 200", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const updated = { id: 1, title: "My list", is_public: true };
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: updated, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 1, is_public: true }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for missing id", async () => {
    const res = await PATCH(makeReq("PATCH", { is_public: true }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when row not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeUpdateChain({ data: null, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 99 }));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/account/user-lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("deletes a list and returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.delete = vi.fn(() => chain);
    chain.eq = vi.fn((field: string) => {
      if (field === "owner_user_id") return Promise.resolve({ error: null });
      return chain;
    });
    mockFrom.mockReturnValueOnce(chain);
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 400 for missing id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });
});
