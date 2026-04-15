import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { decideWinner } from "@/lib/ab-winner";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";

const log = logger("cron:ab-auto-promote");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Nightly cron that reads every running A/B test, runs a two-
 * proportion z-test on impressions/conversions, and if a significant
 * winner is declared (p < threshold AND min_sample_size reached)
 * stamps auto_promoted_variant + auto_promoted_at + winner on the
 * row and sets status='concluded'.
 *
 * This closes the loop from the A/B test deep-dive finding that
 * winners were being declared manually, leaving conversion lift
 * on the table for weeks.
 *
 * Safe-by-default:
 *   - Tests with min_sample_size unset default to 200
 *   - significance_threshold unset defaults to 0.05
 *   - Tests already auto_promoted get skipped
 *   - Honours the automation kill switch under the 'ab_tests' feature
 *   - Writes a context row to admin_action_log for the audit trail
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("ab_tests")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const { data: tests, error } = await supabase
    .from("ab_tests")
    .select(
      "id, name, broker_slug, status, impressions_a, impressions_b, conversions_a, conversions_b, winner, min_sample_size, significance_threshold, auto_promoted",
    )
    .eq("status", "running");

  if (error) {
    log.error("Failed to fetch ab_tests", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: tests?.length || 0,
    promoted: 0,
    insufficient: 0,
    inconclusive: 0,
    failed: 0,
  };

  for (const test of tests || []) {
    try {
      if (test.auto_promoted) {
        continue;
      }
      const decision = decideWinner({
        impressions_a: (test.impressions_a as number) || 0,
        impressions_b: (test.impressions_b as number) || 0,
        conversions_a: (test.conversions_a as number) || 0,
        conversions_b: (test.conversions_b as number) || 0,
        min_sample_size: (test.min_sample_size as number) || 200,
        significance_threshold:
          Number(test.significance_threshold) || 0.05,
      });

      if (decision.reason === "insufficient_sample") {
        stats.insufficient++;
        continue;
      }
      if (!decision.winner) {
        stats.inconclusive++;
        continue;
      }

      const nowIso = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("ab_tests")
        .update({
          winner: decision.winner,
          auto_promoted_variant: decision.winner,
          auto_promoted_at: nowIso,
          auto_promoted: true,
          status: "concluded",
          end_date: nowIso,
        })
        .eq("id", test.id);

      if (upErr) {
        stats.failed++;
        log.error("auto-promote update failed", {
          id: test.id,
          error: upErr.message,
        });
        continue;
      }

      // Audit row
      await supabase.from("admin_action_log").insert({
        admin_email: "system@ab-auto-promote",
        feature: "ab_tests",
        action: "config",
        target_row_id: test.id as number,
        target_verdict: decision.winner,
        reason: `p=${decision.pValue.toFixed(4)} z=${decision.zScore.toFixed(2)} lift=${decision.liftPct.toFixed(1)}%`,
        context: {
          test_name: test.name,
          impressions_a: test.impressions_a,
          impressions_b: test.impressions_b,
          conversions_a: test.conversions_a,
          conversions_b: test.conversions_b,
          decision,
        },
      });

      stats.promoted++;
      log.info("Auto-promoted A/B winner", {
        id: test.id,
        winner: decision.winner,
        pValue: decision.pValue,
      });
    } catch (err) {
      stats.failed++;
      log.error("ab auto-promote threw", {
        id: test.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("ab auto-promote cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("ab-auto-promote", handler);
