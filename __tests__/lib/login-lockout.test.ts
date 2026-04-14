import { describe, it, expect } from "vitest";
import { thresholdForCount } from "@/lib/login-lockout";

describe("thresholdForCount", () => {
  it("returns null below the first threshold", () => {
    expect(thresholdForCount(0)).toBeNull();
    expect(thresholdForCount(4)).toBeNull();
  });

  it("returns the first tier at 5 failures (15 min)", () => {
    const t = thresholdForCount(5);
    expect(t).not.toBeNull();
    expect(t!.lockMs).toBe(15 * 60 * 1000);
  });

  it("returns the second tier at 10 failures (1 hour)", () => {
    const t = thresholdForCount(10);
    expect(t!.lockMs).toBe(60 * 60 * 1000);
  });

  it("returns the top tier at 20+ failures (24 hours)", () => {
    const t = thresholdForCount(20);
    expect(t!.lockMs).toBe(24 * 60 * 60 * 1000);
  });

  it("caps at the top tier regardless of how high the count goes", () => {
    expect(thresholdForCount(9999)!.lockMs).toBe(24 * 60 * 60 * 1000);
  });

  it("tier label is present and human-readable", () => {
    expect(thresholdForCount(5)!.label).toContain("minute");
    expect(thresholdForCount(10)!.label).toContain("hour");
    expect(thresholdForCount(20)!.label).toContain("24");
  });
});
