import { describe, it, expect } from "vitest";
import { getCreditAwardForEvent } from "@/lib/investor-referrals";

describe("getCreditAwardForEvent", () => {
  it("awards more for accepted briefs than signups", () => {
    expect(getCreditAwardForEvent("brief_accepted")).toBeGreaterThan(
      getCreditAwardForEvent("signup"),
    );
  });

  it("returns positive credits for every event", () => {
    expect(getCreditAwardForEvent("signup")).toBe(5);
    expect(getCreditAwardForEvent("brief_created")).toBe(10);
    expect(getCreditAwardForEvent("brief_accepted")).toBe(25);
  });
});
