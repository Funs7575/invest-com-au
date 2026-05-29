import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
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

import { GET } from "@/app/api/rba-polls/leaderboard/route";

const sampleAccuracy = [
  { voter_user_id: "u1", polls_participated: 5, correct_predictions: 4, accuracy_pct: 80 },
  { voter_user_id: "u2", polls_participated: 3, correct_predictions: 2, accuracy_pct: 66.67 },
];

const sampleProfiles = [
  { user_id: "u1", display_name: "Alice", badge: "gold", reputation: 120 },
  { user_id: "u2", display_name: "Bob", badge: "silver", reputation: 80 },
];

describe("GET /api/rba-polls/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(sampleAccuracy, null);
      return makeBuilder(sampleProfiles, null);
    });
  });

  it("returns a ranked leaderboard with display names and badges", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.leaderboard).toHaveLength(2);

    const first = json.leaderboard[0] as {
      rank: number;
      display_name: string;
      badge: string;
      polls_participated: number;
      correct_predictions: number;
      accuracy_pct: number;
    };
    expect(first.rank).toBe(1);
    expect(first.display_name).toBe("Alice");
    expect(first.badge).toBe("gold");
    expect(first.polls_participated).toBe(5);
    expect(first.correct_predictions).toBe(4);
    expect(first.accuracy_pct).toBe(80);

    const second = json.leaderboard[1] as { rank: number; display_name: string };
    expect(second.rank).toBe(2);
    expect(second.display_name).toBe("Bob");
  });

  it("uses Anonymous and empty badge when profile is missing", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(sampleAccuracy, null);
      return makeBuilder([], null); // no profiles found
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const first = json.leaderboard[0] as { display_name: string; badge: string };
    expect(first.display_name).toBe("Anonymous");
    expect(first.badge).toBe("");
  });

  it("uses Anonymous when profiles data is null", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      callCount++;
      if (callCount === 1) return makeBuilder(sampleAccuracy, null);
      return makeBuilder(null, null);
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const first = json.leaderboard[0] as { display_name: string };
    expect(first.display_name).toBe("Anonymous");
  });

  it("returns empty leaderboard when accuracy table is empty", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.leaderboard).toEqual([]);
  });

  it("returns empty leaderboard when accuracy data is null", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.leaderboard).toEqual([]);
  });

  it("returns 500 when accuracy view query fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "view error" }));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("fetch_failed");
  });

  it("sets Cache-Control header with longer TTL than polls endpoint", async () => {
    const res = await GET();
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("max-age=300");
  });

  it("accuracy_pct is returned as a Number (not string)", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    const first = json.leaderboard[0] as { accuracy_pct: unknown };
    expect(typeof first.accuracy_pct).toBe("number");
  });
});
