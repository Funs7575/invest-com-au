import { describe, it, expect } from "vitest";
import { resolveLanes, COMPOSITE_BAND } from "@/lib/getmatched/resolve-lanes";

describe("resolveLanes — base routing", () => {
  it("named professional → advisor hero", () => {
    const out = resolveLanes({ intent: "help", help_sub: "financial_planner", help_preference: "individual" });
    expect(out.hero).toBe("advisor");
  });

  it("browse intent → listings hero", () => {
    const out = resolveLanes({ intent: "alt_assets" });
    expect(out.hero).toBe("listings");
  });

  it("DIY compare goal → platforms hero", () => {
    const out = resolveLanes({ intent: "grow", help_preference: "compare" });
    expect(out.hero).toBe("platforms");
  });

  it("home → advisor hero (loan gates the purchase)", () => {
    expect(resolveLanes({ intent: "home" }).hero).toBe("advisor");
  });

  it("property physical → advisor hero WITH listings as a composite secondary", () => {
    const out = resolveLanes({ intent: "property", property_sub: "physical" });
    expect(out.hero).toBe("advisor");
    expect(out.secondary).toContain("listings");
  });
});

describe("resolveLanes — the edge-case table (each row pinned)", () => {
  it("conflicting signals: named professional + browse-ish preference → advisor hero, listings still secondary", () => {
    const out = resolveLanes({ intent: "alt_assets", help_sub: "tax_agent" });
    expect(out.hero).toBe("advisor");
    expect(out.secondary).toContain("listings");
  });

  it("total uncertainty → guided composite, NEVER an advisor hero (no hard lead push)", () => {
    const out = resolveLanes({ intent: "browse", help_preference: "not_sure" });
    expect(out.hero).not.toBe("advisor");
    expect(["education", "brief", "listings"]).toContain(out.hero);
    // The advisor lane survives as an option, just never the push.
    const advisor = out.lanes.find((l) => l.kind === "advisor");
    expect(advisor === undefined || advisor.weight <= 35).toBe(true);
  });

  it("urgent + uncertain → advisor leads (urgency wins), education demoted not hidden", () => {
    const out = resolveLanes({ intent: "help", help_preference: "individual", visa_status: "not_sure", timeline: "now" });
    expect(out.hero).toBe("advisor");
    const edu = out.lanes.find((l) => l.kind === "education");
    expect(edu).toBeDefined(); // demoted, still present
  });

  it("'researching' timeline → education hero; advisor heavily damped", () => {
    const out = resolveLanes({ intent: "help", help_preference: "individual", timeline: "researching" });
    expect(out.hero).toBe("education");
    const advisor = out.lanes.find((l) => l.kind === "advisor")!;
    const hero = out.lanes[0]!;
    expect(hero.weight - advisor.weight).toBeGreaterThan(0);
  });

  it("empty listing supply → lane demoted with an honest note and brief backfills", () => {
    const out = resolveLanes({ intent: "alt_assets" }, { listings: 0 });
    expect(out.hero).not.toBe("listings");
    const listings = out.lanes.find((l) => l.kind === "listings")!;
    expect(listings.weight).toBeLessThanOrEqual(15);
    expect(listings.reasons).toContain("Limited matching supply right now");
    const brief = out.lanes.find((l) => l.kind === "brief")!;
    expect(brief.reasons).toContain("Post a brief and let professionals come to you");
  });

  it("thin advisor supply → advisor demoted, never an empty hero", () => {
    const out = resolveLanes({ intent: "help", help_sub: "financial_planner" }, { advisor: 0 });
    expect(out.hero).not.toBe("advisor");
  });
});

describe("resolveLanes — invariants", () => {
  it("weights are clamped 0–100, lanes sorted desc, reasons factual strings", () => {
    const out = resolveLanes({ intent: "home", timeline: "now", help_sub: "mortgage_broker" });
    for (const l of out.lanes) {
      expect(l.weight).toBeGreaterThanOrEqual(0);
      expect(l.weight).toBeLessThanOrEqual(100);
      for (const reason of l.reasons) expect(typeof reason).toBe("string");
    }
    const weights = out.lanes.map((l) => l.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });

  it("secondary lanes are always within the composite band of the hero", () => {
    const out = resolveLanes({ intent: "property", property_sub: "physical", budget_band: "100k_500k" });
    const heroW = out.lanes[0]!.weight;
    for (const s of out.secondary) {
      const lane = out.lanes.find((l) => l.kind === s)!;
      expect(heroW - lane.weight).toBeLessThanOrEqual(COMPOSITE_BAND);
    }
  });

  it("empty answers still resolve (education/brief default; never throws)", () => {
    const out = resolveLanes({});
    expect(out.hero).toBeDefined();
    expect(out.lanes.length).toBeGreaterThan(0);
  });
});
