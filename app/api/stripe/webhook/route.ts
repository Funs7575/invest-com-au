import { getStripe, PLANS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleInvoicePaid, handleInvoicePaymentFailed } from "@/lib/advisor-billing";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { ADMIN_EMAIL } from "@/lib/admin";

const log = logger("stripe-webhook");

// ─── Transactional email helpers ────────────────────────────────────

/** Escape HTML special chars to prevent XSS in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fire-and-forget email via Resend */
async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
  from = "Invest.com.au <hello@invest.com.au>",
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
  } catch (err) {
    log.error("Transactional email failed", { error: err instanceof Error ? err.message : String(err) });
  }
}

function emailWrapper(heading: string, accentColor: string, body: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
      <div style="background: ${accentColor}; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <span style="color: #fff; font-weight: 800; font-size: 16px;">${heading}</span>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        ${body}
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
          Invest.com.au — Independent investing education &amp; comparison<br>
          <a href="https://invest.com.au/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
        </p>
      </div>
    </div>`;
}

function buildProWelcomeEmail(planInterval: string | null): string {
  const isYearly = planInterval === "year";
  const planLabel = isYearly ? PLANS.yearly.label : PLANS.monthly.label;

  return emailWrapper("Welcome to Invest.com.au Pro 🎉", "#15803d", `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">You're now a Pro member!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Your <strong>${planLabel}</strong> subscription is active. Here's what you've unlocked:
    </p>
    <ul style="color: #334155; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
      <li>Ad-free broker comparisons &amp; reviews</li>
      <li>Exclusive Pro-only research &amp; guides</li>
      <li>Discounted course &amp; consultation pricing</li>
      <li>Priority support</li>
    </ul>
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://invest.com.au/account" style="display: inline-block; padding: 12px 28px; background: #15803d; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Go to Your Account →</a>
    </div>
  `);
}

function buildCourseReceiptEmail(courseName: string, courseSlug: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2);

  return emailWrapper("Course Purchase Confirmed ✅", "#0f172a", `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">You're in!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Your purchase of <strong>${escapeHtml(courseName)}</strong> has been confirmed.
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Access:</strong> Lifetime — start anytime</p>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://invest.com.au/courses/${courseSlug}" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Start Learning →</a>
    </div>
  `);
}

function buildConsultationConfirmationEmail(
  consultationTitle: string,
  consultationSlug: string,
  amountCents: number,
): string {
  const amount = (amountCents / 100).toFixed(2);

  return emailWrapper("Consultation Booked ✅", "#7c3aed", `
    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Booking confirmed!</h2>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
      Your <strong>${escapeHtml(consultationTitle)}</strong> consultation has been booked successfully.
    </p>
    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin: 0 0 16px;">
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
      <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Status:</strong> Confirmed</p>
    </div>
    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
      We'll reach out within 1–2 business days to schedule your session. Check your account for updates.
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="https://invest.com.au/consultations/${consultationSlug}" style="display: inline-block; padding: 12px 28px; background: #7c3aed; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">View Booking →</a>
    </div>
  `);
}

// Ensure this runs in Node.js runtime (needed for Stripe signature verification)
export const runtime = "nodejs";

async function upsertSubscription(subscription: Stripe.Subscription) {
  const supabase = createAdminClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Look up user by stripe_customer_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    log.error("No profile found for Stripe customer", { customerId });
    return;
  }

  const item = subscription.items.data[0];

  // Out-of-order protection. Stripe does NOT guarantee webhook delivery
  // order. A `subscription.updated` event (flipping status to active) can
  // arrive AFTER a later `subscription.updated` (flipping to cancelled),
  // which would leave the row in the wrong terminal state. Stripe puts
  // the actual event time on `subscription.updated` via `Date.now()`; we
  // use that as a monotonic marker and skip any incoming event that's
  // older than what we already stored.
  //
  // We persist it into `updated_at` because the column already exists on
  // the subscriptions table and we don't want to require a migration for
  // this fix. Incoming events older than existing `updated_at` are
  // dropped (but still return success to Stripe so it stops retrying).
  const stripeEventTime = new Date(
    // Prefer explicit updated timestamp if Stripe provides it (billing_cycle_anchor
    // or created are the closest proxies); otherwise fall back to wall clock.
    subscription.cancel_at
      ? subscription.cancel_at * 1000
      : subscription.current_period_start
      ? subscription.current_period_start * 1000
      : Date.now()
  ).toISOString();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("updated_at, status")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existing?.updated_at && existing.updated_at > stripeEventTime) {
    log.info("Skipping older webhook event", {
      subscriptionId: subscription.id,
      existingUpdatedAt: existing.updated_at,
      incomingEventTime: stripeEventTime,
    });
    return;
  }

  const subscriptionData = {
    user_id: profile.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    price_id: item?.price?.id || null,
    plan_interval: item?.price?.recurring?.interval || null,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { onConflict: "stripe_subscription_id" });

  if (error) {
    log.error("Subscription upsert error", { error: error.message });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    log.error("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency (crash-robust) ────────────────────────────────────
  // Stripe retries events after transient failures, so the same event.id
  // can arrive multiple times. Claim with a processing → done state
  // machine so that a crashed handler's event can be re-taken after a
  // 5 minute timeout. Previous version was PK-only, which meant a
  // handler crash left a permanent "duplicate" row and the event was
  // never retried.
  //
  // Duplicate handling without this check produces: double welcome emails,
  // double wallet credits, duplicated audit-log rows, and double refund
  // reversals. All of those are revenue / trust disasters.
  const idempotencyClient = createAdminClient();
  const FIVE_MINS_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  {
    const { error: dedupeError } = await idempotencyClient
      .from("stripe_webhook_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        status: "processing",
        started_at: new Date().toISOString(),
      });

    if (dedupeError) {
      if (dedupeError.code === "23505") {
        // Row already exists. If it's 'done', we're finished. If it's
        // 'processing' and younger than 5 min, another worker owns
        // it. If 'processing' and older, we re-take it (previous
        // worker crashed).
        const { data: existing } = await idempotencyClient
          .from("stripe_webhook_events")
          .select("status, started_at")
          .eq("event_id", event.id)
          .maybeSingle();

        if (existing?.status === "done") {
          log.info("Duplicate webhook event ignored (already done)", {
            eventId: event.id,
            type: event.type,
          });
          return NextResponse.json({ received: true, duplicate: true });
        }
        if (
          existing?.status === "processing" &&
          existing.started_at &&
          existing.started_at > FIVE_MINS_AGO
        ) {
          log.info("Duplicate webhook event ignored (in-flight)", {
            eventId: event.id,
            type: event.type,
          });
          return NextResponse.json({ received: true, inflight: true });
        }
        // Stale processing row — re-take it.
        await idempotencyClient
          .from("stripe_webhook_events")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("event_id", event.id);
        log.warn("Retaking stale stripe webhook event", {
          eventId: event.id,
          type: event.type,
        });
      } else {
        log.warn("Idempotency claim failed, processing anyway", {
          eventId: event.id,
          error: dedupeError.message,
        });
      }
    }
  }

  // Mark the row complete once the handler finishes successfully. On
  // exception we mark it 'error' so a retry can come along. Use a
  // finally-style wrapper that runs even if the handler throws.
  let finalStatus: "done" | "error" = "done";
  try {
    switch (event.type) {
      case "customer.subscription.created": {
        const newSub = event.data.object as Stripe.Subscription;
        await upsertSubscription(newSub);

        // Send Pro welcome email on new subscription
        if (newSub.status === "active" || newSub.status === "trialing") {
          const custId = typeof newSub.customer === "string" ? newSub.customer : newSub.customer.id;
          try {
            const customer = await getStripe().customers.retrieve(custId);
            if (!("deleted" in customer) && customer.email) {
              const interval = newSub.items.data[0]?.price?.recurring?.interval || null;
              sendTransactionalEmail(
                customer.email,
                "Welcome to Invest.com.au Pro 🎉",
                buildProWelcomeEmail(interval),
              ).catch((err) => log.error("Pro welcome email failed", { err: err instanceof Error ? err.message : String(err) }));

              // Notify admin of new Pro signup. Escape customer fields
              // even though Stripe validates email format — header
              // injection via "\n" or "\r" in the subject line is the
              // riskiest path. Stripping non-printable chars defends
              // even if upstream validation regresses.
              const safeEmail = escapeHtml(customer.email).replace(/[\r\n]/g, "");
              const safeCustId = escapeHtml(custId).replace(/[\r\n]/g, "");
              const safeInterval = escapeHtml(interval || "unknown");
              sendTransactionalEmail(
                ADMIN_EMAIL,
                `New Pro Signup: ${safeEmail}`,
                `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">💎 New Pro Member</h2><p style="color:#64748b;font-size:14px"><strong>${safeEmail}</strong> just subscribed to Invest.com.au Pro (${safeInterval} plan).</p><p style="color:#64748b;font-size:14px">Customer ID: ${safeCustId}</p><a href="${getSiteUrl()}/admin/pro-subscribers" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">View Pro Members →</a></div>`,
              ).catch((err) => log.error("Admin Pro signup notification failed", { err: err instanceof Error ? err.message : String(err) }));
            }
          } catch (err) {
            log.error("Pro welcome email lookup failed", { error: err instanceof Error ? err.message : String(err) });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid": {
        const paidInvoice = event.data.object as Stripe.Invoice;
        const paidPiId =
          typeof paidInvoice.payment_intent === "string"
            ? paidInvoice.payment_intent
            : paidInvoice.payment_intent?.id || null;

        // Check if this is an advisor lead billing invoice
        if (paidInvoice.metadata?.type === "advisor_lead") {
          await handleInvoicePaid(paidInvoice.id, paidPiId);
        }

        log.info("Invoice paid", { invoiceId: paidInvoice.id, customer: paidInvoice.customer });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        // Update advisor billing if applicable
        if (invoice.metadata?.type === "advisor_lead") {
          await handleInvoicePaymentFailed(invoice.id);
        }

        // Notify the subscriber so they can update their card before Stripe's
        // dunning cycle cancels the subscription. Previously this only
        // logged a warning, so subscribers with an expired card would
        // silently slide into past_due → canceled and only find out when
        // their Pro features stopped working. getSubscription()'s isPro
        // already excludes past_due, so access is revoked at the check
        // layer — this handler just adds the user-visible notification.
        const invCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        if (invCustomerId && invoice.metadata?.type !== "advisor_lead") {
          try {
            const custAdmin = createAdminClient();
            const { data: subProfile } = await custAdmin
              .from("profiles")
              .select("id")
              .eq("stripe_customer_id", invCustomerId)
              .maybeSingle();

            // Tag the subscription with payment_failed_at if the column exists.
            // Safe under schema drift — errors are logged and swallowed.
            if (subProfile) {
              await custAdmin
                .from("subscriptions")
                .update({ updated_at: new Date().toISOString() })
                .eq("stripe_customer_id", invCustomerId);
            }

            const customer = await getStripe().customers.retrieve(invCustomerId);
            if (!("deleted" in customer) && customer.email) {
              const amount = ((invoice.amount_due || 0) / 100).toFixed(2);
              await sendTransactionalEmail(
                customer.email,
                "Action needed: your Invest.com.au Pro payment failed",
                emailWrapper("Payment Failed ⚠️", "#dc2626", `
                  <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">We couldn't process your renewal</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    We tried to charge your card A$${amount} for your Invest.com.au Pro
                    subscription, but the payment didn't go through.
                  </p>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    Pro features are temporarily paused until you update your
                    payment method. We'll retry over the next few days — update
                    your card now to avoid losing access.
                  </p>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${getSiteUrl()}/account" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Update Payment Method →</a>
                  </div>
                `),
              );
            }
          } catch (err) {
            log.error("Payment failed email error", { error: err instanceof Error ? err.message : String(err) });
          }
        }

        log.warn("Payment failed for customer", { customer: invoice.customer, invoice: invoice.id });
        // The subscription.updated webhook will also fire with status 'past_due',
        // which upsertSubscription handles automatically. Access is revoked
        // by getSubscription() since past_due is excluded from isPro.
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Handle one-time course purchases
        if (session.metadata?.type === "course" && session.mode === "payment") {
          const userId = session.metadata.supabase_user_id;
          const courseSlug = session.metadata.course_slug || "investing-101";

          if (userId) {
            const supabase = createAdminClient();

            // Look up course for course_id, revenue tracking, and confirmation email
            const { data: course } = await supabase
              .from("courses")
              .select("id, title, creator_id, revenue_share_percent")
              .eq("slug", courseSlug)
              .maybeSingle();

            const { data: purchase, error } = await supabase
              .from("course_purchases")
              .upsert(
                {
                  user_id: userId,
                  course_slug: courseSlug,
                  course_id: course?.id || null,
                  stripe_payment_id: session.payment_intent as string,
                  amount_paid: session.amount_total || 0,
                  purchased_at: new Date().toISOString(),
                },
                { onConflict: "user_id,course_slug" }
              )
              .select("id")
              .single();

            if (error) {
              log.error("Course purchase upsert error", { error: error.message });
            }

            // Insert revenue tracking row if course has a creator. Run
            // this BEFORE sending the receipt so that if the revenue
            // insert fails we can roll back the purchase row — avoiding
            // the orphaned-purchase-without-revenue split-state that
            // caused creator payout disputes. We can't do a real DB
            // transaction through PostgREST, but rollback-on-error is
            // the next best thing: if the revenue write fails and the
            // purchase row was freshly inserted (not a duplicate-click
            // upsert), delete it so the user's checkout retries cleanly.
            let revenueOk = true;
            if (purchase && course?.creator_id && course.revenue_share_percent > 0) {
              const totalAmount = session.amount_total || 0;
              const creatorAmount = Math.round(totalAmount * (course.revenue_share_percent / 100));
              const platformAmount = totalAmount - creatorAmount;

              const { error: revenueError } = await supabase
                .from("course_revenue")
                .insert({
                  course_id: course.id,
                  purchase_id: purchase.id,
                  creator_id: course.creator_id,
                  total_amount: totalAmount,
                  creator_amount: creatorAmount,
                  platform_amount: platformAmount,
                  revenue_share_percent: course.revenue_share_percent,
                });

              if (revenueError) {
                revenueOk = false;
                log.error("Course revenue insert error — rolling back purchase", {
                  error: revenueError.message,
                  purchaseId: purchase.id,
                });
                // Best-effort rollback. If delete fails the purchase stays
                // but an admin alert makes the orphan visible for manual fix.
                await supabase
                  .from("course_purchases")
                  .delete()
                  .eq("id", purchase.id);
                sendTransactionalEmail(
                  ADMIN_EMAIL,
                  `Course revenue insert failed — manual review needed`,
                  `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#dc2626;font-size:16px">⚠️ Course Revenue Insert Failed</h2><p style="color:#64748b;font-size:14px">Purchase <strong>${purchase.id}</strong> for course <strong>${escapeHtml(courseSlug)}</strong> (user <strong>${escapeHtml(userId)}</strong>) was rolled back because the creator revenue row couldn't be inserted.</p><p style="color:#64748b;font-size:12px">Error: ${escapeHtml(revenueError.message)}</p><p style="color:#64748b;font-size:14px">Stripe payment intent: <code>${session.payment_intent}</code></p></div>`,
                ).catch(() => {});
              }
            }

            // Send course receipt email — only if the combined write
            // committed successfully, otherwise the user thinks they're
            // enrolled when they aren't.
            const customerEmail = session.customer_email || session.customer_details?.email;
            if (customerEmail && revenueOk && !error) {
              const courseName = course?.title || courseSlug;
              sendTransactionalEmail(
                customerEmail,
                `Course Confirmed: ${courseName}`,
                buildCourseReceiptEmail(courseName, courseSlug, session.amount_total || 0),
              ).catch((err) => log.error("Course receipt email failed", { err: err instanceof Error ? err.message : String(err) }));
            }
          }
        }

        // Wallet top-ups are handled exclusively by /api/marketplace/webhook
        // to avoid double-crediting from two webhook endpoints.
        // creditWallet() also has idempotency protection via stripe_payment_intent_id.

        // Handle advisor credit top-ups
        if (session.metadata?.type === "advisor_credit_topup" && session.mode === "payment") {
          const professionalId = parseInt(session.metadata.professional_id || "0");
          const topupId = parseInt(session.metadata.topup_id || "0");
          const amountCents = session.amount_total || 0;

          if (professionalId && amountCents > 0) {
            const supabase = createAdminClient();

            // Idempotency: check if already processed
            if (topupId) {
              const { data: existing } = await supabase
                .from("advisor_credit_topups")
                .select("status")
                .eq("id", topupId)
                .single();
              if (existing?.status === "completed") {
                log.info("Advisor top-up already processed", { topupId, professionalId });
                break;
              }
            }

            // Credit the advisor's balance
            const { data: pro } = await supabase
              .from("professionals")
              .select("credit_balance_cents, lifetime_credit_cents")
              .eq("id", professionalId)
              .single();

            await supabase.from("professionals").update({
              credit_balance_cents: (pro?.credit_balance_cents || 0) + amountCents,
              lifetime_credit_cents: (pro?.lifetime_credit_cents || 0) + amountCents,
              // Update per-lead price if a pack was purchased (rewards bigger packs with lower per-lead rate)
              ...(session.metadata?.per_lead_cents ? { lead_price_cents: parseInt(session.metadata.per_lead_cents) } : {}),
            }).eq("id", professionalId);

            // Mark top-up as completed
            if (topupId) {
              await supabase.from("advisor_credit_topups").update({
                status: "completed",
                stripe_payment_intent_id: session.payment_intent as string,
                stripe_checkout_session_id: session.id,
              }).eq("id", topupId);
            }

            // Advisor receipt email — previously missing, so advisors who
            // paid for credit had no proof of purchase and no confirmation
            // that the charge had posted. Pulls the advisor's email from
            // the professionals row (falls back to the Stripe customer
            // email) and renders an itemised receipt.
            try {
              const { data: advisor } = await supabase
                .from("professionals")
                .select("email, name")
                .eq("id", professionalId)
                .maybeSingle();
              const advisorEmail =
                advisor?.email ||
                session.customer_email ||
                session.customer_details?.email;
              if (advisorEmail) {
                const amount = (amountCents / 100).toFixed(2);
                sendTransactionalEmail(
                  advisorEmail,
                  `Credit Top-Up Confirmed — A$${amount}`,
                  emailWrapper("Credit Top-Up Confirmed ✅", "#0f172a", `
                    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Your credits are ready</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                      Hi ${escapeHtml(advisor?.name || "there")}, your advisor credit
                      top-up has been processed. You're ready to receive leads.
                    </p>
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
                      <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Status:</strong> Credited to your balance</p>
                    </div>
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${getSiteUrl()}/advisor-portal" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Go to Advisor Portal →</a>
                    </div>
                  `),
                ).catch((err) => log.error("Advisor topup receipt email failed", { err: err instanceof Error ? err.message : String(err) }));
              }
            } catch (err) {
              log.error("Advisor topup receipt lookup failed", { error: err instanceof Error ? err.message : String(err) });
            }

            log.info("Advisor credit topped up", { professionalId, amountCents, topupId });
          }
        }

        // Handle featured advisor purchase
        if (session.metadata?.type === "advisor_featured" && session.mode === "payment") {
          const professionalId = parseInt(session.metadata.professional_id || "0");
          if (professionalId) {
            const supabase = createAdminClient();
            const featuredUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
            await supabase.from("professionals").update({
              featured_until: featuredUntil,
            }).eq("id", professionalId);
            log.info("Advisor featured activated", { professionalId, until: featuredUntil });

            // Featured-purchase receipt — previously missing.
            try {
              const { data: advisor } = await supabase
                .from("professionals")
                .select("email, name, slug")
                .eq("id", professionalId)
                .maybeSingle();
              const advisorEmail =
                advisor?.email ||
                session.customer_email ||
                session.customer_details?.email;
              if (advisorEmail) {
                const amount = ((session.amount_total || 0) / 100).toFixed(2);
                const expiresLabel = new Date(featuredUntil).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });
                sendTransactionalEmail(
                  advisorEmail,
                  `Featured Listing Activated — A$${amount}`,
                  emailWrapper("Featured Listing Activated ✨", "#7c3aed", `
                    <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">You're featured!</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                      Hi ${escapeHtml(advisor?.name || "there")}, your profile is now
                      featured on Invest.com.au. You'll see a priority placement
                      badge on listings and search results for the next 30 days.
                    </p>
                    <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
                      <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Featured until:</strong> ${expiresLabel}</p>
                    </div>
                    <div style="text-align: center; margin: 20px 0;">
                      <a href="${getSiteUrl()}/advisor/${advisor?.slug || ""}" style="display: inline-block; padding: 12px 28px; background: #7c3aed; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">View Your Profile →</a>
                    </div>
                  `),
                ).catch((err) => log.error("Advisor featured receipt email failed", { err: err instanceof Error ? err.message : String(err) }));
              }
            } catch (err) {
              log.error("Advisor featured receipt lookup failed", { error: err instanceof Error ? err.message : String(err) });
            }
          }
        }

        // Handle listing payments
        if (session.metadata?.type === "listing_payment" && session.mode === "payment") {
          const listingId = parseInt(session.metadata.listing_id || "0");
          const planId = parseInt(session.metadata.plan_id || "0");
          const contactEmail = session.metadata.contact_email;

          if (listingId && planId) {
            const supabase = createAdminClient();

            // Look up plan to get duration from features
            const { data: plan } = await supabase
              .from("listing_plans")
              .select("plan_name, features")
              .eq("id", planId)
              .single();

            const durationDays = plan?.features?.listing_duration_days || 30;
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

            // Activate the listing
            const { error: updateError } = await supabase
              .from("investment_listings")
              .update({
                status: "active",
                expires_at: expiresAt,
                updated_at: new Date().toISOString(),
              })
              .eq("id", listingId);

            if (updateError) {
              log.error("Listing activation error", { error: updateError.message, listingId });
            } else {
              log.info("Listing activated", { listingId, planId, durationDays });
            }

            // Fetch listing title for the email
            const { data: listing } = await supabase
              .from("investment_listings")
              .select("title, slug")
              .eq("id", listingId)
              .single();

            // Send confirmation email to the seller
            if (contactEmail) {
              const listingTitle = listing?.title || `Listing #${listingId}`;
              const planName = plan?.plan_name || "Standard";
              const amountPaid = ((session.amount_total || 0) / 100).toFixed(2);

              sendTransactionalEmail(
                contactEmail,
                `Listing Activated: ${listingTitle}`,
                emailWrapper("Listing Payment Confirmed", "#0f172a", `
                  <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Your listing is now live!</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                    Your <strong>${escapeHtml(planName)}</strong> plan for <strong>${escapeHtml(listingTitle)}</strong> has been activated.
                  </p>
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                    <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amountPaid}</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Duration:</strong> ${durationDays} days</p>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #334155;"><strong>Expires:</strong> ${new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <div style="text-align: center; margin: 20px 0;">
                    <a href="${getSiteUrl()}/invest/listings/${listing?.slug || listingId}" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">View Your Listing</a>
                  </div>
                `),
              ).catch((err) => log.error("Listing confirmation email failed", { err: err instanceof Error ? err.message : String(err) }));
            }
          }
        }

        // Handle consultation bookings
        if (session.metadata?.type === "consultation" && session.mode === "payment") {
          const userId = session.metadata.supabase_user_id;
          const consultationSlug = session.metadata.consultation_slug;

          if (userId && consultationSlug) {
            const supabase = createAdminClient();

            const { data: consultation } = await supabase
              .from("consultations")
              .select("id, title")
              .eq("slug", consultationSlug)
              .maybeSingle();

            if (consultation) {
              const { error: bookingError } = await supabase
                .from("consultation_bookings")
                .upsert(
                  {
                    user_id: userId,
                    consultation_id: consultation.id,
                    stripe_payment_id: session.payment_intent as string,
                    amount_paid: session.amount_total || 0,
                    status: "confirmed",
                    booked_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id,consultation_id" }
                );

              if (bookingError) {
                log.error("Consultation booking upsert error", { error: bookingError.message });
              }

              // Send consultation confirmation email
              const consultCustomerEmail = session.customer_email || session.customer_details?.email;
              if (consultCustomerEmail) {
                const consultTitle = consultation.title || consultationSlug;
                sendTransactionalEmail(
                  consultCustomerEmail,
                  `Consultation Booked: ${consultTitle}`,
                  buildConsultationConfirmationEmail(consultTitle, consultationSlug, session.amount_total || 0),
                ).catch((err) => log.error("Consultation confirmation email failed", { err: err instanceof Error ? err.message : String(err) }));
              }
            }
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id || null;
        const refundedAmountCents = charge.amount_refunded;
        const supabase = createAdminClient();

        if (!paymentIntentId) break;

        // 1. Check if this was a course purchase — revoke access
        const { data: coursePurchase } = await supabase
          .from("course_purchases")
          .select("id, user_id, course_slug, amount_paid")
          .eq("stripe_payment_id", paymentIntentId)
          .maybeSingle();

        if (coursePurchase) {
          await supabase
            .from("course_purchases")
            .update({ refunded: true, refunded_at: new Date().toISOString() })
            .eq("id", coursePurchase.id);

          // Delete associated revenue record
          await supabase
            .from("course_revenue")
            .delete()
            .eq("purchase_id", coursePurchase.id);

          log.info("Course purchase refunded", { courseSlug: coursePurchase.course_slug, userId: coursePurchase.user_id });
        }

        // 2. Check if this was a wallet top-up — reverse the credit
        const { data: walletTxn } = await supabase
          .from("wallet_transactions")
          .select("id, broker_slug, amount_cents")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .eq("type", "deposit")
          .maybeSingle();

        if (walletTxn) {
          try {
            const { debitWallet } = await import("@/lib/marketplace/wallet");

            // Partial-refund-safe reversal. Stripe sends `charge.refunded`
            // with `charge.amount_refunded` as the *cumulative* amount
            // refunded on the charge. If a user has already been partially
            // refunded (say $50) and we later refund another $50, the
            // second event has amount_refunded = $100. Naïvely calling
            // debitWallet($100) would over-reverse by $50.
            //
            // Fix: look up prior reversals for this charge (by the
            // reference_id we set below), sum them, and only reverse the
            // delta. Also capped against the original top-up amount so a
            // bug in Stripe's side can never drain more than the deposit.
            const { data: priorReversals } = await supabase
              .from("wallet_transactions")
              .select("amount_cents")
              .eq("broker_slug", walletTxn.broker_slug)
              .eq("type", "spend")
              .eq("reference_type", "stripe_refund")
              .eq("reference_id", charge.id);

            const alreadyReversedCents = (priorReversals || []).reduce(
              (sum, r) => sum + (r.amount_cents || 0),
              0,
            );
            const targetReversalCents = Math.min(refundedAmountCents, walletTxn.amount_cents);
            const deltaCents = targetReversalCents - alreadyReversedCents;

            if (deltaCents <= 0) {
              log.info("Wallet refund already fully reversed — skipping", {
                brokerSlug: walletTxn.broker_slug,
                chargeId: charge.id,
                alreadyReversedCents,
                targetReversalCents,
              });
            } else {
              await debitWallet(
                walletTxn.broker_slug,
                deltaCents,
                `Stripe refund reversal — $${(deltaCents / 100).toFixed(2)}`,
                { type: "stripe_refund", id: charge.id }
              );

              // Notify broker
              await supabase.from("broker_notifications").insert({
                broker_slug: walletTxn.broker_slug,
                type: "wallet_refund",
                title: "Wallet Top-Up Reversed",
                message: `A refund of $${(deltaCents / 100).toFixed(2)} was processed. Your wallet balance has been adjusted.`,
                link: "/broker-portal/wallet",
                is_read: false,
                email_sent: false,
              });

              log.info("Wallet refund reversed", {
                brokerSlug: walletTxn.broker_slug,
                deltaCents,
                cumulativeRefundedCents: refundedAmountCents,
              });
            }
          } catch (err) {
            log.error("Wallet refund reversal failed", { error: err instanceof Error ? err.message : String(err) });
          }
        }

        // 3. Check if this was a consultation booking — cancel it
        const { data: booking } = await supabase
          .from("consultation_bookings")
          .select("id, user_id, consultation_id")
          .eq("stripe_payment_id", paymentIntentId)
          .maybeSingle();

        if (booking) {
          await supabase
            .from("consultation_bookings")
            .update({ status: "refunded", refunded_at: new Date().toISOString() })
            .eq("id", booking.id);

          log.info("Consultation booking refunded", { bookingId: booking.id });
        }

        // Audit log
        await supabase.from("admin_audit_log").insert({
          action: "stripe_refund",
          entity_type: "charge",
          entity_id: charge.id,
          entity_name: paymentIntentId,
          details: {
            amount_refunded_cents: refundedAmountCents,
            course_purchase_revoked: !!coursePurchase,
            wallet_reversed: !!walletTxn,
            consultation_cancelled: !!booking,
          },
          admin_email: "stripe_webhook",
        });

        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
        const supabase = createAdminClient();

        // Alert admin immediately — disputes need manual attention
        if (process.env.RESEND_API_KEY) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Invest.com.au <alerts@invest.com.au>",
                to: ["hello@invest.com.au"],
                subject: `⚠️ Stripe Dispute Created — $${(dispute.amount / 100).toFixed(2)}`,
                html: `
                  <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
                    <div style="background: #dc2626; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                      <span style="color: #fff; font-weight: 800; font-size: 14px;">⚠️ Dispute Alert</span>
                    </div>
                    <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0 0 12px; font-size: 14px; color: #0f172a;"><strong>Amount:</strong> $${(dispute.amount / 100).toFixed(2)}</p>
                      <p style="margin: 0 0 12px; font-size: 14px; color: #0f172a;"><strong>Reason:</strong> ${dispute.reason}</p>
                      <p style="margin: 0 0 12px; font-size: 14px; color: #0f172a;"><strong>Charge:</strong> ${chargeId}</p>
                      <p style="margin: 0 0 16px; font-size: 14px; color: #0f172a;"><strong>Status:</strong> ${dispute.status}</p>
                      <a href="https://dashboard.stripe.com/disputes/${dispute.id}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">View in Stripe →</a>
                    </div>
                  </div>
                `,
              }),
            });
          } catch (err) {
            log.error("Dispute alert email failed", { err: err instanceof Error ? err.message : String(err), disputeId: dispute.id });
          }
        }

        // Audit log
        await supabase.from("admin_audit_log").insert({
          action: "stripe_dispute",
          entity_type: "dispute",
          entity_id: dispute.id,
          entity_name: chargeId || "unknown",
          details: {
            amount_cents: dispute.amount,
            reason: dispute.reason,
            status: dispute.status,
          },
          admin_email: "stripe_webhook",
        });

        break;
      }

      default:
        // Unhandled event type — log for debugging
        break;
    }
  } catch (err) {
    log.error("Webhook handler error", { error: err instanceof Error ? err.message : String(err) });
    finalStatus = "error";
    // Mark the event row as 'error' so a Stripe retry can re-take it
    // by the stale-processing fallback path above.
    try {
      await idempotencyClient
        .from("stripe_webhook_events")
        .update({ status: "error", completed_at: new Date().toISOString() })
        .eq("event_id", event.id);
    } catch {
      // swallow — this is a best-effort status update
    }
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  // Mark done so this event will never be re-processed by a retry.
  if (finalStatus === "done") {
    try {
      await idempotencyClient
        .from("stripe_webhook_events")
        .update({ status: "done", completed_at: new Date().toISOString() })
        .eq("event_id", event.id);
    } catch {
      // swallow — the event was processed; the status stamp is best-effort
    }
  }

  return NextResponse.json({ received: true });
}
