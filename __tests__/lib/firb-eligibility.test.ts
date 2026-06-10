import { describe, it, expect } from "vitest";

import {
  FIRB_BUYER_STATUS_OPTIONS,
  FIRB_PROPERTY_TYPE_OPTIONS,
  resolveFirbEligibility,
  type FirbBuyerStatus,
  type FirbPropertyType,
} from "@/lib/firb-eligibility";

const ALL_STATUSES = FIRB_BUYER_STATUS_OPTIONS.map((o) => o.value);
const ALL_PROPERTIES = FIRB_PROPERTY_TYPE_OPTIONS.map((o) => o.value);

describe("resolveFirbEligibility — rule classes", () => {
  it.each<FirbBuyerStatus>(["citizen", "permanent_resident", "nz_citizen"])(
    "%s never needs approval, for any property type",
    (status) => {
      for (const property of ALL_PROPERTIES) {
        expect(resolveFirbEligibility(status, property).verdict).toBe("no_approval_needed");
      }
    },
  );

  it("foreign companies always require approval, for any property type", () => {
    for (const property of ALL_PROPERTIES) {
      expect(resolveFirbEligibility("foreign_company", property).verdict).toBe("generally_approved");
    }
  });

  it.each<FirbPropertyType>(["new_dwelling", "off_the_plan", "vacant_land"])(
    "temporary visa holders are generally approved for %s",
    (property) => {
      expect(resolveFirbEligibility("temporary_visa", property).verdict).toBe("generally_approved");
    },
  );

  it("temporary visa holders hit the established-dwelling ban window", () => {
    const r = resolveFirbEligibility("temporary_visa", "established");
    expect(r.verdict).toBe("banned_window");
    expect(r.title).toContain("31 March 2027");
  });

  it.each<FirbPropertyType>(["new_dwelling", "off_the_plan", "vacant_land"])(
    "non-residents are generally approved for %s",
    (property) => {
      expect(resolveFirbEligibility("non_resident", property).verdict).toBe("generally_approved");
    },
  );

  it("non-residents are not approved for established homes", () => {
    expect(resolveFirbEligibility("non_resident", "established").verdict).toBe("not_approved");
  });
});

describe("resolveFirbEligibility — readout integrity", () => {
  it("every combination yields a complete, professional-routed readout", () => {
    for (const status of ALL_STATUSES) {
      for (const property of ALL_PROPERTIES) {
        const r = resolveFirbEligibility(status, property);
        expect(r.title.length).toBeGreaterThan(10);
        expect(r.summary.length).toBeGreaterThan(30);
        expect(r.points.length).toBeGreaterThan(0);
        expect(r.ctas.length).toBeGreaterThan(0);
        // Educational framing: the rules speak, the tool never instructs the
        // user personally ("you should…" is personal-advice territory).
        expect(`${r.title} ${r.summary}`).not.toMatch(/you should/i);
        for (const cta of r.ctas) {
          expect(cta.href.startsWith("/")).toBe(true);
        }
      }
    }
  });

  it("blocked outcomes always offer a lawyer route", () => {
    const blocked = [
      resolveFirbEligibility("temporary_visa", "established"),
      resolveFirbEligibility("non_resident", "established"),
    ];
    for (const r of blocked) {
      expect(r.ctas.some((c) => c.href === "/advisors/foreign-investment-lawyers")).toBe(true);
    }
  });
});
