import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, company_name, phone, broker_slug, website } = body;

    // Validate required fields
    if (!email || !password || !full_name || !company_name) {
      return NextResponse.json(
        { error: "Email, password, full name, and company name are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Check if email already has a broker account
    const { data: existingAccount } = await supabaseAdmin
      .from("broker_accounts")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Generate broker slug if not provided
    const slug = broker_slug || company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
    });

    if (authError) {
      // Handle duplicate auth user
      if (authError.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "This email is already registered. Try signing in instead." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Generate postback API key
    const apiKey = `pb_${crypto.randomBytes(24).toString("hex")}`;

    // Create broker account (status: pending)
    const { error: insertError } = await supabaseAdmin
      .from("broker_accounts")
      .insert({
        auth_user_id: authData.user.id,
        broker_slug: slug,
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        company_name: company_name.trim(),
        phone: phone?.trim() || null,
        role: "owner",
        status: "pending",
        postback_api_key: apiKey,
      });

    if (insertError) {
      // Clean up auth user if account creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Create initial wallet
    await supabaseAdmin.from("broker_wallets").insert({
      broker_slug: slug,
      balance_cents: 0,
      lifetime_deposited_cents: 0,
      lifetime_spent_cents: 0,
      currency: "AUD",
      low_balance_alert_enabled: true,
      low_balance_threshold_cents: 10000,
    });

    // Log to admin audit
    await supabaseAdmin.from("admin_audit_log").insert({
      action: "create",
      entity_type: "broker_account",
      entity_name: company_name,
      admin_email: "self-registration",
      details: { email, broker_slug: slug, website },
    });

    // Send notification email to admin (fire-and-forget)
    if (process.env.RESEND_API_KEY) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au <partners@invest.com.au>",
          to: ["admin@invest.com.au"],
          subject: `New Broker Registration: ${company_name}`,
          html: `
            <h2>New Broker Registration</h2>
            <p><strong>Company:</strong> ${company_name}</p>
            <p><strong>Contact:</strong> ${full_name} (${email})</p>
            <p><strong>Broker Slug:</strong> ${slug}</p>
            ${website ? `<p><strong>Website:</strong> ${website}</p>` : ""}
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au"}/admin/marketplace/brokers">Review in Admin →</a></p>
          `,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
