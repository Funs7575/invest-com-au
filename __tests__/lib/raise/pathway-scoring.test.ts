import { describe, it, expect } from "vitest";
import {
  scorePathways,
  type PathwayAnswers,
} from "@/lib/raise/pathway-scoring";
import { PATHWAY_IDS, PATHWAYS } from "@/lib/raise/pathways";

/** A neutral baseline — every judgment answer is "not sure" / mid. */
const base: PathwayAnswers = {
  structure: "company",
  stage: "early_revenue",
  revenue: "100k_1m",
  amount: "250k_1m",
  timeline: "six_twelve",
  equity: "not_sure",
  rd: "not_sure",
  security: "not_sure",
  audience: "not_sure",
  exit: "not_sure",
};

const find = (results: ReturnType<typeof scorePathways>, id: string) => {
  const row = results.find((r) => r.pathway === id);
  if (!row) throw new Error(`pathway ${id} missing from results`);
  return row;
};

describe("scorePathways — output invariants", () => {
  it("returns all 7 pathways, sorted by score desc, scores clamped 0–100", () => {
    const results = scorePathways(base);
    expect(results).toHaveLength(PATHWAY_IDS.length);
    expect(new Set(results.map((r) => r.pathway)).size).toBe(PATHWAY_IDS.length);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.reasons.length).toBeLessThanOrEqual(4);
      expect(r.cautions.length).toBeLessThanOrEqual(3);
    }
  });

  it("never crashes on an all-not-sure profile and keeps floor pathways visible", () => {
    const results = scorePathways({
      ...base,
      structure: "not_started",
      stage: "idea",
      revenue: "none",
      amount: "under_50k",
      timeline: "flexible",
    });
    expect(results).toHaveLength(7);
    // Bootstrap and grants have base floors — they should be eligible options.
    expect(find(results, "bootstrap").eligible).toBe(true);
    expect(find(results, "grants").eligible).toBe(true);
  });

  it("marks ineligible pathways with score 0, long_shot fit and a factual reason", () => {
    const results = scorePathways({ ...base, structure: "sole_trader" });
    const csf = find(results, "csf");
    expect(csf.eligible).toBe(false);
    expect(csf.score).toBe(0);
    expect(csf.fit).toBe("long_shot");
    expect(csf.cautions.join(" ")).toMatch(/compan/i);
  });
});

describe("scorePathways — regime gates", () => {
  it("CSF requires a company", () => {
    for (const structure of ["sole_trader", "partnership_trust", "not_started"] as const) {
      const csf = find(scorePathways({ ...base, structure }), "csf");
      expect(csf.eligible).toBe(false);
    }
  });

  it("CSF is ineligible above the $25M revenue cap", () => {
    const csf = find(scorePathways({ ...base, revenue: "over_25m" }), "csf");
    expect(csf.eligible).toBe(false);
    expect(csf.cautions.join(" ")).toMatch(/\$25M/);
  });

  it("VC requires a company", () => {
    const vc = find(scorePathways({ ...base, structure: "sole_trader" }), "vc");
    expect(vc.eligible).toBe(false);
  });

  it("debt is ineligible for idea-stage with no revenue and no security", () => {
    const debt = find(
      scorePathways({ ...base, stage: "idea", revenue: "none", security: "none" }),
      "debt",
    );
    expect(debt.eligible).toBe(false);
  });

  it("sale is ineligible when the owner is focused on growth", () => {
    const sale = find(scorePathways({ ...base, exit: "grow" }), "sale");
    expect(sale.eligible).toBe(false);
  });
});

describe("scorePathways — routing quality", () => {
  it("routes a consumer brand with fans to CSF as the top strong match", () => {
    const results = scorePathways({
      ...base,
      audience: "consumer_fans",
      equity: "open",
      stage: "growing",
    });
    expect(results[0]!.pathway).toBe("csf");
    expect(results[0]!.fit).toBe("strong");
    expect(results[0]!.reasons.join(" ")).toMatch(/communit/i);
  });

  it("routes an asset-backed established business that wants control to debt", () => {
    const results = scorePathways({
      ...base,
      stage: "established",
      revenue: "1m_5m",
      security: "hard_assets",
      equity: "keep_full",
      timeline: "urgent",
      amount: "50k_250k",
    });
    expect(results[0]!.pathway).toBe("debt");
    expect(results[0]!.fit).toBe("strong");
  });

  it("routes novel R&D to grants as a strong fit even pre-revenue", () => {
    const grants = find(
      scorePathways({ ...base, rd: "novel", stage: "pre_revenue", revenue: "none" }),
      "grants",
    );
    expect(grants.fit).toBe("strong");
    expect(grants.reasons.join(" ")).toMatch(/R&D/);
  });

  it("routes a large high-growth round to VC, with an urgency caution when rushed", () => {
    const results = scorePathways({
      ...base,
      amount: "1m_5m",
      rd: "novel",
      stage: "growing",
      revenue: "1m_5m",
      equity: "prefer_equity",
      timeline: "urgent",
    });
    const vc = find(results, "vc");
    expect(vc.fit).toBe("strong");
    expect(vc.cautions.join(" ")).toMatch(/months/i);
  });

  it("routes an owner who wants out to sale as the top match", () => {
    const results = scorePathways({
      ...base,
      exit: "exit_now",
      stage: "established",
      revenue: "5m_25m",
    });
    expect(results[0]!.pathway).toBe("sale");
    expect(results[0]!.fit).toBe("strong");
  });

  it("keeps full-ownership preferences honest: equity pathways carry dilution cautions", () => {
    const results = scorePathways({ ...base, equity: "keep_full", audience: "consumer_fans" });
    expect(find(results, "csf").cautions.join(" ")).toMatch(/ownership|shareholders/i);
    expect(find(results, "vc").cautions.join(" ")).toMatch(/ownership|%/);
    expect(find(results, "angel").cautions.join(" ")).toMatch(/dilut/i);
  });

  it("small angel-sized rounds rank angels ahead of VC", () => {
    const results = scorePathways({
      ...base,
      amount: "50k_250k",
      stage: "pre_revenue",
      revenue: "none",
      equity: "open",
    });
    const angel = find(results, "angel");
    const vc = find(results, "vc");
    expect(angel.score).toBeGreaterThan(vc.score);
    expect(vc.cautions.join(" ")).toMatch(/angel/i);
  });
});

describe("pathway registry integrity", () => {
  it("every pathway has complete metadata and resolvable next-step hrefs", () => {
    for (const id of PATHWAY_IDS) {
      const meta = PATHWAYS[id];
      expect(meta.id).toBe(id);
      expect(meta.label.length).toBeGreaterThan(3);
      expect(meta.definition.length).toBeGreaterThan(40);
      expect(meta.eligibilityFacts.length).toBeGreaterThan(0);
      expect(meta.watchOuts.length).toBeGreaterThan(0);
      expect(meta.nextSteps.length).toBeGreaterThan(0);
      for (const step of meta.nextSteps) {
        expect(step.href.startsWith("/")).toBe(true);
      }
      expect(meta.guideSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
