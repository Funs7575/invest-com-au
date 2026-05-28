import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
}));

import { GET, POST } from "@/app/api/community/debate-vote/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makePostReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/community/debate-vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetReq(threadId: number): NextRequest {
  return new NextRequest(`http://localhost/api/community/debate-vote?thread_id=${threadId}`);
}

// ── GET ───────────────────────────────────────────────────────────────────────

describe("GET /api/community/debate-vote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for missing thread_id", async () => {
    const req = new NextRequest("http://localhost/api/community/debate-vote");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric thread_id", async () => {
    const req = new NextRequest("http://localhost/api/community/debate-vote?thread_id=abc");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns tallies for unauthenticated user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const votes = [
      { position: "bull", voter_user_id: "uid-1" },
      { position: "bull", voter_user_id: "uid-2" },
      { position: "bear", voter_user_id: "uid-3" },
    ];
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.eq = vi.fn((field: string) => {
      if (field === "thread_id") return { ...chain, eq: vi.fn(() => Promise.resolve({ data: votes })) };
      return Promise.resolve({ data: votes });
    });
    // Simple mock: return votes
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: votes })),
      })),
    });
    const res = await GET(makeGetReq(1));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { bull_count: number; bear_count: number; total: number; user_position: null };
    expect(body.bull_count).toBe(2);
    expect(body.bear_count).toBe(1);
    expect(body.total).toBe(3);
    expect(body.user_position).toBeNull();
  });

  it("returns user_position when authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const votes = [
      { position: "bull", voter_user_id: USER.id },
      { position: "bear", voter_user_id: "uid-2" },
    ];
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: votes })),
      })),
    });
    const res = await GET(makeGetReq(1));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user_position: string };
    expect(body.user_position).toBe("bull");
  });
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe("POST /api/community/debate-vote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePostReq({ thread_id: 1, position: "bull" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid position", async () => {
    const res = await POST(makePostReq({ thread_id: 1, position: "neutral" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing thread_id", async () => {
    const res = await POST(makePostReq({ position: "bull" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when thread not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    });
    const res = await POST(makePostReq({ thread_id: 99, position: "bull" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 for non-debate thread", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 1, thread_type: "discussion", is_removed: false } })),
        })),
      })),
    });
    const res = await POST(makePostReq({ thread_id: 1, position: "bull" }));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("not_a_debate_thread");
  });
});
