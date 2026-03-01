import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getStripe } from "@/lib/stripe";

/**
 * POST /api/marketplace/setup-payment-method
 * Creates a Stripe SetupIntent so the broker can save a payment method for auto top-up.
 * Returns client_secret for Stripe Elements.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth via cookies
    const cookieHeader = request.headers.get("cookie") || "";
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader.split(";").map((c) => {
              const [name, ...rest] = c.trim().split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get broker account
    const { data: account } = await supabase
      .from("broker_accounts")
      .select("broker_slug, email, company_name")
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { error: "No active broker account" },
        { status: 403 }
      );
    }

    const stripe = getStripe();

    // Get or create Stripe customer for this broker
    const { data: wallet } = await supabase
      .from("broker_wallets")
      .select("stripe_payment_method_id")
      .eq("broker_slug", account.broker_slug)
      .maybeSingle();

    // Search for existing Stripe customer by email
    const customers = await stripe.customers.list({
      email: account.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: account.email,
        name: account.company_name || undefined,
        metadata: { broker_slug: account.broker_slug },
      }, {
        idempotencyKey: `customer_${account.broker_slug}_${user.id}`,
      });
      customerId = customer.id;
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
      metadata: {
        broker_slug: account.broker_slug,
        type: "auto_topup_setup",
      },
    }, {
      idempotencyKey: `setup_intent_${account.broker_slug}_${Date.now()}`,
    });

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      customer_id: customerId,
    });
  } catch (err) {
    console.error("Setup payment method error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/marketplace/setup-payment-method
 * Saves the confirmed payment method ID to the broker's wallet.
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieHeader.split(";").map((c) => {
              const [name, ...rest] = c.trim().split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: account } = await supabase
      .from("broker_accounts")
      .select("broker_slug")
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!account) {
      return NextResponse.json(
        { error: "No active broker account" },
        { status: 403 }
      );
    }

    const { payment_method_id, auto_topup_enabled, threshold_cents, amount_cents } =
      await request.json();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payment_method_id) {
      updates.stripe_payment_method_id = payment_method_id;
    }
    if (typeof auto_topup_enabled === "boolean") {
      updates.auto_topup_enabled = auto_topup_enabled;
    }
    if (typeof threshold_cents === "number") {
      updates.auto_topup_threshold_cents = threshold_cents;
    }
    if (typeof amount_cents === "number") {
      updates.auto_topup_amount_cents = amount_cents;
    }

    await supabase
      .from("broker_wallets")
      .update(updates)
      .eq("broker_slug", account.broker_slug);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update payment method error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
