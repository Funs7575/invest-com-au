/**
 * Handler for `checkout.session.completed`.
 *
 * Dispatches to one of six checkout sub-flows based on
 * `session.metadata.type` / `session.metadata.kind`:
 *
 *   1. **course**               — one-time course purchase receipt +
 *                                 creator revenue tracking with rollback
 *   2. **advisor_credit_topup** — credit balance update + advisor receipt
 *   3. **advisor_featured**     — 30-day featured activation + receipt
 *   4. **listing_payment**      — investment listing activation + receipt
 *   5. **consultation**         — consultation booking upsert + confirmation
 *   6. **sponsored_placement**  — sponsored placement booking + buyer +
 *                                 admin receipts
 *
 * Wallet top-ups (metadata.type === "wallet_topup") are intentionally
 * absent: those are handled exclusively by `/api/marketplace/webhook` to
 * prevent double-crediting from two webhook endpoints.
 *
 * Migrated from `app/api/stripe/webhook/route.ts:149-657` as part of
 * J-01c-2. Behaviour is byte-for-byte preserved, including:
 *   - idempotent advisor_credit_topup (topup_id existence check)
 *   - course purchase rollback when creator revenue insert fails
 *   - sponsored_placement 23505 race-tolerance
 *   - lazy invoice-URL fetch for sponsored placements
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import {
  buildConsultationConfirmationEmail,
  buildCourseReceiptEmail,
  emailWrapper,
  sendTransactionalEmail,
} from "../lib/email";
import { ADMIN_EMAIL } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";

export const handleCheckoutSessionCompleted: WebhookHandler = async (
  event,
  ctx,
) => {
  const session = event.data.object as Stripe.Checkout.Session;
  const { admin: supabase, log, stripe } = ctx;

  // ── 1. Course purchase ───────────────────────────────────────────
  if (session.metadata?.type === "course" && session.mode === "payment") {
    const userId = session.metadata.supabase_user_id;
    const courseSlug = session.metadata.course_slug || "investing-101";

    if (userId) {
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
          { onConflict: "user_id,course_slug" },
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
      // caused creator payout disputes.
      let revenueOk = true;
      if (purchase && course?.creator_id && course.revenue_share_percent > 0) {
        const totalAmount = session.amount_total || 0;
        const creatorAmount = Math.round(
          totalAmount * (course.revenue_share_percent / 100),
        );
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
          log.error(
            "Course revenue insert error — rolling back purchase",
            { error: revenueError.message, purchaseId: purchase.id },
          );
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

      const customerEmail =
        session.customer_email || session.customer_details?.email;
      if (customerEmail && revenueOk && !error) {
        const courseName = course?.title || courseSlug;
        sendTransactionalEmail(
          customerEmail,
          `Course Confirmed: ${courseName}`,
          buildCourseReceiptEmail(
            courseName,
            courseSlug,
            session.amount_total || 0,
          ),
        ).catch((err) =>
          log.error("Course receipt email failed", {
            err: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
  }

  // ── 2. Advisor credit top-up ─────────────────────────────────────
  if (
    session.metadata?.type === "advisor_credit_topup" &&
    session.mode === "payment"
  ) {
    const professionalId = parseInt(session.metadata.professional_id || "0");
    const topupId = parseInt(session.metadata.topup_id || "0");
    const amountCents = session.amount_total || 0;

    if (professionalId && amountCents > 0) {
      // Idempotency: check if already processed
      if (topupId) {
        const { data: existing } = await supabase
          .from("advisor_credit_topups")
          .select("status")
          .eq("id", topupId)
          .single();
        if (existing?.status === "completed") {
          log.info("Advisor top-up already processed", {
            topupId,
            professionalId,
          });
          return { status: "done" };
        }
      }

      const { data: pro } = await supabase
        .from("professionals")
        .select("credit_balance_cents, lifetime_credit_cents")
        .eq("id", professionalId)
        .single();

      await supabase
        .from("professionals")
        .update({
          credit_balance_cents: (pro?.credit_balance_cents || 0) + amountCents,
          lifetime_credit_cents:
            (pro?.lifetime_credit_cents || 0) + amountCents,
          ...(session.metadata?.per_lead_cents
            ? {
                lead_price_cents: parseInt(session.metadata.per_lead_cents),
              }
            : {}),
        })
        .eq("id", professionalId);

      if (topupId) {
        await supabase
          .from("advisor_credit_topups")
          .update({
            status: "completed",
            stripe_payment_intent_id: session.payment_intent as string,
            stripe_checkout_session_id: session.id,
          })
          .eq("id", topupId);
      }

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
            emailWrapper(
              "Credit Top-Up Confirmed ✅",
              "#0f172a",
              `
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
            `,
            ),
          ).catch((err) =>
            log.error("Advisor topup receipt email failed", {
              err: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      } catch (err) {
        log.error("Advisor topup receipt lookup failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      log.info("Advisor credit topped up", {
        professionalId,
        amountCents,
        topupId,
      });
    }
  }

  // ── 3. Advisor featured activation ──────────────────────────────
  if (
    session.metadata?.type === "advisor_featured" &&
    session.mode === "payment"
  ) {
    const professionalId = parseInt(session.metadata.professional_id || "0");
    if (professionalId) {
      const featuredUntil = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      await supabase
        .from("professionals")
        .update({ featured_until: featuredUntil })
        .eq("id", professionalId);
      log.info("Advisor featured activated", {
        professionalId,
        until: featuredUntil,
      });

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
          const expiresLabel = new Date(featuredUntil).toLocaleDateString(
            "en-AU",
            { day: "numeric", month: "long", year: "numeric" },
          );
          sendTransactionalEmail(
            advisorEmail,
            `Featured Listing Activated — A$${amount}`,
            emailWrapper(
              "Featured Listing Activated ✨",
              "#7c3aed",
              `
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
            `,
            ),
          ).catch((err) =>
            log.error("Advisor featured receipt email failed", {
              err: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      } catch (err) {
        log.error("Advisor featured receipt lookup failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ── 4. Investment listing activation ────────────────────────────
  if (
    session.metadata?.type === "listing_payment" &&
    session.mode === "payment"
  ) {
    const listingId = parseInt(session.metadata.listing_id || "0");
    const planId = parseInt(session.metadata.plan_id || "0");
    const contactEmail = session.metadata.contact_email;

    if (listingId && planId) {
      const { data: plan } = await supabase
        .from("listing_plans")
        .select("plan_name, features")
        .eq("id", planId)
        .single();

      const features = plan?.features;
      const durationDays =
        features &&
        typeof features === "object" &&
        !Array.isArray(features) &&
        typeof features.listing_duration_days === "number"
          ? features.listing_duration_days
          : 30;
      const expiresAt = new Date(
        Date.now() + durationDays * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { error: updateError } = await supabase
        .from("investment_listings")
        .update({
          status: "active",
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", listingId);

      if (updateError) {
        log.error("Listing activation error", {
          error: updateError.message,
          listingId,
        });
      } else {
        log.info("Listing activated", { listingId, planId, durationDays });
      }

      const { data: listing } = await supabase
        .from("investment_listings")
        .select("title, slug")
        .eq("id", listingId)
        .single();

      if (contactEmail) {
        const listingTitle = listing?.title || `Listing #${listingId}`;
        const planName = plan?.plan_name || "Standard";
        const amountPaid = ((session.amount_total || 0) / 100).toFixed(2);

        sendTransactionalEmail(
          contactEmail,
          `Listing Activated: ${listingTitle}`,
          emailWrapper(
            "Listing Payment Confirmed",
            "#0f172a",
            `
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
          `,
          ),
        ).catch((err) =>
          log.error("Listing confirmation email failed", {
            err: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
  }

  // ── 5. Consultation booking ──────────────────────────────────────
  if (
    session.metadata?.type === "consultation" &&
    session.mode === "payment"
  ) {
    const userId = session.metadata.supabase_user_id;
    const consultationSlug = session.metadata.consultation_slug;

    if (userId && consultationSlug) {
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
            { onConflict: "user_id,consultation_id" },
          );

        if (bookingError) {
          log.error("Consultation booking upsert error", {
            error: bookingError.message,
          });
        }

        const consultCustomerEmail =
          session.customer_email || session.customer_details?.email;
        if (consultCustomerEmail) {
          const consultTitle = consultation.title || consultationSlug;
          sendTransactionalEmail(
            consultCustomerEmail,
            `Consultation Booked: ${consultTitle}`,
            buildConsultationConfirmationEmail(
              consultTitle,
              consultationSlug,
              session.amount_total || 0,
            ),
          ).catch((err) =>
            log.error("Consultation confirmation email failed", {
              err: err instanceof Error ? err.message : String(err),
            }),
          );
        }
      }
    }
  }

  // ── 6. Sponsored placement self-serve purchase ───────────────────
  if (
    session.metadata?.kind === "sponsored_placement" &&
    session.mode === "payment" &&
    session.payment_status === "paid"
  ) {
    const md = session.metadata;
    const brokerId = parseInt(md.broker_id || "0");

    if (!brokerId || !md.tier || !md.starts_at || !md.ends_at) {
      log.error("sponsored_placement metadata incomplete", {
        session_id: session.id,
        md,
      });
      sendTransactionalEmail(
        ADMIN_EMAIL,
        `⚠️ Sponsored placement payment without bookable metadata — ${session.id}`,
        `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="color:#b91c1c;font-size:16px">Manual action required</h2><p style="color:#475569;font-size:14px">A Stripe checkout session completed with <code>metadata.kind=sponsored_placement</code> but the booking row could not be created because one of <code>broker_id / tier / starts_at / ends_at</code> was missing.</p><p style="color:#475569;font-size:14px"><strong>Session:</strong> <code>${escapeHtml(session.id)}</code><br/><strong>Buyer:</strong> ${escapeHtml(session.customer_email || "(unknown)")}<br/><strong>Amount:</strong> A$${((session.amount_total ?? 0) / 100).toFixed(2)}</p><p style="color:#475569;font-size:14px">Either manually create the booking or refund the buyer.</p></div>`,
      ).catch((err) =>
        log.error("sponsored_placement incomplete-alert failed", {
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    } else {
      const amountCents = session.amount_total ?? 0;
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      // Lazy-fetch the invoice URL when the invoice is only an id
      let resolvedInvoiceUrl: string | null = null;
      if (typeof session.invoice === "string") {
        try {
          const invoice = await stripe.invoices.retrieve(session.invoice);
          resolvedInvoiceUrl = invoice.hosted_invoice_url ?? null;
        } catch {
          // non-fatal
        }
      } else {
        resolvedInvoiceUrl = session.invoice?.hosted_invoice_url || null;
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
            created_by:
              md.contact_email || session.customer_email || "checkout",
            notes: md.contact_name
              ? `Contact: ${md.contact_name} <${md.contact_email}>`
              : md.contact_email || null,
          });

        if (insertErr) {
          // 23505 = unique_violation — two webhook deliveries raced past
          // the select-existing check; the loser treats this as success.
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
            ).catch((err) =>
              log.error("sponsored_placement receipt failed", {
                err: err instanceof Error ? err.message : String(err),
              }),
            );
          }

          sendTransactionalEmail(
            ADMIN_EMAIL,
            `💰 Sponsored placement booked: ${md.broker_name} — ${md.tier}`,
            `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">New sponsored placement</h2><p style="color:#64748b;font-size:14px"><strong>${escapeHtml(md.broker_name)}</strong> booked <strong>${escapeHtml(md.tier.replace(/_/g, " "))}</strong> for ${md.duration_days} days starting ${escapeHtml(md.starts_at.slice(0, 10))}.</p><p style="color:#64748b;font-size:14px">Amount: A$${(amountCents / 100).toFixed(2)}</p><a href="${getSiteUrl()}/admin/sponsored-queue" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">Queue →</a></div>`,
          ).catch(() => undefined);
        }
      }
    }
  }

  return { status: "done" };
};
