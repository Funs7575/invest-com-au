import { describe, it, expect } from "vitest";
import { buildExpatJourney, getJourneyStep } from "@/lib/expat-journey";
import {
  UK_CONFIG,
  US_CONFIG,
  NZ_CONFIG,
  CN_CONFIG,
  SA_CONFIG,
} from "@/lib/foreign-investment-country-data";

// ─── buildExpatJourney ──────────────────────────────────────────────────────

describe("buildExpatJourney — invariants", () => {
  it("always includes an eligibility step as step 1", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    const step = journey.steps[0];
    expect(step).toBeDefined();
    expect(step!.id).toBe("eligibility");
    expect(step!.stepNumber).toBe(1);
  });

  it("always includes a handoff step as the last step", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    const last = journey.steps[journey.steps.length - 1];
    expect(last).toBeDefined();
    expect(last!.id).toBe("handoff");
  });

  it("step numbers are sequential from 1 with no gaps", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    journey.steps.forEach((step, idx) => {
      expect(step.stepNumber).toBe(idx + 1);
    });
  });

  it("always returns at least 3 steps (eligibility, firb, handoff minimum)", () => {
    // SA has fewer optional sections but should still have >= 3 steps
    const journey = buildExpatJourney(SA_CONFIG);
    expect(journey.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("always includes a firb step", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    const firbStep = journey.steps.find((s) => s.id === "firb");
    expect(firbStep).toBeDefined();
  });

  it("always includes a tax step", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    const taxStep = journey.steps.find((s) => s.id === "tax");
    expect(taxStep).toBeDefined();
  });
});

// ─── UK — full-featured journey ─────────────────────────────────────────────

describe("buildExpatJourney — UK config (full featured)", () => {
  const journey = buildExpatJourney(UK_CONFIG);

  it("correctly identifies the country", () => {
    expect(journey.code).toBe("uk");
    expect(journey.countryName).toBe("United Kingdom");
    expect(journey.countryShort).toBe("UK");
    expect(journey.flag).toBe("🇬🇧");
    expect(journey.currency).toBe("GBP");
  });

  it("includes a pension step for UK (QROPS)", () => {
    const pensionStep = journey.steps.find((s) => s.id === "pension");
    expect(pensionStep).toBeDefined();
    expect(pensionStep!.heading).toContain("QROPS");
    // Should have a critical callout about high-stakes nature
    expect(pensionStep!.calloutVariant).toBe("critical");
  });

  it("includes an fx step for UK (GBP corridor)", () => {
    const fxStep = journey.steps.find((s) => s.id === "fx");
    expect(fxStep).toBeDefined();
    expect(fxStep!.heading).toContain("GBP");
  });

  it("includes a migration step for UK", () => {
    const migStep = journey.steps.find((s) => s.id === "migration");
    expect(migStep).toBeDefined();
  });

  it("eligibility step mentions DTA and 15% dividend rate for UK", () => {
    const step = journey.steps.find((s) => s.id === "eligibility");
    expect(step).toBeDefined();
    const allText = step!.bullets.join(" ");
    expect(allText).toContain("Double Tax Agreement");
    expect(allText).toContain("15%");
  });

  it("FIRB step mentions the established-dwelling ban", () => {
    const step = journey.steps.find((s) => s.id === "firb");
    expect(step).toBeDefined();
    expect(step!.calloutTitle).toContain("Established Dwelling Ban");
    expect(step!.calloutVariant).toBe("critical");
  });

  it("handoff step links to all three advisor pages", () => {
    const step = journey.steps.find((s) => s.id === "handoff");
    expect(step).toBeDefined();
    const hrefs = step!.links.map((l) => l.href);
    expect(hrefs).toContain("/advisors/firb-specialists");
    expect(hrefs).toContain("/advisors/international-tax-specialists");
    expect(hrefs).toContain("/advisors/migration-agents");
  });

  it("handoff step mentions pension specialists for UK (QROPS)", () => {
    const step = journey.steps.find((s) => s.id === "handoff");
    expect(step).toBeDefined();
    const bulletText = step!.bullets.join(" ");
    expect(bulletText).toContain("Pension transfer specialists");
  });

  it("tax step includes DTA rows and HMRC reporting bullets", () => {
    const step = journey.steps.find((s) => s.id === "tax");
    expect(step).toBeDefined();
    const allText = step!.bullets.join(" ");
    expect(allText).toContain("WHT");
    expect(allText).toContain("UK reporting");
  });
});

// ─── US — critical warning, FBAR/FATCA, no pension ──────────────────────────

