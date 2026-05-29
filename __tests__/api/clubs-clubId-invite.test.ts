import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
    async () => ({ data: { user: { id: "user-uuid-1" } } }),
  ),
  mockFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "ip:test",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, GET } from "@/app/api/clubs/[clubId]/invite/route";

// ── Chain builder ─────────────────────────────────────────────────────────────

function makeChain(
  res: { data?: unknown; error?: unknown; count?: number | null } = {},
) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "like", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => ({
    data: res.data ?? null,
    error: res.error ?? null,
  }));
  chain.maybeSingle = vi.fn(async () => ({
    data: res.data ?? null,
    error: res.error ?? null,
  }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

// ── Request helpers ───────────────────────────────────────────────────────────

const CLUB_ID = "club-abc-123";

function makePostReq(clubId = CLUB_ID): NextRequest {
  return new NextRequest(`http://localhost/api/clubs/${clubId}/invite`, {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makeGetReq(opts: { clubId?: string; token?: string; displayName?: string } = {}): NextRequest {
  const { clubId = CLUB_ID, token, displayName } = opts;
  const url = new URL(`http://localhost/api/clubs/${clubId}/invite`);
  if (token) url.searchParams.set("token", token);
  if (displayName) url.searchParams.set("displayName", displayName);
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PARAMS = { params: Promise.resolve({ clubId: CLUB_ID }) };

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE   = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/clubs/[clubId]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-1" } } });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makePostReq(), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePostReq(), PARAMS);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 403 when caller is not a member", async () => {
    // club_members.single() returns no membership
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await POST(makePostReq(), PARAMS);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("not_member");
  });

  it("returns 422 when club is at member limit", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_members" && callCount === 1) {
        // membership check → is a member
        return makeChain({ data: { id: "member-1" }, error: null });
      }
      if (table === "investment_clubs") {
        // club member_limit
        return makeChain({ data: { member_limit: 5 }, error: null });
      }
      if (table === "club_members" && callCount >= 3) {
        // member count — at limit
        const c = makeChain({ data: null, error: null, count: 5 });
        return c;
      }
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq(), PARAMS);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/member limit/i);
  });

  it("returns 500 when invite insert fails", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_members" && callCount === 1) {
        return makeChain({ data: { id: "member-1" }, error: null });
      }
      if (table === "investment_clubs") {
        return makeChain({ data: { member_limit: 20 }, error: null });
      }
      if (table === "club_members") {
        // member count — under limit
        const c = makeChain({ data: null, error: null, count: 3 });
        return c;
      }
      if (table === "club_invitations") {
        // insert returns error
        return makeChain({ data: null, error: { message: "insert failed" } });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq(), PARAMS);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Could not create invite.");
  });

  it("creates invite and returns token + expiresAt on success", async () => {
    const invite = { invite_token: "tok-abc-123", expires_at: FUTURE_DATE };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_members" && callCount === 1) {
        return makeChain({ data: { id: "member-1" }, error: null });
      }
      if (table === "investment_clubs") {
        return makeChain({ data: { member_limit: 20 }, error: null });
      }
      if (table === "club_members") {
        const c = makeChain({ data: null, error: null, count: 5 });
        return c;
      }
      if (table === "club_invitations") {
        return makeChain({ data: invite, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await POST(makePostReq(), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("tok-abc-123");
    expect(json.expiresAt).toBe(FUTURE_DATE);
  });
});

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/clubs/[clubId]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-1" } } });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeGetReq({ token: "tok-1" }), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeGetReq({ token: "tok-1" }), PARAMS);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 400 when token query param is missing", async () => {
    const res = await GET(makeGetReq(), PARAMS);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("token is required.");
  });

  it("returns 404 when invite token is invalid or not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeGetReq({ token: "bad-token" }), PARAMS);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired invite.");
  });

  it("returns 409 when invite has already been used", async () => {
    const usedInvite = { id: "inv-1", club_id: CLUB_ID, expires_at: FUTURE_DATE, used_at: "2026-05-01T00:00:00.000Z" };
    mockFrom.mockReturnValue(makeChain({ data: usedInvite, error: null }));
    const res = await GET(makeGetReq({ token: "tok-used" }), PARAMS);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Invite already used.");
  });

  it("returns 410 when invite has expired", async () => {
    const expiredInvite = { id: "inv-2", club_id: CLUB_ID, expires_at: PAST_DATE, used_at: null };
    mockFrom.mockReturnValue(makeChain({ data: expiredInvite, error: null }));
    const res = await GET(makeGetReq({ token: "tok-expired" }), PARAMS);
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toBe("Invite has expired.");
  });

  it("returns { ok: true, alreadyMember: true } when user is already in the club", async () => {
    const validInvite = { id: "inv-3", club_id: CLUB_ID, expires_at: FUTURE_DATE, used_at: null };
    const existingMembership = { id: "mem-1" };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_invitations") return makeChain({ data: validInvite, error: null });
      if (table === "club_members" && callCount === 2) {
        // Already-member check
        return makeChain({ data: existingMembership, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await GET(makeGetReq({ token: "tok-valid" }), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.alreadyMember).toBe(true);
    expect(json.clubId).toBe(CLUB_ID);
  });

  it("returns 422 when joining would exceed member limit", async () => {
    const validInvite = { id: "inv-4", club_id: CLUB_ID, expires_at: FUTURE_DATE, used_at: null };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_invitations") return makeChain({ data: validInvite, error: null });
      if (table === "club_members" && callCount === 2) {
        // Not already a member
        return makeChain({ data: null, error: null });
      }
      if (table === "investment_clubs") {
        return makeChain({ data: { member_limit: 5 }, error: null });
      }
      if (table === "club_members") {
        // At limit
        const c = makeChain({ data: null, error: null, count: 5 });
        return c;
      }
      return makeChain({ data: null, error: null });
    });
    const res = await GET(makeGetReq({ token: "tok-full" }), PARAMS);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toMatch(/member limit/i);
  });

  it("returns 500 when join insert fails", async () => {
    const validInvite = { id: "inv-5", club_id: CLUB_ID, expires_at: FUTURE_DATE, used_at: null };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_invitations" && callCount === 1) return makeChain({ data: validInvite, error: null });
      if (table === "club_members" && callCount === 2) {
        // Not already a member
        return makeChain({ data: null, error: null });
      }
      if (table === "investment_clubs") {
        return makeChain({ data: { member_limit: 20 }, error: null });
      }
      if (table === "club_members" && callCount === 4) {
        // Member count — under limit
        const c = makeChain({ data: null, error: null, count: 3 });
        return c;
      }
      if (table === "club_members") {
        // join insert → error
        return makeChain({ data: null, error: { message: "join error" } });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await GET(makeGetReq({ token: "tok-ok" }), PARAMS);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Could not join club.");
  });

  it("joins club, marks token used, and returns { ok: true, alreadyMember: false } on success", async () => {
    const validInvite = { id: "inv-6", club_id: CLUB_ID, expires_at: FUTURE_DATE, used_at: null };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_invitations" && callCount === 1) return makeChain({ data: validInvite, error: null });
      if (table === "club_members" && callCount === 2) {
        // Not already a member
        return makeChain({ data: null, error: null });
      }
      if (table === "investment_clubs") {
        return makeChain({ data: { member_limit: 20 }, error: null });
      }
      if (table === "club_members" && callCount === 4) {
        // Member count under limit
        const c = makeChain({ data: null, error: null, count: 2 });
        return c;
      }
      if (table === "club_members") {
        // join insert — success (no error)
        return makeChain({ data: { id: "new-member" }, error: null });
      }
      if (table === "club_invitations") {
        // mark used update
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });
    const res = await GET(makeGetReq({ token: "tok-join", displayName: "Alice" }), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.alreadyMember).toBe(false);
    expect(json.clubId).toBe(CLUB_ID);
  });

  it("defaults displayName to 'Member' when not provided", async () => {
    const validInvite = { id: "inv-7", club_id: CLUB_ID, expires_at: FUTURE_DATE, used_at: null };
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "club_invitations" && callCount === 1) return makeChain({ data: validInvite, error: null });
      if (table === "club_members" && callCount === 2) return makeChain({ data: null, error: null });
      if (table === "investment_clubs") return makeChain({ data: { member_limit: 20 }, error: null });
      if (table === "club_members" && callCount === 4) {
        const c = makeChain({ data: null, error: null, count: 1 });
        return c;
      }
      // join insert
      return makeChain({ data: { id: "new-member-2" }, error: null });
    });
    const res = await GET(makeGetReq({ token: "tok-join-noname" }), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
