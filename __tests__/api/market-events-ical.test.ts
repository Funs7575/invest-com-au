import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockServerFrom } = vi.hoisted(() => ({ mockServerFrom: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import { GET } from "@/app/api/market-events/ical/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = [], error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "eq", "gte", "lte", "order", "limit",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const ALL_DAY_EVENT = {
  id: 1,
  event_date: "2026-06-10",
  event_type: "rba",
  title: "RBA Cash Rate Decision",
  description: "Reserve Bank of Australia interest rate decision",
  source_url: "https://rba.gov.au",
  is_all_day: true,
  start_time: null,
  timezone: "Australia/Sydney",
};

const TIMED_EVENT = {
  id: 2,
  event_date: "2026-06-15",
  event_type: "asx",
  title: "ASX Rebalance",
  description: "S&P/ASX 200 index quarterly rebalance",
  source_url: "",
  is_all_day: false,
  start_time: "14:30",
  timezone: "Australia/Sydney",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/market-events/ical — response shape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 with text/calendar content-type", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/calendar/);
  });

  it("sets Content-Disposition attachment header for .ics download", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain(".ics");
  });

  it("sets Cache-Control header", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
  });

  it("returns 500 on DB error", async () => {
    mockServerFrom.mockReturnValue(makeBuilder(null, { message: "db fail" }));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/market-events/ical — iCal structure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("includes VCALENDAR wrapper with required properties", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).toContain("END:VCALENDAR");
    expect(body).toContain("VERSION:2.0");
    expect(body).toContain("CALSCALE:GREGORIAN");
    expect(body).toContain("METHOD:PUBLISH");
  });

  it("includes PRODID identifying invest.com.au", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("PRODID:");
    expect(body).toContain("invest.com.au");
  });

  it("includes X-WR-CALNAME for calendar apps", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("X-WR-CALNAME:");
  });

  it("returns empty calendar (no VEVENTs) when no events returned", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([]));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).not.toContain("BEGIN:VEVENT");
  });
});

describe("GET /api/market-events/ical — all-day events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a VEVENT for an all-day event", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain("END:VEVENT");
  });

  it("uses VALUE=DATE format for all-day events", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("DTSTART;VALUE=DATE:20260610");
    expect(body).toContain("DTEND;VALUE=DATE:20260611");
  });

  it("embeds the event title as SUMMARY", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("SUMMARY:RBA Cash Rate Decision");
  });

  it("embeds the event description as DESCRIPTION", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("DESCRIPTION:");
    expect(body).toContain("Reserve Bank");
  });

  it("uses source_url as URL when present", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("URL:https://rba.gov.au");
  });

  it("falls back to calendar page URL when source_url is empty", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([{ ...ALL_DAY_EVENT, source_url: "" }]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("URL:https://invest.com.au/calendar");
  });

  it("includes CATEGORIES from event_type uppercased", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("CATEGORIES:RBA");
  });

  it("includes a unique UID for each event", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("UID:market-event-1@invest.com.au");
  });
});

describe("GET /api/market-events/ical — timed events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses TZID-qualified DTSTART for timed events", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([TIMED_EVENT]));
    const res = await GET();
    const body = await res.text();
    // DTSTART;TZID=Australia/Sydney:20260615T143000
    expect(body).toContain("DTSTART;TZID=Australia/Sydney:20260615T");
  });

  it("uses DURATION:PT1H for timed events (no explicit DTEND)", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([TIMED_EVENT]));
    const res = await GET();
    const body = await res.text();
    expect(body).toContain("DURATION:PT1H");
  });

  it("renders multiple events as separate VEVENTs", async () => {
    mockServerFrom.mockReturnValue(makeBuilder([ALL_DAY_EVENT, TIMED_EVENT]));
    const res = await GET();
    const body = await res.text();
    const count = (body.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(count).toBe(2);
  });
});

describe("GET /api/market-events/ical — query filters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries with is_published=true filter", async () => {
    const chain = makeBuilder([ALL_DAY_EVENT]);
    mockServerFrom.mockReturnValue(chain);
    await GET();
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "is_published" && c[1] === true)).toBe(true);
  });

  it("applies a limit of 500 to the query", async () => {
    const chain = makeBuilder([ALL_DAY_EVENT]);
    mockServerFrom.mockReturnValue(chain);
    await GET();
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(500);
  });
});
