import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:data-integrity-audit");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Nightly data integrity audit.
 *
 * Runs a fixed set of SELECT queries that each look for a
 * specific class of data issue (orphans, dangling references,
 * impossible states). Each check writes a row to
 * `data_integrity_issues` with an `issue_count` and a sample of
 * IDs. The admin dashboard surfaces any check with
 * `issue_count > 0` and `resolved_at IS NULL`.
 *
 * Idempotent: re-running upserts the same rows. The `last_seen_at`
 * timestamp advances each run so you can see how long an issue
 * has been outstanding.
 *
 * Safety: every check runs in its own try block — one failing
 * check never blocks the rest.
 */
interface Check {
  name: string;
  description: string;
  severity: "info" | "warn" | "critical";
  run: (supabase: AdminClient) => Promise<{ count: number; sampleIds?: unknown[] }>;
}

type AdminClient = ReturnType<typeof createAdminClient>;

const CHECKS: Check[] = [
  {
    name: "professional_leads_orphan_professional",
    description:
      "Leads referencing a professional_id that no longer exists in professionals",
    severity: "critical",
    async run(supabase) {
      // Fetch a bounded sample for the alert payload — expensive
      // to full-join, so we do a bounded range
      const { data } = await supabase
        .from("professional_leads")
        .select("id, professional_id")
        .limit(5000);
      if (!data || data.length === 0) return { count: 0 };
      const ids = [...new Set(data.map((r) => r.professional_id as number))];
      const { data: existing } = await supabase
        .from("professionals")
        .select("id")
        .in("id", ids);
      const existingSet = new Set((existing || []).map((r) => r.id as number));
      const orphans = data.filter(
        (r) => !existingSet.has(r.professional_id as number),
      );
      return {
        count: orphans.length,
        sampleIds: orphans.slice(0, 10).map((r) => r.id),
      };
    },
  },
  {
    name: "lead_disputes_orphan_lead",
    description: "Disputes referencing a lead_id that no longer exists",
    severity: "critical",
    async run(supabase) {
      const { data } = await supabase
        .from("lead_disputes")
        .select("id, lead_id")
        .not("lead_id", "is", null)
        .limit(5000);
      if (!data || data.length === 0) return { count: 0 };
      const ids = [...new Set(data.map((r) => r.lead_id as number))];
      const { data: existing } = await supabase
        .from("professional_leads")
        .select("id")
        .in("id", ids);
      const existingSet = new Set((existing || []).map((r) => r.id as number));
      const orphans = data.filter((r) => !existingSet.has(r.lead_id as number));
      return {
        count: orphans.length,
        sampleIds: orphans.slice(0, 10).map((r) => r.id),
      };
    },
  },
  {
    name: "advisor_billing_negative_balance",
    description: "Advisors with a negative credit_balance_cents",
    severity: "warn",
    async run(supabase) {
      const { data } = await supabase
        .from("professionals")
        .select("id, credit_balance_cents")
        .lt("credit_balance_cents", 0)
        .limit(1000);
      return {
        count: data?.length || 0,
        sampleIds: (data || []).slice(0, 10).map((r) => r.id),
      };
    },
  },
  {
    name: "disputes_refunded_without_refund_cents",
    description:
      "Disputes with status='approved' but refunded_cents = 0 or NULL",
    severity: "warn",
    async run(supabase) {
      const { data } = await supabase
        .from("lead_disputes")
        .select("id, refunded_cents")
        .eq("status", "approved")
        .or("refunded_cents.is.null,refunded_cents.eq.0")
        .limit(1000);
      return {
        count: data?.length || 0,
        sampleIds: (data || []).slice(0, 10).map((r) => r.id),
      };
    },
  },
  {
    name: "form_events_future_timestamps",
    description:
      "form_events rows with created_at in the future — possible clock skew or injection",
    severity: "warn",
    async run(supabase) {
      const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("form_events")
        .select("id", { count: "exact", head: true })
        .gt("created_at", future);
      return { count: count || 0 };
    },
  },
  {
    name: "complaints_overdue_sla",
    description:
      "Complaints past their 30-day SLA that are still unresolved",
    severity: "critical",
    async run(supabase) {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("complaints_register")
        .select("id")
        .lt("sla_due_at", now)
        .not("status", "in", "(resolved,escalated_afca,closed)")
        .limit(100);
      return {
        count: data?.length || 0,
        sampleIds: (data || []).slice(0, 10).map((r) => r.id),
      };
    },
  },
  {
    name: "job_queue_stuck_running",
    description: "Jobs in 'running' state for more than 30 minutes",
    severity: "warn",
    async run(supabase) {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("job_queue")
        .select("id")
        .eq("status", "running")
        .lt("started_at", cutoff)
        .limit(100);
      return {
        count: data?.length || 0,
        sampleIds: (data || []).slice(0, 10).map((r) => r.id),
      };
    },
  },
];

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const stats = { checks: CHECKS.length, issues_found: 0, failed: 0 };
  const nowIso = new Date().toISOString();

  for (const check of CHECKS) {
    try {
      const result = await check.run(supabase);
      if (result.count > 0) stats.issues_found++;

      await supabase.from("data_integrity_issues").upsert(
        {
          check_name: check.name,
          issue_count: result.count,
          severity: check.severity,
          sample_ids: result.sampleIds || null,
          description: check.description,
          last_seen_at: nowIso,
          resolved_at: result.count === 0 ? nowIso : null,
        },
        { onConflict: "check_name" },
      );
    } catch (err) {
      stats.failed++;
      log.error("check threw", {
        check: check.name,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("data integrity audit completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

export const GET = wrapCronHandler("data-integrity-audit", handler);
