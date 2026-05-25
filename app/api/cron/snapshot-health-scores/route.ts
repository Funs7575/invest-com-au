import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { fireConsumerWebhook } from "@/lib/consumer-webhook-dispatch";

const log = logger("cron-snapshot-health-scores");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron: health-score snapshot.
 *
 * Runs daily (see lib/cron-groups.ts — daily-6 group alongside check-fees).
 * Copies the current broker_health_scores rows into the append-only
 * broker_health_score_history table so the /health-scores/[slug] detail
 * page can render an overall_score sparkline over time.
 *
 * Uses service-role (createAdminClient) because cron routes are a
 * legitimate service_role caller per the admin-client scope documented
 * in CLAUDE.md.
 */
async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  const { data: scores, error: fetchErr } = await supabase
    .from("broker_health_scores")
    .select(
      "broker_slug, overall_score, regulatory_score, client_money_score, financial_stability_score, platform_reliability_score, insurance_score",
    );

  if (fetchErr) {
    log.error("failed to fetch broker_health_scores", {
      error: fetchErr.message,
    });
    return NextResponse.json(
      { ok: false, error: fetchErr.message },
      { status: 500 },
    );
  }

  const rows = scores ?? [];
  const now = new Date().toISOString();
  let succeeded = 0;
  let failed = 0;

  for (const s of rows) {
    const { error: insertErr } = await supabase
      .from("broker_health_score_history")
      .insert({
        broker_slug: s.broker_slug,
        overall_score: s.overall_score,
        regulatory_score: s.regulatory_score ?? null,
        client_money_score: s.client_money_score ?? null,
        financial_stability_score: s.financial_stability_score ?? null,
        platform_reliability_score: s.platform_reliability_score ?? null,
        insurance_score: s.insurance_score ?? null,
        captured_at: now,
      });

    if (insertErr) {
      log.error("failed to insert health score history row", {
        broker_slug: s.broker_slug,
        error: insertErr.message,
      });
      failed++;
    } else {
      succeeded++;
    }
  }

  log.info("health-score snapshot complete", {
    total: rows.length,
    succeeded,
    failed,
  });

  // Fire consumer webhooks for each broker whose score was successfully
  // snapshotted. Fire-and-forget — never await, never let this break the cron.
  if (succeeded > 0) {
    for (const s of rows) {
      void fireConsumerWebhook("health_score.updated", {
        broker_slug: s.broker_slug,
        overall_score: s.overall_score,
        regulatory_score: s.regulatory_score ?? null,
        client_money_score: s.client_money_score ?? null,
        financial_stability_score: s.financial_stability_score ?? null,
        platform_reliability_score: s.platform_reliability_score ?? null,
        insurance_score: s.insurance_score ?? null,
        captured_at: now,
      });
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, succeeded, failed });
}

export const GET = wrapCronHandler("snapshot-health-scores", handler);
