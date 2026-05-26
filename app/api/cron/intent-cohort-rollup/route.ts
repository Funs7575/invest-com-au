/**
 * Cron: intent-cohort-rollup — weekly investor-intent cohort aggregation.
 *
 * Runs Sunday 00:00 UTC (registered in lib/cron-groups.ts under weekly-sun-0).
 *
 * Reads quiz completions (user_quiz_history) and lead captures (quiz_leads)
 * from the prior ISO week and aggregates them into investor_cohort_snapshots
 * by inferred_vertical × experience_level × investment_range.
 *
 * No PII is stored — only aggregate counts and derived percentages.
 * The snapshots power the /api/v1/cohort-report Enterprise API endpoint.
 *
 * Idempotent: upserts on (week_start, inferred_vertical, experience_level,
 * investment_range) so re-runs overwrite stale values rather than duplicating.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:intent-cohort-rollup");

/** Returns the Monday (ISO week start) of the week that contains `date`. */
function isoWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

/** Normalise investment_range strings to a canonical set. */
function normaliseRange(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().replace(/[^0-9a-z+]/g, "");
  if (v.includes("0") && v.includes("10")) return "0-10k";
  if (v.includes("10") && v.includes("50")) return "10k-50k";
  if (v.includes("50") && v.includes("250")) return "50k-250k";
  if (v.includes("250") || v.includes("+")) return "250k+";
  return raw.slice(0, 32); // keep original if no canonical match
}

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  // Compute the prior full ISO week (Mon–Sun, ending last Saturday midnight UTC)
  const now = new Date();
  const thisWeekStart = isoWeekStart(now);
  const priorWeekStart = new Date(thisWeekStart);
  priorWeekStart.setUTCDate(priorWeekStart.getUTCDate() - 7);
  const priorWeekEnd = new Date(thisWeekStart); // exclusive upper bound

  const weekLabel = priorWeekStart.toISOString().slice(0, 10);
  log.info("Running intent-cohort-rollup", {
    week_start: weekLabel,
    week_end: priorWeekEnd.toISOString().slice(0, 10),
  });

  const stats = { rows_written: 0, errors: 0 };

  // ── 1. Fetch quiz completions in the window ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: quizRows, error: quizError } = await (supabase as any)
    .from("user_quiz_history")
    .select("inferred_vertical, answers")
    .gte("completed_at", priorWeekStart.toISOString())
    .lt("completed_at", priorWeekEnd.toISOString())
    .not("completed_at", "is", null);

  if (quizError) {
    log.error("Failed to fetch quiz history", { error: quizError.message });
    return NextResponse.json({ error: "Failed to fetch quiz history" }, { status: 500 });
  }

  // ── 2. Fetch lead captures in the window ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leadRows, error: leadError } = await (supabase as any)
    .from("quiz_leads")
    .select("inferred_vertical, experience_level, investment_range, utm_source")
    .gte("captured_at", priorWeekStart.toISOString())
    .lt("captured_at", priorWeekEnd.toISOString());

  if (leadError) {
    log.error("Failed to fetch quiz leads", { error: leadError.message });
    return NextResponse.json({ error: "Failed to fetch quiz leads" }, { status: 500 });
  }

  const quizzes = (quizRows ?? []) as Array<{ inferred_vertical: string | null; answers: Record<string, unknown> | null }>;
  const leads = (leadRows ?? []) as Array<{
    inferred_vertical: string | null;
    experience_level: string | null;
    investment_range: string | null;
    utm_source: string | null;
  }>;

  // ── 3. Group by dimension triple ───────────────────────────────────────────
  type CohortKey = string; // JSON serialised {v,e,r}
  const quizCounts = new Map<CohortKey, number>();
  const leadCounts = new Map<CohortKey, number>();
  const utmCounts = new Map<CohortKey, Map<string, number>>();

  function makeKey(vertical: string | null, experience: string | null, range: string | null): CohortKey {
    return JSON.stringify({ v: vertical ?? null, e: experience ?? null, r: range ?? null });
  }

  // Count quiz completions — experience + range come from the answers JSONB
  for (const q of quizzes) {
    const answers = (q.answers ?? {}) as Record<string, unknown>;
    const experience = typeof answers["experience"] === "string" ? answers["experience"] : null;
    const range = normaliseRange(typeof answers["amount"] === "string" ? answers["amount"] : null);
    const key = makeKey(q.inferred_vertical, experience, range);
    quizCounts.set(key, (quizCounts.get(key) ?? 0) + 1);
  }

  // Count leads
  for (const l of leads) {
    const range = normaliseRange(l.investment_range);
    const key = makeKey(l.inferred_vertical, l.experience_level, range);
    leadCounts.set(key, (leadCounts.get(key) ?? 0) + 1);

    if (l.utm_source) {
      if (!utmCounts.has(key)) utmCounts.set(key, new Map());
      const m = utmCounts.get(key)!;
      m.set(l.utm_source, (m.get(l.utm_source) ?? 0) + 1);
    }
  }

  // ── 4. Also compute a roll-up row (all dimensions null = total) ───────────
  const totalQuizzes = quizzes.length;
  const totalLeads = leads.length;
  const allKeys = new Set([...quizCounts.keys(), ...leadCounts.keys()]);
  const totalKey = makeKey(null, null, null);
  // Ensure the total row exists even if quiz/lead counts are empty
  if (!allKeys.has(totalKey)) {
    quizCounts.set(totalKey, totalQuizzes);
    leadCounts.set(totalKey, totalLeads);
    allKeys.add(totalKey);
  } else {
    quizCounts.set(totalKey, totalQuizzes);
    leadCounts.set(totalKey, totalLeads);
  }

  // ── 5. Build upsert rows ───────────────────────────────────────────────────
  const upsertRows: Array<{
    week_start: string;
    inferred_vertical: string | null;
    experience_level: string | null;
    investment_range: string | null;
    quiz_completions: number;
    leads_captured: number;
    conversion_rate: number | null;
    top_utm_source: string | null;
    computed_at: string;
  }> = [];

  const computedAt = new Date().toISOString();

  for (const key of allKeys) {
    const dims = JSON.parse(key) as { v: string | null; e: string | null; r: string | null };
    const qCount = quizCounts.get(key) ?? 0;
    const lCount = leadCounts.get(key) ?? 0;
    const convRate = qCount > 0 ? Math.round((lCount / qCount) * 10000) / 100 : null;

    // Top UTM source by count
    let topUtm: string | null = null;
    const utmMap = utmCounts.get(key);
    if (utmMap && utmMap.size > 0) {
      let maxCount = 0;
      for (const [src, cnt] of utmMap) {
        if (cnt > maxCount) { maxCount = cnt; topUtm = src; }
      }
    }

    upsertRows.push({
      week_start: weekLabel,
      inferred_vertical: dims.v,
      experience_level: dims.e,
      investment_range: dims.r,
      quiz_completions: qCount,
      leads_captured: lCount,
      conversion_rate: convRate,
      top_utm_source: topUtm,
      computed_at: computedAt,
    });
  }

  // ── 6. Upsert ──────────────────────────────────────────────────────────────
  if (upsertRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from("investor_cohort_snapshots")
      .upsert(upsertRows, {
        onConflict: "week_start,inferred_vertical,experience_level,investment_range",
      });
    if (upsertError) {
      stats.errors++;
      log.error("Cohort upsert failed", { error: upsertError.message });
    } else {
      stats.rows_written = upsertRows.length;
    }
  }

  log.info("intent-cohort-rollup complete", { week: weekLabel, ...stats });

  return NextResponse.json({
    ok: true,
    week_start: weekLabel,
    cohort_rows: upsertRows.length,
    quiz_completions: totalQuizzes,
    leads_captured: totalLeads,
    errors: stats.errors,
  });
}

export const GET = wrapCronHandler("intent-cohort-rollup", handler);
