/**
 * Stripe Connect Express marketplace payouts.
 *
 * Flow:
 *   1. Pro hits `/pros/connect` → onboarding link created → completes Connect
 *      Express onboarding on Stripe's hosted page.
 *   2. Webhook `account.updated` syncs `stripe_connect_*` columns on the pro.
 *   3. Once `stripe_connect_payouts_enabled=true`, consumers can pay the pro
 *      through the brief tracker. PaymentIntent uses `application_fee_amount`
 *      so the platform automatically retains the take rate; the rest is
 *      transferred to the pro's connected account.
 *   4. Webhook `payment_intent.succeeded` flips `marketplace_payments.status`
 *      to 'succeeded'. `charge.refunded` flips to 'refunded'.
 *
 * Take rate: env `MARKETPLACE_TAKE_RATE_BPS`, default 1000 (10%). Clamped
 * to [0, 3000] (max 30%).
 */
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";
// eslint-disable-next-line no-restricted-imports -- service-role legitimate: webhook-driven writes + cross-pro reads on professionals where the caller's JWT isn't available.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("stripe-connect");

const DEFAULT_TAKE_RATE_BPS = 1_000;

export function getMarketplaceTakeRateBps(): number {
  const raw = process.env.MARKETPLACE_TAKE_RATE_BPS;
  if (!raw) return DEFAULT_TAKE_RATE_BPS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 3_000) {
    log.warn("MARKETPLACE_TAKE_RATE_BPS out of range, using default", { raw });
    return DEFAULT_TAKE_RATE_BPS;
  }
  return parsed;
}

export type StripeConnectStatus =
  | "not_connected"
  | "onboarding"
  | "active"
  | "restricted"
  | "rejected";

export interface ConnectAccountInfo {
  professionalId: number;
  stripeAccountId: string | null;
  status: StripeConnectStatus;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

export async function getConnectInfo(
  professionalId: number,
): Promise<ConnectAccountInfo> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select(
      "stripe_connect_account_id, stripe_connect_status, stripe_connect_payouts_enabled, stripe_connect_charges_enabled",
    )
    .eq("id", professionalId)
    .maybeSingle();
  return {
    professionalId,
    stripeAccountId: (data?.stripe_connect_account_id as string | null) ?? null,
    status: ((data?.stripe_connect_status as StripeConnectStatus | null) ??
      "not_connected") as StripeConnectStatus,
    payoutsEnabled: Boolean(data?.stripe_connect_payouts_enabled),
    chargesEnabled: Boolean(data?.stripe_connect_charges_enabled),
  };
}

export interface CreateOnboardingLinkInput {
  professionalId: number;
  refreshUrl: string;
  returnUrl: string;
  email: string;
}

export interface CreateOnboardingLinkResult {
  url: string | null;
  unavailable?: "no_secret" | "stripe_error";
  detail?: string;
}

