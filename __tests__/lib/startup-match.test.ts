import { describe, it, expect } from "vitest";
import {
  scoreRound,
  rankRounds,
  raisedPct,
  formatAud,
  type OpenRound,
  type StartupProfileSnippet,
  type StartupThesis,
} from "@/lib/startup-match";

function makeRound(overrides: Partial<OpenRound> = {}): OpenRound {
  return {
    id: "r1",
    startup_id: "s1",
    instrument: "safe",
    target_aud_cents: 1_000_000_00, // $1M
    raised_aud_cents: 250_000_00,   // $250K
    min_ticket_aud_cents: 10_000_00, // $10K
    wholesale_only: false,
    closes_at: "2026-12-31T00:00:00Z",
    ...overrides,
  };
}

function makeProfile(overrides: Partial<StartupProfileSnippet> = {}): StartupProfileSnippet {
  return {
    id: "s1",
    company_name: "AcmeTech",
    slug: "acmetech",
    sector: ["FinTech", "SaaS"],
    stage: "seed",
    status: "active",
    esic_eligible_self_attested: false,
    esic_verified_at: null,
    ...overrides,
  };
}

describe("scoreRound", () => {
  it("returns score 0 and no sector matches when thesis is empty", () => {
    const result = scoreRound(makeRound(), makeProfile(), {}, false);
    expect(result.blockedReason).toBeNull();
    expect(result.sectorMatches).toHaveLength(0);
    // stage match (empty preferences ⇒ all match) + ticket compat
    expect(result.score).toBe(15 + 10); // 25
  });

  it("adds 10 per overlapping sector (case-insensitive)", () => {
    const thesis: StartupThesis = { sector_tags: ["fintech", "saas"] };
    const result = scoreRound(makeRound(), makeProfile({ sector: ["FinTech", "SaaS"] }), thesis, false);
    expect(result.sectorMatches).toHaveLength(2);
    expect(result.score).toBeGreaterThanOrEqual(20); // 2 sectors × 10
  });

  it("normalises AI/ML to ai_ml for comparison", () => {
    const thesis: StartupThesis = { sector_tags: ["ai_ml"] };
    const result = scoreRound(makeRound(), makeProfile({ sector: ["AI/ML"] }), thesis, false);
    expect(result.sectorMatches).toHaveLength(1);
  });

  it("caps sector score at 50 (5+ matches)", () => {
    const thesis: StartupThesis = {
      sector_tags: ["fintech", "saas", "healthtech", "deeptech", "cleantech", "edtech"],
    };
    const profile = makeProfile({
      sector: ["FinTech", "SaaS", "HealthTech", "DeepTech", "CleanTech", "EdTech"],
    });
    const result = scoreRound(makeRound(), profile, thesis, false);
    // sector capped at 50
    expect(result.score).toBeLessThanOrEqual(80); // 50 + 15 + 5(if esic) + 10
  });

  it("adds 15 for matching stage preference", () => {
    const thesis: StartupThesis = { stage_preferences: ["seed"] };
    const result = scoreRound(makeRound(), makeProfile({ stage: "seed" }), thesis, false);
    expect(result.score).toBeGreaterThanOrEqual(15);
  });

  it("no stage bonus when stage not in preferences", () => {
    const thesis: StartupThesis = { stage_preferences: ["series_a"] };
    const result = scoreRound(makeRound(), makeProfile({ stage: "seed" }), thesis, false);
    // stage doesn't match → no +15
    const noStageResult = scoreRound(makeRound(), makeProfile({ stage: "seed" }), {}, false);
    expect(result.score).toBeLessThan(noStageResult.score);
  });

  it("adds 5 bonus for ESIC-eligible startup", () => {
    const thesis: StartupThesis = {};
    const withEsic = scoreRound(makeRound(), makeProfile({ esic_eligible_self_attested: true }), thesis, false);
    const noEsic = scoreRound(makeRound(), makeProfile({ esic_eligible_self_attested: false }), thesis, false);
    expect(withEsic.score - noEsic.score).toBe(5);
  });

  it("adds 10 ticket compat bonus when min_ticket <= thesis max", () => {
    const thesis: StartupThesis = { max_ticket_aud: 50_000 }; // $50K
    const result = scoreRound(makeRound({ min_ticket_aud_cents: 10_000_00 }), makeProfile(), thesis, false);
    // min_ticket ($10K) <= thesis max ($50K) → compat bonus
    expect(result.score).toBeGreaterThanOrEqual(10);
  });

  it("no ticket compat bonus when min_ticket exceeds thesis max", () => {
    const thesis: StartupThesis = { max_ticket_aud: 5_000 }; // $5K
    const result = scoreRound(makeRound({ min_ticket_aud_cents: 50_000_00 }), makeProfile(), thesis, false);
    const resultNoMax = scoreRound(makeRound({ min_ticket_aud_cents: 50_000_00 }), makeProfile(), {}, false);
    expect(result.score).toBeLessThan(resultNoMax.score);
  });

  it("blocks wholesale_only round when not verified", () => {
    const result = scoreRound(
      makeRound({ wholesale_only: true }),
      makeProfile(),
      {},
      false, // not verified
    );
    expect(result.blockedReason).toBe("wholesale_only");
  });

  it("allows wholesale_only round when verified", () => {
    const result = scoreRound(
      makeRound({ wholesale_only: true }),
      makeProfile(),
      {},
      true, // verified
    );
    expect(result.blockedReason).toBeNull();
  });
});

