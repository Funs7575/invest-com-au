/**
 * Handlers for `customer.subscription.{created,updated,deleted}`.
 *
 * All three rely on `upsertSubscription` to keep the `subscriptions`
 * table in sync. The `.created` variant additionally fires:
 *   - a Pro welcome email to the new subscriber, and
 *   - an admin notification to ADMIN_EMAIL.
 *
 * Migrated from `app/api/stripe/webhook/route.ts:344-385` as part of
 * J-01b. Behaviour is preserved byte-for-byte:
 *   - Welcome email only fires when status is `active` or `trialing`.
 *   - Both fire-and-forget emails swallow their errors via `.catch`
 *     so a Resend outage doesn't block the webhook ack to Stripe.
 *   - Admin email applies the same header-injection defence (escape +
 *     strip CR/LF) the legacy code used.
 */

import type Stripe from "stripe";
import type { WebhookHandler } from "../types";
import { ADMIN_EMAIL } from "@/lib/admin";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { upsertSubscription } from "../lib/upsert-subscription";
import {
  buildProWelcomeEmail,
  buildTrialEndingSoonEmail,
  sendTransactionalEmail,
} from "../lib/email";

export const handleCustomerSubscriptionCreated: WebhookHandler = async (event, ctx) => {
  const newSub = event.data.object as Stripe.Subscription;
  await upsertSubscription(newSub, ctx.admin, ctx.log);

  // Send Pro welcome email on new subscription
  if (newSub.status === "active" || newSub.status === "trialing") {
    const custId =
      typeof newSub.customer === "string" ? newSub.customer : newSub.customer.id;
    try {
      const customer = await ctx.stripe.customers.retrieve(custId);
      if (!("deleted" in customer) && customer.email) {
        const interval = newSub.items.data[0]?.price?.recurring?.interval || null;
        sendTransactionalEmail(
          customer.email,
          "Welcome to Invest.com.au Pro 🎉",
          buildProWelcomeEmail(interval),
        ).catch((err) =>
          ctx.log.error("Pro welcome email failed", {
            err: err instanceof Error ? err.message : String(err),
          }),
        );

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
        ).catch((err) =>
          ctx.log.error("Admin Pro signup notification failed", {
            err: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    } catch (err) {
      ctx.log.error("Pro welcome email lookup failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { status: "done" };
};

export const handleCustomerSubscriptionTrialWillEnd: WebhookHandler = async (event, ctx) => {
  const sub = event.data.object as Stripe.Subscription;
  const custId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  try {
    const customer = await ctx.stripe.customers.retrieve(custId);
    if (!("deleted" in customer) && customer.email) {
      const interval = sub.items.data[0]?.price?.recurring?.interval || null;
      const trialEndDate = sub.trial_end
        ? new Date(sub.trial_end * 1000).toLocaleDateString("en-AU", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
        : "soon";
      sendTransactionalEmail(
        customer.email,
        "Your free trial ends in 3 days — here's what happens next",
        buildTrialEndingSoonEmail(interval, trialEndDate),
      ).catch((err) =>
        ctx.log.error("Trial ending email failed", {
          err: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  } catch (err) {
    ctx.log.error("Trial ending email lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  ctx.log.info("Subscription trial ending soon", {
    subscriptionId: sub.id,
    trialEnd: sub.trial_end,
  });

  return { status: "done" };
};

export const handleCustomerSubscriptionUpdated: WebhookHandler = async (event, ctx) => {
  await upsertSubscription(event.data.object as Stripe.Subscription, ctx.admin, ctx.log);
  return { status: "done" };
};

export const handleCustomerSubscriptionDeleted: WebhookHandler = async (event, ctx) => {
  await upsertSubscription(event.data.object as Stripe.Subscription, ctx.admin, ctx.log);
  return { status: "done" };
};
