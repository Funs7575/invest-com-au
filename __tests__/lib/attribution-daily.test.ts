import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Tests for lib/attribution-daily.ts.
 *
 * The function fetches yesterday's attribution_touches and upserts
 * one row per (run_date, channel, vertical) into
 * revenue_attribution_daily.
 *
 * We mock the Supabase admin client to return controlled touch rows
 * and capture the resulting upserts so we can verify:
 *   - touches per channel are aggregated correctly
 *   - revenue_cents only includes conversion-like events
 *   - separate vertical slices produce separate upsert rows
 *   - the empty-touches case returns zero counts
 *   - DB fetch errors are handled gracefully
 */

interface UpsertCall {
  table: string;
  payload: Record<string, unknown>;
  conflict: string | undefined;
}

let touchesData: unknown[];
let touchesError: { message: string } | null;
let upsertCalls: UpsertCall[];
let upsertError: { message: string } | null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const builder: Record<string, unknown> = {};

      builder.select = vi.fn().mockReturnValue(builder);
      builder.gte = vi.fn().mockReturnValue(builder);
      builder.lte = vi.fn().mockReturnValue(builder);

      builder.limit = vi.fn(async () => {
        // Resolve the SELECT chain on attribution_touches
        if (table === "attribution_touches") {
          return { data: touchesData, error: touchesError };
        }
        return { data: [], error: null };
      });

      builder.upsert = vi.fn(async (payload: Record<string, unknown>, opts?: { onConflict?: string }) => {
        upsertCalls.push({
          table,
          payload,
          conflict: opts?.onConflict,
        });
        return { error: upsertError };
      });

      return builder;
    },
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

import { rollupYesterdayAttribution } from "@/lib/attribution-daily";

beforeEach(() => {
  touchesData = [];
  touchesError = null;
  upsertCalls = [];
  upsertError = null;
});

describe("rollupYesterdayAttribution", () => {
  it("returns zero counts when no touches exist", async () => {
    touchesData = [];
    const result = await rollupYesterdayAttribution();
    expect(result.totalTouches).toBe(0);
    expect(result.totalConversions).toBe(0);
    expect(result.totalRevenueCents).toBe(0);
    expect(result.channelCount).toBe(0);
    expect(upsertCalls).toHaveLength(0);
  });

  it("returns zero counts and logs when fetch errors", async () => {
    touchesData = [];
    touchesError = { message: "DB connection refused" };
    const result = await rollupYesterdayAttribution();
    expect(result.totalTouches).toBe(0);
    expect(upsertCalls).toHaveLength(0);
  });

  it("aggregates touches across a single vertical and channel", async () => {
    touchesData = [
      {
        session_id: "s1",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        session_id: "s1",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:01:00Z",
      },
      {
        session_id: "s1",
        user_key: null,
        event: "conversion",
        channel: "google",
        vertical: "brokers",
        value_cents: 5000,
        created_at: "2026-04-15T10:02:00Z",
      },
    ];

    const result = await rollupYesterdayAttribution();

    // 1 channel * 1 vertical = 1 upsert row
    expect(upsertCalls).toHaveLength(1);
    const call = upsertCalls[0]!;
    expect(call.conflict).toBe("run_date,channel,vertical");
    expect(call.payload.channel).toBe("google");
    expect(call.payload.vertical).toBe("brokers");
    expect(call.payload.touches).toBe(3);
    expect(call.payload.revenue_cents).toBe(5000);
    expect(result.totalRevenueCents).toBe(5000);
  });

  it("upserts separate rows per vertical slice", async () => {
    touchesData = [
      {
        session_id: "s1",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        session_id: "s2",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: "advisors",
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
    ];

    await rollupYesterdayAttribution();

    expect(upsertCalls).toHaveLength(2);
    const verticals = upsertCalls.map((c) => c.payload.vertical).sort();
    expect(verticals).toEqual(["advisors", "brokers"]);
  });

  it("only counts conversion-like events in revenue", async () => {
    touchesData = [
      {
        session_id: "s1",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: "brokers",
        value_cents: 9999, // should NOT be counted — view not conversion
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        session_id: "s1",
        user_key: null,
        event: "lead",
        channel: "google",
        vertical: "brokers",
        value_cents: 200,
        created_at: "2026-04-15T10:01:00Z",
      },
      {
        session_id: "s1",
        user_key: null,
        event: "signup",
        channel: "google",
        vertical: "brokers",
        value_cents: 50,
        created_at: "2026-04-15T10:02:00Z",
      },
    ];

    await rollupYesterdayAttribution();

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]!.payload.revenue_cents).toBe(250); // 200 + 50, not 9999
  });

  it("treats null vertical as its own slice", async () => {
    touchesData = [
      {
        session_id: "s1",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: null,
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        session_id: "s2",
        user_key: null,
        event: "view",
        channel: "google",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
    ];

    await rollupYesterdayAttribution();

    expect(upsertCalls).toHaveLength(2);
    const verticals = upsertCalls.map((c) => c.payload.vertical);
    expect(verticals).toContain(null);
    expect(verticals).toContain("brokers");
  });

  it("groups multiple sessions on the same channel", async () => {
    touchesData = [
      {
        session_id: "s1",
        user_key: null,
        event: "view",
        channel: "facebook",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        session_id: "s2",
        user_key: null,
        event: "view",
        channel: "facebook",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        session_id: "s2",
        user_key: null,
        event: "view",
        channel: "facebook",
        vertical: "brokers",
        value_cents: null,
        created_at: "2026-04-15T10:01:00Z",
      },
    ];

    await rollupYesterdayAttribution();

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]!.payload.channel).toBe("facebook");
    expect(upsertCalls[0]!.payload.touches).toBe(3); // 1 from s1 + 2 from s2
  });

  it("returns the correct date string (yesterday in ISO YYYY-MM-DD)", async () => {
    touchesData = [];
    const result = await rollupYesterdayAttribution();
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(result.date).toBe(yesterday);
  });
});
