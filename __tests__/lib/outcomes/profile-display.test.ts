import { describe, it, expect } from "vitest";

import { badgeToneFor } from "@/lib/outcomes/profile-display";

describe("badgeToneFor", () => {
  it("returns slate for null", () => {
    expect(badgeToneFor(null)).toBe("slate");
  });

  it("returns slate for undefined", () => {
    expect(badgeToneFor(undefined as unknown as number)).toBe("slate");
  });

  it("returns slate for 0", () => {
    expect(badgeToneFor(0)).toBe("slate");
  });

  // Pin the exact >= boundaries — catches a future > vs >= regression.
  it("returns slate just below the amber threshold (59.9)", () => {
    expect(badgeToneFor(59.9)).toBe("slate");
  });

  it("returns amber at exactly 60", () => {
    expect(badgeToneFor(60)).toBe("amber");
  });

  it("returns amber just below the emerald threshold (79.9)", () => {
    expect(badgeToneFor(79.9)).toBe("amber");
  });

  it("returns emerald at exactly 80", () => {
    expect(badgeToneFor(80)).toBe("emerald");
  });

  it("returns emerald at 100", () => {
    expect(badgeToneFor(100)).toBe("emerald");
  });

  it("returns slate for negatives (-5)", () => {
    expect(badgeToneFor(-5)).toBe("slate");
  });
});
