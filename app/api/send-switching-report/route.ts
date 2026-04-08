import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("switching-report");

/**
 * POST /api/send-switching-report
 * Sends a personalized switching report email with cost breakdown and affiliate link.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`switch-report:${ip}`, 5, 10)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { email, currentBroker, currentBrokerSlug, cheapestBroker, cheapestBrokerSlug, currentCost, cheapestCost, savings, tradesPerYear, avgTradeSize, usAllocation } = body;

    if (!email || !currentBroker || !cheapestBroker) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
    const affiliateLink = `${siteUrl}/go/${cheapestBrokerSlug}?utm_source=switching_report&utm_medium=email&utm_campaign=switch_save`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: #059669; color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Your Switching Report</h1>
          <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Invest.com.au — Personalised Broker Comparison</p>
        </div>

        <div style="padding: 24px; background: white; border: 1px solid #e2e8f0; border-top: none;">
          ${savings > 0 ? `
          <div style="text-align: center; padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #059669; font-weight: 600;">You could save up to</p>
            <p style="margin: 4px 0; font-size: 36px; font-weight: 800; color: #047857;">$${savings.toLocaleString()}/year</p>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">by switching from ${escapeHtml(currentBroker)} to ${escapeHtml(cheapestBroker)}</p>
          </div>
          ` : ""}

          <h2 style="font-size: 15px; color: #0f172a; margin: 0 0 12px;">Cost Comparison</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0;">
                <th style="text-align: left; padding: 8px; color: #64748b;"></th>
                <th style="text-align: right; padding: 8px; color: #dc2626;">${escapeHtml(currentBroker)}</th>
                <th style="text-align: right; padding: 8px; color: #059669;">${escapeHtml(cheapestBroker)}</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; color: #334155; font-weight: 600;">Annual Cost</td>
                <td style="padding: 8px; text-align: right; color: #dc2626; font-weight: 700;">$${currentCost.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right; color: #059669; font-weight: 700;">$${cheapestCost.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; color: #64748b; font-size: 12px;">Based on ${tradesPerYear} trades/yr, $${avgTradeSize.toLocaleString()} avg, ${usAllocation}% US</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          <h2 style="font-size: 15px; color: #0f172a; margin: 0 0 8px;">Projected Savings</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              ${[1, 2, 3, 5].map(y => `
                <td style="text-align: center; padding: 12px; background: #f0fdf4; border-radius: 8px;">
                  <div style="font-size: 11px; color: #6b7280;">${y} Year${y > 1 ? "s" : ""}</div>
                  <div style="font-size: 18px; font-weight: 800; color: #047857;">$${(savings * y).toLocaleString()}</div>
                </td>
              `).join("")}
            </tr>
          </table>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${affiliateLink}" style="display: inline-block; padding: 14px 32px; background: #059669; color: white; font-weight: 700; font-size: 15px; border-radius: 10px; text-decoration: none;">
              Switch to ${escapeHtml(cheapestBroker)} →
            </a>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 16px;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              <strong>How to switch:</strong> Most CHESS-sponsored brokers allow direct HIN transfer — your shares stay in your name throughout.
              <a href="${siteUrl}/switch" style="color: #7c3aed;">Read our switching guide →</a>
            </p>
          </div>
        </div>

        <div style="padding: 16px; text-align: center; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
            This report was generated by <a href="${siteUrl}" style="color: #94a3b8;">Invest.com.au</a>.
            Fee data is updated daily. Invest.com.au may earn a commission if you open an account.
            <br><a href="${siteUrl}/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      from: "Invest.com.au <fees@invest.com.au>",
      subject: `Your Switching Report: Save $${savings.toLocaleString()}/year by switching to ${cheapestBroker}`,
      html,
    });

    log.info("Switching report sent", { email: email.slice(0, 3) + "***", savings, currentBroker, cheapestBroker });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("Switching report error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to send report" }, { status: 500 });
  }
}
