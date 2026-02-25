import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Low wallet balance alerts
 *
 * Runs daily. Checks all broker wallets where:
 * - low_balance_alert_enabled = true
 * - balance_cents <= low_balance_threshold_cents
 * - No alert sent in the last 24 hours (to avoid spam)
 *
 * Sends email via Resend and creates broker_notifications.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();
  const results: { broker_slug: string; action: string; detail: string }[] = [];

  // ── 1. Find wallets with low balance alerts enabled ──
  const { data: wallets } = await supabase
    .from("broker_wallets")
    .select("broker_slug, balance_cents, low_balance_threshold_cents, low_balance_alert_enabled")
    .eq("low_balance_alert_enabled", true);

  if (!wallets || wallets.length === 0) {
    return NextResponse.json({ alerts_sent: 0, timestamp: now.toISOString() });
  }

  for (const wallet of wallets) {
    // Skip if balance is above threshold
    if (wallet.balance_cents > (wallet.low_balance_threshold_cents || 0)) {
      continue;
    }

    // Check if we already sent a low balance alert in the last 24h
    const { data: recentAlert } = await supabase
      .from("broker_notifications")
      .select("id")
      .eq("broker_slug", wallet.broker_slug)
      .eq("type", "low_balance")
      .gte("created_at", yesterday)
      .limit(1);

    if (recentAlert && recentAlert.length > 0) {
      results.push({
        broker_slug: wallet.broker_slug,
        action: "skipped",
        detail: "Alert already sent in last 24h",
      });
      continue;
    }

    const balanceFormatted = `$${(wallet.balance_cents / 100).toFixed(2)}`;
    const thresholdFormatted = `$${((wallet.low_balance_threshold_cents || 0) / 100).toFixed(2)}`;

    // Auto-pause active campaigns if wallet balance is $0 or less
    if (wallet.balance_cents <= 0) {
      const { data: activeCampaigns } = await supabase
        .from("campaigns")
        .select("id, name")
        .eq("broker_slug", wallet.broker_slug)
        .eq("status", "active");

      if (activeCampaigns && activeCampaigns.length > 0) {
        for (const camp of activeCampaigns) {
          await supabase
            .from("campaigns")
            .update({ status: "paused", updated_at: now.toISOString() })
            .eq("id", camp.id);
        }

        await supabase.from("broker_notifications").insert({
          broker_slug: wallet.broker_slug,
          type: "campaigns_paused",
          title: `${activeCampaigns.length} Campaign${activeCampaigns.length > 1 ? "s" : ""} Auto-Paused`,
          message: `Your wallet balance is ${balanceFormatted}. All active campaigns have been paused to prevent charges. Top up your wallet to resume.`,
          link: "/broker-portal/wallet",
          is_read: false,
          email_sent: false,
        });

        results.push({
          broker_slug: wallet.broker_slug,
          action: "campaigns_paused",
          detail: `${activeCampaigns.length} campaign(s) paused — wallet at ${balanceFormatted}`,
        });
      }
    }

    // Create broker notification
    await supabase.from("broker_notifications").insert({
      broker_slug: wallet.broker_slug,
      type: "low_balance",
      title: "Low Wallet Balance",
      message: `Your wallet balance is ${balanceFormatted}, below your ${thresholdFormatted} threshold. Top up to keep your campaigns running.`,
      link: "/broker-portal/wallet",
      is_read: false,
      email_sent: false,
    });

    // Send email alert
    if (process.env.RESEND_API_KEY) {
      const { data: account } = await supabase
        .from("broker_accounts")
        .select("email, full_name, company_name")
        .eq("broker_slug", wallet.broker_slug)
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
              from: "Invest.com.au <alerts@invest.com.au>",
              to: [account.email],
              subject: `⚠ Low Wallet Balance — ${balanceFormatted} remaining`,
              html: `
                <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
                  <div style="background: #0f172a; padding: 16px 24px; border-radius: 12px 12px 0 0;">
                    <span style="color: #f59e0b; font-weight: 800; font-size: 14px;">Invest.com.au</span>
                    <span style="color: #94a3b8; font-size: 12px;"> · Partner Portal</span>
                  </div>
                  <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                      <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
                        ⚠ Your wallet balance is ${balanceFormatted}
                      </p>
                      <p style="margin: 8px 0 0; font-size: 13px; color: #78350f;">
                        This is below your ${thresholdFormatted} alert threshold. Your active campaigns may pause if the balance reaches $0.
                      </p>
                    </div>
                    <a href="${baseUrl}/broker-portal/wallet" style="display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
                      Top Up Wallet →
                    </a>
                    <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
                      You're receiving this because low balance alerts are enabled in your settings.
                      <a href="${baseUrl}/broker-portal/settings" style="color: #64748b;">Manage alerts</a>
                    </p>
                  </div>
                </div>
              `,
            }),
          });

          // Mark notification email_sent
          await supabase
            .from("broker_notifications")
            .update({ email_sent: true })
            .eq("broker_slug", wallet.broker_slug)
            .eq("type", "low_balance")
            .order("created_at", { ascending: false })
            .limit(1);
        } catch {
          // Email failed — notification is still saved
        }
      }
    }

    results.push({
      broker_slug: wallet.broker_slug,
      action: "alert_sent",
      detail: `Balance ${balanceFormatted} (threshold: ${thresholdFormatted})`,
    });
  }

  return NextResponse.json({
    alerts_sent: results.filter((r) => r.action === "alert_sent").length,
    skipped: results.filter((r) => r.action === "skipped").length,
    results,
    timestamp: now.toISOString(),
  });
}
