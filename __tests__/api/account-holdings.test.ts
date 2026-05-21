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

import { GET, POST, PATCH, DELETE } from "@/app/api/account/holdings/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/holdings`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validHolding = {
  ticker: "VAS",
  exchange: "ASX",
  shares: 100,
  cost_basis_per_share_cents: 9500,
  acquired_at: "2024-01-15",
};

describe("/api/account/holdings", () => {
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

  it("GET returns items list", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("items");
    expect(Array.isArray(json.items)).toBe(true);
  });

  it("GET returns 500 on query error", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "db fail" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", validHolding));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for missing required field", async () => {
    const res = await POST(makeReq("POST", { ticker: "VAS" }));
    expect(res.status).toBe(400);
  });

  it("POST creates holding successfully", async () => {
    const mockItem = { id: 1, ...validHolding };
    mockFrom.mockImplementation(() => makeBuilder({ data: mockItem, error: null }));
    const res = await POST(makeReq("POST", validHolding));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty("item");
  });

  it("PATCH rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq("PATCH", { id: 1, shares: 200 }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 for missing id", async () => {
    const res = await PATCH(makeReq("PATCH", { shares: 200 }));
    expect(res.status).toBe(400);
  });

  it("PATCH updates holding successfully", async () => {
    const mockItem = { id: 1, ...validHolding, shares: 200 };
    mockFrom.mockImplementation(() => makeBuilder({ data: mockItem, error: null }));
    const res = await PATCH(makeReq("PATCH", { id: 1, shares: 200 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("item");
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

  it("DELETE removes holding successfully", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ error: null }));
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
