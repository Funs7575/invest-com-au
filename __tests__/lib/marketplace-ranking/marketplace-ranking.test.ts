import { describe, it, expect } from "vitest";
import {
  scoreProvider,
  sortByScore,
  type RankableProvider,
  type RankingWeights,
} from "@/lib/marketplace-ranking";

const W: RankingWeights = {
  verified: 10000,
  outcome_score: 8000,
  response_latency_inv: 4000,
  subscription_tier: 5000,
  rating: 3000,
};

describe("scoreProvider", () => {
  it("returns 0 for a totally empty provider", () => {
    expect(scoreProvider({ id: 1 }, W)).toBe(0);
  });

  it("gives a fully-loaded scale-tier verified pro the highest score", () => {
    const full: RankableProvider = {
      id: 1,
      verified: true,
      outcome_score: 100,
      response_latency_hours: 0,
      subscription_tier: "scale",
      rating: 5,
    };
    const empty: RankableProvider = { id: 2 };
    expect(scoreProvider(full, W)).toBeGreaterThan(scoreProvider(empty, W));
  });

  it("a verified pro outranks an unverified pro all else equal", () => {
    const verified: RankableProvider = { id: 1, verified: true, rating: 4 };
    const unverified: RankableProvider = { id: 2, verified: false, rating: 4 };
    expect(scoreProvider(verified, W)).toBeGreaterThan(
      scoreProvider(unverified, W),
    );
  });

  it("subscription tier raises score (scale > growth > starter > free)", () => {
    const base: RankableProvider = { id: 1, verified: true };
    const free = scoreProvider({ ...base, subscription_tier: "free" }, W);
    const starter = scoreProvider({ ...base, subscription_tier: "starter" }, W);
    const growth = scoreProvider({ ...base, subscription_tier: "growth" }, W);
    const scale = scoreProvider({ ...base, subscription_tier: "scale" }, W);
    expect(starter).toBeGreaterThan(free);
    expect(growth).toBeGreaterThan(starter);
    expect(scale).toBeGreaterThan(growth);
  });

  it("response_latency_inv: 0h is best, 48h+ is worst", () => {
    const fast: RankableProvider = {
      id: 1,
      verified: true,
      response_latency_hours: 0,
    };
    const slow: RankableProvider = {
      id: 2,
      verified: true,
      response_latency_hours: 100, // clamps to 1 → inv 0
    };
    expect(scoreProvider(fast, W)).toBeGreaterThan(scoreProvider(slow, W));
  });

  it("disabling a weight removes its contribution", () => {
    const noVerifiedWeight: RankingWeights = { ...W, verified: 0 };
    const verified: RankableProvider = { id: 1, verified: true, rating: 4 };
    const unverified: RankableProvider = { id: 2, verified: false, rating: 4 };
    expect(scoreProvider(verified, noVerifiedWeight)).toBe(
      scoreProvider(unverified, noVerifiedWeight),
    );
  });

  it("sortByScore returns highest-first stable ordering", () => {
    const providers: RankableProvider[] = [
      { id: 1, verified: false, rating: 3 },
      { id: 2, verified: true, rating: 5, subscription_tier: "scale" },
      { id: 3, verified: true, rating: 4, subscription_tier: "growth" },
    ];
    const sorted = sortByScore(providers, W);
    expect(sorted.map((p) => p.id)).toEqual([2, 3, 1]);
  });
});
