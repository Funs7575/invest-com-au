import { describe, it, expect } from "vitest";
import { routeQuizToVertical } from "@/lib/quiz-vertical-router";

describe("routeQuizToVertical — advisor track", () => {
  it("advisor + property → buyer's agents", () => {
    const r = routeQuizToVertical({ approach: "advisor", goal: "property" });
    expect(r.vertical).toBe("property");
    expect(r.nextPath).toBe("/property/buyer-agents");
  });

  it("advisor + super → super hub", () => {
    const r = routeQuizToVertical({ approach: "advisor", goal: "super" });
    expect(r.vertical).toBe("super");
    expect(r.nextPath).toBe("/super");
  });

  it("advisor + grow → find-advisor", () => {
    const r = routeQuizToVertical({ approach: "advisor", goal: "grow" });
    expect(r.vertical).toBe("advisors");
    expect(r.nextPath).toBe("/find-advisor");
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it("advisor with no goal → find-advisor", () => {
    const r = routeQuizToVertical({ approach: "advisor" });
    expect(r.vertical).toBe("advisors");
  });
});

describe("routeQuizToVertical — DIY track", () => {
  it("diy + crypto → crypto tab", () => {
    const r = routeQuizToVertical({ approach: "diy", goal: "crypto" });
    expect(r.vertical).toBe("crypto");
    expect(r.nextPath).toBe("/compare?tab=crypto");
  });

  it("diy + trade → brokers", () => {
    const r = routeQuizToVertical({ approach: "diy", goal: "trade" });
    expect(r.vertical).toBe("brokers");
    expect(r.nextPath).toBe("/compare");
  });

  it("diy + grow → brokers", () => {
    const r = routeQuizToVertical({ approach: "diy", goal: "grow" });
    expect(r.vertical).toBe("brokers");
  });

  it("diy + automate → robo-advisors", () => {
    const r = routeQuizToVertical({ approach: "diy", goal: "automate" });
    expect(r.vertical).toBe("robo");
    expect(r.nextPath).toBe("/robo-advisors");
  });

  it("diy + property-reit → ETF broker compare", () => {
    const r = routeQuizToVertical({ approach: "diy", goal: "property-reit" });
    expect(r.vertical).toBe("brokers");
    expect(r.nextPath).toBe("/compare?tab=etf");
  });
});

describe("routeQuizToVertical — property sub-types", () => {
  it("physical property default → buyer's agents", () => {
    const r = routeQuizToVertical({ goal: "property", propertySubType: "physical" });
    expect(r.vertical).toBe("property");
    expect(r.nextPath).toBe("/property/buyer-agents");
  });

  it("property via REIT → broker ETF tab", () => {
    const r = routeQuizToVertical({ goal: "property", propertySubType: "reit" });
    expect(r.vertical).toBe("brokers");
    expect(r.nextPath).toBe("/compare?tab=etf");
  });

  it("property via super → SMSF pathway", () => {
    const r = routeQuizToVertical({ goal: "property", propertySubType: "super" });
    expect(r.vertical).toBe("super");
    expect(r.nextPath).toBe("/super/smsf");
  });
});

describe("routeQuizToVertical — fallbacks", () => {
  it("empty answers → brokers with low confidence", () => {
    const r = routeQuizToVertical({});
    expect(r.vertical).toBe("brokers");
    expect(r.confidence).toBeLessThan(0.5);
  });

  it("unsure + goal → uses goal as signal", () => {
    const r = routeQuizToVertical({ approach: "unsure", goal: "grow" });
    expect(r.vertical).toBe("brokers");
    expect(r.reasons.some((s) => s.includes("defer"))).toBe(true);
  });

  it("reasons chain is populated", () => {
    const r = routeQuizToVertical({ approach: "advisor", goal: "grow" });
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});
