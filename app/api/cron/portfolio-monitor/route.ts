import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("cron-portfolio-monitor");

export const runtime = "edge";
export const maxDuration = 60;

/**
 * PORTFOLIO FEE MONITOR
 *
 * Runs monthly. For each user portfolio:
 * 1. Recalculates annual fees based on current broker data
 * 2. Compares to last snapshot — detects fee changes
 * 3. Checks if a cheaper alternative has appeared
 * 4. Creates alerts for fee changes and savings opportunities
 * 5. Sends a monthly summary email with personalised savings data
 *
 * This is the core product loop:
 * - User sets up portfolio (free) → gets monthly email → clicks through →
 *   sees affiliate CTA for cheaper broker → affiliate revenue
 *
 * Each email costs ~$0.001 to send via Resend.
 * Each click-through generates ~$1-5 in affiliate revenue.
 * At 1,000 portfolios: $1/month cost → $50-500/month revenue.
 */
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";

  // Get all portfolios with holdings stored in the JSON
  const { data: portfolios } = await supabase
    .from("user_portfolios")
    .select("id, email, name, holdings, annual_fees_cents, optimal_fees_cents, savings_cents, optimal_broker_slug, last_snapshot_at")
    .not("email", "is", null)
    .limit(200);

  // Get current broker fee data
  const { data: allBrokers } = await supabase
    .from("brokers")
    .select("slug, name, asx_fee_value, us_fee_value, fx_rate, inactivity_fee, platform_type, rating, color, logo_url, affiliate_url")
    .eq("status", "active");

  const brokerMap = new Map((allBrokers || []).map(b => [b.slug, b]));

  let alertsSent = 0;
  let snapshotsCreated = 0;

  for (const portfolio of portfolios || []) {
    if (!portfolio.email || !portfolio.holdings || !Array.isArray(portfolio.holdings)) continue;

    const firstName = portfolio.name?.split(" ")[0] || "Investor";
    const prevFees = (portfolio.annual_fees_cents || 0) / 100;

    // Recalculate current fees
    let totalFees = 0;
    const feeBreakdown: { broker: string; slug: string; fee: number; prev_fee?: number }[] = [];
    const alerts: { type: string; title: string; detail: string; slug: string }[] = [];

    for (const h of portfolio.holdings as { broker_slug: string; balance: number; trades_per_year?: number; us_allocation?: number; annual_fee?: number }[]) {
      const broker = brokerMap.get(h.broker_slug);
      if (!broker) continue;

      const trades = h.trades_per_year || 24;
      const balance = h.balance || 0;
      const usAlloc = (h.us_allocation || 30) / 100;
      const asxTrades = Math.round(trades * (1 - usAlloc));
      const usTrades = trades - asxTrades;
      const avgTradeSize = balance > 0 ? balance / trades : 2000;

      const asxCost = asxTrades * (broker.asx_fee_value || 0);
      const usCost = usTrades * (broker.us_fee_value || 0);
      const fxCost = usTrades * avgTradeSize * ((broker.fx_rate || 0) / 100);
      const inactivity = broker.inactivity_fee || 0;
      const annualFee = Math.round(asxCost + usCost + fxCost + inactivity);

      totalFees += annualFee;

      const prevHoldingFee = h.annual_fee || 0;
      feeBreakdown.push({ broker: broker.name, slug: h.broker_slug, fee: annualFee, prev_fee: prevHoldingFee });

      // Detect fee change
      if (prevHoldingFee > 0 && Math.abs(annualFee - prevHoldingFee) > 5) {
        const direction = annualFee > prevHoldingFee ? "increased" : "decreased";
        alerts.push({
          type: "fee_change",
          title: `${broker.name} fees ${direction}`,
          detail: `Your estimated annual fee with ${broker.name} ${direction} from $${prevHoldingFee} to $${annualFee}.`,
          slug: h.broker_slug,
        });
      }
    }

    // Find optimal broker
    let optimalFees = totalFees;
    let optimalSlug = "";
    const shareBrokers = (allBrokers || []).filter(b => b.platform_type === "share_broker");

    for (const ob of shareBrokers) {
      let cost = 0;
      for (const h of portfolio.holdings as { balance: number; trades_per_year?: number; us_allocation?: number }[]) {
        const trades = h.trades_per_year || 24;
        const balance = h.balance || 0;
        const usAlloc = (h.us_allocation || 30) / 100;
        const asxTrades = Math.round(trades * (1 - usAlloc));
        const usTrades = trades - asxTrades;
        const avgTradeSize = balance > 0 ? balance / trades : 2000;
        cost += asxTrades * (ob.asx_fee_value || 0);
        cost += usTrades * (ob.us_fee_value || 0);
        cost += usTrades * avgTradeSize * ((ob.fx_rate || 0) / 100);
        cost += ob.inactivity_fee || 0;
      }
      if (cost < optimalFees) {
        optimalFees = Math.round(cost);
        optimalSlug = ob.slug;
      }
    }

    const savings = totalFees - optimalFees;

    // Check if savings opportunity changed
    const prevSavings = (portfolio.savings_cents || 0) / 100;
    if (savings > prevSavings + 20 && savings > 50) {
      const optBroker = brokerMap.get(optimalSlug);
      alerts.push({
        type: "savings_opportunity",
        title: `New savings opportunity: $${savings}/year`,
        detail: `By switching to ${optBroker?.name || optimalSlug}, you could save $${savings} per year on broker fees.`,
        slug: optimalSlug,
      });
    }

    // Create fee snapshot
    await supabase.from("portfolio_fee_snapshots").insert({
      portfolio_id: portfolio.id,
      snapshot_date: new Date().toISOString().slice(0, 10),
      total_annual_fees: totalFees,
      cheapest_alternative_fees: optimalFees,
      potential_savings: savings,
      breakdown: feeBreakdown,
    }).catch(() => {});
    snapshotsCreated++;

    // Save alerts
    for (const alert of alerts) {
      await supabase.from("portfolio_alerts").insert({
        portfolio_id: portfolio.id,
        broker_slug: alert.slug,
        alert_type: alert.type,
        title: alert.title,
        detail: alert.detail,
      }).catch(() => {});
    }

    // Update portfolio with new calculations
    await supabase.from("user_portfolios").update({
      annual_fees_cents: totalFees * 100,
      optimal_fees_cents: optimalFees * 100,
      savings_cents: savings * 100,
      optimal_broker_slug: optimalSlug || null,
      last_snapshot_at: new Date().toISOString(),
    }).eq("id", portfolio.id).catch(() => {});

    // Send monthly summary email
    const optBroker = brokerMap.get(optimalSlug);
    const feeRows = feeBreakdown.map(f =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px">${f.broker}</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;font-weight:600">$${f.fee}/yr</td></tr>`
    ).join("");

    const subject = savings > 50
      ? `${firstName}, you could save $${savings}/year on broker fees`
      : `${firstName}, your monthly fee report from Invest.com.au`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0f172a;font-size:18px">📊 Your Monthly Fee Report</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6">Hi ${firstName}, here's your broker fee summary for this month:</p>
        
        <table style="width:100%;border-collapse:collapse;margin:12px 0">
          <thead><tr style="background:#f8fafc"><th style="padding:8px;text-align:left;font-size:12px;color:#64748b">Platform</th><th style="padding:8px;text-align:right;font-size:12px;color:#64748b">Annual Fee</th></tr></thead>
          <tbody>${feeRows}</tbody>
          <tfoot><tr style="background:#f8fafc"><td style="padding:8px;font-weight:700;font-size:14px">Total</td><td style="padding:8px;text-align:right;font-weight:700;font-size:14px">$${totalFees}/yr</td></tr></tfoot>
        </table>

        ${savings > 50 && optBroker ? `
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="color:#065f46;font-weight:700;font-size:14px;margin:0 0 4px">💡 You could save $${savings}/year</p>
          <p style="color:#047857;font-size:13px;margin:0">By switching to ${optBroker.name}, your fees would drop from $${totalFees} to $${optimalFees} per year.</p>
          <a href="${siteUrl}/broker/${optimalSlug}?utm_source=portfolio_monitor&utm_medium=email" style="display:inline-block;padding:10px 20px;background:#059669;color:white;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:10px">
            See ${optBroker.name} Review →
          </a>
        </div>
        ` : `
        <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:16px;margin:16px 0">
          <p style="color:#065f46;font-weight:700;font-size:14px;margin:0">✅ You're on an optimal platform</p>
          <p style="color:#047857;font-size:13px;margin:0 0 0 0">No cheaper alternative found for your trading pattern. Nice work!</p>
        </div>
        `}

        ${alerts.length > 0 ? `
        <p style="color:#475569;font-size:14px;font-weight:600;margin-top:16px">⚡ Alerts this month:</p>
        <ul style="color:#475569;font-size:13px;line-height:1.8">
          ${alerts.map(a => `<li>${a.title}</li>`).join("")}
        </ul>
        ` : ""}

        <a href="${siteUrl}/portfolio?utm_source=portfolio_monitor&utm_medium=email" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-top:12px">
          View Full Dashboard →
        </a>

        ${notificationFooter()}
      </div>
    `;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <portfolio@invest.com.au>",
          to: portfolio.email,
          subject,
          html,
        }),
      });
      alertsSent++;
    } catch (e) {
      log.error("Portfolio email failed", { id: portfolio.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  log.info("Portfolio monitor complete", { portfolios: (portfolios || []).length, snapshots: snapshotsCreated, emailsSent: alertsSent });

  return NextResponse.json({
    portfolios: (portfolios || []).length,
    snapshots: snapshotsCreated,
    emailsSent: alertsSent,
  });
}
