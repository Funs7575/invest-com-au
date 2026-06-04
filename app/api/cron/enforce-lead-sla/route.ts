import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { ADMIN_EMAIL } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { enqueueJob } from "@/lib/job-queue";

const log = logger("cron:enforce-lead-sla");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily cron that enforces lead-response SLAs on the advisor vertical.
 *
 * State machine (per advisor, counted over the last 14 days):
 *
 *   0-2 unresponded leads:  no action
 *   3 unresponded:          warning email 1 ("please respond")
 *   5 unresponded:          warning email 2 ("auto-pause pending")
 *   7 unresponded:          auto-pause the advisor (status = paused),
 *                           stamp auto_paused_at + reason,
 *                           email advisor + admin
 *
 * Unpause path: the daily cron also detects advisors previously paused
 * for SLA violations whose unresponded count has dropped back below 3
 * (because they responded, or the leads aged out). Those get
 * automatically unpaused.
 *
 * Idempotent: uses pause_warning_sent_at to prevent spamming warnings
 * and auto_paused_at to prevent re-pausing already-paused advisors.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all active advisors + any that are currently auto-paused
  // (we need the paused set to check for unpause).
  const { data: advisors, error } = await supabase
    .from("professionals")
    .select("id, name, email, status, auto_paused_at, auto_pause_reason, pause_warning_sent_at")
    .in("status", ["active", "paused"])
    .limit(5000);

  if (error) {
    log.error("Failed to fetch advisors", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: advisors?.length || 0,
    warned1: 0,
    warned2: 0,
    paused: 0,
    unpaused: 0,
    failed: 0,
  };

  for (const advisor of advisors || []) {
    try {
      // Count unresponded leads from the last 14 days
      const { count: unresponded } = await supabase
        .from("professional_leads")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", advisor.id)
        .is("responded_at", null)
        .gte("created_at", fourteenDaysAgo);

      const unrespondedCount = unresponded || 0;

      // ── Unpause path ────────────────────────────────────
      // Previously auto-paused advisor whose unresponded count has
      // dropped below the warning threshold. Restore them.
      if (
        advisor.status === "paused" &&
        advisor.auto_pause_reason === "sla_miss" &&
        unrespondedCount < 3
      ) {
        await supabase
          .from("professionals")
          .update({
            status: "active",
            auto_paused_at: null,
            auto_pause_reason: null,
            pause_warning_sent_at: null,
          })
          .eq("id", advisor.id);

        // Reinstatement is already durable (status flipped above). The
        // courtesy email is enqueued durably so a Resend hiccup retries.
        await enqueueSlaEmail(
          advisor.email,
          "Your advisor profile is active again",
          `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
            <h2 style="color:#0f172a;font-size:18px">You're back in the directory</h2>
            <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")}, your profile has been automatically reinstated. Thanks for catching up on your leads.</p>
            <a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Go to portal →</a>
          </div>`,
        );
        stats.unpaused++;
        continue;
      }

      // Skip advisors already in terminal states
      if (advisor.status !== "active") continue;

      // ── Auto-pause at 7+ unresponded ────────────────────
      if (unrespondedCount >= 7 && !advisor.auto_paused_at) {
        const nowIso = now.toISOString();
        await supabase
          .from("professionals")
          .update({
            status: "paused",
            auto_paused_at: nowIso,
            auto_pause_reason: "sla_miss",
          })
          .eq("id", advisor.id);

        // Pause is already durable (auto_paused_at stamped above also acts
        // as the idempotency guard against re-pausing / re-emailing). The
        // notifications are enqueued durably (not fire-and-forget) so a
        // Resend hiccup retries via the worker rather than silently dropping.
        await enqueueSlaEmail(
          advisor.email,
          "Your advisor profile has been paused",
          `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
            <h2 style="color:#dc2626;font-size:18px">Profile paused — SLA breach</h2>
            <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")}, you have ${unrespondedCount} unresponded leads in the last 14 days and we've had to pause your profile in the directory.</p>
            <p style="font-size:14px">Respond to your leads via the advisor portal — the next daily cron will automatically reinstate you once your unresponded count drops below 3.</p>
            <a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Go to portal →</a>
          </div>`,
        );

        // Tell admin too
        await enqueueSlaEmail(
          ADMIN_EMAIL,
          `Advisor auto-paused (SLA): ${advisor.name}`,
          `<p>${escapeHtml(advisor.name || "advisor")} auto-paused with ${unrespondedCount} unresponded leads.</p>`,
        );

        stats.paused++;
        continue;
      }

      // ── Warning email 2 at 5+ unresponded ───────────────
      if (unrespondedCount >= 5 && unrespondedCount < 7) {
        // Don't spam — only send if we haven't sent the 2nd warning yet
        // (pause_warning_sent_at tracks the last warning sent).
        const lastWarned = advisor.pause_warning_sent_at
          ? new Date(advisor.pause_warning_sent_at)
          : null;
        const hoursSinceLast = lastWarned
          ? (now.getTime() - lastWarned.getTime()) / (1000 * 60 * 60)
          : Infinity;

        if (hoursSinceLast >= 24) {
          // Enqueue durably BEFORE stamping pause_warning_sent_at. The job
          // is retried by the worker, so a Resend hiccup no longer drops the
          // warning. Only stamp (which would otherwise suppress re-sends for
          // 24h) once the email is durably queued — if the enqueue fails we
          // leave the flag so the next run retries this warning.
          const queued = await enqueueSlaEmail(
            advisor.email,
            "Urgent: respond to your leads to avoid pausing",
            `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
              <h2 style="color:#dc2626;font-size:18px">Final warning</h2>
              <p style="font-size:14px">You have ${unrespondedCount} unresponded leads. If you don't respond soon, your profile will be automatically paused in the directory (triggering at 7 unresponded).</p>
              <a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Respond now →</a>
            </div>`,
          );
          if (queued) {
            await supabase
              .from("professionals")
              .update({ pause_warning_sent_at: now.toISOString() })
              .eq("id", advisor.id);
            stats.warned2++;
          } else {
            log.warn("SLA warning-2 enqueue failed — leaving flag for retry", {
              advisorId: advisor.id,
            });
            stats.failed++;
          }
        }
        continue;
      }

      // ── Warning email 1 at 3+ unresponded ───────────────
      if (unrespondedCount >= 3) {
        const lastWarned = advisor.pause_warning_sent_at
          ? new Date(advisor.pause_warning_sent_at)
          : null;
        if (!lastWarned) {
          // Enqueue durably BEFORE stamping pause_warning_sent_at so a
          // transient Resend failure retries instead of being swallowed
          // while the flag (which suppresses future warning-1 sends) advances.
          const queued = await enqueueSlaEmail(
            advisor.email,
            "You have unresponded leads",
            `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
              <h2 style="color:#0f172a;font-size:18px">A few leads waiting for you</h2>
              <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")}, you have ${unrespondedCount} leads that haven't been responded to yet. Respond quickly to keep your profile active and your response time ranking high.</p>
              <a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View leads →</a>
            </div>`,
          );
          if (queued) {
            await supabase
              .from("professionals")
              .update({ pause_warning_sent_at: now.toISOString() })
              .eq("id", advisor.id);
            stats.warned1++;
          } else {
            log.warn("SLA warning-1 enqueue failed — leaving flag for retry", {
              advisorId: advisor.id,
            });
            stats.failed++;
          }
        }
      }
    } catch (err) {
      stats.failed++;
      log.error("SLA enforcement threw for advisor", {
        advisorId: advisor.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("SLA enforcement cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

/**
 * Durably enqueue an SLA email onto the job_queue. The job-queue-worker cron
 * sends it via Resend and retries with exponential backoff on transient
 * failures (see lib/job-queue `send_email` handler), so the notice survives a
 * single Resend hiccup instead of being swallowed by the old fire-and-forget
 * `fetch().catch(() => {})`. Returns true when the job row was persisted,
 * false when the enqueue itself failed (or there was no recipient). Warning
 * sends gate their `pause_warning_sent_at` stamp on this so a failed enqueue
 * retries next run; pause/unpause notifications are best-effort (the durable
 * state change has already landed).
 */
async function enqueueSlaEmail(
  to: string | null,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!to) return false;
  const jobId = await enqueueJob("send_email", {
    to,
    subject,
    html,
    from: "Invest.com.au <system@invest.com.au>",
  });
  return jobId !== null;
}

export const GET = wrapCronHandler("enforce-lead-sla", handler);
