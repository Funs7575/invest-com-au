import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

const log = logger("price-drop-alerts");

const FIELD_LABELS: Record<string, string> = {
  asx_fee: "ASX Brokerage",
  asx_fee_value: "ASX Fee",
  us_fee: "US Brokerage",
  us_fee_value: "US Fee",
  fx_rate: "FX Rate",
  inactivity_fee: "Inactivity Fee",
};

/**
 * GET /api/cron/price-drop-alerts
 * Checks for recent fee decreases and notifies subscribers who opted for "decrease" alerts.
 * Runs daily — complements the instant check-fees cron by catching decreases
 * that were auto-approved and sending targeted "price drop" emails.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

  // Find fee decreases from the last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentChanges, error: changesError } = await supabase
    .from("fee_update_queue")
    .select("broker_id, broker_slug, broker_name, field_name, old_value, new_value, reviewed_at")
    .eq("status", "approved")
    .gte("reviewed_at", oneDayAgo)
    .order("reviewed_at", { ascending: false });

  if (changesError) {
    log.error("Failed to fetch recent changes", { error: changesError.message });
    return NextResponse.json({ error: changesError.message }, { status: 500 });
  }

  // Filter to actual decreases (numeric comparison)
  const decreases = (recentChanges || []).filter((c) => {
    const oldNum = parseFloat((c.old_value || "").replace(/[^0-9.]/g, ""));
    const newNum = parseFloat((c.new_value || "").replace(/[^0-9.]/g, ""));
    return !isNaN(oldNum) && !isNaN(newNum) && newNum < oldNum;
  });

  if (decreases.length === 0) {
    log.info("No price drops in last 24h");
    return NextResponse.json({ sent: 0, decreases: 0 });
  }

  // Get subscribers who want decrease alerts (both "decrease" and "any")
  const { data: subscribers } = await supabase
    .from("fee_alert_subscriptions")
    .select("id, email, broker_slugs, alert_type, unsubscribe_token")
    .eq("verified", true)
    .in("alert_type", ["decrease", "any"]);

  let sent = 0;

  for (const sub of (subscribers || []).slice(0, 100)) {
    // Filter decreases relevant to this subscriber's broker selection
    const relevant = sub.broker_slugs && sub.broker_slugs.length > 0
      ? decreases.filter((d) => sub.broker_slugs.includes(d.broker_slug))
      : decreases;

    if (relevant.length === 0) continue;

    // Check we haven't already notified for these exact changes
    const changeKeys = relevant.map((d) => `${d.broker_slug}:${d.field_name}:${d.new_value}`);

    const dropRows = relevant.map((d) => {
      const oldNum = parseFloat((d.old_value || "").replace(/[^0-9.]/g, ""));
      const newNum = parseFloat((d.new_value || "").replace(/[^0-9.]/g, ""));
      const pctDrop = oldNum > 0 ? Math.round(((oldNum - newNum) / oldNum) * 100) : 0;
      const fieldLabel = FIELD_LABELS[d.field_name] || d.field_name;

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #f1f5f9;">
            <a href="${siteUrl}/broker/${d.broker_slug}" style="font-weight:700;color:#0f172a;text-decoration:underline;font-size:14px;">${d.broker_name || d.broker_slug}</a>
            <div style="font-size:12px;color:#64748b;margin-top:2px;">${fieldLabel}</div>
          </td>
          <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;">
            <span style="color:#dc2626;text-decoration:line-through;font-size:14px;">${d.old_value}</span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;">
            <span style="color:#059669;font-weight:700;font-size:16px;">${d.new_value}</span>
          </td>
          <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;">
            <span style="display:inline-block;padding:2px 8px;background:#dcfce7;border-radius:100px;color:#059669;font-size:12px;font-weight:700;">↓ ${pctDrop}%</span>
          </td>
        </tr>`;
    }).join("");

    const unsubUrl = `${siteUrl}/fee-alerts?unsubscribe=${sub.unsubscribe_token || ""}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
        <div style="background:#059669;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">💰</div>
          <h1 style="margin:0;font-size:20px;font-weight:800;">Price Drop Alert</h1>
          <p style="margin:6px 0 0;opacity:0.9;font-size:13px;">Good news — broker fees just got cheaper</p>
        </div>

        <div style="padding:24px;background:white;border:1px solid #e2e8f0;border-top:none;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Broker</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Was</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Now</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0;">Drop</th>
              </tr>
            </thead>
            <tbody>${dropRows}</tbody>
          </table>

          <div style="text-align:center;margin:24px 0 16px;">
            <a href="${siteUrl}/compare" style="display:inline-block;padding:14px 32px;background:#059669;color:white;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
              Compare Updated Fees →
            </a>
          </div>

          <div style="background:#f0fdf4;border:1px solid #a7f3d0;border-radius:8px;padding:12px;margin-top:16px;">
            <p style="margin:0;font-size:12px;color:#047857;">
              <strong>Tip:</strong> Fee drops are a great time to switch brokers. Use our
              <a href="${siteUrl}/switching-calculator" style="color:#7c3aed;font-weight:600;">switching calculator</a>
              to see how much you could save.
            </p>
          </div>
        </div>

        <div style="padding:16px;text-align:center;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            You're receiving this because you subscribed to fee drop alerts on
            <a href="${siteUrl}" style="color:#94a3b8;">Invest.com.au</a>.
            <br><a href="${unsubUrl}" style="color:#94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>`;

    try {
      await sendEmail({
        to: sub.email,
        from: "Invest.com.au <alerts@invest.com.au>",
        subject: `Price Drop: ${relevant.map((d) => d.broker_name || d.broker_slug).join(", ")} cut fees`,
        html,
      });

      // Log the notifications
      for (const d of relevant) {
        const oldNum = parseFloat((d.old_value || "").replace(/[^0-9.]/g, ""));
        const newNum = parseFloat((d.new_value || "").replace(/[^0-9.]/g, ""));
        const pctChange = oldNum > 0 ? -Math.round(((oldNum - newNum) / oldNum) * 100) : 0;

        await supabase.from("price_drop_notifications").insert({
          subscription_id: sub.id,
          broker_slug: d.broker_slug,
          field_name: d.field_name,
          old_value: d.old_value,
          new_value: d.new_value,
          change_percent: pctChange,
        });
      }

      // Update subscription tracking
      await supabase
        .from("fee_alert_subscriptions")
        .update({
          last_notified_at: new Date().toISOString(),
          notification_count: (sub as Record<string, unknown>).notification_count
            ? Number((sub as Record<string, unknown>).notification_count) + 1
            : 1,
        })
        .eq("id", sub.id);

      sent++;
    } catch (err) {
      log.error("Failed to send price drop email", {
        email: sub.email.slice(0, 3) + "***",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Price drop alerts sent", { decreases: decreases.length, subscribers: (subscribers || []).length, sent });

  return NextResponse.json({
    decreases: decreases.length,
    subscribers: (subscribers || []).length,
    sent,
    timestamp: new Date().toISOString(),
  });
}
