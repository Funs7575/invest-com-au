import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(
  async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
    data: { user: null },
    error: null,
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/rba-polls/route";

const samplePolls = [
  { id: 1, meeting_date: "2026-06-03", description: "June meeting", status: "open", outcome: null, change_bps: null, decided_at: null },
  { id: 2, meeting_date: "2026-05-06", description: "May meeting", status: "revealed", outcome: 0, change_bps: null, decided_at: "2026-05-06T03:30:00Z" },
];

const sampleVotes = [
  { target_id: 1, vote: 1, voter_user_id: "user-a" },
  { target_id: 1, vote: 0, voter_user_id: "user-b" },
  { target_id: 1, vote: 1, voter_user_id: "user-c" },
  { target_id: 2, vote: 0, voter_user_id: "user-a" },
];

describe("GET /api/rba-polls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated user
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(samplePolls, null);
      return makeBuilder(sampleVotes, null);
    });
  });

  it("returns polls list with tally for anonymous user", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.polls).toHaveLength(2);
    // Poll 1: 2 hikes, 1 hold
    const poll1 = json.polls[0] as { tally: { hike: number; hold: number; cut: number; total: number }; myVote: null };
    expect(poll1.tally.hike).toBe(2);
    expect(poll1.tally.hold).toBe(1);
    expect(poll1.tally.cut).toBe(0);
    expect(poll1.tally.total).toBe(3);
    expect(poll1.myVote).toBeNull();
  });

  it("includes myVote for authenticated user who voted", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-a", email: "user@example.com" } },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const poll1 = json.polls[0] as { myVote: number | null };
    expect(poll1.myVote).toBe(1); // user-a voted 1 (hike) on poll 1
  });

  it("sets myVote to null for authenticated user who has not voted", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-d", email: "user-d@example.com" } },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const poll1 = json.polls[0] as { myVote: null };
    expect(poll1.myVote).toBeNull();
  });

  it("returns empty polls array when no polls exist", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.polls).toEqual([]);
  });

  it("returns empty polls array when polls data is null", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.polls).toEqual([]);
  });

  it("returns 500 when polls fetch fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "poll fetch error" }));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fetch_failed");
  });

  it("sets Cache-Control header", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
  });

  it("handles zero votes gracefully — all tallies are 0", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(samplePolls, null);
      return makeBuilder([], null); // no votes
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const poll1 = json.polls[0] as { tally: { total: number } };
    expect(poll1.tally.total).toBe(0);
  });

  it("does not crash when supabase.auth.getUser throws", async () => {
    // The route wraps getUser in try/catch; it should still return polls.
    mockGetUser.mockRejectedValue(new Error("network error"));
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(samplePolls, null);
      return makeBuilder(sampleVotes, null);
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.polls).toHaveLength(2);
    // myVote should be null since userId is null after error
    const poll1 = json.polls[0] as { myVote: null };
    expect(poll1.myVote).toBeNull();
  });
});
