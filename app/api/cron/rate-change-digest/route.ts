import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("cron:rate-change-digest");

// Diff the two most-recent distinct savings_rate_snapshots batches.
// Writes a rate_change_log row for every broker+product_kind whose rate
// changed between the two batches. Idempotent — unique index on
// (broker_id, product_kind, snapshot_captured_at) absorbs re-runs.

interface SnapshotRow {
  broker_id: number;
  broker_slug: string;
  broker_name: string;
  product_kind: string;
  rate_bps: number;
  captured_at: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("rate-change-digest", async () => {
    const admin = createAdminClient();

    // ── 1. Find the two most-recent distinct captured_at timestamps ─────────
    const { data: batches, error: batchErr } = await admin
      .from("savings_rate_snapshots")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(100);

    if (batchErr || !batches || batches.length === 0) {
      log.warn("No snapshot batches found", { error: batchErr?.message });
      return { response: NextResponse.json({ ok: true, changes: 0, reason: "no_data" }), stats: { changes: 0 } };
    }

    const distinctDates = [...new Set(batches.map((r) => r.captured_at))];
    if (distinctDates.length < 2) {
      log.info("Only one snapshot batch exists — nothing to diff yet");
      return { response: NextResponse.json({ ok: true, changes: 0, reason: "single_batch" }), stats: { changes: 0 } };
    }

    const [newestAt, previousAt] = [distinctDates[0], distinctDates[1]] as [string, string];

    // ── 2. Load both batches with broker name/slug via join ──────────────────
    const [{ data: newest }, { data: previous }] = await Promise.all([
      admin
        .from("savings_rate_snapshots")
        .select("broker_id, product_kind, rate_bps, captured_at, brokers!inner(slug, name)")
        .eq("captured_at", newestAt),
      admin
        .from("savings_rate_snapshots")
        .select("broker_id, product_kind, rate_bps, captured_at, brokers!inner(slug, name)")
        .eq("captured_at", previousAt),
    ]);

    if (!newest || !previous) {
      log.warn("Failed to load snapshot batches");
      return { response: NextResponse.json({ ok: true, changes: 0, reason: "load_error" }), stats: { changes: 0 } };
    }

    const flatten = (rows: unknown[]): SnapshotRow[] =>
      (rows as Array<{
        broker_id: number;
        product_kind: string;
        rate_bps: number;
        captured_at: string;
        brokers: { slug: string; name: string };
      }>).map((r) => ({
        broker_id: r.broker_id,
        broker_slug: r.brokers.slug,
        broker_name: r.brokers.name,
        product_kind: r.product_kind,
        rate_bps: r.rate_bps,
        captured_at: r.captured_at,
      }));

    const newestRows = flatten(newest);
    const prevMap = new Map<string, number>();
    for (const r of flatten(previous)) {
      prevMap.set(`${r.broker_id}:${r.product_kind}`, r.rate_bps);
    }

    // ── 3. Compute changes ───────────────────────────────────────────────────
    const insertRows: {
      broker_id: number;
      broker_slug: string;
      broker_name: string;
      product_kind: string;
      old_rate_bps: number | null;
      new_rate_bps: number;
      delta_bps: number;
      direction: "up" | "down" | "new";
      snapshot_captured_at: string;
    }[] = [];

    for (const row of newestRows) {
      const key = `${row.broker_id}:${row.product_kind}`;
      const oldBps = prevMap.get(key) ?? null;
      const delta = row.rate_bps - (oldBps ?? 0);

      if (oldBps === null) {
        insertRows.push({ ...row, old_rate_bps: null, new_rate_bps: row.rate_bps, delta_bps: row.rate_bps, direction: "new", snapshot_captured_at: row.captured_at });
      } else if (delta !== 0) {
        insertRows.push({ ...row, old_rate_bps: oldBps, new_rate_bps: row.rate_bps, delta_bps: delta, direction: delta > 0 ? "up" : "down", snapshot_captured_at: row.captured_at });
      }
    }

    if (insertRows.length === 0) {
      log.info("No rate changes detected", { newestAt, previousAt });
      return { response: NextResponse.json({ ok: true, changes: 0 }), stats: { changes: 0 } };
    }

    // ── 4. Upsert (idempotent via unique index) ──────────────────────────────
    const { error: insertErr, count } = await admin
      .from("rate_change_log")
      .upsert(insertRows, { onConflict: "broker_id,product_kind,snapshot_captured_at", ignoreDuplicates: true })
      .select();

    if (insertErr) {
      log.error("Failed to write rate_change_log", { error: insertErr.message });
      return { response: NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 }), stats: { changes: 0 } };
    }

    // Fanout to feed_events so new rate changes appear in the unified feed.
    // Failures are non-blocking — the digest itself already succeeded.
    const feedRows = insertRows.map((r) => ({
      event_type: "rate_change" as const,
      ref_id: `${r.broker_id}:${r.product_kind}:${r.snapshot_captured_at}`,
      headline:
        r.direction === "up"
          ? `${r.broker_name} raised their ${r.product_kind} rate by ${r.delta_bps} bps`
          : r.direction === "down"
            ? `${r.broker_name} cut their ${r.product_kind} rate by ${Math.abs(r.delta_bps)} bps`
            : `${r.broker_name} added a new ${r.product_kind} rate`,
      actor_name: r.broker_name,
      actor_slug: r.broker_slug,
      entity_slug: r.broker_slug,
      score_base: r.direction === "up" ? 70 : r.direction === "new" ? 65 : 55,
      published_at: r.snapshot_captured_at,
    }));
    const { error: feedErr } = await admin
      .from("feed_events")
      .upsert(feedRows, { onConflict: "event_type,ref_id", ignoreDuplicates: true });
    if (feedErr) {
      log.warn("feed_events fanout failed (non-blocking)", { error: feedErr.message });
    }

    log.info("Rate change digest complete", { changes: insertRows.length, written: count, newestAt, previousAt });
    return {
      response: NextResponse.json({ ok: true, changes: insertRows.length, newestAt, previousAt }),
      stats: { changes: insertRows.length },
    };
  }, { triggeredBy: req.headers.get("x-admin-manual") ? "admin_manual" : "cron" });
}
