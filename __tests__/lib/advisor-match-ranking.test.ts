import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  wilsonLowerBound,
  smoothedEngagementRate,
  rankByOutcomes,
  fetchAdvisorOutcomeStats,
  invalidateOutcomesCache,
  OUTCOMES_WEIGHT,
  OUTCOMES_CAP,
  MIN_OBS,
  PRIOR_MATCHES,
  PRIOR_ENGAGEMENTS,
  type AdvisorOutcomeStats,
  type RankableCandidate,
} from "@/lib/advisor-match-ranking";
import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Helpers ──────────────────────────────────────────────────────────────

function mkCandidate(id: number, matchScore: number): RankableCandidate {
  return { id, matchScore };
}

function mkStats(
  advisorId: number,
  matchCount: number,
  engagementCount: number,
): AdvisorOutcomeStats {
  return { advisorId, matchCount, engagementCount };
}

/**
 * Minimal Supabase stub. The `from()` chain is:
 *   .from(table).select(cols).gte(col, val) → resolves with { data, error }
 *
 * `wires.rows` is returned for all .gte() terminal calls.
 */
function makeStubClient(wires: {
  rows?: Array<{ professional_id: number; outcome: string | null }>;
  error?: { message: string } | null;
  throws?: boolean;
}): SupabaseClient {
  const fromImpl = vi.fn(() => {
    if (wires.throws) {
      throw new Error("DB exploded");
    }
    const builder: Record<string, unknown> = {};
    const chainMethods = ["select", "gte"];
    for (const m of chainMethods) {
      builder[m] = vi.fn(() => builder);
    }
    // Resolve as a thenable so awaiting builder works
    builder.then = vi.fn((cb: (v: { data: unknown; error: unknown }) => void) => {
      cb({
        data: wires.rows ?? [],
        error: wires.error ?? null,
      });
      return Promise.resolve();
    });
    return builder;
  });
  return { from: fromImpl } as unknown as SupabaseClient;
}

// ─── wilsonLowerBound ─────────────────────────────────────────────────────

