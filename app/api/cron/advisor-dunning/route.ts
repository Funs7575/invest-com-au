import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { getStripe } from "@/lib/stripe";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { wrapCronHandler } from "@/lib/cron-run-log";

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
        // Credit the advisor's balance
        await supabase
          .from("advisor_credit_topups")
          .update({
            status: "completed",
            dunning_step: nextStep,
            dunning_last_attempt_at: now.toISOString(),
          })
          .eq("id", topup.id);

        await supabase
          .from("professionals")
          .update({
            credit_balance_cents: (advisor.credit_balance_cents || 0) + topup.amount_cents,
          })
          .eq("id", advisor.id);

        sendEmail(
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

      sendEmail(
        advisor.email,
        subjects[nextStep],
        `<div style="font-family:Arial,sans-serif;max-width:560px;color:#334155">
          <h2 style="color:${nextStep >= 2 ? "#dc2626" : "#0f172a"};font-size:18px">${urgencies[nextStep]}</h2>
          <p style="font-size:14px">Hi ${escapeHtml(advisor.name || "there")},</p>
          <p style="font-size:14px">${bodies[nextStep]}</p>
          <a href="${getSiteUrl()}/advisor-portal?topup=retry" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Update payment method →</a>
        </div>`,
      );

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

function sendEmail(to: string | null, subject: string, html: string): void {
  if (!to || !process.env.RESEND_API_KEY) return;
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <billing@invest.com.au>",
      to: [to],
      subject,
      html,
    }),
  }).catch(() => {});
}

export const GET = wrapCronHandler("advisor-dunning", handler);
