import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

// from("advisor_user_match_scores").select().eq().order().limit() -> awaited
let scoresResult: { data: unknown; error: unknown } = { data: [], error: null };
const mockFrom = vi.fn(() => {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) b[m] = vi.fn(() => b);
  b.limit = vi.fn(async () => scoresResult);
  return b;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { GET } from "@/app/api/account/advisor-match-scores/route";

const USER = { id: "user-1", email: "user@example.com" };

function makeReq(): NextRequest {
  return new Request("http://localhost/api/account/advisor-match-scores") as unknown as NextRequest;
}

describe("GET /api/account/advisor-match-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null });
    scoresResult = { data: [], error: null };
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns an empty scores map for a user with no rows", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { scores: Record<string, number> };
    expect(json.scores).toEqual({});
  });

  it("returns a professional_id -> match_percent map", async () => {
    scoresResult = {
      data: [
        { professional_id: 7, match_percent: 92 },
        { professional_id: 12, match_percent: 80 },
      ],
      error: null,
    };
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { scores: Record<string, number> };
    expect(json.scores).toEqual({ "7": 92, "12": 80 });
  });

  it("tolerates a null data result and returns an empty map", async () => {
    scoresResult = { data: null, error: null };
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as { scores: Record<string, number> };
    expect(json.scores).toEqual({});
  });

  it("returns 500 when the query errors", async () => {
    scoresResult = { data: null, error: { message: "db error" } };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("fetch_failed");
  });
});
