import { describe, it, expect } from "vitest";
import {
  generateAvailableDays,
  formatTimeLabel,
  type WeeklyTemplateClientRow,
} from "@/lib/booking-v2/slots";

// Fixed "now": Friday 2026-06-12 (local). generateAvailableDays starts at +1 day.
const NOW = new Date("2026-06-12T08:00:00");

describe("generateAvailableDays", () => {
  it("returns no days when the template is empty", () => {
    expect(generateAvailableDays([], { now: NOW })).toEqual([]);
  });

  it("generates slots only on days the template covers", () => {
    // Saturday is day 6. NOW+1 = Sat 2026-06-13.
    const template: WeeklyTemplateClientRow[] = [
      { dayOfWeek: 6, startTime: "09:00", endTime: "11:00", slotDurationMinutes: 30 },
    ];
    const days = generateAvailableDays(template, { now: NOW, days: 7 });
    expect(days.length).toBeGreaterThan(0);
    // Every returned day must be a Saturday.
    for (const d of days) {
      expect(new Date(`${d.date}T12:00:00`).getDay()).toBe(6);
    }
    // 09:00–11:00 in 30m slots = 09:00, 09:30, 10:00, 10:30 (10:30+30=11:00 fits).
    expect(days[0]!.times).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("excludes slots that don't fit before the window end", () => {
    const template: WeeklyTemplateClientRow[] = [
      { dayOfWeek: 6, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 45 },
    ];
    const days = generateAvailableDays(template, { now: NOW, days: 7 });
    // 09:00 fits (ends 09:45); 09:45 would end 10:30 > 10:00, excluded.
    expect(days[0]!.times).toEqual(["09:00"]);
  });

  it("removes already-taken times for a date", () => {
    const template: WeeklyTemplateClientRow[] = [
      { dayOfWeek: 6, startTime: "09:00", endTime: "11:00", slotDurationMinutes: 30 },
    ];
    const sat = "2026-06-13";
    const days = generateAvailableDays(template, {
      now: NOW,
      days: 2,
      takenByDate: { [sat]: ["09:30:00", "10:00"] },
    });
    const satDay = days.find((d) => d.date === sat);
    expect(satDay?.times).toEqual(["09:00", "10:30"]);
  });

  it("skips inactive windows", () => {
    const template: WeeklyTemplateClientRow[] = [
      { dayOfWeek: 6, startTime: "09:00", endTime: "11:00", slotDurationMinutes: 30, isActive: false },
    ];
    expect(generateAvailableDays(template, { now: NOW, days: 7 })).toEqual([]);
  });

  it("dedups overlapping windows on the same day", () => {
    const template: WeeklyTemplateClientRow[] = [
      { dayOfWeek: 6, startTime: "09:00", endTime: "10:00", slotDurationMinutes: 30 },
      { dayOfWeek: 6, startTime: "09:30", endTime: "10:30", slotDurationMinutes: 30 },
    ];
    const days = generateAvailableDays(template, { now: NOW, days: 7 });
    // Union of {09:00,09:30} and {09:30,10:00} → sorted unique.
    expect(days[0]!.times).toEqual(["09:00", "09:30", "10:00"]);
  });
});

describe("formatTimeLabel", () => {
  it("formats midnight and noon correctly", () => {
    expect(formatTimeLabel("00:00")).toBe("12:00 AM");
    expect(formatTimeLabel("12:00")).toBe("12:00 PM");
  });
  it("formats afternoon times", () => {
    expect(formatTimeLabel("14:30")).toBe("2:30 PM");
    expect(formatTimeLabel("09:05")).toBe("9:05 AM");
  });
});
