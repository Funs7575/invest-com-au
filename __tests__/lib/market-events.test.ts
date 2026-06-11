import { describe, it, expect, vi } from "vitest";

// Pure-function tests only — mock the server client so importing the
// module never touches next/headers.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import {
  filterUpcoming,
  nextEventOfType,
  groupEventsByMonth,
  MARKET_EVENT_TYPE_LABELS,
  type MarketEvent,
} from "@/lib/market-events";

let nextId = 1;
function event(partial: Partial<MarketEvent>): MarketEvent {
  return {
    id: nextId++,
    event_date: "2026-07-07",
    event_type: "rba",
    title: "RBA cash rate decision",
    description: "Reserve Bank of Australia board meeting",
    source_url: "https://www.rba.gov.au",
    is_all_day: false,
    start_time: "14:30:00",
    timezone: "Australia/Sydney",
    ...partial,
  };
}

describe("filterUpcoming", () => {
  it("drops events before the from date (inclusive boundary kept) and sorts ascending", () => {
    const events = [
      event({ event_date: "2026-09-01" }),
      event({ event_date: "2026-06-10" }), // past
      event({ event_date: "2026-06-11" }), // today — kept
      event({ event_date: "2026-07-07" }),
    ];
    const upcoming = filterUpcoming(events, "2026-06-11");
    expect(upcoming.map((e) => e.event_date)).toEqual([
      "2026-06-11",
      "2026-07-07",
      "2026-09-01",
    ]);
  });

  it("applies the limit after sorting", () => {
    const events = [
      event({ event_date: "2026-09-01" }),
      event({ event_date: "2026-07-07" }),
      event({ event_date: "2026-08-04" }),
    ];
    const upcoming = filterUpcoming(events, "2026-06-11", 2);
    expect(upcoming.map((e) => e.event_date)).toEqual(["2026-07-07", "2026-08-04"]);
  });

  it("returns [] for an empty list or a zero/negative limit", () => {
    expect(filterUpcoming([], "2026-06-11")).toEqual([]);
    expect(filterUpcoming([event({})], "2026-06-11", 0)).toEqual([]);
    expect(filterUpcoming([event({})], "2026-06-11", -1)).toEqual([]);
  });
});

describe("nextEventOfType", () => {
  it("returns the earliest event of the requested type", () => {
    const events = [
      event({ event_date: "2026-08-04", event_type: "rba" }),
      event({ event_date: "2026-06-25", event_type: "economic", title: "ABS CPI" }),
      event({ event_date: "2026-07-07", event_type: "rba" }),
    ];
    expect(nextEventOfType(events, "rba")?.event_date).toBe("2026-07-07");
    expect(nextEventOfType(events, "economic")?.event_date).toBe("2026-06-25");
  });

  it("returns null when no event of that type exists", () => {
    expect(nextEventOfType([event({ event_type: "asx" })], "rba")).toBeNull();
    expect(nextEventOfType([], "rba")).toBeNull();
  });
});

describe("groupEventsByMonth", () => {
  it("groups by YYYY-MM preserving input order within each month", () => {
    const a = event({ event_date: "2026-07-07", title: "first" });
    const b = event({ event_date: "2026-07-28", title: "second" });
    const c = event({ event_date: "2026-08-04", title: "third" });
    const grouped = groupEventsByMonth([a, b, c]);
    expect([...grouped.keys()]).toEqual(["2026-07", "2026-08"]);
    expect(grouped.get("2026-07")?.map((e) => e.title)).toEqual(["first", "second"]);
    expect(grouped.get("2026-08")).toHaveLength(1);
  });

  it("returns an empty map for no events", () => {
    expect(groupEventsByMonth([]).size).toBe(0);
  });
});

describe("MARKET_EVENT_TYPE_LABELS", () => {
  it("covers the event types the calendar publishes", () => {
    for (const type of ["rba", "asx", "earnings", "economic", "dividend", "ipo", "other"]) {
      expect(MARKET_EVENT_TYPE_LABELS[type]).toBeTruthy();
    }
  });
});
