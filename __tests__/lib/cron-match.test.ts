import { describe, it, expect } from "vitest";
import { cronMatches } from "@/lib/cron-match";

// All assertions use explicit UTC instants. Date(Date.UTC(y,m,d,h,mi)).
const at = (h: number, mi: number, d = 15, mon = 5, y = 2026) =>
  new Date(Date.UTC(y, mon, d, h, mi));

describe("cronMatches — schedules used in vercel.json", () => {
  it("*/15 matches minutes 0,15,30,45 only", () => {
    expect(cronMatches("*/15 * * * *", at(10, 0))).toBe(true);
    expect(cronMatches("*/15 * * * *", at(10, 15))).toBe(true);
    expect(cronMatches("*/15 * * * *", at(10, 45))).toBe(true);
    expect(cronMatches("*/15 * * * *", at(10, 14))).toBe(false);
    expect(cronMatches("*/15 * * * *", at(10, 5))).toBe(false);
  });

  it("'0,30' matches minutes 0 and 30", () => {
    expect(cronMatches("0,30 * * * *", at(3, 0))).toBe(true);
    expect(cronMatches("0,30 * * * *", at(3, 30))).toBe(true);
    expect(cronMatches("0,30 * * * *", at(3, 15))).toBe(false);
  });

  it("hourly-5 (minute 5, any hour) matches only at :05", () => {
    expect(cronMatches("5 * * * *", at(0, 5))).toBe(true);
    expect(cronMatches("5 * * * *", at(23, 5))).toBe(true);
    expect(cronMatches("5 * * * *", at(23, 6))).toBe(false);
  });

  it("daily-2 (0 2 * * *) matches only at 02:00 UTC", () => {
    expect(cronMatches("0 2 * * *", at(2, 0))).toBe(true);
    expect(cronMatches("0 2 * * *", at(2, 1))).toBe(false);
    expect(cronMatches("0 2 * * *", at(3, 0))).toBe(false);
  });

  it("daily-1-30 (30 1 * * *) matches only at 01:30 UTC", () => {
    expect(cronMatches("30 1 * * *", at(1, 30))).toBe(true);
    expect(cronMatches("30 1 * * *", at(1, 0))).toBe(false);
    expect(cronMatches("30 1 * * *", at(2, 30))).toBe(false);
  });

  it("supports ranges and day-of-week", () => {
    // 0 9 * * 1-5  → 09:00 on weekdays. 2026-06-15 is a Monday (UTC).
    expect(cronMatches("0 9 * * 1-5", at(9, 0, 15, 5))).toBe(true);
    // 2026-06-14 is a Sunday.
    expect(cronMatches("0 9 * * 1-5", at(9, 0, 14, 5))).toBe(false);
  });

  it("rejects malformed expressions instead of throwing", () => {
    expect(cronMatches("not a cron", at(0, 0))).toBe(false);
    expect(cronMatches("* * *", at(0, 0))).toBe(false);
    expect(cronMatches("", at(0, 0))).toBe(false);
  });

  it("wildcard matches every minute", () => {
    expect(cronMatches("* * * * *", at(7, 23))).toBe(true);
  });
});
