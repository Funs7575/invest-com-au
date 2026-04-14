import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:automation-verdict-rollup");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Hourly cron that aggregates classifier verdicts per feature into
 * `automation_verdict_daily`. The admin dashboard's time-series
 * charts read from this table instead of scanning raw
 * lead_disputes / investment_listings / user_reviews on every page
 * load.
 *
 * Strategy:
 *   - Upsert today's row for every feature that produces verdicts
 *   - Re-aggregate yesterday too (late-arriving updates)
 *   - Past days are immutable — we don't touch them
 *
 * This is eventually-consistent with the raw tables, which is fine
 * for a dashboard chart. Exact numbers are still available on the
 * drill-down pages which query the raw tables directly.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const days = [dayKey(yesterday), dayKey(today)];
  const stats = { upserts: 0, failed: 0 };

  for (const day of days) {
    try {
      const rows = await Promise.all([
        rollupLeadDisputes(supabase, day),
        rollupListings(supabase, day),
        rollupTextModeration(supabase, day),
        rollupApplications(supabase, day),
        rollupBrokerChanges(supabase, day),
        rollupCampaigns(supabase, day),
      ]);
      const flat = rows.flat();

      for (const r of flat) {
        const { error } = await supabase
          .from("automation_verdict_daily")
          .upsert(r, { onConflict: "feature,day" });
        if (error) {
          stats.failed++;
          log.warn("verdict_daily upsert failed", { error: error.message, feature: r.feature });
        } else {
          stats.upserts++;
        }
      }
    } catch (err) {
      stats.failed++;
      log.error("rollup day threw", {
        day,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("verdict rollup completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

type Supa = ReturnType<typeof createAdminClient>;

interface DailyRow {
  feature: string;
  day: string;
  auto_acted: number;
  escalated: number;
  rejected: number;
  approved: number;
  refunded_cents: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayRange(day: string): { start: string; end: string } {
  const start = new Date(`${day}T00:00:00Z`).toISOString();
  const end = new Date(`${day}T23:59:59.999Z`).toISOString();
  return { start, end };
}

async function rollupLeadDisputes(supabase: Supa, day: string): Promise<DailyRow[]> {
  const { start, end } = dayRange(day);
  const { data } = await supabase
    .from("lead_disputes")
    .select("auto_resolved_verdict, status, refunded_cents")
    .gte("created_at", start)
    .lte("created_at", end);
  const rows = data || [];
  return [
    {
      feature: "lead_disputes",
      day,
      auto_acted: rows.filter((r) => r.auto_resolved_verdict === "refund" || r.auto_resolved_verdict === "reject").length,
      escalated: rows.filter((r) => r.auto_resolved_verdict === "escalate").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      approved: rows.filter((r) => r.status === "approved").length,
      refunded_cents: rows.reduce((acc, r) => acc + ((r.refunded_cents as number | null) || 0), 0),
    },
  ];
}

async function rollupListings(supabase: Supa, day: string): Promise<DailyRow[]> {
  const { start, end } = dayRange(day);
  const { data } = await supabase
    .from("investment_listings")
    .select("auto_classified_verdict, status")
    .gte("created_at", start)
    .lte("created_at", end);
  const rows = data || [];
  return [
    {
      feature: "listing_scam",
      day,
      auto_acted: rows.filter((r) => r.auto_classified_verdict === "auto_approve" || r.auto_classified_verdict === "auto_reject").length,
      escalated: rows.filter((r) => r.auto_classified_verdict === "escalate").length,
      rejected: rows.filter((r) => r.auto_classified_verdict === "auto_reject").length,
      approved: rows.filter((r) => r.auto_classified_verdict === "auto_approve").length,
      refunded_cents: 0,
    },
  ];
}

async function rollupTextModeration(supabase: Supa, day: string): Promise<DailyRow[]> {
  const { start, end } = dayRange(day);
  const [broker, advisor] = await Promise.all([
    supabase
      .from("user_reviews")
      .select("auto_moderated_verdict, status")
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("professional_reviews")
      .select("auto_moderated_verdict, status")
      .gte("created_at", start)
      .lte("created_at", end),
  ]);
  const rows = [...(broker.data || []), ...(advisor.data || [])];
  return [
    {
      feature: "text_moderation",
      day,
      auto_acted: rows.filter((r) => r.auto_moderated_verdict === "auto_publish" || r.auto_moderated_verdict === "auto_reject").length,
      escalated: rows.filter((r) => r.auto_moderated_verdict === "escalate").length,
      rejected: rows.filter((r) => r.auto_moderated_verdict === "auto_reject").length,
      approved: rows.filter((r) => r.auto_moderated_verdict === "auto_publish").length,
      refunded_cents: 0,
    },
  ];
}

async function rollupApplications(supabase: Supa, day: string): Promise<DailyRow[]> {
  const { start, end } = dayRange(day);
  const { data } = await supabase
    .from("advisor_applications")
    .select("status, reviewed_by")
    .gte("created_at", start)
    .lte("created_at", end);
  const rows = data || [];
  const auto = rows.filter((r) => r.reviewed_by === "auto");
  return [
    {
      feature: "advisor_applications",
      day,
      auto_acted: auto.length,
      escalated: rows.filter((r) => r.status === "pending").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      approved: rows.filter((r) => r.status === "approved").length,
      refunded_cents: 0,
    },
  ];
}

async function rollupBrokerChanges(supabase: Supa, day: string): Promise<DailyRow[]> {
  const { start, end } = dayRange(day);
  const { data } = await supabase
    .from("broker_data_changes")
    .select("auto_applied_tier, auto_applied_at")
    .gte("created_at", start)
    .lte("created_at", end);
  const rows = data || [];
  const applied = rows.filter((r) => r.auto_applied_at !== null);
  return [
    {
      feature: "broker_data_changes",
      day,
      auto_acted: applied.filter((r) => r.auto_applied_tier !== "require_admin").length,
      escalated: rows.filter((r) => r.auto_applied_tier === "require_admin" || r.auto_applied_tier === null).length,
      rejected: 0,
      approved: applied.length,
      refunded_cents: 0,
    },
  ];
}

async function rollupCampaigns(supabase: Supa, day: string): Promise<DailyRow[]> {
  const { start, end } = dayRange(day);
  const { data } = await supabase
    .from("campaigns")
    .select("status")
    .gte("created_at", start)
    .lte("created_at", end);
  const rows = data || [];
  return [
    {
      feature: "marketplace_campaigns",
      day,
      auto_acted: rows.filter((r) => r.status === "active" || r.status === "rejected").length,
      escalated: rows.filter((r) => r.status === "pending").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      approved: rows.filter((r) => r.status === "active").length,
      refunded_cents: 0,
    },
  ];
}

export const GET = wrapCronHandler("automation-verdict-rollup", handler);
