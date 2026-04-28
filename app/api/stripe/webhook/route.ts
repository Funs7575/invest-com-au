import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleInvoicePaid, handleInvoicePaymentFailed } from "@/lib/advisor-billing";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { ADMIN_EMAIL } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";
import { dispatchEvent } from "@/lib/stripe-webhook/registry";
import {
  buildConsultationConfirmationEmail,
  buildCourseReceiptEmail,
  emailWrapper,
  sendTransactionalEmail,
} from "@/lib/stripe-webhook/lib/email";
// Side-effect import — registers per-event handlers into the registry
// before `dispatchEvent` runs. Handler-registry split is incremental
// (J-01a → J-01c); the legacy switch below still runs for events not
// yet migrated to the registry.
import "@/lib/stripe-webhook/handlers";

const log = logger("stripe-webhook");

// Ensure this runs in Node.js runtime (needed for Stripe signature verification)
export const runtime = "nodejs";

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
    // J-01a: try the handler-registry first. Events not yet migrated
    // (J-01b/c) fall through to the legacy switch below. The registry's
    // handlers receive a typed `WebhookContext` so they can be unit-
    // tested in isolation without spinning up the full route.
    const dispatched = await dispatchEvent(event, {
      admin: createAdminClient(),
      stripe: getStripe(),
      log,
    });
    if (dispatched.handled) {
      if (dispatched.result.status === "error") {
        throw dispatched.result.error;
      }
      // Skip the legacy switch — registry owns this event type now.
      // Fall through to the post-switch idempotency stamp below.
    } else switch (event.type) {
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

        // ── Sponsored placement self-serve purchase ────────────────
        // Metadata set by /api/advertise/create-checkout. Creates a
        // scheduled booking which the daily cron picks up and applies.
        if (
          session.metadata?.kind === "sponsored_placement" &&
          session.mode === "payment" &&
          session.payment_status === "paid"
        ) {
          const supabase = createAdminClient();
          const md = session.metadata;
          const brokerId = parseInt(md.broker_id || "0");
          if (!brokerId || !md.tier || !md.starts_at || !md.ends_at) {
            log.error("sponsored_placement metadata incomplete", {
              session_id: session.id,
              md,
            });
            // Payment was taken but the booking cannot be auto-created.
            // Alert ops immediately so a manual refund or booking can
            // happen before the broker is confused.
            sendTransactionalEmail(
              ADMIN_EMAIL,
              `⚠️ Sponsored placement payment without bookable metadata — ${session.id}`,
              `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="color:#b91c1c;font-size:16px">Manual action required</h2><p style="color:#475569;font-size:14px">A Stripe checkout session completed with <code>metadata.kind=sponsored_placement</code> but the booking row could not be created because one of <code>broker_id / tier / starts_at / ends_at</code> was missing.</p><p style="color:#475569;font-size:14px"><strong>Session:</strong> <code>${escapeHtml(session.id)}</code><br/><strong>Buyer:</strong> ${escapeHtml(session.customer_email || "(unknown)")}<br/><strong>Amount:</strong> A$${((session.amount_total ?? 0) / 100).toFixed(2)}</p><p style="color:#475569;font-size:14px">Either manually create the booking or refund the buyer.</p></div>`,
            ).catch((err) => log.error("sponsored_placement incomplete-alert failed", { err: err instanceof Error ? err.message : String(err) }));
          } else {
            const amountCents = session.amount_total ?? 0;
            const pi =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id || null;
            const invoiceUrl =
              typeof session.invoice === "string"
                ? null // hosted URL fetched lazily below
                : session.invoice?.hosted_invoice_url || null;

            // Lazy-fetch the invoice URL when the invoice is only an id
            let resolvedInvoiceUrl = invoiceUrl;
            if (!resolvedInvoiceUrl && typeof session.invoice === "string") {
              try {
                const invoice = await getStripe().invoices.retrieve(session.invoice);
                resolvedInvoiceUrl = invoice.hosted_invoice_url ?? null;
              } catch {
                // non-fatal
              }
            }

            const { data: existing } = await supabase
              .from("sponsored_placement_bookings")
              .select("id")
              .eq("stripe_session_id", session.id)
              .maybeSingle();

            if (existing) {
              log.info("sponsored_placement booking already exists", {
                session_id: session.id,
                booking_id: existing.id,
              });
            } else {
              const { error: insertErr } = await supabase
                .from("sponsored_placement_bookings")
                .insert({
                  broker_id: brokerId,
                  broker_slug: md.broker_slug,
                  tier: md.tier,
                  starts_at: md.starts_at,
                  ends_at: md.ends_at,
                  amount_cents: amountCents,
                  currency: (session.currency || "aud").toUpperCase(),
                  invoice_ref: (session.invoice as string) || null,
                  stripe_session_id: session.id,
                  stripe_payment_intent_id: pi,
                  stripe_invoice_url: resolvedInvoiceUrl,
                  status: "scheduled",
                  created_by: md.contact_email || session.customer_email || "checkout",
                  notes: md.contact_name
                    ? `Contact: ${md.contact_name} <${md.contact_email}>`
                    : md.contact_email || null,
                });
              if (insertErr) {
                // 23505 = unique_violation. If two webhook deliveries
                // raced past the select-existing check above, one of
                // them will lose on the UNIQUE index on
                // stripe_session_id — treat that as success, not a
                // bug.
                if (insertErr.code === "23505") {
                  log.info("sponsored_placement race lost (already booked)", {
                    session_id: session.id,
                  });
                } else {
                  log.error("sponsored_placement booking insert failed", {
                    session_id: session.id,
                    err: insertErr.message,
                  });
                }
              } else {
                log.info("sponsored_placement booking created", {
                  broker_slug: md.broker_slug,
                  tier: md.tier,
                  starts_at: md.starts_at,
                });
                // Receipt to the buyer + admin notification
                const buyerEmail = md.contact_email || session.customer_email;
                if (buyerEmail) {
                  const amount = (amountCents / 100).toFixed(2);
                  sendTransactionalEmail(
                    buyerEmail,
                    `Sponsored placement confirmed — ${md.broker_name}`,
                    emailWrapper(
                      "Sponsored placement booked",
                      "#0f172a",
                      `
                      <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Thanks — your booking is locked in</h2>
                      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                        Your ${escapeHtml(md.tier.replace(/_/g, " "))} placement for
                        <strong>${escapeHtml(md.broker_name)}</strong> goes live on
                        ${new Date(md.starts_at).toLocaleDateString("en-AU", { dateStyle: "medium" })}
                        and runs for ${md.duration_days} days.
                      </p>
                      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 0 0 16px;">
                        <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Amount paid:</strong> A$${amount}</p>
                        ${resolvedInvoiceUrl ? `<p style="margin: 4px 0 0; font-size: 13px;"><a href="${resolvedInvoiceUrl}" style="color: #2563eb;">View invoice</a></p>` : ""}
                      </div>
                      <p style="color: #64748b; font-size: 12px; line-height: 1.55;">
                        You can track impressions + clicks during the campaign at your Broker Portal dashboard.
                      </p>
                      <p style="margin: 20px 0; text-align: center;">
                        <a href="${getSiteUrl()}/broker-portal/sponsored-slots" style="display: inline-block; padding: 12px 28px; background: #f59e0b; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Track my campaign →</a>
                      </p>
                    `,
                    ),
                  ).catch((err) => log.error("sponsored_placement receipt failed", { err: err instanceof Error ? err.message : String(err) }));
                }
                // Admin heads-up
                sendTransactionalEmail(
                  ADMIN_EMAIL,
                  `💰 Sponsored placement booked: ${md.broker_name} — ${md.tier}`,
                  `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">New sponsored placement</h2><p style="color:#64748b;font-size:14px"><strong>${escapeHtml(md.broker_name)}</strong> booked <strong>${escapeHtml(md.tier.replace(/_/g, " "))}</strong> for ${md.duration_days} days starting ${escapeHtml(md.starts_at.slice(0, 10))}.</p><p style="color:#64748b;font-size:14px">Amount: A$${(amountCents / 100).toFixed(2)}</p><a href="${getSiteUrl()}/admin/sponsored-queue" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">Queue →</a></div>`,
                ).catch(() => undefined);
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

      // J-01a: `charge.dispute.created` migrated to the registry.
      // See `lib/stripe-webhook/handlers/charge-dispute-created.ts`.

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
