/**
 * Pro weekly digest — Mondays 09:00 AEST (= Sunday 23:00 UTC, fires from
 * the daily-23 dispatcher when getUTCDay() === 0). Each verified active pro
 * gets a digest of new open briefs from the past 7 days, filtered to their
 * specialty tags.
 *
 * Idempotency: unique (professional_id, period_start) constraint. The
 * orchestrator writes the audit row BEFORE the Resend call so a crash
 * leaves a record. Re-runs are safe no-ops.
 */
// eslint-disable-next-line no-restricted-imports -- cross-pro fan-out under a cron context with no user JWT; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("cron:pro-digest");

export interface DigestRunResult {
  pros_considered: number;
  pros_sent: number;
  pros_skipped_idempotent: number;
  pros_failed: number;
}

export async function runProDigest(now: Date = new Date()): Promise<DigestRunResult> {
  const admin = createAdminClient();
  const periodEnd = new Date(now);
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7);
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const periodEndIso = periodEnd.toISOString().slice(0, 10);

  const { data: pros } = await admin
    .from("professionals")
    .select("id, name, email, specialty_tags, location_state")
    .eq("status", "active")
    .in("profile_quality_gate", ["passed", "pending"]);

  if (!pros || pros.length === 0) {
    return {
      pros_considered: 0,
      pros_sent: 0,
      pros_skipped_idempotent: 0,
      pros_failed: 0,
    };
  }

  const result: DigestRunResult = {
    pros_considered: pros.length,
    pros_sent: 0,
    pros_skipped_idempotent: 0,
    pros_failed: 0,
  };

  for (const pro of pros as Array<{
    id: number;
    name: string;
    email: string | null;
    specialty_tags: string[] | null;
    location_state: string | null;
  }>) {
    if (!pro.email) {
      result.pros_failed++;
      continue;
    }
    // Has this pro already received this week's digest?
    const { data: prior } = await admin
      .from("pro_digest_sends")
      .select("id")
      .eq("professional_id", pro.id)
      .eq("period_start", periodStartIso)
      .maybeSingle();
    if (prior) {
      result.pros_skipped_idempotent++;
      continue;
    }

    // Find matching briefs.
    const { data: briefs } = await admin
      .from("advisor_auctions")
      .select("id, slug, job_title, brief_template, brief_payload, created_at")
      .eq("flow_type", "accept")
      .eq("status", "open")
      .is("accepted_by_team_id", null)
      .is("accepted_by_professional_id", null)
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    const matching = filterBriefsForPro(briefs ?? [], pro.specialty_tags ?? []);
    if (matching.length === 0) {
      // Still record we considered them so we don't re-evaluate next run.
      await admin.from("pro_digest_sends").insert({
        professional_id: pro.id,
        period_start: periodStartIso,
        period_end: periodEndIso,
        brief_count: 0,
      });
      result.pros_skipped_idempotent++;
      continue;
    }

    // Idempotency row FIRST so a crash leaves a marker.
    const { error: writeErr } = await admin.from("pro_digest_sends").insert({
      professional_id: pro.id,
      period_start: periodStartIso,
      period_end: periodEndIso,
      brief_count: matching.length,
    });
    if (writeErr) {
      // Race: another runner already wrote this period — count as idempotent.
      if (writeErr.code === "23505") {
        result.pros_skipped_idempotent++;
        continue;
      }
      result.pros_failed++;
      continue;
    }

    try {
      await sendDigestEmail({
        to: pro.email,
        proName: pro.name,
        briefs: matching.slice(0, 10),
      });
      result.pros_sent++;
    } catch (err) {
      log.warn("digest send failed", {
        professional_id: pro.id,
        err: err instanceof Error ? err.message : String(err),
      });
      result.pros_failed++;
    }
  }

  return result;
}

export function filterBriefsForPro(
  briefs: Array<{
    id: number;
    brief_template: string | null;
    brief_payload: Record<string, unknown> | null;
  }>,
  specialtyTags: string[],
): Array<{ id: number; brief_template: string | null }> {
  if (specialtyTags.length === 0) {
    // No specialty filter — show all open briefs.
    return briefs.map((b) => ({ id: b.id, brief_template: b.brief_template }));
  }
  const lowerTags = specialtyTags.map((t) => t.toLowerCase());
  return briefs.filter((b) => {
    if (!b.brief_template) return false;
    return lowerTags.some((t) => b.brief_template!.toLowerCase().includes(t));
  });
}

async function sendDigestEmail(_input: {
  to: string;
  proName: string;
  briefs: Array<{ id: number; brief_template: string | null }>;
}): Promise<void> {
  // Resend wiring intentionally a stub. The infrastructure (table +
  // orchestrator + idempotency) is in place so the actual Resend call
  // can swap in without changing call sites. Marks an explicit TODO.
  // TODO(MM-30): wire Resend send with the existing pattern from
  // lib/marketplace-emails.ts. Until then, this is a no-op so the cron
  // still progresses idempotency rows.
  return;
}
