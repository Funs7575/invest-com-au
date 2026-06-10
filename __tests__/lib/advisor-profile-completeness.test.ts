import { describe, it, expect } from "vitest";
import {
  deriveProfileCompleteness,
  COMPLETENESS_FIELDS,
  WIZARD_STEPS,
} from "@/lib/advisor-portal/profile-completeness";

const FULL: Record<string, unknown> = {
  photo_url: "https://cdn/x.jpg",
  bio: "20 years helping families plan.",
  specialties: ["SMSF", "Retirement"],
  fee_structure: "fee-for-service",
  fee_description: "$330/hr, first call free.",
  website: "https://firm.example",
  phone: "0400 000 000",
  booking_link: "https://cal.com/x",
};

describe("deriveProfileCompleteness", () => {
  it("an empty/null profile is 0% with every field missing and photo first", () => {
    for (const p of [null, undefined, {}]) {
      const r = deriveProfileCompleteness(p);
      expect(r.score).toBe(0);
      expect(r.complete).toBe(false);
      expect(r.missingFields).toHaveLength(COMPLETENESS_FIELDS.length);
      expect(r.nextStep).toBe("photo"); // first wizard step
    }
  });

  it("a fully-populated profile is 100% with no next step", () => {
    const r = deriveProfileCompleteness(FULL);
    expect(r.score).toBe(100);
    expect(r.missingFields).toEqual([]);
    expect(r.nextStep).toBeNull();
    expect(r.complete).toBe(true);
  });

  it("weights sum to 100 and the score reflects the filled weight", () => {
    expect(COMPLETENESS_FIELDS.reduce((s, f) => s + f.weight, 0)).toBe(100);
    // photo(20) + bio(20) only.
    const r = deriveProfileCompleteness({ photo_url: "x", bio: "y" });
    expect(r.score).toBe(40);
  });

  it("treats empty string and empty array as missing", () => {
    const r = deriveProfileCompleteness({ ...FULL, bio: "", specialties: [] });
    expect(r.score).toBe(100 - 20 - 15); // bio(20) + specialties(15) lost
    expect(r.missingFields).toEqual(["Bio / About", "Specialties"]);
  });

  it("missingFields preserves the canonical field order (API contract)", () => {
    const r = deriveProfileCompleteness({ bio: "y" }); // everything except bio missing
    const expectedOrder = COMPLETENESS_FIELDS.filter((f) => f.key !== "bio").map((f) => f.label);
    expect(r.missingFields).toEqual(expectedOrder);
  });

  it("nextStep is the first INCOMPLETE wizard step, in wizard order", () => {
    // photo + bio + website done (bio step complete), specialties missing → specialties.
    const r = deriveProfileCompleteness({ photo_url: "x", bio: "y", website: "z" });
    expect(r.nextStep).toBe("specialties");
    // Only the availability fields missing → availability is the last gap.
    const r2 = deriveProfileCompleteness({ ...FULL, phone: "", booking_link: "" });
    expect(r2.nextStep).toBe("availability");
  });

  it("rolls fields up per wizard step (fees needs both fee fields)", () => {
    const r = deriveProfileCompleteness({ ...FULL, fee_description: "" });
    const fees = r.steps.find((s) => s.id === "fees")!;
    expect(fees.complete).toBe(false);
    expect(fees.totalWeight).toBe(20);
    expect(fees.filledWeight).toBe(10); // fee_structure filled, fee_description not
    expect(fees.missing).toEqual(["Fee description"]);
  });

  it("exposes exactly the five wizard steps, each mapped to ≥1 field", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual(["photo", "bio", "specialties", "fees", "availability"]);
    for (const step of WIZARD_STEPS) {
      expect(COMPLETENESS_FIELDS.some((f) => f.step === step.id), `${step.id} has a field`).toBe(true);
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.blurb.length).toBeGreaterThan(0);
    }
  });
});
