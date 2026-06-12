import { describe, it, expect } from "vitest";
import {
  zonedWallClockToUtc,
  zoneOffsetMs,
  bookingStartUtc,
  addMinutes,
  utcToZonedWallClock,
  formatBookingForHumans,
} from "@/lib/booking-v2/time";

describe("zonedWallClockToUtc", () => {
  it("converts a Sydney standard-time wall clock to the correct UTC instant", () => {
    // June = AEST (UTC+10), no DST. 14:00 Sydney = 04:00 UTC.
    const utc = zonedWallClockToUtc("2026-06-12T14:00:00", "Australia/Sydney");
    expect(utc.toISOString()).toBe("2026-06-12T04:00:00.000Z");
  });

  it("converts a Sydney daylight-time wall clock (UTC+11) correctly", () => {
    // January = AEDT (UTC+11). 14:00 Sydney = 03:00 UTC.
    const utc = zonedWallClockToUtc("2026-01-12T14:00:00", "Australia/Sydney");
    expect(utc.toISOString()).toBe("2026-01-12T03:00:00.000Z");
  });

  it("treats a UTC zone as identity", () => {
    const utc = zonedWallClockToUtc("2026-06-12T14:00:00", "UTC");
    expect(utc.toISOString()).toBe("2026-06-12T14:00:00.000Z");
  });

  it("handles Perth (UTC+8, no DST)", () => {
    const utc = zonedWallClockToUtc("2026-06-12T14:00:00", "Australia/Perth");
    expect(utc.toISOString()).toBe("2026-06-12T06:00:00.000Z");
  });

  it("throws on an unparseable datetime", () => {
    expect(() => zonedWallClockToUtc("not-a-date", "Australia/Sydney")).toThrow(
      /invalid datetime/,
    );
  });

  it("round-trips through utcToZonedWallClock", () => {
    const utc = zonedWallClockToUtc("2026-06-12T09:30:00", "Australia/Sydney");
    expect(utcToZonedWallClock(utc, "Australia/Sydney")).toBe(
      "2026-06-12T09:30:00",
    );
  });
});

describe("zoneOffsetMs", () => {
  it("reports +10h for Sydney in winter", () => {
    const inst = new Date("2026-06-12T00:00:00Z");
    expect(zoneOffsetMs(inst, "Australia/Sydney")).toBe(10 * 3_600_000);
  });

  it("reports +11h for Sydney in summer", () => {
    const inst = new Date("2026-01-12T00:00:00Z");
    expect(zoneOffsetMs(inst, "Australia/Sydney")).toBe(11 * 3_600_000);
  });

  it("reports 0 for UTC", () => {
    expect(zoneOffsetMs(new Date("2026-06-12T00:00:00Z"), "UTC")).toBe(0);
  });
});

describe("bookingStartUtc", () => {
  it("accepts HH:MM and HH:MM:SS", () => {
    const a = bookingStartUtc("2026-06-12", "14:00", "Australia/Sydney");
    const b = bookingStartUtc("2026-06-12", "14:00:00", "Australia/Sydney");
    expect(a.toISOString()).toBe("2026-06-12T04:00:00.000Z");
    expect(b.toISOString()).toBe(a.toISOString());
  });
});

describe("addMinutes", () => {
  it("adds minutes immutably", () => {
    const base = new Date("2026-06-12T04:00:00Z");
    const out = addMinutes(base, 30);
    expect(out.toISOString()).toBe("2026-06-12T04:30:00.000Z");
    expect(base.toISOString()).toBe("2026-06-12T04:00:00.000Z");
  });
});

describe("formatBookingForHumans", () => {
  it("renders a Sydney-local long date + 12h time", () => {
    const utc = new Date("2026-06-12T04:00:00Z"); // 2pm Sydney (AEST)
    const s = formatBookingForHumans(utc, "Australia/Sydney");
    expect(s).toContain("12 June 2026");
    expect(s).toMatch(/2:00\s?pm/i);
  });
});
