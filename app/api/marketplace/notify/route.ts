import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Internal notification API — sends broker notifications and optionally emails.
 * Called by other API routes / cron jobs / admin actions.
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-side only).
 */
export async function POST(req: NextRequest) {
  try {
    // Simple auth — internal calls only (check for internal API key or service role)
    const authHeader = req.headers.get("x-internal-key");
    if (authHeader !== process.env.INTERNAL_API_KEY && authHeader !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { broker_slug, type, title, message, link, send_email = false } = body;

    if (!broker_slug || !type || !title || !message) {
      return NextResponse.json({ error: "broker_slug, type, title, and message are required" }, { status: 400 });
    }

    // Insert notification
    const { data: notification, error: insertError } = await supabaseAdmin
      .from("broker_notifications")
      .insert({
        broker_slug,
        type,
        title,
        message,
        link: link || null,
        is_read: false,
        email_sent: false,
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
    }

    // Optionally send email
    if (send_email && process.env.RESEND_API_KEY) {
      const { data: account } = await supabaseAdmin
        .from("broker_accounts")
        .select("email, full_name, company_name")
        .eq("broker_slug", broker_slug)
        .eq("status", "active")
        .maybeSingle();

      if (account?.email) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Invest.com.au <partners@invest.com.au>",
              to: [account.email],
              subject: `[Partner Portal] ${title}`,
              html: `
                <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
                  <div style="background: #0f172a; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                    <span style="color: #f59e0b; font-weight: 800; font-size: 14px;">Invest.com.au</span>
                    <span style="color: #94a3b8; font-size: 12px;"> · Partner Portal</span>
                  </div>
                  <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                    <h2 style="margin: 0 0 8px; font-size: 18px; color: #0f172a;">${title}</h2>
                    <p style="margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.6;">${message}</p>
                    ${link ? `<a href="${baseUrl}${link}" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">View in Portal →</a>` : ""}
                    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
                      You received this because you have an active partner account on Invest.com.au.
                    </p>
                  </div>
                </div>
              `,
            }),
          });

          // Mark email as sent
          await supabaseAdmin
            .from("broker_notifications")
            .update({ email_sent: true })
            .eq("id", notification.id);
        } catch {
          // Email failed — notification is still saved
        }
      }
    }

    return NextResponse.json({ success: true, notification_id: notification.id });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
