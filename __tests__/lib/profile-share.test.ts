import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { getProfileShare } from "@/lib/profile-share";

const VALID_TOKEN = "a".repeat(48);

function makeSelectChain(data: unknown, error: unknown = null) {
  const terminal = { data, error };
  const chain: Record<string, unknown> & { then: (r: (v: typeof terminal) => void) => void } = {
    then: (resolve: (v: typeof terminal) => void) => resolve(terminal),
  };
  for (const m of ["select", "eq", "update"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["maybeSingle"] = vi.fn(() => Promise.resolve(terminal));
  return chain;
}

const SNAPSHOT = {
  goals: { is_fhb: true, is_hnw: false, primary_vertical: "shares" },
  quiz: { inferred_vertical: "shares", top_match_slug: "commsec", completed_at: "2026-05-01" },
  watchlist: [{ item_type: "etf", item_slug: "vgs", display_name: "Vanguard Global Shares" }],
  health: { overall: 72, diversification: 80, cost: 65, risk_alignment: 70, engagement: 68, scored_month: "2026-05" },
};

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => vi.clearAllMocks());

describe("getProfileShare", () => {
  it("returns null for empty token", async () => {
    expect(await getProfileShare("")).toBeNull();
  });

  it("returns null for oversized token", async () => {
    expect(await getProfileShare("x".repeat(201))).toBeNull();
  });

  it("returns null when token not found", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) return makeSelectChain(null); // maybeSingle returns null
      return makeSelectChain(null);
    });
    expect(await getProfileShare(VALID_TOKEN)).toBeNull();
  });

  it("returns null when token is expired", async () => {
    const chain = makeSelectChain({
      id: "abc",
      snapshot_json: SNAPSHOT,
      expires_at: PAST,
      consumed_at: null,
      created_at: "2026-05-01",
    });
    mockFrom.mockReturnValue(chain);
    expect(await getProfileShare(VALID_TOKEN)).toBeNull();
  });

  it("returns snapshot when token is valid and not consumed", async () => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      // First call: select → maybeSingle resolves to the row
      // Second call: update for consumed_at
      if (call === 1) {
        return makeSelectChain({
          id: "abc",
          snapshot_json: SNAPSHOT,
          expires_at: FUTURE,
          consumed_at: null,
          created_at: "2026-05-01",
        });
      }
      return makeSelectChain(null); // update call
    });

    const result = await getProfileShare(VALID_TOKEN);
    expect(result).not.toBeNull();
    expect(result!.wasConsumedPreviously).toBe(false);
    expect(result!.snapshot.goals?.is_fhb).toBe(true);
    expect(result!.snapshot.quiz?.inferred_vertical).toBe("shares");
    expect(result!.snapshot.watchlist).toHaveLength(1);
    expect(result!.snapshot.health?.overall).toBe(72);
  });

  it("stamps consumed_at on first read", async () => {
    const updateChain = makeSelectChain(null);
    let call = 0;
    mockFrom.mockImplementation(() => {
      call++;
      if (call === 1) {
        return makeSelectChain({
          id: "xyz",
          snapshot_json: SNAPSHOT,
          expires_at: FUTURE,
          consumed_at: null,
          created_at: "2026-05-01",
        });
      }
      return updateChain;
    });

    await getProfileShare(VALID_TOKEN);
    // The second mockFrom call should be for the update
    expect(mockFrom).toHaveBeenCalledTimes(2);
    expect(mockFrom.mock.calls[1]?.[0]).toBe("profile_share_tokens");
  });

  it("returns wasConsumedPreviously=true for already-read tokens", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({
        id: "abc",
        snapshot_json: SNAPSHOT,
        expires_at: FUTURE,
        consumed_at: "2026-05-02T12:00:00Z",
        created_at: "2026-05-01",
      }),
    );

    const result = await getProfileShare(VALID_TOKEN);
    expect(result!.wasConsumedPreviously).toBe(true);
    // Should NOT call update — already consumed
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns null when DB query errors", async () => {
    const chain = makeSelectChain(null, { message: "connection refused" });
    mockFrom.mockReturnValue(chain);
    expect(await getProfileShare(VALID_TOKEN)).toBeNull();
  });
});
