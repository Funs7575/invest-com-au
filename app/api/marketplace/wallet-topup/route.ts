import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminSB } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Authenticate broker user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify broker account
    const { data: account } = await supabase
      .from("broker_accounts")
      .select("broker_slug, company_name, email")
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: "No active broker account" }, { status: 403 });
    }

    const body = await request.json();
    const amountDollars = parseInt(body.amount, 10);

    if (!amountDollars || amountDollars < 50 || amountDollars > 50000) {
      return NextResponse.json(
        { error: "Amount must be between $50 and $50,000" },
        { status: 400 }
      );
    }

    const amountCents = amountDollars * 100;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

    // Create invoice record (pending)
    const admin = createAdminSB(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: invoice, error: invoiceErr } = await admin
      .from("marketplace_invoices")
      .insert({
        broker_slug: account.broker_slug,
        amount_cents: amountCents,
        type: "wallet_topup",
        status: "pending",
        description: `Wallet top-up: $${amountDollars} AUD`,
      })
      .select("id")
      .single();

    if (invoiceErr) {
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }

    // Create Stripe checkout session (one-time payment)
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: "Marketplace Wallet Top-Up",
              description: `Add $${amountDollars} AUD to your advertising wallet`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "wallet_topup",
        broker_slug: account.broker_slug,
        invoice_id: String(invoice.id),
        amount_cents: String(amountCents),
      },
      customer_email: account.email,
      success_url: `${siteUrl}/broker-portal/wallet?topup=success`,
      cancel_url: `${siteUrl}/broker-portal/wallet?topup=cancelled`,
    });

    // Store checkout session ID on invoice
    await admin
      .from("marketplace_invoices")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", invoice.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Wallet top-up error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
