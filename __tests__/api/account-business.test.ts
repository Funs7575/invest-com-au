import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
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

import { GET, POST, PATCH } from "@/app/api/account/business/route";

function makeReq(method = "GET", body?: unknown): NextRequest {
  return new Request(`http://localhost/api/account/business`, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

const validBusinessBody = {
  business_name: "Acme Corp",
  legal_name: "Acme Corporation Pty Ltd",
  industry: "Finance",
  employees_band: "5-19",
  revenue_band: "75k_2m",
  primary_state: "NSW",
};

describe("/api/account/business", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
  });

  it("GET rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns null account when no business profile exists", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("account");
  });

  it("GET returns 500 when fetch fails", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "db error" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("POST rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("POST", validBusinessBody));
    expect(res.status).toBe(401);
  });

  it("POST returns 400 for missing business_name", async () => {
    const res = await POST(makeReq("POST", { legal_name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("POST creates business profile successfully", async () => {
    const mockAccount = { id: 1, auth_user_id: "u1", business_name: "Acme Corp", status: "pending" };
    mockFrom.mockImplementation(() => makeBuilder({ data: mockAccount, error: null }));
    const res = await POST(makeReq("POST", validBusinessBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty("account");
  });

  it("POST returns 500 when insert fails", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "unique violation" } }));
    const res = await POST(makeReq("POST", validBusinessBody));
    expect(res.status).toBe(500);
  });

  it("PATCH rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq("PATCH", { business_name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 for invalid field (business_name too long)", async () => {
    const res = await PATCH(makeReq("PATCH", { business_name: "x".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("PATCH updates business profile successfully", async () => {
    const mockAccount = { id: 1, auth_user_id: "u1", business_name: "New Name" };
    mockFrom.mockImplementation(() => makeBuilder({ data: mockAccount, error: null }));
    const res = await PATCH(makeReq("PATCH", { business_name: "New Name" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("account");
  });
});
