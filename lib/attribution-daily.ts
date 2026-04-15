/**
 * Daily attribution rollup.
 *
 * Reads attribution_touches (Wave 6) and writes one summary row
 * per (run_date, channel, vertical) into revenue_attribution_daily.
 *
 * Uses the existing `rollupAttribution()` pure function from
 * lib/attribution.ts so the math stays consistent between the
 * admin realtime view and the nightly summary.
 *
 * Design note:
 *   - `rollupAttribution` takes raw touch rows with
 *     { session_id, channel, event, value_cents } and returns a
 *     Record<Channel, AttributionRow> with touches + three
 *     conversion-counting models (first/last/linear).
 *   - The summary row stores all three models so the exec
 *     dashboard can A/B which attribution narrative tells the
 *     cleanest story without re-querying raw touches.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  rollupAttribution,
  type Channel,
  type AttributionRow,
} from "@/lib/attribution";
import { logger } from "@/lib/logger";

const log = logger("attribution-daily");

export interface DailyRollupResult {
  date: string;
  channelCount: number;
  totalTouches: number;
  totalConversions: number;
  totalRevenueCents: number;
}

interface TouchRow {
  session_id: string | null;
  user_key: string | null;
  event: string;
  channel: string | null;
  vertical: string | null;
  value_cents: number | null;
  created_at: string;
}

function toRollupInput(rows: TouchRow[]): Array<{
  session_id: string;
  channel: Channel | string;
  event: string;
  value_cents: number | null;
}> {
  return rows
    .filter((r) => r.session_id)
    .map((r) => ({
      session_id: r.session_id as string,
      channel: (r.channel || "direct") as Channel,
      event: r.event || "view",
      value_cents: r.value_cents ?? null,
    }));
}

/**
 * Aggregate yesterday's attribution_touches into the summary
 * table. Idempotent — upserts on (run_date, channel, vertical).
 */
export async function rollupYesterdayAttribution(): Promise<DailyRollupResult> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const runDate = yesterday.toISOString().slice(0, 10);
  const from = `${runDate}T00:00:00Z`;
  const to = `${runDate}T23:59:59Z`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("attribution_touches")
    .select(
      "session_id, user_key, event, channel, vertical, value_cents, created_at",
    )
    .gte("created_at", from)
    .lte("created_at", to)
    .limit(100_000);

  if (error) {
    log.warn("attribution rollup fetch failed", { error: error.message });
    return {
      date: runDate,
      channelCount: 0,
      totalTouches: 0,
      totalConversions: 0,
      totalRevenueCents: 0,
    };
  }

  const rows = (data as TouchRow[] | null) || [];
  if (rows.length === 0) {
    return {
      date: runDate,
      channelCount: 0,
      totalTouches: 0,
      totalConversions: 0,
      totalRevenueCents: 0,
    };
  }

  // Compute per-vertical slices so the dashboard can drill in.
  // Verticals set includes `null` (touches with no vertical).
  const verticalKeys: Array<string | null> = [];
  const verticalSet = new Set<string | null>();
  for (const r of rows) {
    const v = r.vertical || null;
    if (!verticalSet.has(v)) {
      verticalSet.add(v);
      verticalKeys.push(v);
    }
  }

  let totalTouches = 0;
  let totalConversions = 0;
  let totalRevenueCents = 0;
  let channelRowCount = 0;

  for (const vertical of verticalKeys) {
    const slice = rows.filter(
      (r) => (r.vertical || null) === vertical,
    );
    if (slice.length === 0) continue;

    // Revenue per dollar — sum raw value_cents across conversion-
    // like events for this vertical slice. The rollup function
    // only tracks touches per channel; we need revenue attribution
    // manually so we can store it in the summary row.
    const perChannelRevenue = new Map<string, number>();
    for (const r of slice) {
      if (r.event === "conversion" || r.event === "lead" || r.event === "signup") {
        const ch = r.channel || "direct";
        perChannelRevenue.set(
          ch,
          (perChannelRevenue.get(ch) || 0) + (r.value_cents || 0),
        );
      }
    }

    const roll = rollupAttribution(toRollupInput(slice));
    const entries = Object.entries(roll) as Array<[Channel, AttributionRow]>;
    for (const [channel, row] of entries) {
      const revenueForChannel = perChannelRevenue.get(channel) || 0;
      const { error: upErr } = await supabase
        .from("revenue_attribution_daily")
        .upsert(
          {
            run_date: runDate,
            channel,
            vertical: vertical || null,
            touches: row.touches,
            first_touch_conversions: row.firstTouchConversions,
            last_touch_conversions: row.lastTouchConversions,
            linear_conversions: row.linearConversions,
            revenue_cents: revenueForChannel,
            computed_at: new Date().toISOString(),
          },
          { onConflict: "run_date,channel,vertical" },
        );
      if (!upErr) channelRowCount += 1;
      totalTouches += row.touches;
      totalConversions += row.lastTouchConversions;
      totalRevenueCents += revenueForChannel;
    }
  }

  log.info("attribution rollup complete", {
    runDate,
    rows: rows.length,
    channelRows: channelRowCount,
    verticals: verticalKeys.length,
  });

  return {
    date: runDate,
    channelCount: channelRowCount,
    totalTouches,
    totalConversions,
    totalRevenueCents,
  };
}
