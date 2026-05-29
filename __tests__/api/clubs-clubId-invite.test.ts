/**
 * Tests for POST + GET /api/clubs/[clubId]/invite
 *
 * Auth: Supabase server client (auth.getUser)
 * POST branches: 429, 401, 403 (not_member), 422 (member_limit), 500 (insert fail), 200 (token)
 * GET  branches: 429, 401, 400 (no token), 404 (invalid invite), 409 (already used),
 *                410 (expired), 200 alreadyMember, 422 (member_limit), 500 (join fail), 200 (joined)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>().mockResolvedValue({
    data: { user: { id: "user-1" } },
  }),
  mockFrom: vi.fn(),
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

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, GET } from "@/app/api/clubs/[clubId]/invite/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase builder stub — every method returns itself; awaiting
 * resolves to `result`.
 */
function makeBuilder(data: unknown, error: unknown = null, count: number | null = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "not", "or", "order", "limit",
    "single", "maybeSingle", "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error, count }));
  return b;
}

const CLUB_ID = "club-abc";
const PARAMS = { params: Promise.resolve({ clubId: CLUB_ID }) };

function makePost(clubId = CLUB_ID): NextRequest {
  return new NextRequest(`http://localhost/api/clubs/${clubId}/invite`, { method: "POST" });
}

function makeGet(clubId = CLUB_ID, token?: string, displayName?: string): NextRequest {
  const url = new URL(`http://localhost/api/clubs/${clubId}/invite`);
  if (token) url.searchParams.set("token", token);
  if (displayName) url.searchParams.set("displayName", displayName);
  return new NextRequest(url.toString(), { method: "GET" });
}

// Future expiry for valid invite tests
const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/clubs/[clubId]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost(), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost(), PARAMS);
    expect(res.status).toBe(401);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/unauthorized/i);
  });

  it("returns 403 when user is not a club member", async () => {
    // membership query returns null
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await POST(makePost(), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json() as Record<string, unknown>).error).toBe("not_member");
  });

  it("returns 422 when club is at member limit", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1" });       // membership: found
      if (call === 2) return makeBuilder({ member_limit: 5 });   // club: limit 5
      return makeBuilder(null, null, 5);                         // count: 5 (at limit)
    });
    const res = await POST(makePost(), PARAMS);
    expect(res.status).toBe(422);
  });

  it("returns 500 when invite insert fails", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1" });
      if (call === 2) return makeBuilder({ member_limit: 20 });
      if (call === 3) return makeBuilder(null, null, 2);
      return makeBuilder(null, { message: "db error" });
    });
    const res = await POST(makePost(), PARAMS);
    expect(res.status).toBe(500);
  });

  it("returns 200 with invite token on success", async () => {
    const tokenData = { invite_token: "tok-xyz", expires_at: FUTURE };
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder({ id: "mem-1" });
      if (call === 2) return makeBuilder({ member_limit: 20 });
      if (call === 3) return makeBuilder(null, null, 2);
      return makeBuilder(tokenData);
    });
    const res = await POST(makePost(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.token).toBe("tok-xyz");
    expect(body.expiresAt).toBe(FUTURE);
  });
});

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/clubs/[clubId]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-99" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet(CLUB_ID, "tok"), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGet(CLUB_ID, "tok"), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 400 when token query param is missing", async () => {
    const res = await GET(makeGet(CLUB_ID), PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/token is required/i);
  });

  it("returns 404 when invite token is not found", async () => {
    // invite query returns null
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet(CLUB_ID, "bad-tok"), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 409 when invite has already been used", async () => {
    mockFrom.mockReturnValue(
      makeBuilder({ id: "inv-1", club_id: CLUB_ID, expires_at: FUTURE, used_at: "2026-05-01T00:00:00Z" }),
    );
    const res = await GET(makeGet(CLUB_ID, "used-tok"), PARAMS);
    expect(res.status).toBe(409);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/already used/i);
  });

  it("returns 410 when invite has expired", async () => {
    mockFrom.mockReturnValue(
      makeBuilder({ id: "inv-1", club_id: CLUB_ID, expires_at: PAST, used_at: null }),
    );
    const res = await GET(makeGet(CLUB_ID, "exp-tok"), PARAMS);
    expect(res.status).toBe(410);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/expired/i);
  });

  it("returns 200 with alreadyMember=true when user is already in club", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1)
        return makeBuilder({ id: "inv-1", club_id: CLUB_ID, expires_at: FUTURE, used_at: null });
      // existing membership check
      return makeBuilder({ id: "mem-existing" });
    });
    const res = await GET(makeGet(CLUB_ID, "valid-tok"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.alreadyMember).toBe(true);
    expect(body.clubId).toBe(CLUB_ID);
  });

  it("returns 422 when club is at member limit during join attempt", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1)
        return makeBuilder({ id: "inv-1", club_id: CLUB_ID, expires_at: FUTURE, used_at: null });
      if (call === 2) return makeBuilder(null);                // not already a member
      if (call === 3) return makeBuilder({ member_limit: 5 }); // club limit
      return makeBuilder(null, null, 5);                       // count at limit
    });
    const res = await GET(makeGet(CLUB_ID, "valid-tok"), PARAMS);
    expect(res.status).toBe(422);
  });

  it("returns 500 when join insert fails", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1)
        return makeBuilder({ id: "inv-1", club_id: CLUB_ID, expires_at: FUTURE, used_at: null });
      if (call === 2) return makeBuilder(null);
      if (call === 3) return makeBuilder({ member_limit: 20 });
      if (call === 4) return makeBuilder(null, null, 3);
      // join insert fails
      return makeBuilder(null, { message: "join error" });
    });
    const res = await GET(makeGet(CLUB_ID, "valid-tok"), PARAMS);
    expect(res.status).toBe(500);
  });

  it("returns 200 with alreadyMember=false and updates invite on successful join", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1)
        return makeBuilder({ id: "inv-1", club_id: CLUB_ID, expires_at: FUTURE, used_at: null });
      if (call === 2) return makeBuilder(null);
      if (call === 3) return makeBuilder({ member_limit: 20 });
      if (call === 4) return makeBuilder(null, null, 3);
      // join insert succeeds (no error)
      if (call === 5) return makeBuilder(null, null, null);
      // update used_at
      return makeBuilder(null);
    });
    const res = await GET(makeGet(CLUB_ID, "valid-tok", "NewMember"), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.alreadyMember).toBe(false);
    expect(body.clubId).toBe(CLUB_ID);
  });
});
