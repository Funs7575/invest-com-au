/**
 * Tests for GET /api/clubs/[clubId]
 *
 * Auth: Supabase server client (auth.getUser) + admin client for benchmark
 * Branches: 429, 401, 403 (not_member), 404 (club not found), 200 (full detail + benchmark)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFrom, mockAdminFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>().mockResolvedValue({
    data: { user: { id: "user-1" } },
  }),
  mockFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
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

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/clubs/[clubId]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

const CLUB_ID = "club-xyz";
const PARAMS = { params: Promise.resolve({ clubId: CLUB_ID }) };

function makeGet(clubId = CLUB_ID): NextRequest {
  return new NextRequest(`http://localhost/api/clubs/${clubId}`, { method: "GET" });
}

const MEMBERSHIP = { id: "mem-1", role: "member", display_name: "Alex" };
const CLUB_DATA = {
  id: CLUB_ID,
  name: "ETF Club",
  slug: "etf-club-123",
  description: null,
  member_limit: 20,
  created_by: "user-1",
  created_at: "2026-05-01T00:00:00Z",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/clubs/[clubId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(401);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/unauthorized/i);
  });

  it("returns 403 when user is not a club member", async () => {
    // membership query returns null
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json() as Record<string, unknown>).error).toBe("not_member");
  });

  it("returns 404 when club data is null", async () => {
    let call = 0;
    // call 1: membership → found; calls 2-5: Promise.all returns club as null, rest as []
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      // club
      if (call === 2) return makeBuilder(null);
      return makeBuilder([]);
    });
    // Admin queries for benchmark (best-effort, may or may not run)
    mockAdminFrom.mockReturnValue(makeBuilder([]));
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(404);
    expect((await res.json() as Record<string, unknown>).error).toBe("not_found");
  });

  it("returns 200 with full club detail when user is a member", async () => {
    const members = [
      { id: "mem-1", role: "member", display_name: "Alex", joined_at: "2026-05-01T00:00:00Z" },
    ];
    const watchlist = [
      { id: "wl-1", broker_id: 5, notes: "Good fees", created_at: "2026-05-02T00:00:00Z", brokers: { name: "CommSec", slug: "commsec", logo_url: null, rating: 4.5, asx_fee: 10 } },
    ];
    const messages = [
      { id: "msg-1", body: "Hello", created_at: "2026-05-03T00:00:00Z", club_members: { display_name: "Alex", role: "member" } },
    ];

    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP); // membership check
      if (call === 2) return makeBuilder(CLUB_DATA);   // club
      if (call === 3) return makeBuilder(members);     // members
      if (call === 4) return makeBuilder(watchlist);   // watchlist
      return makeBuilder(messages);                    // messages
    });

    // Admin benchmark queries
    mockAdminFrom.mockReturnValueOnce(
      makeBuilder([{ user_id: "user-1", display_name: "Alex" }]),
    ).mockReturnValueOnce(
      makeBuilder([{ user_id: "user-1", broker_slug: "commsec" }]),
    );

    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect((body.club as Record<string, unknown>).id).toBe(CLUB_ID);
    expect((body.myMembership as Record<string, unknown>).role).toBe("member");
    expect((body.members as unknown[]).length).toBe(1);
    expect((body.watchlist as unknown[]).length).toBe(1);
    expect((body.messages as unknown[]).length).toBe(1);
    // benchmark should be populated
    expect(Array.isArray(body.benchmark)).toBe(true);
  });

  it("returns 200 with empty benchmark when admin query fails (non-fatal)", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      if (call === 2) return makeBuilder(CLUB_DATA);
      if (call === 3) return makeBuilder([]);
      if (call === 4) return makeBuilder([]);
      return makeBuilder([]);
    });

    // Admin throws error — benchmark should degrade gracefully
    mockAdminFrom.mockImplementation(() => {
      throw new Error("admin unavailable");
    });

    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.benchmark).toEqual([]);
  });
});
