import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/unsubscribe
 * Unsubscribes an email from all marketing emails.
 *
 * Updates:
 * - email_captures: unsubscribed = true, newsletter_opt_in = false
 * - profiles (if account exists): all email_* preferences = false
 * - Resend Contacts: unsubscribed = true
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email } = body as { email?: string };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const sanitizedEmail = email.trim().toLowerCase().slice(0, 254);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let updated = false;

  // 1. Update email_captures table
  const { data: captures } = await supabase
    .from("email_captures")
    .update({
      unsubscribed: true,
      newsletter_opt_in: false,
    })
    .eq("email", sanitizedEmail)
    .select("id");

  if (captures && captures.length > 0) {
    updated = true;
  }

  // 2. Update quiz_leads table (also has email)
  await supabase
    .from("quiz_leads")
    .update({ unsubscribed: true } as Record<string, unknown>)
    .eq("email", sanitizedEmail);

  // 3. Update profiles table if user has an account
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", sanitizedEmail)
    .limit(1);

  if (profiles && profiles.length > 0) {
    await supabase
      .from("profiles")
      .update({
        email_newsletter: false,
        email_fee_alerts: false,
        email_deal_alerts: false,
        email_weekly_digest: false,
      })
      .eq("id", profiles[0].id);
    updated = true;
  }

  // 4. Sync unsubscribe to Resend Contacts (fire-and-forget)
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/contacts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: sanitizedEmail,
          unsubscribed: true,
        }),
      });
    } catch {
      // Non-critical — still unsubscribed in our DB
    }
  }

  if (!updated) {
    // Email not found in our system, but still return success (don't reveal existence)
    return NextResponse.json({
      success: true,
      message: "If that email was subscribed, it has been unsubscribed.",
    });
  }

  return NextResponse.json({
    success: true,
    message: "You have been unsubscribed from all Invest.com.au marketing emails.",
  });
}