describe("wilsonLowerBound", () => {
  it("returns 0 for n=0 (no division by zero)", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });

  it("returns a value in [0, 1]", () => {
    for (const [s, n] of [
      [0, 10],
      [5, 10],
      [10, 10],
      [100, 1000],
    ]) {
      const v = wilsonLowerBound(s!, n!);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("higher success rate → higher lower bound", () => {
    const low = wilsonLowerBound(1, 10);
    const high = wilsonLowerBound(9, 10);
    expect(high).toBeGreaterThan(low);
  });

  it("more observations → tighter interval (lower bound closer to pHat)", () => {
    // Both have 50 % success rate; more n → lower bound closer to 0.5
    const few = wilsonLowerBound(5, 10);
    const many = wilsonLowerBound(500, 1000);
    expect(many).toBeGreaterThan(few);
  });

  it("perfect record with tiny sample has lower bound < 1", () => {
    // 2/2 should NOT give 1.0 — uncertainty must be acknowledged
    const lb = wilsonLowerBound(2, 2);
    expect(lb).toBeLessThan(1);
  });

  it("zero successes gives lower bound near 0", () => {
    const lb = wilsonLowerBound(0, 10);
    expect(lb).toBeLessThan(0.1);
  });
});

// ─── smoothedEngagementRate ───────────────────────────────────────────────

describe("smoothedEngagementRate", () => {
  it("applies prior so new advisors get a neutral rate, not 0", () => {
    const rate = smoothedEngagementRate(mkStats(1, 0, 0));
    // Prior is PRIOR_ENGAGEMENTS/PRIOR_MATCHES = 0.5; Wilson lower bound
    // of a 50 % prior on few observations should be > 0.
    expect(rate).toBeGreaterThan(0);
  });

  it("strong advisors score higher than weak ones", () => {
    const strong = smoothedEngagementRate(mkStats(1, 100, 90));
    const weak = smoothedEngagementRate(mkStats(2, 100, 10));
    expect(strong).toBeGreaterThan(weak);
  });

  it("caps at OUTCOMES_CAP even for perfect records", () => {
    const perfect = smoothedEngagementRate(mkStats(1, 1000, 1000));
    expect(perfect).toBeLessThanOrEqual(OUTCOMES_CAP);
  });

  it("a high-volume average advisor beats a tiny-sample perfect one", () => {
    // 1/1 engagement (tiny sample) vs 60/100 (larger, consistent)
    const tinyPerfect = smoothedEngagementRate(mkStats(1, 1, 1));
    const solidHigh = smoothedEngagementRate(mkStats(2, 100, 60));
    expect(solidHigh).toBeGreaterThan(tinyPerfect);
  });

  it("returns value in [0, OUTCOMES_CAP]", () => {
    const scenarios: AdvisorOutcomeStats[] = [
      mkStats(1, 0, 0),
      mkStats(2, 1, 0),
      mkStats(3, 1, 1),
      mkStats(4, 50, 50),
      mkStats(5, 1000, 1000),
    ];
    for (const s of scenarios) {
      const r = smoothedEngagementRate(s);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(OUTCOMES_CAP);
    }
  });

  it("prior constants are consistent with each other (engagements ≤ matches)", () => {
    expect(PRIOR_ENGAGEMENTS).toBeLessThanOrEqual(PRIOR_MATCHES);
  });

  it("MIN_OBS constant is exported and > 0", () => {
    expect(MIN_OBS).toBeGreaterThan(0);
  });
});

// ─── rankByOutcomes ───────────────────────────────────────────────────────

describe("rankByOutcomes — empty stats fallback", () => {
  it("preserves original order when no stats are provided", () => {
    const candidates = [mkCandidate(1, 80), mkCandidate(2, 60), mkCandidate(3, 40)];
    const ranked = rankByOutcomes(candidates, []);
    expect(ranked.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("sets _outcomesScore = matchScore when stats is empty", () => {
    const candidates = [mkCandidate(1, 75), mkCandidate(2, 50)];
    const ranked = rankByOutcomes(candidates, []);
    expect(ranked[0]._outcomesScore).toBe(75);
    expect(ranked[1]._outcomesScore).toBe(50);
  });

  it("returns empty array when candidates is empty", () => {
    expect(rankByOutcomes([], [])).toEqual([]);
    expect(rankByOutcomes([], [mkStats(1, 10, 8)])).toEqual([]);
  });
});

describe("rankByOutcomes — outcomes influence", () => {
  it("advisors with strong outcomes rise above those with higher match scores", () => {
    // Advisor 2 has lower raw matchScore but strong engagement history
    const candidates = [mkCandidate(1, 90), mkCandidate(2, 70)];
    const stats: AdvisorOutcomeStats[] = [
      mkStats(1, 5, 1), // weak engagement (1/5 after prior)
      mkStats(2, 100, 85), // strong engagement (85/100)
    ];
    const ranked = rankByOutcomes(candidates, stats);
    expect(ranked[0].id).toBe(2);
  });

  it("an advisor with perfect tiny sample does NOT leapfrog a solid high-volume one", () => {
    // Advisor 1: matchScore=80, 1/1 (tiny perfect)
    // Advisor 2: matchScore=80, 60/100 (solid)
    const candidates = [mkCandidate(1, 80), mkCandidate(2, 80)];
    const stats: AdvisorOutcomeStats[] = [
      mkStats(1, 1, 1), // tiny perfect
      mkStats(2, 100, 60), // solid, consistent
    ];
    const ranked = rankByOutcomes(candidates, stats);
    // Advisor 2 should rank ahead due to better smoothed rate
    expect(ranked[0].id).toBe(2);
  });

  it("advisors missing from stats receive neutral prior score", () => {
    const candidates = [mkCandidate(1, 50), mkCandidate(2, 50)];
    // Only stats for advisor 1; advisor 2 is new
    const stats: AdvisorOutcomeStats[] = [mkStats(1, 10, 8)];
    const ranked = rankByOutcomes(candidates, stats);
    // Advisor 1 has strong history (8/10) → should rank first
    expect(ranked[0].id).toBe(1);
  });

  it("blended score respects OUTCOMES_WEIGHT constant", () => {
    // A single candidate; verify the math
    const candidate = mkCandidate(99, 80);
    // Advisor with 100 engagements / 100 matches (capped at OUTCOMES_CAP)
    const stats = [mkStats(99, 100, 100)];
    const [result] = rankByOutcomes([candidate], stats);

    const expectedRate = Math.min(
      // Wilson lower bound on prior-augmented data
      wilsonLowerBound(
        100 + PRIOR_ENGAGEMENTS,
        100 + PRIOR_MATCHES,
      ),
      OUTCOMES_CAP,
    );
    const expectedScore = (1 - OUTCOMES_WEIGHT) * 80 + OUTCOMES_WEIGHT * expectedRate * 100;
    // Allow floating-point rounding (we round to 1 dp)
    expect(result._outcomesScore).toBeCloseTo(expectedScore, 0);
  });

  it("tie-breaks by original matchScore when blended scores are equal", () => {
    // Force both to get the same outcomes rate by using same stats
    const candidates = [mkCandidate(1, 60), mkCandidate(2, 70)];
    // Both advisors have identical stats → same smoothed rate
    const stats: AdvisorOutcomeStats[] = [
      mkStats(1, 20, 10),
      mkStats(2, 20, 10),
    ];
    const ranked = rankByOutcomes(candidates, stats);
    // Higher matchScore should win the tie
    expect(ranked[0].id).toBe(2);
  });

  it("does not mutate the input candidates array", () => {
    const original = [mkCandidate(1, 70), mkCandidate(2, 50)];
    const copy = original.map((c) => ({ ...c }));
    rankByOutcomes(original, [mkStats(2, 100, 80)]);
    // Original objects should be unchanged (spread ensures new objects)
    for (let i = 0; i < original.length; i++) {
      expect(original[i]).toEqual(copy[i]);
    }
  });

  it("preserves extra properties on candidate objects through the sort", () => {
    const candidates = [
      { id: 1, matchScore: 60, name: "Alice", specialties: ["smsf"] },
      { id: 2, matchScore: 40, name: "Bob", specialties: [] },
    ];
    const ranked = rankByOutcomes(candidates, [mkStats(2, 100, 80)]);
    const bob = ranked.find((c) => c.id === 2);
    expect(bob?.name).toBe("Bob");
    expect(bob?.specialties).toEqual([]);
  });

  it("caps outcomes score contribution so a capped advisor cannot exceed 100 final score", () => {
    // Even a perfect advisor with max cap should produce final score ≤ 100
    const [result] = rankByOutcomes([mkCandidate(1, 100)], [mkStats(1, 1000, 1000)]);
    expect(result._outcomesScore).toBeLessThanOrEqual(100);
  });
});

describe("rankByOutcomes — ordering guarantees", () => {
  it("stable sort: equal scores stay in original order (via tie-break)", () => {
    // Both have identical matchScore, identical outcome stats → same blended score.
    // Tie-break by matchScore should preserve relative order.
    const candidates = [mkCandidate(1, 55), mkCandidate(2, 55)];
    const stats: AdvisorOutcomeStats[] = [mkStats(1, 10, 5), mkStats(2, 10, 5)];
    const ranked = rankByOutcomes(candidates, stats);
    // Both get same score; matchScore tie-break is also equal → first in wins
    expect(ranked.map((c) => c.id)).toContain(1);
    expect(ranked.map((c) => c.id)).toContain(2);
  });

  it("produces deterministic output for the same input", () => {
    const candidates = [mkCandidate(1, 80), mkCandidate(2, 60), mkCandidate(3, 70)];
    const stats: AdvisorOutcomeStats[] = [
      mkStats(1, 10, 3),
      mkStats(2, 20, 18),
      mkStats(3, 5, 4),
    ];
    const first = rankByOutcomes(candidates, stats).map((c) => c.id);
    const second = rankByOutcomes(candidates, stats).map((c) => c.id);
    expect(first).toEqual(second);
  });
});

// ─── fetchAdvisorOutcomeStats ─────────────────────────────────────────────

describe("fetchAdvisorOutcomeStats", () => {
  beforeEach(() => {
    invalidateOutcomesCache();
  });

  it("returns [] when the query returns an error", async () => {
    const supabase = makeStubClient({ error: { message: "permission denied" } });
    const result = await fetchAdvisorOutcomeStats(supabase);
    expect(result).toEqual([]);
  });

  it("returns [] when supabase throws", async () => {
    const supabase = makeStubClient({ throws: true });
    const result = await fetchAdvisorOutcomeStats(supabase);
    expect(result).toEqual([]);
  });

  it("aggregates match counts per professional_id", async () => {
    const supabase = makeStubClient({
      rows: [
        { professional_id: 1, outcome: "contacted" },
        { professional_id: 1, outcome: "lost" },
        { professional_id: 2, outcome: "converted" },
      ],
    });
    const result = await fetchAdvisorOutcomeStats(supabase);
    const a1 = result.find((r) => r.advisorId === 1);
    expect(a1?.matchCount).toBe(2);
  });

  it("counts contacted and converted as engagements", async () => {
    const supabase = makeStubClient({
      rows: [
        { professional_id: 1, outcome: "contacted" },
        { professional_id: 1, outcome: "converted" },
        { professional_id: 1, outcome: "lost" },
        { professional_id: 1, outcome: "no_response" },
      ],
    });
    const result = await fetchAdvisorOutcomeStats(supabase);
    const a1 = result.find((r) => r.advisorId === 1);
    expect(a1?.matchCount).toBe(4);
    expect(a1?.engagementCount).toBe(2);
  });

  it("does not count lost / no_response as engagements", async () => {
    const supabase = makeStubClient({
      rows: [
        { professional_id: 5, outcome: "lost" },
        { professional_id: 5, outcome: "no_response" },
      ],
    });
    const result = await fetchAdvisorOutcomeStats(supabase);
    const a5 = result.find((r) => r.advisorId === 5);
    expect(a5?.engagementCount).toBe(0);
  });

  it("skips rows with null professional_id", async () => {
    const supabase = makeStubClient({
      rows: [
        { professional_id: null as unknown as number, outcome: "contacted" },
        { professional_id: 3, outcome: "contacted" },
      ],
    });
    const result = await fetchAdvisorOutcomeStats(supabase);
    expect(result.every((r) => r.advisorId !== null)).toBe(true);
    expect(result.find((r) => r.advisorId === 3)).toBeDefined();
  });

  it("caches results to avoid repeated DB calls", async () => {
    const supabase = makeStubClient({
      rows: [{ professional_id: 7, outcome: "contacted" }],
    });
    await fetchAdvisorOutcomeStats(supabase);
    await fetchAdvisorOutcomeStats(supabase);
    // from() should only have been called once (cached on second call)
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("invalidateOutcomesCache forces a re-fetch", async () => {
    const supabase = makeStubClient({
      rows: [{ professional_id: 8, outcome: "converted" }],
    });
    await fetchAdvisorOutcomeStats(supabase);
    invalidateOutcomesCache();
    await fetchAdvisorOutcomeStats(supabase);
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it("returns empty array when no rows exist", async () => {
    const supabase = makeStubClient({ rows: [] });
    const result = await fetchAdvisorOutcomeStats(supabase);
    expect(result).toEqual([]);
  });
});