describe("rankRounds", () => {
  it("returns empty array when no rounds", () => {
    expect(rankRounds([], [], {}, false)).toHaveLength(0);
  });

  it("omits rounds with no matching profile", () => {
    const round = makeRound({ startup_id: "unknown" });
    const profile = makeProfile({ id: "s1" });
    const result = rankRounds([round], [profile], {}, false);
    expect(result).toHaveLength(0);
  });

  it("omits inactive startups", () => {
    const round = makeRound();
    const profile = makeProfile({ status: "draft" });
    const result = rankRounds([round], [profile], {}, false);
    expect(result).toHaveLength(0);
  });

  it("omits wholesale_only rounds for non-verified investors", () => {
    const round = makeRound({ wholesale_only: true });
    const profile = makeProfile();
    const result = rankRounds([round], [profile], {}, false);
    expect(result).toHaveLength(0);
  });

  it("sorts higher-scoring rounds first", () => {
    const roundA = makeRound({ id: "rA", startup_id: "sA" });
    const roundB = makeRound({ id: "rB", startup_id: "sB" });
    const profileA = makeProfile({ id: "sA", sector: ["FinTech"] });
    const profileB = makeProfile({ id: "sB", sector: ["Other"] });
    const thesis: StartupThesis = { sector_tags: ["fintech"] };
    const result = rankRounds([roundB, roundA], [profileA, profileB], thesis, false);
    expect(result[0]?.round.id).toBe("rA"); // higher sector match
  });

  it("breaks score ties by closes_at ascending", () => {
    const r1 = makeRound({ id: "r1", startup_id: "s1", closes_at: "2026-11-01T00:00:00Z" });
    const r2 = makeRound({ id: "r2", startup_id: "s2", closes_at: "2026-09-01T00:00:00Z" });
    const p1 = makeProfile({ id: "s1" });
    const p2 = makeProfile({ id: "s2" });
    const result = rankRounds([r1, r2], [p1, p2], {}, false);
    // Equal scores → earlier close first
    expect(result[0]?.round.id).toBe("r2");
  });
});

describe("raisedPct", () => {
  it("returns 0 for zero target", () => {
    expect(raisedPct(makeRound({ target_aud_cents: 0, raised_aud_cents: 0 }))).toBe(0);
  });

  it("caps at 100 when over-raised", () => {
    expect(raisedPct(makeRound({ target_aud_cents: 100, raised_aud_cents: 200 }))).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(raisedPct(makeRound({ target_aud_cents: 300, raised_aud_cents: 100 }))).toBe(33);
  });
});

describe("formatAud", () => {
  it("formats millions", () => {
    expect(formatAud(2_000_000_00)).toBe("$2.0M");
  });

  it("formats thousands", () => {
    expect(formatAud(250_000_00)).toBe("$250K");
  });

  it("formats sub-thousand", () => {
    expect(formatAud(500_00)).toBe("$500");
  });
});
