import { describe, it, expect } from "vitest";
import {
  resolveDripLane,
  selectDripVariant,
} from "@/lib/getmatched/drip-lane";

describe("resolveDripLane — answer-driven hero", () => {
  it("hero advisor when the user named a professional", () => {
    expect(resolveDripLane({ answers: { help_sub: "financial-planner" } })).toBe("advisor");
  });

  it("hero listings when the user wanted to browse opportunities", () => {
    expect(resolveDripLane({ answers: { intent: "alt_assets" } })).toBe("listings");
  });

  it("hero platforms for a DIY platform goal", () => {
    expect(resolveDripLane({ answers: { intent: "trade" } })).toBe("platforms");
  });

  it("falls back to default for an education-led researcher with no lane signal", () => {
    // researching inverts to education-first; education maps to default.
    expect(
      resolveDripLane({ answers: { intent: "not_sure", timeline: "researching" } }),
    ).toBe("default");
  });
});

describe("resolveDripLane — route fallback when answers are absent", () => {
  it("advisor for individual / firm / expert_team / second_opinion routes", () => {
    expect(resolveDripLane({ route: "individual" })).toBe("advisor");
    expect(resolveDripLane({ route: "firm" })).toBe("advisor");
    expect(resolveDripLane({ route: "expert_team" })).toBe("advisor");
    expect(resolveDripLane({ route: "second_opinion" })).toBe("advisor");
  });

  it("listings for the browse route", () => {
    expect(resolveDripLane({ route: "browse" })).toBe("listings");
  });

  it("platforms for the compare route", () => {
    expect(resolveDripLane({ route: "compare" })).toBe("platforms");
  });

  it("default for brief / guide routes and unknown/null", () => {
    expect(resolveDripLane({ route: "investor_brief" })).toBe("default");
    expect(resolveDripLane({ route: "listing_brief" })).toBe("default");
    expect(resolveDripLane({ route: "guide" })).toBe("default");
    expect(resolveDripLane({ route: null })).toBe("default");
    expect(resolveDripLane({})).toBe("default");
  });

  it("prefers the answer-driven hero over the route", () => {
    // route says compare (platforms) but answers name a professional → advisor.
    expect(
      resolveDripLane({ route: "compare", answers: { help_sub: "tax-agent" } }),
    ).toBe("advisor");
  });

  it("uses route when answers resolve to a non-tailored (default) lane", () => {
    expect(
      resolveDripLane({ route: "browse", answers: { intent: "not_sure", timeline: "researching" } }),
    ).toBe("listings");
  });
});

describe("selectDripVariant — copy per lane", () => {
  it("advisor variant leads with the matched-professional angle", () => {
    const v = selectDripVariant({ route: "individual" });
    expect(v.lane).toBe("advisor");
    expect(v.subjectLead).toMatch(/professional/i);
    expect(v.intro).toMatch(/professional/i);
  });

  it("listings variant leads with new-matching-opportunities angle", () => {
    const v = selectDripVariant({ answers: { intent: "alt_assets" } });
    expect(v.lane).toBe("listings");
    expect(v.intro).toMatch(/opportunit/i);
  });

  it("platforms variant leads with the fee/comparison angle", () => {
    const v = selectDripVariant({ route: "compare" });
    expect(v.lane).toBe("platforms");
    expect(v.intro).toMatch(/fee|compar/i);
  });

  it("default variant keeps the original resume copy", () => {
    const v = selectDripVariant({ route: "guide" });
    expect(v.lane).toBe("default");
    expect(v.subjectLead).toBe("Pick up where you left off");
  });
});
