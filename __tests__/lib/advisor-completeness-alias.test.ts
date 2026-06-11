/**
 * Tests for lib/advisor-completeness.ts — the public re-export alias.
 *
 * Verifies that the alias correctly re-exports the canonical implementation
 * so that external callers get identical behaviour without importing from
 * the advisor-portal subdirectory.
 */
import { describe, it, expect } from "vitest";
import {
  deriveProfileCompleteness,
  COMPLETENESS_FIELDS,
  WIZARD_STEPS,
} from "@/lib/advisor-completeness";

describe("lib/advisor-completeness alias", () => {
  it("re-exports deriveProfileCompleteness with the same behaviour as the canonical module", () => {
    const full = {
      photo_url: "https://cdn/x.jpg",
      bio: "20 years helping families plan.",
      specialties: ["SMSF", "Retirement"],
      fee_structure: "fee-for-service",
      fee_description: "$330/hr, first call free.",
      website: "https://firm.example",
      phone: "0400 000 000",
      booking_link: "https://cal.com/x",
    };

    const r = deriveProfileCompleteness(full);
    expect(r.score).toBe(100);
    expect(r.complete).toBe(true);
    expect(r.nextStep).toBeNull();
  });

  it("re-exports COMPLETENESS_FIELDS with weights summing to 100", () => {
    const total = COMPLETENESS_FIELDS.reduce((s, f) => s + f.weight, 0);
    expect(total).toBe(100);
  });

  it("re-exports WIZARD_STEPS with the canonical 5 steps", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toEqual([
      "photo",
      "bio",
      "specialties",
      "fees",
      "availability",
    ]);
  });

  it("returns score 0 for null with nextStep = photo", () => {
    const r = deriveProfileCompleteness(null);
    expect(r.score).toBe(0);
    expect(r.nextStep).toBe("photo");
  });
});
