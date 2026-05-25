import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({
  data: { user: { id: "user-uuid-1", email: "user@example.com" } },
  error: null,
}));

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select","insert","update","upsert","delete","eq","neq","gt","gte",
    "lt","lte","in","is","not","or","order","limit","range","single",
    "maybeSingle","filter","contains","lte",
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

// Mock crypto.randomUUID so tests have deterministic tokens
const { mockRandomUUID } = vi.hoisted(() => ({ mockRandomUUID: vi.fn(() => "test-token-uuid-1234") }));
vi.stubGlobal("crypto", { randomUUID: mockRandomUUID });

import { POST } from "@/app/api/account/holdings/handoff/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/account/holdings/handoff", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : { body: JSON.stringify({}), headers: { "content-type": "application/json" } }),
  }) as unknown as NextRequest;
}

describe("POST /api/account/holdings/handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-uuid-1", email: "user@example.com" } },
      error: null,
    });
    // holdings fetch returns empty list; insert succeeds
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  it("returns 401 for unauthenticated requests", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 201 with token on success", async () => {
    // First call is holdings select (returns empty array), second is insert (returns null row)
    mockFrom.mockImplementationOnce(() => makeBuilder({ data: [], error: null }));
    mockFrom.mockImplementationOnce(() => makeBuilder({ data: null, error: null }));

    const res = await POST(makeReq({ intent: "tax-prep" }));
    expect(res.status).toBe(201);
    const json = await res.json() as { token: string };
    expect(json).toHaveProperty("token");
    expect(typeof json.token).toBe("string");
  });

  it("defaults intent to tax-prep when not provided", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
    const res = await POST(makeReq({}));
    expect(res.status).toBe(201);
  });

  it("returns 500 when holdings fetch fails", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: { message: "db error" } }));
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 500 when insert fails", async () => {
    mockFrom.mockImplementationOnce(() => makeBuilder({ data: [], error: null }));
    mockFrom.mockImplementationOnce(() => makeBuilder({ data: null, error: { message: "insert error" } }));
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid intent value (too long)", async () => {
    const res = await POST(makeReq({ intent: "x".repeat(101) }));
    expect(res.status).toBe(400);
  });
});
