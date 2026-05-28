import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockIsRateLimited } = vi.hoisted(() => ({ mockIsRateLimited: vi.fn() }));
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn() })),
}));

// ── Import after mocks ───────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/user-lists/[slug]/follow/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER = { id: "user-abc", email: "alice@example.com" };
const SLUG = "best-etfs-2026";

function makeRequest(method: "POST" | "DELETE"): NextRequest {
  return new NextRequest(`http://localhost/api/user-lists/${SLUG}/follow`, {
    method,
  });
}

function makeSelectChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data: result.data, error: result.error ?? null }));
  return c;
}

function makeInsertChain(result: { error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.insert = vi.fn(() => Promise.resolve({ error: result.error }));
  return c;
}

const PUBLIC_LIST = { id: "list-1", is_public: true, owner_user_id: "other-user" };
const OWN_LIST   = { id: "list-1", is_public: true, owner_user_id: USER.id };
const PRIVATE_LIST = { id: "list-2", is_public: false, owner_user_id: "other-user" };

// ── POST tests ───────────────────────────────────────────────────────────────

describe("POST /api/user-lists/[slug]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(429);
  });

  it("returns 404 when list does not exist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: null }));
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(404);
  });

  it("returns 403 when list is private", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: PRIVATE_LIST }));
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "list_not_public" });
  });

  it("returns 409 when user tries to follow their own list", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: OWN_LIST }));
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "cannot_follow_own_list" });
  });

  it("returns 200 { ok: true, already: true } on duplicate follow", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: PUBLIC_LIST }))
      .mockReturnValueOnce(makeInsertChain({ error: { code: "23505" } }));
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, already: true });
  });

  it("returns 500 when insert fails with unknown error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: PUBLIC_LIST }))
      .mockReturnValueOnce(makeInsertChain({ error: { code: "XXXX", message: "db error" } }));
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(500);
  });

  it("returns 200 { ok: true, following: true } on successful follow", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: PUBLIC_LIST }))
      .mockReturnValueOnce(makeInsertChain({ error: null }));
    const res = await POST(makeRequest("POST"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, following: true });
  });
});

// ── DELETE tests ─────────────────────────────────────────────────────────────

describe("DELETE /api/user-lists/[slug]/follow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when list does not exist", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce(makeSelectChain({ data: null }));
    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(404);
  });

  it("returns 200 { ok: true, following: false } on successful unfollow", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });

    const deleteChain = (() => {
      const inner2 = { eq: vi.fn(() => Promise.resolve({ error: null })) };
      const inner1 = { eq: vi.fn(() => inner2) };
      return { delete: vi.fn(() => inner1) };
    })();

    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: PUBLIC_LIST }))
      .mockReturnValueOnce(deleteChain);

    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, following: false });
  });

  it("returns 500 when delete fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });

    const deleteChain = (() => {
      const inner2 = { eq: vi.fn(() => Promise.resolve({ error: { message: "db error" } })) };
      const inner1 = { eq: vi.fn(() => inner2) };
      return { delete: vi.fn(() => inner1) };
    })();

    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: PUBLIC_LIST }))
      .mockReturnValueOnce(deleteChain);

    const res = await DELETE(makeRequest("DELETE"));
    expect(res.status).toBe(500);
  });
});
