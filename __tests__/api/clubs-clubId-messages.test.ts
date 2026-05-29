/**
 * Tests for GET + POST /api/clubs/[clubId]/messages
 *
 * Auth: Supabase server client (auth.getUser)
 * GET branches: 429, 401, 403 (not_member), 400 (invalid cursor), 500 (db error),
 *               200 (messages + nextCursor pagination)
 * POST (withValidatedBody, ctx-forwarded): 429, 400 (bad body), 401, 403 (not_member), 500, 200
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
// Uses the real withValidatedBody, which forwards the Next.js route context
// ({ params }) to the handler as its 3rd arg — so the tests call POST(req, ctx).

import { GET, POST } from "@/app/api/clubs/[clubId]/messages/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown, error: unknown = null) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete",
    "eq", "neq", "in", "lt", "order", "limit", "single", "maybeSingle",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data, error }));
  return b;
}

const CLUB_ID = "club-msg";
const PARAMS = { params: Promise.resolve({ clubId: CLUB_ID }) };

function makeGet(clubId = CLUB_ID, before?: string): NextRequest {
  const url = new URL(`http://localhost/api/clubs/${clubId}/messages`);
  if (before) url.searchParams.set("before", before);
  return new NextRequest(url.toString(), { method: "GET" });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/clubs/${CLUB_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const MEMBERSHIP = { id: "mem-1", role: "member", display_name: "Alex" };

function makeMsg(id: string, createdAt: string) {
  return {
    id,
    body: `Message ${id}`,
    created_at: createdAt,
    club_members: { display_name: "Alex", role: "member" },
  };
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/clubs/[clubId]/messages", () => {
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
  });

  it("returns 403 when user is not a club member", async () => {
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(403);
    expect((await res.json() as Record<string, unknown>).error).toBe("not_member");
  });

  it("returns 400 when before cursor is not a valid date", async () => {
    mockFrom.mockReturnValue(makeBuilder(MEMBERSHIP));
    const res = await GET(makeGet(CLUB_ID, "not-a-date"), PARAMS);
    expect(res.status).toBe(400);
    expect((await res.json() as Record<string, unknown>).error).toMatch(/invalid cursor/i);
  });

  it("returns 500 when DB query fails", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      return makeBuilder(null, { message: "db error" });
    });
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(500);
  });

  it("returns 200 with messages when no cursor provided", async () => {
    const msgs = [
      makeMsg("m1", "2026-05-03T10:00:00Z"),
      makeMsg("m2", "2026-05-02T10:00:00Z"),
    ];
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      return makeBuilder(msgs);
    });
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(Array.isArray(body.messages)).toBe(true);
    expect((body.messages as unknown[]).length).toBe(2);
    expect(body.nextCursor).toBeNull();
  });

  it("returns nextCursor when there are more than 50 messages", async () => {
    // 51 messages returned → hasMore = true, nextCursor = row[49].created_at
    const msgs = Array.from({ length: 51 }, (_, i) => {
      const d = new Date(Date.now() - i * 60000).toISOString();
      return makeMsg(`m${i}`, d);
    });
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      return makeBuilder(msgs);
    });
    const res = await GET(makeGet(), PARAMS);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect((body.messages as unknown[]).length).toBe(50);
    expect(body.nextCursor).not.toBeNull();
  });

  it("accepts a valid ISO cursor in ?before param", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      return makeBuilder([makeMsg("m1", "2026-05-01T00:00:00Z")]);
    });
    const res = await GET(makeGet(CLUB_ID, "2026-05-03T00:00:00Z"), PARAMS);
    expect(res.status).toBe(200);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/clubs/[clubId]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ body: "Hello" }), PARAMS);
    expect(res.status).toBe(429);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest(`http://localhost/api/clubs/${CLUB_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not{json",
    });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 400 when message body is empty string", async () => {
    const res = await POST(makePost({ body: "" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ body: "Hello" }), PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a club member", async () => {
    mockFrom.mockReturnValue(makeBuilder(null));
    const res = await POST(makePost({ body: "Hello" }), PARAMS);
    expect(res.status).toBe(403);
  });

  it("returns 500 when insert fails", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      return makeBuilder(null, { message: "insert error" });
    });
    const res = await POST(makePost({ body: "Hello" }), PARAMS);
    expect(res.status).toBe(500);
  });

  it("returns 200 when message is sent successfully", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeBuilder(MEMBERSHIP);
      return makeBuilder(null); // insert success
    });
    const res = await POST(makePost({ body: "Hello everyone!" }), PARAMS);
    expect(res.status).toBe(200);
    expect((await res.json() as Record<string, unknown>).ok).toBe(true);
  });
});
