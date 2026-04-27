import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  scoreAdvisor,
  rankAdvisors,
  getLatestQualityWeights,
  invalidateQualityWeightsCache,
  type AdvisorForRanking,
  type QualityWeight,
} from "@/lib/advisor-ranker";
import type { SupabaseClient } from "@supabase/supabase-js";

function mkAdvisor(overrides: Partial<AdvisorForRanking> = {}): AdvisorForRanking {
  return {
    id: 1,
    rating: 4.0,
    review_count: 5,
    verified: true,
    status: "active",
    auto_pause_reason: null,
    profile_quality_gate: "passed",
    profile_gate_step: null,
    median_response_hours: 4,
    recent_lead_count: 5,
    recent_dispute_count: 0,
    is_sponsored: false,
    ...overrides,
  };
}

describe("scoreAdvisor", () => {
  it("returns 0 for paused advisors with any reason", () => {
    expect(
      scoreAdvisor(mkAdvisor({ status: "paused", auto_pause_reason: "afsl_ceased" }), []),
    ).toBe(0);
  });

  it("returns 0 for inactive advisors", () => {
    expect(scoreAdvisor(mkAdvisor({ status: "inactive" }), [])).toBe(0);
  });

  it("scores a solid advisor above a weak one", () => {
    const strong = scoreAdvisor(
      mkAdvisor({
        rating: 4.8,
        review_count: 50,
        verified: true,
        median_response_hours: 1,
        recent_dispute_count: 0,
        profile_quality_gate: "passed",
      }),
      [],
    );
    const weak = scoreAdvisor(
      mkAdvisor({
        rating: 3.2,
        review_count: 1,
        verified: false,
        median_response_hours: 30,
        recent_dispute_count: 3,
        profile_quality_gate: "pending",
      }),
      [],
    );
    expect(strong).toBeGreaterThan(weak);
  });

  it("rewards the highest-rated advisor most", () => {
    const a = scoreAdvisor(mkAdvisor({ rating: 4.9 }), []);
    const b = scoreAdvisor(mkAdvisor({ rating: 3.8 }), []);
    expect(a).toBeGreaterThan(b);
  });

  it("applies a sponsored boost when flagged", () => {
    const normal = scoreAdvisor(mkAdvisor(), []);
    const sponsored = scoreAdvisor(mkAdvisor({ is_sponsored: true, sponsored_boost: 15 }), []);
    expect(sponsored).toBeGreaterThan(normal);
  });

  it("penalises advisors with an auto-pause reason (but doesn't zero them)", () => {
    const clean = scoreAdvisor(mkAdvisor(), [], { compliancePenalty: 10 });
    const flaggedActive = scoreAdvisor(
      mkAdvisor({ auto_pause_reason: "sla_miss" }),
      [],
      { compliancePenalty: 10 },
    );
    expect(flaggedActive).toBeLessThan(clean);
    expect(flaggedActive).toBeGreaterThanOrEqual(0);
  });

  it("uses learned weights when present", () => {
    const weights: QualityWeight[] = [
      { signal_name: "rating_high", weight: 50 },
      { signal_name: "response_fast", weight: 50 },
    ];
    const withLearned = scoreAdvisor(
      mkAdvisor({ rating: 4.9, median_response_hours: 1 }),
      weights,
    );
    const withDefaults = scoreAdvisor(
      mkAdvisor({ rating: 4.9, median_response_hours: 1 }),
      [],
    );
    // Learned higher-weight signals should produce a higher normalised score
    expect(withLearned).toBeGreaterThanOrEqual(withDefaults);
  });
});

