import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { getStripe } from "@/lib/stripe";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { enqueueJob } from "@/lib/job-queue";

const log = logger("cron:advisor-dunning");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily dunning cron for failed advisor credit top-ups.
 *
 * Works off the existing `advisor_credit_topups` table. When a top-up
 * lands in status='failed' the cron walks it through a state machine:
 *
 *   Day 0 (immediate):  dunning_step=0 → email 1 + schedule retry for day 1
 *   Day 1:  dunning_step=1 → retry charge. success: mark completed.
 *                             fail: email 2 ("still failing, please update")
 *   Day 3:  dunning_step=2 → retry charge. success: mark completed.
 *                             fail: email 3 ("pausing in 4 days")
 *   Day 7:  dunning_step=3 → final retry. success: mark completed.
 *                             fail: mark advisor credit-paused + email 4
 *
 * State tracked in new `advisor_credit_topups.dunning_step` +
 * `advisor_credit_topups.dunning_last_attempt_at` columns.
 *
 * Safe to run daily — each step only fires once per row.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const stripe = getStripe();

  const { data: failed, error } = await supabase
    .from("advisor_credit_topups")
    .select(
      "id, professional_id, amount_cents, status, stripe_payment_intent_id, created_at, dunning_step, dunning_last_attempt_at",
    )
    .eq("status", "failed")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    log.error("Failed to fetch failed top-ups", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const stats = {
    scanned: failed?.length || 0,
    retried_succeeded: 0,
    retried_failed: 0,
    emailed: 0,
    paused: 0,
    skipped: 0,
    errored: 0,
  };

  for (const topup of failed || []) {
    try {
      const createdAt = topup.created_at ? new Date(topup.created_at).getTime() : now.getTime();
      const ageDays = Math.floor((now.getTime() - createdAt) / (1000 * 60 * 60 * 24));
      const currentStep = topup.dunning_step || 0;

      // Pick the next step based on age
      const nextStep =
        ageDays >= 7 ? 3 :
        ageDays >= 3 ? 2 :
        ageDays >= 1 ? 1 :
        0;

      // Only act on step transitions
      if (nextStep <= currentStep) {
        stats.skipped++;
        continue;
      }

      // Fetch advisor for the email + customer id
      const { data: advisor } = await supabase
        .from("professionals")
        .select("id, name, email, stripe_customer_id, credit_balance_cents, status")
        .eq("id", topup.professional_id)
        .maybeSingle();
      if (!advisor?.email) {
        stats.errored++;
        continue;
      }

      // Step 1+ retries the Stripe charge via the existing payment intent
      let retrySucceeded = false;
      if (nextStep >= 1 && topup.stripe_payment_intent_id) {
        try {
          const pi = await stripe.paymentIntents.retrieve(topup.stripe_payment_intent_id);
          if (pi.status !== "succeeded" && pi.status !== "processing") {
            const confirmed = await stripe.paymentIntents.confirm(topup.stripe_payment_intent_id, {
              // Vercel cron IP has to be off_session for this to work on
              // a saved payment method without fresh user interaction.
              off_session: true,
            });
            if (confirmed.status === "succeeded") {
              retrySucceeded = true;
            }
          } else if (pi.status === "succeeded") {
            retrySucceeded = true;
          }
        } catch (err) {
          log.warn("Dunning retry failed", {
            topupId: topup.id,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (retrySucceeded) {
        // Credit FIRST through the ledger, mark the topup completed AFTER.
        // The ledger's (kind, reference_type, reference_id) unique index
        // keyed to the topup id is the durable guard: if this cron crashes
        // after crediting but before flipping status='completed', the row
        // stays 'failed' and the next run re-records the SAME ledger triple
        // — which is a no-op — then completes the status. No lost credit,
        // no double credit. (Old ordering marked completed first, so a
        // crash left the topup "done" but never credited, with no retry.)
        // The triple matches the Stripe-webhook topup-credit path
        // (advisor_credit_topup / topup id) so the two can never both
        // credit the same row.
        await recordLedgerEntry({
          professionalId: advisor.id as number,
          amountCents: topup.amount_cents,
          kind: "topup",
          description: `Dunning retry recovered — A$${(topup.amount_cents / 100).toFixed(2)}`,
          referenceType: "advisor_credit_topup",
          referenceId: String(topup.id),
          metadata: {
            dunning_recovery: true,
            dunning_step: nextStep,
            stripe_payment_intent_id: topup.stripe_payment_intent_id ?? null,
          },
          createdBy: "cron:advisor-dunning",
          supabase,
        });

        await supabase
          .from("advisor_credit_topups")
          .update({
            status: "completed",
            dunning_step: nextStep,
            dunning_last_attempt_at: now.toISOString(),
          })
          .eq("id", topup.id);

        // Recovery email is informational — the credit + status flip above
        // are already durable, so this is best-effort but still enqueued
        // (not fire-and-forget) so a transient Resend failure gets retried.
        await enqueueDunningEmail(
          advisor.email,
          `Payment succeeded — A$${(topup.amount_cents / 100).toFixed(2)} credited`,
          `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
            <h2 style="color:#15803d;font-size:18px">✅ Payment recovered</h2>
            <p style="font-size:14px">Your previously-failed top-up has been successfully retried and credited to your balance. You're back in business.</p>
            <a href="${getSiteUrl()}/advisor-portal" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View balance →</a>
          </div>`,
        );
        stats.retried_succeeded++;
        continue;
      }

      // Retry didn't succeed (or we're on step 0 which doesn't retry)
      // → send the appropriate dunning email
      const subjects = [
        "Your payment didn't go through",
        "Still waiting on your payment",
        "Action needed: your advisor credits",
        "Final notice: account will pause",
      ];
      const urgencies = ["", "⚠️ Still failing", "⚠️ Urgent", "🚫 Final notice"];
      const bodies = [
        `Your recent credit top-up of A$${(topup.amount_cents / 100).toFixed(2)} didn't process. This usually means your card was declined.`,
        `We retried the charge and it's still failing. Please update your payment method to keep your advisor profile running.`,
        `We'll try one more time in a few days. If that also fails, your account will be paused until you update your payment method.`,
        `Your account has been paused. Update your payment method to resume receiving leads.`,
      ];

      // Enqueue the dunning email durably BEFORE advancing any state. The
      // job_queue row is retried with backoff by the job-queue-worker, so a
      // transient Resend hiccup no longer silently drops the notice. We only
      // advance dunning_step (and pause at the final step) once the email is
      // durably queued — if enqueue fails we leave the row untouched so the
      // next daily run retries this same step rather than skipping past it.
      const emailQueued = await enqueueDunningEmail(
        advisor.email,
        subjects[nextStep],
        `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:${nextStep >= 2 ? "#dc2626" : "#0f172a"};font-size:18px">${urgencies[nextStep]}</h2>
          <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")},</p>
          <p style="font-size:14px">${bodies[nextStep]}</p>
          <a href="${getSiteUrl()}/advisor-portal?topup=retry" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Update payment method →</a>
        </div>`,
      );

      if (!emailQueued) {
        log.warn("Dunning email enqueue failed — leaving step for retry", {
          topupId: topup.id,
          step: nextStep,
        });
        stats.errored++;
        continue;
      }

      // Final step: pause the advisor if still not paid
      if (nextStep === 3 && advisor.status === "active") {
        await supabase
          .from("professionals")
          .update({
            status: "paused",
            auto_paused_at: now.toISOString(),
            auto_pause_reason: "payment_failed",
          })
          .eq("id", advisor.id);
        stats.paused++;
      } else {
        stats.retried_failed++;
      }

      await supabase
        .from("advisor_credit_topups")
        .update({
          dunning_step: nextStep,
          dunning_last_attempt_at: now.toISOString(),
        })
        .eq("id", topup.id);
      stats.emailed++;
    } catch (err) {
      stats.errored++;
      log.error("Dunning step threw", {
        topupId: topup.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Advisor dunning cron completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

/**
 * Durably enqueue a dunning email onto the job_queue. The job-queue-worker
 * cron sends it via Resend and retries with exponential backoff on a 5xx /
 * 429 / transient failure (see lib/job-queue `send_email` handler), so the
 * notice is no longer lost on a single Resend hiccup the way the old
 * fire-and-forget `fetch().catch(() => {})` was. Returns true when the job
 * row was persisted, false when the enqueue itself failed (or no recipient).
 */
async function enqueueDunningEmail(
  to: string | null,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!to) return false;
  const jobId = await enqueueJob("send_email", {
    to,
    subject,
    html,
    from: "Invest.com.au <billing@invest.com.au>",
  });
  return jobId !== null;
}

export const GET = wrapCronHandler("advisor-dunning", handler);
