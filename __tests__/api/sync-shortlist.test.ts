import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));

const mockIsRateLimited = vi.fn(async () => false);
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args) }));

// Mock server supabase client (user-session client)
const mockGetUser = vi.fn();
const mockFromFn = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromFn,
  })),
}));

import { GET, POST } from "@/app/api/sync-shortlist/route";

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "delete", "update", "eq", "order"]) { c[m] = vi.fn(() => c); }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/sync-shortlist", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
});

describe("GET /api/sync-shortlist", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns slugs array for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: [{ broker_slug: "abc", added_at: "2026-01-01" }], error: null }));
    const res = await GET();
    const body = await res.json();
    expect(body.slugs).toEqual(["abc"]);
  });

  it("returns 500 when DB query errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/sync-shortlist", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq("POST", { slugs: ["abc"] }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("POST", { slugs: [] }));
    expect(res.status).toBe(429);
  });

  it("clears and inserts new shortlist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    let call = 0;
    mockFromFn.mockImplementation(() => {
      call++;
      return makeChain({ data: null, error: null }); // delete, then insert
    });
    const res = await POST(makeReq("POST", { slugs: ["abc", "xyz"] }));
    const body = await res.json();
    expect(body.slugs).toEqual(["abc", "xyz"]);
  });

  it("returns 500 when delete errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: null, error: { message: "delete failed" } }));
    const res = await POST(makeReq("POST", { slugs: ["abc"] }));
    expect(res.status).toBe(500);
  });

  it("caps slugs at MAX_SHORTLIST (8)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: null, error: null }));
    const tooMany = ["a","b","c","d","e","f","g","h","i","j"]; // 10
    const res = await POST(makeReq("POST", { slugs: tooMany }));
    const body = await res.json();
    expect(body.slugs).toHaveLength(8);
  });
});
