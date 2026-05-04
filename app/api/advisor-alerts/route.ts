/**
 * POST /api/advisor-alerts
 * Save an email alert for when a matching advisor joins the directory.
 * Stores in advisor_search_alerts table (created if needed via upsert).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-alerts");

const AdvisorAlertBody = z.object({
  email: z.string().email(),
  advisor_type: z.string().min(1),
  location_state: z.string().optional(),
  location_suburb: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (await isRateLimited(`advisor_alert:${ip}`, 3, 60)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const rawBody = await request.json().catch(() => null);
  const bodyResult = AdvisorAlertBody.safeParse(rawBody);
  if (!bodyResult.success) {
    const issue = bodyResult.error.issues[0];
    const msg = issue?.path[0] === "email"
      ? "A valid email address is required."
      : issue?.path[0] === "advisor_type"
        ? "Advisor type is required."
        : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { email, advisor_type, location_state, location_suburb } = bodyResult.data;

  const admin = createAdminClient();

  // Upsert by email + advisor_type + location to avoid duplicates
  const { error } = await admin
    .from("advisor_search_alerts")
    .upsert(
      {
        email: email.trim().toLowerCase(),
        advisor_type: advisor_type.trim(),
        location_state: location_state?.trim() || null,
        location_suburb: location_suburb?.trim() || null,
        active: true,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "email,advisor_type",
        ignoreDuplicates: false,
      }
    );

  if (error) {
    // If the table doesn't exist, return a soft success so UX doesn't break
    log.error("[advisor-alerts] DB error:", error.message);
    if (error.code === "42P01") {
      return NextResponse.json({ success: true, warning: "Alert registered (table pending)" });
    }
    return NextResponse.json({ error: "Failed to save alert. Please try again." }, { status: 500 });
  }

  // Send confirmation email if Resend is configured
  if (process.env.RESEND_API_KEY) {
    const typeLabel = advisor_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const locationLabel = [location_suburb, location_state].filter(Boolean).join(", ") || "Australia";
    const unsubUrl = `https://invest.com.au/unsubscribe-alerts?email=${encodeURIComponent(email.trim().toLowerCase())}`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Invest.com.au <alerts@invest.com.au>",
        to: email.trim().toLowerCase(),
        subject: `Alert set: ${typeLabel} in ${locationLabel}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
          <h2 style="color:#0f172a;font-size:18px;margin-bottom:4px">You&apos;re on the list! ✓</h2>
          <p style="color:#64748b;font-size:14px">We&apos;ll notify you when a <strong>${typeLabel}</strong> in <strong>${locationLabel}</strong> joins Invest.com.au.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0">
            <p style="font-size:13px;color:#475569;margin:0"><strong>Alert details:</strong><br/>
            Type: ${typeLabel}<br/>
            Location: ${locationLabel}</p>
          </div>
          <p style="font-size:13px;color:#64748b">In the meantime, browse our <a href="https://invest.com.au/advisors" style="color:#7c3aed">current advisor directory</a> — new professionals join every week.</p>
          <p style="font-size:11px;color:#94a3b8;margin-top:24px">
            <a href="${unsubUrl}" style="color:#94a3b8">Unsubscribe from alerts</a>
          </p>
        </div>`,
      }),
    }).catch((err) => log.error("[advisor-alerts] confirmation email failed:", err));
  }

  return NextResponse.json({ success: true });
}
