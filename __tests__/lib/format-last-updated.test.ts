import { describe, it, expect } from "vitest";
import { formatLastUpdated } from "@/lib/format-last-updated";

const NOW = new Date("2026-06-08T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe("formatLastUpdated", () => {
  it("returns null for missing input", () => {
    expect(formatLastUpdated(null, NOW)).toBeNull();
    expect(formatLastUpdated(undefined, NOW)).toBeNull();
    expect(formatLastUpdated("", NOW)).toBeNull();
  });

  it("returns null for an unparseable date", () => {
    expect(formatLastUpdated("not-a-date", NOW)).toBeNull();
  });

  it("treats same-day and future timestamps as 'today'", () => {
    expect(formatLastUpdated(NOW.toISOString(), NOW)).toBe("today");
    expect(formatLastUpdated(daysAgo(-3), NOW)).toBe("today"); // clock skew guard
  });

  it("formats recent days", () => {
    expect(formatLastUpdated(daysAgo(1), NOW)).toBe("yesterday");
    expect(formatLastUpdated(daysAgo(3), NOW)).toBe("3 days ago");
    expect(formatLastUpdated(daysAgo(6), NOW)).toBe("6 days ago");
  });

  it("formats weeks", () => {
    expect(formatLastUpdated(daysAgo(7), NOW)).toBe("1 week ago");
    expect(formatLastUpdated(daysAgo(21), NOW)).toBe("3 weeks ago");
  });

  it("formats months", () => {
    expect(formatLastUpdated(daysAgo(30), NOW)).toBe("1 month ago");
    expect(formatLastUpdated(daysAgo(90), NOW)).toBe("3 months ago");
  });

  it("formats years", () => {
    expect(formatLastUpdated(daysAgo(365), NOW)).toBe("over a year ago");
    expect(formatLastUpdated(daysAgo(800), NOW)).toBe("2 years ago");
  });
});
