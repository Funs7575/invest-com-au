import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockClaimAnonymousSaves = vi.fn();
const mockClaimSessionQuizzes = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/bookmarks", () => ({
  claimAnonymousSaves: (...args: unknown[]) => mockClaimAnonymousSaves(...args),
}));

vi.mock("@/lib/quiz-history", () => ({
  claimSessionQuizzes: (...args: unknown[]) => mockClaimSessionQuizzes(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from "@/app/api/account/claim-anonymous/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/account/claim-anonymous", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/account/claim-anonymous", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePost({ session_id: "sess-abc" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Unauthorized" });
  });

  it("returns 400 when session_id is missing", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing session_id" });
  });

  it("returns 400 when session_id is not a string", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(makePost({ session_id: 12345 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Missing session_id" });
  });

  it("returns 400 when body is malformed JSON", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/account/claim-anonymous", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns { ok, bookmarks_claimed, quizzes_claimed } on success", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockClaimAnonymousSaves.mockResolvedValueOnce(5);
    mockClaimSessionQuizzes.mockResolvedValueOnce(2);
    const res = await POST(makePost({ session_id: "sess-abc" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, bookmarks_claimed: 5, quizzes_claimed: 2 });
  });

  it("calls both claim functions with the correct args in parallel", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockClaimAnonymousSaves.mockResolvedValueOnce(3);
    mockClaimSessionQuizzes.mockResolvedValueOnce(1);
    await POST(makePost({ session_id: "sess-xyz" }));
    expect(mockClaimAnonymousSaves).toHaveBeenCalledWith("sess-xyz", USER.id);
    expect(mockClaimSessionQuizzes).toHaveBeenCalledWith("sess-xyz", USER.id);
  });

  it("truncates session_id to 100 characters", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockClaimAnonymousSaves.mockResolvedValueOnce(0);
    mockClaimSessionQuizzes.mockResolvedValueOnce(0);
    const longId = "a".repeat(200);
    await POST(makePost({ session_id: longId }));
    expect(mockClaimAnonymousSaves).toHaveBeenCalledWith("a".repeat(100), USER.id);
  });

  it("returns ok:true even when both claim functions resolve to 0", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockClaimAnonymousSaves.mockResolvedValueOnce(0);
    mockClaimSessionQuizzes.mockResolvedValueOnce(0);
    const res = await POST(makePost({ session_id: "sess-empty" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, bookmarks_claimed: 0, quizzes_claimed: 0 });
  });
});
