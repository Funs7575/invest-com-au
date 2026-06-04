import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

import { GET } from "@/app/api/rba-polls/route";

// Thenable query builder that resolves to `result` once awaited.
function makeBuilder(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "order", "limit"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const POLLS = [{ id: 5, meeting_date: "2026-07-08", description: "July", status: "open", outcome: null, change_bps: null, decided_at: null }];

// Votes against poll 5 stored in prod forum_votes columns: user_id + value.
const VOTES = [
  { target_id: 5, value: 1, user_id: "user-A" }, // HIKE
  { target_id: 5, value: 0, user_id: "user-B" }, // HOLD
  { target_id: 5, value: -1, user_id: "user-C" }, // CUT
  { target_id: 5, value: 1, user_id: "user-A2" }, // HIKE
];

describe("GET /api/rba-polls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tallies votes from forum_votes user_id/value columns", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ data: POLLS, error: null })) // rba_polls
      .mockReturnValueOnce(makeBuilder({ data: VOTES, error: null })); // forum_votes

    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { polls: Array<{ id: number; tally: { hike: number; hold: number; cut: number; total: number }; myVote: number | null }> };
    const poll = body.polls[0]!;
    expect(poll.tally).toEqual({ hike: 2, hold: 1, cut: 1, total: 4 });
    expect(poll.myVote).toBeNull();
  });

  it("returns the caller's own vote via user_id match", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "user-C" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder({ data: POLLS, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: VOTES, error: null }));

    const res = await GET();
    const body = (await res.json()) as { polls: Array<{ myVote: number | null }> };
    expect(body.polls[0]!.myVote).toBe(-1); // user-C voted CUT
  });
});
