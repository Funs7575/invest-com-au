import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockIsAllowed } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

// Server client only does the auth check + the user-scoped GET list query.
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

// Admin client builds the snapshot (4 parallel reads) + inserts the token.
const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { GET, POST } from "@/app/api/account/profile-share/route";

const USER = { id: "user-1", email: "user@example.com" };

function makeReq(method = "POST"): NextRequest {
  return new Request("http://localhost/api/account/profile-share", { method }) as unknown as NextRequest;
}

// GET list builder: from().select().eq().order().limit() -> awaited result
function makeListBuilder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) b[m] = vi.fn(() => b);
  b.limit = vi.fn(async () => result);
  return b;
}

// Snapshot read builder used by all four admin Promise.all reads.
function makeSnapshotBuilder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "not", "order", "limit"]) b[m] = vi.fn(() => b);
  b.maybeSingle = vi.fn(async () => result);
  // watchlist read terminates on .limit() (no maybeSingle) — make limit awaitable too.
  const limitFn = vi.fn(() => b) as unknown as { (): unknown; then?: unknown };
  b.limit = limitFn;
  // Make the builder itself awaitable so the watchlist `.limit(20)` (terminal) resolves.
  (b as { then?: unknown }).then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

describe("/api/account/profile-share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
    mockServerFrom.mockImplementation(() => makeListBuilder({ data: [], error: null }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profile_share_tokens") {
        return { insert: vi.fn(async () => ({ error: null })) };
      }
      return makeSnapshotBuilder({ data: null, error: null });
    });
  });

  // ── GET ──────────────────────────────────────────────────────────────────
  it("GET returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
  });

  it("GET returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("GET returns the caller's token list", async () => {
    mockServerFrom.mockImplementation(() =>
      makeListBuilder({ data: [{ id: "t1", created_at: "x", expires_at: "y", consumed_at: null }], error: null }),
    );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { tokens: unknown[] };
    expect(json.tokens).toHaveLength(1);
  });

  it("GET returns 500 when the list query errors", async () => {
    mockServerFrom.mockImplementation(() => makeListBuilder({ data: null, error: { message: "db" } }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });

  // ── POST ─────────────────────────────────────────────────────────────────
  it("POST returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("POST returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("POST creates a 48-hex token and returns 201 with share_url", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(201);
    const json = (await res.json()) as { token: string; share_url: string; expires_at: string };
    expect(json.token).toMatch(/^[0-9a-f]{48}$/);
    expect(json.share_url).toBe(`https://invest.com.au/shared-profile/${json.token}`);
    expect(typeof json.expires_at).toBe("string");
  });

  it("POST returns 500 when the token insert fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "profile_share_tokens") {
        return { insert: vi.fn(async () => ({ error: { message: "insert boom" } })) };
      }
      return makeSnapshotBuilder({ data: null, error: null });
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("insert_failed");
  });
});
