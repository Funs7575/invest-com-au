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

              // Notify admin of new Pro signup
              sendTransactionalEmail(
                ADMIN_EMAIL,
                `New Pro Signup: ${customer.email}`,
                `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">💎 New Pro Member</h2><p style="color:#64748b;font-size:14px"><strong>${customer.email}</strong> just subscribed to Invest.com.au Pro (${interval || "unknown"} plan).</p><p style="color:#64748b;font-size:14px">Customer ID: ${custId}</p><a href="${getSiteUrl()}/admin/pro-subscribers" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">View Pro Members →</a></div>`,
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

        log.warn("Payment failed for customer", { customer: invoice.customer, invoice: invoice.id });
        // The subscription.updated webhook will also fire with status 'past_due',
        // which upsertSubscription handles automatically
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

            // Send course receipt email
            const customerEmail = session.customer_email || session.customer_details?.email;
            if (customerEmail) {
              const courseName = course?.title || courseSlug;
              sendTransactionalEmail(
                customerEmail,
                `Course Confirmed: ${courseName}`,
                buildCourseReceiptEmail(courseName, courseSlug, session.amount_total || 0),
              ).catch((err) => log.error("Course receipt email failed", { err: err instanceof Error ? err.message : String(err) }));
            }

            // Insert revenue tracking row if course has a creator
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
                log.error("Course revenue insert error", { error: revenueError.message });
              }
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
            const reverseAmount = Math.min(refundedAmountCents, walletTxn.amount_cents);

            await debitWallet(
              walletTxn.broker_slug,
              reverseAmount,
              `Stripe refund reversal — $${(reverseAmount / 100).toFixed(2)}`,
              { type: "stripe_refund", id: charge.id }
            );

            // Notify broker
            await supabase.from("broker_notifications").insert({
              broker_slug: walletTxn.broker_slug,
              type: "wallet_refund",
              title: "Wallet Top-Up Reversed",
              message: `A refund of $${(reverseAmount / 100).toFixed(2)} was processed. Your wallet balance has been adjusted.`,
              link: "/broker-portal/wallet",
              is_read: false,
              email_sent: false,
            });

            log.info("Wallet refund reversed", { brokerSlug: walletTxn.broker_slug, amount: `$${(reverseAmount / 100).toFixed(2)}` });
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
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
