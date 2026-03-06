import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`fee_alert:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { email, brokerSlugs, alertType, frequency } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const supabase = await createClient();
    const unsubscribeToken = randomBytes(16).toString("hex");
    const verifyToken = randomBytes(16).toString("hex");

    const { error } = await supabase.from("fee_alert_subscriptions").upsert({
      email: email.toLowerCase().trim(),
      broker_slugs: brokerSlugs || [],
      alert_type: alertType || "any",
      frequency: frequency || "instant",
      unsubscribe_token: unsubscribeToken,
      verify_token: verifyToken,
      verified: false,
    }, { onConflict: "email" });

    if (error) return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });

    // Send verification email
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: email,
          subject: "Confirm your fee alert subscription",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; color: #334155;">
              <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 18px;">Fee Change Alerts</h1>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="font-size: 15px;">Confirm your subscription to receive alerts when broker fees change.</p>
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${siteUrl}/fee-alerts?verify=${verifyToken}" style="display: inline-block; padding: 12px 32px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Confirm Subscription →</a>
                </div>
                <p style="font-size: 12px; color: #94a3b8;">You'll be notified when any Australian broker changes their fees. <a href="${siteUrl}/fee-alerts?unsubscribe=${unsubscribeToken}" style="color: #64748b;">Unsubscribe</a></p>
              </div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fee alert error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Verify or unsubscribe
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verifyToken = searchParams.get("verify");
  const unsubToken = searchParams.get("unsubscribe");

  const supabase = await createClient();

  if (verifyToken) {
    await supabase.from("fee_alert_subscriptions").update({ verified: true }).eq("verify_token", verifyToken);
    return NextResponse.json({ success: true, action: "verified" });
  }

  if (unsubToken) {
    await supabase.from("fee_alert_subscriptions").delete().eq("unsubscribe_token", unsubToken);
    return NextResponse.json({ success: true, action: "unsubscribed" });
  }

  return NextResponse.json({ error: "Missing token" }, { status: 400 });
}
