import { describe, it, expect } from "vitest";
import { formatCountdown, secondsRemaining } from "@/lib/format-countdown";

describe("formatCountdown", () => {
  it("formats minutes and zero-padded seconds", () => {
    expect(formatCountdown(272)).toBe("4:32");
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(5)).toBe("0:05");
    expect(formatCountdown(60)).toBe("1:00");
  });

  it("clamps negatives and zero to 0:00", () => {
    expect(formatCountdown(0)).toBe("0:00");
    expect(formatCountdown(-10)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatCountdown(90.9)).toBe("1:30");
  });
});

describe("secondsRemaining", () => {
  it("returns whole seconds until expiry", () => {
    expect(secondsRemaining(10_000, 0)).toBe(10);
    expect(secondsRemaining(10_500, 0)).toBe(11); // rounds up partial seconds
  });

  it("never goes below zero", () => {
    expect(secondsRemaining(0, 10_000)).toBe(0);
  });
});
