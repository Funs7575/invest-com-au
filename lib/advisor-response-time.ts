import { createAdminClient } from "@/lib/supabase/admin";

export interface ResponseTimeStats {
  median_hours: number | null;
  sample_size: number;
}

/**
 * Computes median time-to-first-bid (in hours) for a single advisor on
 * public quote jobs, looking back over the last `lookbackDays` days.
 *
 * Used by:
 *  - quote cards: "Usually responds in < 4h" badge (#8)
 *  - advisor portal analytics
 */
export async function computeAdvisorResponseTime(
  advisorId: number,
  lookbackDays = 90,
): Promise<ResponseTimeStats> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - lookbackDays * 86400_000).toISOString();

  const { data } = await admin
    .from("advisor_auction_bids")
    .select("created_at, advisor_auctions:auction_id!inner(created_at, source)")
    .eq("advisor_id", advisorId)
    .gte("created_at", since)
    .limit(200);

  if (!data || data.length === 0) return { median_hours: null, sample_size: 0 };

  const deltas: number[] = [];
  for (const row of data) {
    const auction = (row as unknown as { advisor_auctions: { created_at: string; source: string } | null })
      .advisor_auctions;
    if (!auction || auction.source !== "public_job") continue;
    const ms = new Date(row.created_at as string).getTime() - new Date(auction.created_at).getTime();
    if (ms >= 0) deltas.push(ms);
  }
  if (deltas.length === 0) return { median_hours: null, sample_size: 0 };
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)]!;
  return {
    median_hours: Math.round((median / 3600_000) * 10) / 10,
    sample_size: deltas.length,
  };
}

/**
 * Batch version: computes response-time stats for many advisors in one
 * round-trip. Returns a Map advisorId → stats. Advisors with no public
 * bids in the window are absent from the map.
 */
export async function batchAdvisorResponseTimes(
  advisorIds: number[],
  lookbackDays = 90,
): Promise<Map<number, ResponseTimeStats>> {
  const out = new Map<number, ResponseTimeStats>();
  if (advisorIds.length === 0) return out;

  const admin = createAdminClient();
  const since = new Date(Date.now() - lookbackDays * 86400_000).toISOString();

  const { data } = await admin
    .from("advisor_auction_bids")
    .select("advisor_id, created_at, advisor_auctions:auction_id!inner(created_at, source)")
    .in("advisor_id", advisorIds)
    .gte("created_at", since)
    .limit(5000);

  if (!data) return out;

  const buckets = new Map<number, number[]>();
  for (const row of data) {
    const auction = (row as unknown as { advisor_auctions: { created_at: string; source: string } | null })
      .advisor_auctions;
    if (!auction || auction.source !== "public_job") continue;
    const ms = new Date(row.created_at as string).getTime() - new Date(auction.created_at).getTime();
    if (ms < 0) continue;
    const id = row.advisor_id as number;
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id)!.push(ms);
  }

  for (const [id, arr] of buckets) {
    arr.sort((a, b) => a - b);
    const median = arr[Math.floor(arr.length / 2)]!;
    out.set(id, {
      median_hours: Math.round((median / 3600_000) * 10) / 10,
      sample_size: arr.length,
    });
  }

  return out;
}

/** Human label for a response-time stat. */
export function formatResponseTimeLabel(stats: ResponseTimeStats | undefined | null): string | null {
  if (!stats || stats.median_hours == null || stats.sample_size < 3) return null;
  const h = stats.median_hours;
  if (h < 1) return "Usually responds within 1h";
  if (h < 4) return "Usually responds within 4h";
  if (h < 12) return "Usually responds within 12h";
  if (h < 24) return "Usually responds within 24h";
  return "Usually responds within 2 days";
}
