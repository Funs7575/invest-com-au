import { describe, it, expect } from "vitest";
import { buildPageRecommendation } from "@/lib/page-recommendations";

describe("buildPageRecommendation", () => {
  it("strips the 'investors' suffix from labels in titles", () => {
    const rec = buildPageRecommendation("advisors", "UK investors", true);
    expect(rec).not.toBeNull();
    expect(rec!.title).toBe("Cross-border tax accountants for UK clients");
    expect(rec!.title).not.toMatch(/investors/);
  });

  it("returns the high-friction invest variant when isHighFriction is true", () => {
    const rec = buildPageRecommendation("invest", "UK investors", true);
    expect(rec).not.toBeNull();
    expect(rec!.title).toContain("FIRB-eligible new properties");
    expect(rec!.title).toContain("UK");
    expect(rec!.body).toContain("2025–2027 ban");
    expect(rec!.href).toBe("/invest?firb=eligible");
    expect(rec!.cta).toBe("FIRB-eligible only");
  });

  it("returns the low-friction invest variant when isHighFriction is false", () => {
    const rec = buildPageRecommendation("invest", "NZ investors", false);
    expect(rec).not.toBeNull();
    expect(rec!.title).toContain("New properties and FIRB-eligible listings");
    expect(rec!.body).toContain("trans-Tasman");
    // Same CTA target — low-friction users still benefit from the FIRB-eligible filter.
    expect(rec!.href).toBe("/invest?firb=eligible");
  });

  it("returns the compare surface CTA pointing to /compare/non-residents", () => {
    const rec = buildPageRecommendation("compare", "US investors", true);
    expect(rec).not.toBeNull();
    expect(rec!.href).toBe("/compare/non-residents");
    expect(rec!.cta).toBe("Non-resident brokers");
  });

  it("returns the advisors surface CTA pointing to international tax specialists", () => {
    const rec = buildPageRecommendation("advisors", "SG investors", true);
    expect(rec).not.toBeNull();
    expect(rec!.href).toBe("/advisors/international-tax-specialists");
    expect(rec!.cta).toBe("Specialist advisors");
  });

  it("handles labels without the 'investors' suffix gracefully", () => {
    const rec = buildPageRecommendation("advisors", "Singapore", true);
    expect(rec).not.toBeNull();
    expect(rec!.title).toBe("Cross-border tax accountants for Singapore clients");
  });

  it("keeps the advisors body copy country-agnostic (the card shows for all 12 intent countries)", () => {
    const rec = buildPageRecommendation("advisors", "Singapore investors", true);
    expect(rec).not.toBeNull();
    // QROPS / "UK/AU" are UK-specific — they read as a mail-merge bug to
    // any non-UK visitor the card is shown to.
    expect(rec!.body).not.toMatch(/QROPS|UK\/AU/);
  });
});
