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
  for (const m of [
    "select","insert","update","upsert","delete","eq","neq","gt","gte",
    "lt","lte","in","is","not","or","order","limit","range","single",
    "maybeSingle","filter","contains",
  ]) {
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

import { GET, POST, DELETE } from "@/app/api/account/net-worth/balances/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request("http://localhost/api/account/net-worth/balances", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validBalance = {
  label: "ING Savings",
  amount_cents: 2500000,
  category: "savings",
};

describe("/api/account/net-worth/balances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "user@example.com" } },
      error: null,
    });
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  // ─── GET ────────────────────────────────────────────────────────────────────

  it("GET returns 401 for unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns empty items list", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json() as { items: unknown[] };
    expect(Array.isArray(json.items)).toBe(true);
  });

  it("GET returns 500 on query error", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "db error" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  // ─── POST ───────────────────────────────────────────────────────────────────

  it("POST returns 401 for unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", validBalance));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for missing label", async () => {
    const res = await POST(makeReq("POST", { amount_cents: 100, category: "savings" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for invalid category", async () => {
    const res = await POST(makeReq("POST", { ...validBalance, category: "bitcoin" }));
    expect(res.status).toBe(400);
  });

  it("POST returns 400 for negative amount", async () => {
    const res = await POST(makeReq("POST", { ...validBalance, amount_cents: -1 }));
    expect(res.status).toBe(400);
  });

  it("POST creates balance successfully", async () => {
    const item = { id: "some-uuid", ...validBalance, updated_at: new Date().toISOString() };
    mockFrom.mockImplementation(() => makeBuilder({ data: item, error: null }));
    const res = await POST(makeReq("POST", validBalance));
    expect(res.status).toBe(201);
    const json = await res.json() as { item: unknown };
    expect(json).toHaveProperty("item");
  });

  it("POST returns 500 on insert error", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "insert failed" } }));
    const res = await POST(makeReq("POST", validBalance));
    expect(res.status).toBe(500);
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────────

  it("DELETE returns 401 for unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("DELETE", { id: "11111111-1111-4111-8111-111111111111" }));
    expect(res.status).toBe(401);
  });

  it("DELETE returns 400 for missing id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("DELETE returns 400 for non-UUID id", async () => {
    const res = await DELETE(makeReq("DELETE", { id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("DELETE removes balance successfully", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await DELETE(makeReq("DELETE", { id: "11111111-1111-4111-8111-111111111111" }));
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("DELETE returns 500 on db error", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "delete failed" } }));
    const res = await DELETE(makeReq("DELETE", { id: "11111111-1111-4111-8111-111111111111" }));
    expect(res.status).toBe(500);
  });
});
