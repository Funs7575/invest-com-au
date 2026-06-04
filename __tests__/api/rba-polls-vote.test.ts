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

import { POST } from "@/app/api/rba-polls/[id]/vote/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(body: unknown, pollId = "5"): NextRequest {
  return new NextRequest(`http://localhost/api/rba-polls/${pollId}/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePollChain(poll: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve({ data: poll, error: null }));
  return chain;
}

function makeUpsertChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.upsert = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/rba-polls/[id]/vote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ vote: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid vote value", async () => {
    const res = await POST(makeReq({ vote: 2 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing vote", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when poll not found", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makePollChain(null);
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq({ vote: 0 }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when poll is already revealed", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makePollChain({ id: 5, status: "revealed" });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq({ vote: 0 }));
    expect(res.status).toBe(409);
  });

  it("returns 409 when poll is closed", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makePollChain({ id: 5, status: "closed" });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq({ vote: -1 }));
    expect(res.status).toBe(409);
  });

  it("upserts a HIKE vote and returns ok", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const upsertChain = makeUpsertChain({ error: null });
    mockFrom
      .mockReturnValueOnce(makePollChain({ id: 5, status: "open" }))
      .mockReturnValueOnce(upsertChain);
    const res = await POST(makeReq({ vote: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; vote: number };
    expect(body.ok).toBe(true);
    expect(body.vote).toBe(1);

    // Writes the prod forum_votes columns (user_id/value, not voter_user_id/vote)
    // and conflicts on the real UNIQUE(user_id, target_type, target_id) index.
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      {
        target_type: "rba_poll",
        target_id: 5,
        user_id: USER.id,
        value: 1,
      },
      { onConflict: "target_type,target_id,user_id" },
    );
  });

  it("upserts a HOLD vote (0) successfully", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makePollChain({ id: 5, status: "open" }))
      .mockReturnValueOnce(makeUpsertChain({ error: null }));
    const res = await POST(makeReq({ vote: 0 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; vote: number };
    expect(body.vote).toBe(0);
  });

  it("upserts a CUT vote (-1) successfully", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makePollChain({ id: 5, status: "open" }))
      .mockReturnValueOnce(makeUpsertChain({ error: null }));
    const res = await POST(makeReq({ vote: -1 }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; vote: number };
    expect(body.vote).toBe(-1);
  });

  it("returns 500 on upsert DB error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom
      .mockReturnValueOnce(makePollChain({ id: 5, status: "open" }))
      .mockReturnValueOnce(makeUpsertChain({ error: { message: "constraint violation" } }));
    const res = await POST(makeReq({ vote: 1 }));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid poll id (non-numeric)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(makeReq({ vote: 1 }, "abc"));
    expect(res.status).toBe(400);
  });
});
