import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("org-auth:stripe-connect:onboard");

/**
 * POST /api/org-auth/stripe-connect/onboard
 *
 * Creates or resumes a Stripe Connect Express onboarding link for the org.
 * If the org already has a stripe_connect_account_id, creates a new account link
 * for that account (resuming an incomplete onboarding). Otherwise, creates a
 * new Express account first.
 */
export async function POST() {
  try {
    const session = await requireOrgSession();

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Only org admins can manage Stripe Connect" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();

    // Fetch the org row
    const { data: org, error: orgErr } = await admin
      .from("organisations")
      .select("id, email, stripe_connect_account_id")
      .eq("id", session.organisationId)
      .single();

    if (orgErr || !org) {
      log.error("Failed to fetch org", { organisationId: session.organisationId, error: orgErr });
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

    let accountId = org.stripe_connect_account_id as string | null;

    if (!accountId) {
      // Create a new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "AU",
        email: (org.email as string) ?? undefined,
        metadata: { organisation_id: String(org.id) },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      // Persist the new account ID
      const { error: updateErr } = await admin
        .from("organisations")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", session.organisationId);

      if (updateErr) {
        log.error("Failed to persist stripe_connect_account_id", { error: updateErr });
        // Continue — the link will still work even if the DB update fails
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://invest.com.au";

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/org-portal?tab=billing&stripe=refresh`,
      return_url: `${siteUrl}/org-portal?tab=billing&stripe=complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("POST /api/org-auth/stripe-connect/onboard error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