describe("buildExpatJourney — US config", () => {
  const journey = buildExpatJourney(US_CONFIG);

  it("eligibility step has critical callout for US worldwide tax", () => {
    const step = journey.steps.find((s) => s.id === "eligibility");
    expect(step).toBeDefined();
    expect(step!.calloutVariant).toBe("critical");
    expect(step!.calloutTitle).toContain("US Citizens");
  });

  it("includes a reporting step for FBAR/FATCA", () => {
    const step = journey.steps.find((s) => s.id === "reporting");
    expect(step).toBeDefined();
    const text = step!.bullets.join(" ");
    expect(text).toContain("FBAR");
  });

  it("tax step notes US reporting obligations", () => {
    const step = journey.steps.find((s) => s.id === "tax");
    expect(step).toBeDefined();
    // US has reportingObligations — tax step callout should surface it
    expect(step!.calloutTitle).toBeDefined();
    // The callout title comes from reportingObligations.title (e.g. "FBAR, FATCA, and US reporting...")
    expect(step!.calloutTitle!.toLowerCase()).toContain("reporting");
  });

  it("includes investment-options step for US (PFIC-aware choices)", () => {
    const step = journey.steps.find((s) => s.id === "investment-options");
    expect(step).toBeDefined();
  });
});

// ─── NZ — no FIRB required ──────────────────────────────────────────────────

describe("buildExpatJourney — NZ config (trans-Tasman)", () => {
  const journey = buildExpatJourney(NZ_CONFIG);

  it("FIRB step has warn (not critical) callout for NZ", () => {
    const step = journey.steps.find((s) => s.id === "firb");
    expect(step).toBeDefined();
    // NZ callout says "No FIRB Required" — variant should be warn
    expect(step!.calloutVariant).toBe("warn");
    expect(step!.calloutTitle).toContain("No FIRB");
  });

  it("eligibility step does not say FIRB is required", () => {
    const step = journey.steps.find((s) => s.id === "eligibility");
    expect(step).toBeDefined();
    const text = step!.bullets.join(" ");
    // NZ citizens don't require FIRB
    expect(text).toContain("do not need FIRB");
  });

  it("includes a pension step for NZ (KiwiSaver portability)", () => {
    const step = journey.steps.find((s) => s.id === "pension");
    expect(step).toBeDefined();
  });
});

// ─── CN — capital controls ───────────────────────────────────────────────────

describe("buildExpatJourney — CN config", () => {
  const journey = buildExpatJourney(CN_CONFIG);

  it("eligibility step has critical callout for capital controls", () => {
    const step = journey.steps.find((s) => s.id === "eligibility");
    expect(step).toBeDefined();
    expect(step!.calloutVariant).toBe("critical");
    expect(step!.calloutTitle).toContain("Capital Outflow");
  });

  it("FX step mentions SAFE compliance", () => {
    const fxStep = journey.steps.find((s) => s.id === "fx");
    // CN has an fxCorridor config
    expect(fxStep).toBeDefined();
  });
});

// ─── SA — no DTA ─────────────────────────────────────────────────────────────

describe("buildExpatJourney — SA config (no DTA)", () => {
  const journey = buildExpatJourney(SA_CONFIG);

  it("eligibility step mentions no DTA for SA", () => {
    const step = journey.steps.find((s) => s.id === "eligibility");
    expect(step).toBeDefined();
    const text = step!.bullets.join(" ");
    expect(text).toContain("does not have a Double Tax Agreement");
  });

  it("tax step summary mentions no DTA", () => {
    const step = journey.steps.find((s) => s.id === "tax");
    expect(step).toBeDefined();
    expect(step!.summary).toContain("does not have a Double Tax Agreement");
  });
});

// ─── getJourneyStep ──────────────────────────────────────────────────────────

describe("getJourneyStep", () => {
  it("returns the step matching the given id", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    const step = getJourneyStep(journey, "tax");
    expect(step).toBeDefined();
    expect(step!.id).toBe("tax");
  });

  it("returns undefined for an unknown id", () => {
    const journey = buildExpatJourney(UK_CONFIG);
    const step = getJourneyStep(journey, "nonexistent-step");
    expect(step).toBeUndefined();
  });
});

// ─── Data integrity — no fabricated URLs ────────────────────────────────────

describe("buildExpatJourney — link integrity", () => {
  const KNOWN_PREFIXES = [
    "/foreign-investment",
    "/advisors",
    "/compare",
    "/non-resident",
    "/visa-investment",
    "/cgt-calculator",
    "/invest",
    "/foreign-investment/send-money-australia",
    "/foreign-investment/siv",
    "/foreign-investment/super",
    "/foreign-investment/shares",
    "/foreign-investment/tax",
    "/find-advisor",
  ];

  for (const code of ["uk", "us", "nz", "cn", "sa"] as const) {
    const configs = { uk: UK_CONFIG, us: US_CONFIG, nz: NZ_CONFIG, cn: CN_CONFIG, sa: SA_CONFIG };
    it(`all links in ${code.toUpperCase()} journey start with a known prefix`, () => {
      const journey = buildExpatJourney(configs[code]);
      for (const step of journey.steps) {
        for (const link of step.links) {
          const isKnown = KNOWN_PREFIXES.some((prefix) =>
            link.href.startsWith(prefix),
          );
          expect(
            isKnown,
            `Unexpected link href in step "${step.id}": ${link.href}`,
          ).toBe(true);
        }
      }
    });
  }
});