export async function createConnectOnboardingLink(
  input: CreateOnboardingLinkInput,
): Promise<CreateOnboardingLinkResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { url: null, unavailable: "no_secret" };
  }
  const stripe = getStripe();

  // Get or create the Connect account for this pro.
  let accountId = (await getConnectInfo(input.professionalId)).stripeAccountId;
  if (!accountId) {
    try {
      const account = await stripe.accounts.create({
        type: "express",
        email: input.email,
        country: "AU",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { professional_id: String(input.professionalId) },
      });
      accountId = account.id;
      const admin = createAdminClient();
      await admin
        .from("professionals")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "onboarding",
        })
        .eq("id", input.professionalId);
    } catch (err) {
      log.error("accounts.create failed", {
        professional_id: input.professionalId,
        err: err instanceof Error ? err.message : String(err),
      });
      return {
        url: null,
        unavailable: "stripe_error",
        detail: err instanceof Error ? err.message : "unknown",
      };
    }
  }

  try {
    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: input.refreshUrl,
      return_url: input.returnUrl,
      type: "account_onboarding",
    });
    return { url: link.url };
  } catch (err) {
    log.error("accountLinks.create failed", {
      professional_id: input.professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      url: null,
      unavailable: "stripe_error",
      detail: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Sync Stripe-side capabilities into the pro's row. Called by the webhook
 * on `account.updated`; can also be invoked manually to force-refresh.
 */
export async function refreshConnectAccountStatus(
  accountId: string,
): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const stripe = getStripe();
  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(accountId);
  } catch (err) {
    log.warn("accounts.retrieve failed", {
      account_id: accountId,
      err: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  const status = mapStripeAccountToStatus(account);
  const admin = createAdminClient();
  await admin
    .from("professionals")
    .update({
      stripe_connect_status: status,
      stripe_connect_payouts_enabled: Boolean(account.payouts_enabled),
      stripe_connect_charges_enabled: Boolean(account.charges_enabled),
    })
    .eq("stripe_connect_account_id", accountId);
}

function mapStripeAccountToStatus(account: Stripe.Account): StripeConnectStatus {
  if (account.requirements?.disabled_reason) return "rejected";
  if (account.charges_enabled && account.payouts_enabled) return "active";
  const hasPastDue = (account.requirements?.past_due ?? []).length > 0;
  if (hasPastDue) return "restricted";
  return "onboarding";
}

export interface CreatePaymentInput {
  briefId: number;
  professionalId: number;
  consumerEmail: string;
  consumerUserId?: string | null;
  amountCents: number;
  description: string;
}

export interface CreatePaymentResult {
  paymentId: number | null;
  paymentIntentId: string | null;
  clientSecret: string | null;
  unavailable?: "no_secret" | "pro_not_connected" | "stripe_error";
  detail?: string;
}

export async function createPaymentForBrief(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      paymentId: null,
      paymentIntentId: null,
      clientSecret: null,
      unavailable: "no_secret",
    };
  }

  const info = await getConnectInfo(input.professionalId);
  if (!info.stripeAccountId || !info.payoutsEnabled) {
    return {
      paymentId: null,
      paymentIntentId: null,
      clientSecret: null,
      unavailable: "pro_not_connected",
    };
  }

  const takeBps = getMarketplaceTakeRateBps();
  const platformFeeCents = Math.floor((input.amountCents * takeBps) / 10_000);

  const stripe = getStripe();
  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: "aud",
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: info.stripeAccountId },
      automatic_payment_methods: { enabled: true },
      description: input.description,
      receipt_email: input.consumerEmail,
      metadata: {
        brief_id: String(input.briefId),
        professional_id: String(input.professionalId),
        kind: "marketplace_payment",
      },
    });
  } catch (err) {
    log.error("paymentIntents.create failed", {
      brief_id: input.briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return {
      paymentId: null,
      paymentIntentId: null,
      clientSecret: null,
      unavailable: "stripe_error",
      detail: err instanceof Error ? err.message : "unknown",
    };
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("marketplace_payments")
    .insert({
      brief_id: input.briefId,
      consumer_email: input.consumerEmail,
      consumer_user_id: input.consumerUserId ?? null,
      professional_id: input.professionalId,
      amount_cents: input.amountCents,
      platform_fee_cents: platformFeeCents,
      currency: "aud",
      stripe_payment_intent_id: intent.id,
      status: "pending",
      description: input.description,
      metadata: { take_rate_bps: takeBps },
    })
    .select("id")
    .single();
  if (error) {
    log.error("marketplace_payments insert failed", { error: error.message });
    return {
      paymentId: null,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      unavailable: "stripe_error",
      detail: error.message,
    };
  }

  return {
    paymentId: row.id as number,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
  };
}

/**
 * Webhook entrypoint — extends the existing Stripe webhook to handle
 * Connect events and marketplace payment intents.
 */
export async function handleConnectWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await refreshConnectAccountStatus(account.id);
      return;
    }
    case "payment_intent.succeeded":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.kind !== "marketplace_payment") return;
      const status =
        event.type === "payment_intent.succeeded"
          ? "succeeded"
          : event.type === "payment_intent.canceled"
            ? "canceled"
            : "failed";
      await updatePaymentStatus(intent.id, status);
      return;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (!paymentIntentId) return;
      await updatePaymentStatus(paymentIntentId, "refunded");
      return;
    }
    default:
      return;
  }
}

async function updatePaymentStatus(
  paymentIntentId: string,
  status: "succeeded" | "refunded" | "failed" | "canceled",
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("marketplace_payments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (error) {
    log.error("updatePaymentStatus failed", {
      payment_intent_id: paymentIntentId,
      error: error.message,
    });
  }
}
