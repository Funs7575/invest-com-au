import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: () => null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ or: () => ({ order: async () => ({ data: [] }) }) }) }),
    }),
  }),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/fee-freshness", () => ({
  FEE_STALE_DAYS: 90,
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import {
  prioritiseStaleBrokers,
  renderDigest,
  type StaleBrokerRow,
} from "@/app/api/cron/stale-fee-editorial/route";

// Fix "now" to 2026-04-01T00:00:00Z so all age math is deterministic
const NOW_MS = new Date("2026-04-01T00:00:00Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

describe("prioritiseStaleBrokers", () => {
  it("stamps ageDays based on fee_verified_date", () => {
    const rows: StaleBrokerRow[] = [
      {
        slug: "alpha",
        name: "Alpha",
        fee_verified_date: new Date(NOW_MS - 100 * DAY_MS).toISOString(),
        fee_source_url: null,
      },
    ];
    const [out] = prioritiseStaleBrokers(rows, NOW_MS);
    expect(out?.ageDays).toBe(100);
  });

  it("returns ageDays: null when fee_verified_date is null (never verified)", () => {
    const rows: StaleBrokerRow[] = [
      { slug: "never", name: "Never", fee_verified_date: null, fee_source_url: null },
    ];
    const [out] = prioritiseStaleBrokers(rows, NOW_MS);
    expect(out?.ageDays).toBeNull();
  });

  it("floors ageDays (29.9 days counts as 29 days, not 30)", () => {
    const partialDayAgo = NOW_MS - (30 * DAY_MS - 60 * 60 * 1000); // 29d 23h
    const rows: StaleBrokerRow[] = [
      {
        slug: "edge",
        name: "Edge",
        fee_verified_date: new Date(partialDayAgo).toISOString(),
        fee_source_url: null,
      },
    ];
    const [out] = prioritiseStaleBrokers(rows, NOW_MS);
    expect(out?.ageDays).toBe(29);
  });

  it("preserves original fields (slug, name, fee_source_url) unchanged", () => {
    const rows: StaleBrokerRow[] = [
      {
        slug: "alpha",
        name: "Alpha Broker",
        fee_verified_date: new Date(NOW_MS - 200 * DAY_MS).toISOString(),
        fee_source_url: "https://alpha.example/fees",
      },
    ];
    const [out] = prioritiseStaleBrokers(rows, NOW_MS);
    expect(out).toMatchObject({
      slug: "alpha",
      name: "Alpha Broker",
      fee_source_url: "https://alpha.example/fees",
      ageDays: 200,
    });
  });

  it("returns ageDays: null for a garbage fee_verified_date (NaN guard)", () => {
    const rows: StaleBrokerRow[] = [
      {
        slug: "garbage",
        name: "Garbage Date",
        fee_verified_date: "not-a-date",
        fee_source_url: null,
      },
    ];
    const [out] = prioritiseStaleBrokers(rows, NOW_MS);
    expect(out?.ageDays).toBeNull();
  });

  it("handles an empty input array", () => {
    expect(prioritiseStaleBrokers([], NOW_MS)).toEqual([]);
  });
});

describe("renderDigest", () => {
  it("includes the row count in the copy", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: null,
        fee_source_url: null,
        ageDays: null,
      },
      {
        slug: "b",
        name: "B",
        fee_verified_date: new Date(NOW_MS - 91 * DAY_MS).toISOString(),
        fee_source_url: null,
        ageDays: 91,
      },
    ]);
    expect(html).toContain("2 broker(s)");
  });

  it("links each broker name to /broker/<slug>", () => {
    const html = renderDigest([
      {
        slug: "alpha",
        name: "Alpha",
        fee_verified_date: null,
        fee_source_url: null,
        ageDays: null,
      },
    ]);
    expect(html).toContain("https://invest.com.au/broker/alpha");
    expect(html).toContain(">Alpha<");
  });

  it("renders 'never verified' when ageDays is null", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: null,
        fee_source_url: null,
        ageDays: null,
      },
    ]);
    expect(html).toContain("never verified");
  });

  it("renders '<N> days old' when ageDays is set", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: "2026-01-01",
        fee_source_url: null,
        ageDays: 120,
      },
    ]);
    expect(html).toContain("120 days old");
  });

  it("uses red age colour when ageDays > 180 (deep-stale signal)", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: "2025-08-01",
        fee_source_url: null,
        ageDays: 220,
      },
    ]);
    expect(html).toContain("#dc2626");
  });

  it("uses red age colour when ageDays is null (never verified is deep-stale)", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: null,
        fee_source_url: null,
        ageDays: null,
      },
    ]);
    expect(html).toContain("#dc2626");
  });

  it("uses amber age colour when ageDays is between freshness and 180", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: "2026-01-01",
        fee_source_url: null,
        ageDays: 100,
      },
    ]);
    expect(html).toContain("#b45309");
    expect(html).not.toContain("#dc2626");
  });

  it("renders a source link when fee_source_url is present", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: null,
        fee_source_url: "https://broker.example/fees",
        ageDays: null,
      },
    ]);
    expect(html).toContain("https://broker.example/fees");
    expect(html).toContain(">source<");
  });

  it("renders a dash when fee_source_url is null", () => {
    const html = renderDigest([
      {
        slug: "a",
        name: "A",
        fee_verified_date: null,
        fee_source_url: null,
        ageDays: null,
      },
    ]);
    // exactly one "em-dash-like" cell for the source column
    expect(html.match(/>—</g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("links the CTA button to /admin/fee-queue", () => {
    const html = renderDigest([]);
    expect(html).toContain("https://invest.com.au/admin/fee-queue");
    expect(html).toContain("Open fee queue");
  });

  it("mentions the FEE_STALE_DAYS window (90) in the copy", () => {
    const html = renderDigest([]);
    expect(html).toContain("90-day");
  });

  it("renders multiple rows in order without mixing them up", () => {
    const html = renderDigest([
      { slug: "first", name: "First", fee_verified_date: null, fee_source_url: null, ageDays: null },
      { slug: "second", name: "Second", fee_verified_date: null, fee_source_url: null, ageDays: 100 },
    ]);
    const firstIdx = html.indexOf(">First<");
    const secondIdx = html.indexOf(">Second<");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
  });
});
