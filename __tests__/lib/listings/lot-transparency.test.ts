import { describe, it, expect } from "vitest";
import { buildLotProfile } from "@/lib/listings/lot-profile";
import {
  assessLotTransparency,
  transparencyLevelLabel,
} from "@/lib/listings/lot-transparency";

const LONG_DESCRIPTION = "x".repeat(320);

describe("assessLotTransparency", () => {
  it("rates a bare listing as essential and lists what to request", () => {
    const assessment = assessLotTransparency(
      { description: "Short." },
      buildLotProfile({}),
    );

    expect(assessment.level).toBe("essential");
    expect(assessment.metCount).toBe(0);
    expect(assessment.score).toBe(0);
    const missing = assessment.checks.filter((c) => !c.met).map((c) => c.id);
    expect(missing).toContain("pricing");
    expect(missing).toContain("paper_trail");
    expect(missing).toContain("costs");
  });

  it("rates a fully-documented listing as comprehensive", () => {
    const profile = buildLotProfile({
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      provenance: "full history",
      holding_costs: [{ label: "Rates", amount: "$1,000/yr" }],
      typical_time_to_sell: "3-6 months",
    });
    const assessment = assessLotTransparency(
      {
        asking_price_cents: 100_000_00,
        description: LONG_DESCRIPTION,
        images: ["/a.jpg", "/b.jpg"],
        location_state: "NSW",
      },
      profile,
    );

    expect(assessment.metCount).toBe(8);
    expect(assessment.level).toBe("comprehensive");
    expect(assessment.score).toBe(100);
  });

  it("rates a mid listing as documented", () => {
    const assessment = assessLotTransparency(
      {
        price_display: "$2.4M",
        description: LONG_DESCRIPTION,
        images: ["/a.jpg", "/b.jpg"],
        location_city: "Mudgee",
      },
      buildLotProfile({}),
    );
    expect(assessment.metCount).toBe(4);
    expect(assessment.level).toBe("documented");
    expect(assessment.score).toBe(50);
  });

  it("accepts price_display as pricing and city as location", () => {
    const assessment = assessLotTransparency(
      { price_display: "POA range $1-2M", location_city: "Orange" },
      buildLotProfile({}),
    );
    const byId = Object.fromEntries(assessment.checks.map((c) => [c.id, c.met]));
    expect(byId.pricing).toBe(true);
    expect(byId.location).toBe(true);
  });

  it("has a label for every level", () => {
    expect(transparencyLevelLabel("essential")).toBeTruthy();
    expect(transparencyLevelLabel("documented")).toBeTruthy();
    expect(transparencyLevelLabel("comprehensive")).toBeTruthy();
  });
});