describe("rankAdvisors", () => {
  it("sorts descending by score", () => {
    const a = mkAdvisor({ id: 1, rating: 4.9, review_count: 50, median_response_hours: 1 });
    const b = mkAdvisor({ id: 2, rating: 3.5, review_count: 2, median_response_hours: 48 });
    const ranked = rankAdvisors([b, a], []);
    expect(ranked[0].id).toBe(1);
    expect(ranked[1].id).toBe(2);
    expect(ranked[0]._rankScore).toBeGreaterThan(ranked[1]._rankScore);
  });

  it("breaks ties by rating then review_count", () => {
    const a = mkAdvisor({ id: 1, rating: 4.9, review_count: 20 });
    const b = mkAdvisor({ id: 2, rating: 4.9, review_count: 5 });
    const ranked = rankAdvisors([b, a], []);
    expect(ranked[0].id).toBe(1);
  });

  it("puts inactive / paused advisors last", () => {
    const active = mkAdvisor({ id: 1, rating: 3.0 });
    const paused = mkAdvisor({ id: 2, rating: 5.0, status: "paused", auto_pause_reason: "afsl_ceased" });
    const ranked = rankAdvisors([paused, active], []);
    expect(ranked[0].id).toBe(1);
  });

  it("applies specialty match boost from options", () => {
    const a = scoreAdvisor(mkAdvisor({ rating: 4.0 }), [], {
      specialtyMatchBoost: 30,
    });
    const b = scoreAdvisor(mkAdvisor({ rating: 4.0 }), [], {});
    expect(a).toBeGreaterThan(b);
  });

  it("caps sponsored boost at 20", () => {
    const a = scoreAdvisor(
      mkAdvisor({ is_sponsored: true, sponsored_boost: 100 }),
      [],
    );
    const b = scoreAdvisor(
      mkAdvisor({ is_sponsored: true, sponsored_boost: 20 }),
      [],
    );
    expect(a).toBe(b);
  });
});

describe("getLatestQualityWeights", () => {
  // Build a minimal Supabase-like stub. Each call to .from() returns a
  // chainable builder whose terminal methods (maybeSingle, then) resolve
  // with whatever the test provides via `wires`.
  function makeStubClient(wires: {
    latest?: { data: { model_version: number } | null };
    rows?: { data: Array<{ signal_name: string; weight: number }> | null };
    throws?: boolean;
  }): SupabaseClient {
    const fromImpl = vi.fn(() => {
      if (wires.throws) {
        throw new Error("DB exploded");
      }
      const builder: Record<string, unknown> = {};
      const chain = ["select", "eq", "order", "limit"];
      for (const m of chain) {
        builder[m] = vi.fn(() => builder);
      }
      builder.maybeSingle = vi.fn(() =>
        Promise.resolve({
          data: wires.latest?.data ?? null,
          error: null,
        }),
      );
      builder.then = vi.fn(
        (cb: (v: { data: unknown; error: null }) => void) => {
          cb({
            data: wires.rows?.data ?? [],
            error: null,
          });
          return Promise.resolve();
        },
      );
      return builder;
    });
    return { from: fromImpl } as unknown as SupabaseClient;
  }

  beforeEach(() => {
    invalidateQualityWeightsCache();
  });

  it("returns [] when no model_version is found", async () => {
    const supabase = makeStubClient({ latest: { data: null } });
    const result = await getLatestQualityWeights(supabase);
    expect(result).toEqual([]);
  });

  it("returns weights from the latest model_version", async () => {
    const supabase = makeStubClient({
      latest: { data: { model_version: 7 } },
      rows: {
        data: [
          { signal_name: "rating_high", weight: 40 },
          { signal_name: "response_fast", weight: 25 },
        ],
      },
    });
    const result = await getLatestQualityWeights(supabase);
    expect(result).toEqual([
      { signal_name: "rating_high", weight: 40 },
      { signal_name: "response_fast", weight: 25 },
    ]);
  });

  it("caches results across calls within the TTL", async () => {
    const supabase = makeStubClient({
      latest: { data: { model_version: 9 } },
      rows: {
        data: [{ signal_name: "verified_badge", weight: 12 }],
      },
    });
    const first = await getLatestQualityWeights(supabase);
    const second = await getLatestQualityWeights(supabase);
    expect(first).toEqual(second);
    // from() should have been called twice in the first invocation
    // (latest + rows) but NOT again on the second (cached)
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      2,
    );
  });

  it("invalidateQualityWeightsCache forces a re-fetch", async () => {
    const supabase = makeStubClient({
      latest: { data: { model_version: 9 } },
      rows: {
        data: [{ signal_name: "verified_badge", weight: 12 }],
      },
    });
    await getLatestQualityWeights(supabase);
    invalidateQualityWeightsCache();
    await getLatestQualityWeights(supabase);
    expect((supabase.from as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      4,
    );
  });

  it("returns [] gracefully when supabase throws", async () => {
    const supabase = makeStubClient({ throws: true });
    const result = await getLatestQualityWeights(supabase);
    expect(result).toEqual([]);
  });

  it("coerces non-numeric weight values to 0", async () => {
    const supabase = makeStubClient({
      latest: { data: { model_version: 1 } },
      rows: {
        data: [
          { signal_name: "rating_high", weight: "not-a-number" as unknown as number },
        ],
      },
    });
    const result = await getLatestQualityWeights(supabase);
    expect(result[0].weight).toBe(0);
  });
});
