import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

import { GET, POST, DELETE } from "@/app/api/account/watchlist/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/watchlist`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/account/watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  it("GET rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns items list for authenticated user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);
  });

  it("GET returns 500 on fetch error", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "db fail" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", { item_type: "stock", item_slug: "anz" }));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for invalid item_type", async () => {
    const res = await POST(makeReq("POST", { item_type: "bond", item_slug: "anz" }));
    expect(res.status).toBe(400);
  });

  it("POST adds item successfully", async () => {
    const mockItem = { id: 1, item_type: "stock", item_slug: "anz", display_name: null, added_at: "2024-01-01" };
    mockFrom.mockImplementation(() => makeBuilder({ data: mockItem, error: null }));
    const res = await POST(makeReq("POST", { item_type: "stock", item_slug: "anz" }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty("item");
  });

  it("POST returns 409 when item already in watchlist", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { code: "23505", message: "unique violation" } }));
    const res = await POST(makeReq("POST", { item_type: "stock", item_slug: "anz" }));
    expect(res.status).toBe(409);
  });

  it("DELETE rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 for missing id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("DELETE removes item successfully", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ error: null }));
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
