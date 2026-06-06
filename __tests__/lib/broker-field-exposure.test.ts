import { describe, it, expect } from "vitest";
import { stripInternalBrokerFields } from "@/lib/request-cache";
import type { Broker } from "@/lib/types";

// Regression guard for the recurring broker-commercial-field exposure class
// (#1408 broker detail, #1411 quiz, #1413 wealth-stack). If any of these
// internal economics fields stops being stripped, anon clients leak them.
const INTERNAL_FIELDS = [
  "cpa_value",
  "affiliate_priority",
  "monthly_sponsorship_fee",
  "commission_type",
  "commission_value",
  "estimated_epc",
  "promoted_placement",
] as const;

describe("broker field exposure guard", () => {
  it("stripInternalBrokerFields removes every internal commercial field", () => {
    const dirty = Object.fromEntries(INTERNAL_FIELDS.map((f) => [f, 123]));
    const cleaned = stripInternalBrokerFields({
      slug: "stake",
      name: "Stake",
      rating: 4.5,
      ...dirty,
    } as unknown as Broker) as unknown as Record<string, unknown>;
    for (const f of INTERNAL_FIELDS) {
      expect(cleaned, `${f} must be stripped`).not.toHaveProperty(f);
    }
    // Non-sensitive display fields survive.
    expect(cleaned.slug).toBe("stake");
    expect(cleaned.name).toBe("Stake");
    expect(cleaned.rating).toBe(4.5);
  });
});
