import { describe, it, expect } from "vitest";

import { CONCIERGE_SEEDS, lookupSeed, isFinderKey } from "@/lib/concierge-seeds";

describe("concierge-seeds", () => {
  it("every seed has a non-empty label and prompt under 200 chars", () => {
    for (const [key, seed] of Object.entries(CONCIERGE_SEEDS)) {
      expect(seed.label, `${key} label`).toBeTruthy();
      expect(seed.prompt, `${key} prompt`).toBeTruthy();
      expect(seed.prompt.length, `${key} prompt length`).toBeLessThanOrEqual(200);
    }
  });

  it("no seed prompt looks like a personal-advice request", () => {
    // Mirrors lib/chatbot.ts PERSONAL_ADVICE_TRIGGERS — the route's
    // classifier would refuse such seeds, blocking the fluid auto-fire
    // experience.
    const triggers = [
      /should i (buy|sell|invest|put)/i,
      /tell me exactly what to do with/i,
      /what do you recommend for my/i,
    ];
    for (const [key, seed] of Object.entries(CONCIERGE_SEEDS)) {
      for (const re of triggers) {
        expect(re.test(seed.prompt), `${key} prompt must not match ${re}`).toBe(false);
      }
    }
  });

  it("lookupSeed returns null for unknown keys", () => {
    expect(lookupSeed(null)).toBeNull();
    expect(lookupSeed("")).toBeNull();
    expect(lookupSeed("not-a-real-finder")).toBeNull();
    expect(lookupSeed("../../../etc/passwd")).toBeNull();
  });

  it("lookupSeed returns the right seed for known keys (case-insensitive)", () => {
    expect(lookupSeed("advisor-finder")?.label).toBe("Advisor finder");
    expect(lookupSeed("ADVISOR-FINDER")?.label).toBe("Advisor finder");
    expect(lookupSeed("  advisor-finder  ")?.label).toBe("Advisor finder");
  });

  it("isFinderKey rejects non-string + unknown values", () => {
    expect(isFinderKey(undefined)).toBe(false);
    expect(isFinderKey(null)).toBe(false);
    expect(isFinderKey(42)).toBe(false);
    expect(isFinderKey({})).toBe(false);
    expect(isFinderKey("nope")).toBe(false);
    expect(isFinderKey("advisor-finder")).toBe(true);
  });
});
