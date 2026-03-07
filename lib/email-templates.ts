/**
 * Shared HTML email template system for Invest.com.au.
 *
 * All templates use inline CSS for maximum email client compatibility.
 * Brand color: emerald #16a34a, text: dark slate #0f172a.
 * Max-width 600px, mobile-friendly.
 */

const BRAND_EMERALD = "#16a34a";
const BRAND_DARK = "#0f172a";
const TEXT_MUTED = "#64748b";
const TEXT_LIGHT = "#94a3b8";
const BG_LIGHT = "#f8fafc";
const BORDER = "#e2e8f0";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

/** Escape HTML special chars to prevent XSS in dynamic content */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Base Template ──────────────────────────────────────────────────────────

/**
 * Wraps content in a responsive, branded email layout.
 *
 * @param content  - Raw HTML for the email body
 * @param preheader - Optional preheader text (visible in inbox previews)
 */
export function baseTemplate(content: string, preheader?: string): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invest.com.au</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheaderHtml}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_EMERALD};padding:20px 24px;border-radius:12px 12px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-weight:800;font-size:18px;letter-spacing:-0.3px;">Invest.com.au</span>
                  </td>
                  <td align="right">
                    <a href="${BASE_URL}" style="color:rgba(255,255,255,0.7);font-size:12px;text-decoration:none;">View online</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#ffffff;border:1px solid ${BORDER};border-top:none;padding:32px 24px;border-radius:0 0 12px 12px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px;font-size:12px;color:${TEXT_LIGHT};line-height:1.6;">
                      Invest.com.au is an independent comparison site. We may earn commissions from partner links.
                    </p>
                    <p style="margin:0;font-size:12px;color:${TEXT_LIGHT};line-height:1.6;">
                      <a href="{{unsubscribe_url}}" style="color:${TEXT_MUTED};text-decoration:underline;">Unsubscribe</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${BASE_URL}/account" style="color:${TEXT_MUTED};text-decoration:underline;">Manage preferences</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${BASE_URL}/privacy" style="color:${TEXT_MUTED};text-decoration:underline;">Privacy</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Welcome Email ──────────────────────────────────────────────────────────

export function welcomeEmail(name: string): string {
  const safeName = escapeHtml(name || "there");

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BRAND_DARK};">Welcome to Invest.com.au</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
      Hi ${safeName}, thanks for signing up! You now have access to Australia's most comprehensive broker comparison tools.
    </p>
    <div style="background:${BG_LIGHT};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${BRAND_DARK};">Here's what you can do:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">1.</span>
            Compare broker fees side-by-side
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">2.</span>
            Set up fee change alerts to stay informed
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">3.</span>
            Take the platform quiz to find your best match
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">4.</span>
            Save brokers to your shortlist for easy comparison
          </td>
        </tr>
      </table>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_EMERALD};">
          <a href="${BASE_URL}/compare" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            Compare Brokers Now
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};">
      Questions? Reply to this email or visit our <a href="${BASE_URL}/learn" style="color:${BRAND_EMERALD};text-decoration:underline;">learning hub</a>.
    </p>`;

  return baseTemplate(content, `Welcome to Invest.com.au, ${safeName}! Start comparing broker fees today.`);
}

// ─── Fee Change Alert Email ─────────────────────────────────────────────────

export function feeChangeAlertEmail(
  changes: { broker: string; oldFee: string; newFee: string }[]
): string {
  const rows = changes
    .map(
      (c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:${BRAND_DARK};font-size:14px;">${escapeHtml(c.broker)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#dc2626;font-size:14px;text-decoration:line-through;">${escapeHtml(c.oldFee)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:${BRAND_EMERALD};font-weight:600;font-size:14px;">${escapeHtml(c.newFee)}</td>
    </tr>`
    )
    .join("");

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Fee Alert</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Broker Fee Changes Detected</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
      The following broker fee changes were detected. As a Pro subscriber, you're the first to know.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:${BG_LIGHT};">
          <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">Broker</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">Was</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">Now</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_EMERALD};">
          <a href="${BASE_URL}/compare" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            View Updated Comparison
          </a>
        </td>
      </tr>
    </table>`;

  return baseTemplate(
    content,
    `${changes.length} broker fee change${changes.length === 1 ? "" : "s"} detected — see the details`
  );
}

// ─── Campaign Approved Email ────────────────────────────────────────────────

export function campaignApprovedEmail(
  campaignName: string,
  brokerName: string
): string {
  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Approved</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Campaign Approved</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
      Great news! Your campaign <strong style="color:${BRAND_DARK};">"${escapeHtml(campaignName)}"</strong> for <strong style="color:${BRAND_DARK};">${escapeHtml(brokerName)}</strong> has been reviewed and approved.
    </p>
    <div style="background:${BG_LIGHT};border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid ${BRAND_EMERALD};">
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
        Your campaign will go live on its scheduled start date. Make sure your wallet has sufficient balance to cover the campaign costs.
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_EMERALD};">
          <a href="${BASE_URL}/broker-portal/campaigns" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            View Campaign
          </a>
        </td>
      </tr>
    </table>`;

  return baseTemplate(
    content,
    `Your campaign "${campaignName}" has been approved and is ready to go live.`
  );
}

// ─── Campaign Rejected Email ────────────────────────────────────────────────

export function campaignRejectedEmail(
  campaignName: string,
  brokerName: string,
  reason?: string
): string {
  const reasonBlock = reason
    ? `<div style="background:#fef2f2;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #dc2626;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">Reason</p>
        <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">${escapeHtml(reason)}</p>
      </div>`
    : "";

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#fef2f2;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">Action Required</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Campaign Not Approved</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
      Your campaign <strong style="color:${BRAND_DARK};">"${escapeHtml(campaignName)}"</strong> for <strong style="color:${BRAND_DARK};">${escapeHtml(brokerName)}</strong> was not approved after review.
    </p>
    ${reasonBlock}
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      You can edit the campaign and resubmit it for review. If you have questions, contact our partnerships team at <a href="mailto:partners@invest.com.au" style="color:${BRAND_EMERALD};text-decoration:underline;">partners@invest.com.au</a>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_DARK};">
          <a href="${BASE_URL}/broker-portal/campaigns" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            Edit Campaign
          </a>
        </td>
      </tr>
    </table>`;

  return baseTemplate(
    content,
    `Your campaign "${campaignName}" needs changes before it can go live.`
  );
}

// ─── Low Balance Email ──────────────────────────────────────────────────────

export function lowBalanceEmail(
  brokerName: string,
  balance: number,
  threshold: number
): string {
  const balanceStr = `$${balance.toFixed(2)}`;
  const thresholdStr = `$${threshold.toFixed(2)}`;
  const isZero = balance <= 0;

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#fef3c7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Low Balance</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Wallet Balance Warning</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
      Hi ${escapeHtml(brokerName)}, your marketplace wallet balance is running low.
    </p>
    <div style="background:${isZero ? "#fef2f2" : "#fef3c7"};border:1px solid ${isZero ? "#fca5a5" : "#fde68a"};border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;color:${isZero ? "#991b1b" : "#92400e"};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Current Balance</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:${isZero ? "#dc2626" : "#92400e"};">${balanceStr}</p>
      <p style="margin:8px 0 0;font-size:13px;color:${TEXT_MUTED};">Alert threshold: ${thresholdStr}</p>
    </div>
    ${isZero ? `<div style="background:#fef2f2;border-radius:8px;padding:12px 16px;margin-bottom:20px;border-left:4px solid #dc2626;">
      <p style="margin:0;font-size:14px;color:#991b1b;font-weight:600;">Your active campaigns may be paused due to insufficient funds.</p>
    </div>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_EMERALD};">
          <a href="${BASE_URL}/broker-portal/wallet" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            Top Up Wallet
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_LIGHT};">
      You're receiving this because low-balance alerts are enabled. <a href="${BASE_URL}/broker-portal/settings" style="color:${TEXT_MUTED};text-decoration:underline;">Manage alert settings</a>
    </p>`;

  return baseTemplate(
    content,
    `Your wallet balance is ${balanceStr}, below the ${thresholdStr} threshold. Top up to keep campaigns running.`
  );
}

// ─── Weekly Digest Email ────────────────────────────────────────────────────

export function weeklyDigestEmail(data: {
  feeChanges: { broker: string; field: string; oldValue: string; newValue: string }[];
  newArticles: { title: string; slug: string; category?: string; readTime?: number }[];
  activeDeals: { broker: string; slug: string; dealText: string; expiry?: string }[];
}): string {
  const dateStr = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const feeRows =
    data.feeChanges.length > 0
      ? data.feeChanges
          .map(
            (c) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-weight:600;color:${BRAND_DARK};font-size:13px;">${escapeHtml(c.broker)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${TEXT_MUTED};font-size:13px;">${escapeHtml(c.field)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#dc2626;font-size:13px;text-decoration:line-through;">${escapeHtml(c.oldValue)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${BRAND_EMERALD};font-weight:600;font-size:13px;">${escapeHtml(c.newValue)}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="4" style="padding:16px;text-align:center;color:${TEXT_LIGHT};font-size:13px;">No fee changes this week.</td></tr>`;

  const articlesHtml =
    data.newArticles.length > 0
      ? data.newArticles
          .map(
            (a) => `
      <li style="margin-bottom:8px;">
        <a href="${BASE_URL}/article/${a.slug}" style="color:${BRAND_DARK};text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(a.title)}</a>
        <span style="color:${TEXT_LIGHT};font-size:12px;margin-left:6px;">${escapeHtml(a.category || "Guide")}${a.readTime ? ` &middot; ${a.readTime} min` : ""}</span>
      </li>`
          )
          .join("")
      : `<li style="color:${TEXT_LIGHT};font-size:13px;">No new articles this week.</li>`;

  const dealsHtml =
    data.activeDeals.length > 0
      ? data.activeDeals
          .map(
            (d) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
          <a href="${BASE_URL}/broker/${d.slug}" style="font-weight:600;color:${BRAND_DARK};text-decoration:none;font-size:13px;">${escapeHtml(d.broker)}</a>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#92400e;font-size:13px;">${escapeHtml(d.dealText)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${TEXT_LIGHT};font-size:12px;">${d.expiry ? `Exp ${escapeHtml(d.expiry)}` : "Ongoing"}</td>
      </tr>`
          )
          .join("")
      : `<tr><td colspan="3" style="padding:16px;text-align:center;color:${TEXT_LIGHT};font-size:13px;">No active deals right now.</td></tr>`;

  const content = `
    <p style="margin:0 0 4px;font-size:12px;color:${TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Weekly Digest</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">What Changed This Week</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Week of ${dateStr} &mdash; here's your summary of the Australian brokerage world.
    </p>

    <!-- Fee Changes -->
    <h2 style="font-size:15px;color:${BRAND_DARK};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${BRAND_EMERALD};">Fee Changes</h2>
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <thead>
          <tr style="background:${BG_LIGHT};">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;">Broker</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;">Field</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;">Was</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;">Now</th>
          </tr>
        </thead>
        <tbody>${feeRows}</tbody>
      </table>
    </div>

    <!-- New Articles -->
    <h2 style="font-size:15px;color:${BRAND_DARK};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${BRAND_EMERALD};">New This Week</h2>
    <ul style="margin:0 0 24px;padding-left:20px;line-height:1.8;">${articlesHtml}</ul>

    <!-- Deals -->
    <h2 style="font-size:15px;color:${BRAND_DARK};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${BRAND_EMERALD};">Active Deals</h2>
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tbody>${dealsHtml}</tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/compare" style="display:inline-block;padding:12px 32px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
              Compare All Platforms
            </a>
          </td>
        </tr>
      </table>
      <p style="text-align:center;margin-top:12px;">
        <a href="${BASE_URL}/find-advisor" style="color:${BRAND_BLUE};font-weight:600;font-size:13px;text-decoration:underline;">Need professional advice? Find an advisor →</a>
      </p>
    </div>`;

  return baseTemplate(
    content,
    `${data.feeChanges.length} fee changes, ${data.newArticles.length} new articles, ${data.activeDeals.length} deals this week`
  );
}

// ─── Campaign Performance Email ─────────────────────────────────────────────

export function campaignPerformanceEmail(data: {
  campaignName: string;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
}): string {
  const statCell = (value: string, label: string, color?: string) => `
    <td style="padding:14px 8px;text-align:center;width:25%;">
      <div style="font-size:22px;font-weight:800;color:${color || BRAND_DARK};">${value}</div>
      <div style="font-size:11px;color:${TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${label}</div>
    </td>`;

  const content = `
    <p style="margin:0 0 4px;font-size:12px;color:${TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Daily Report</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Campaign Performance</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
      Here's yesterday's performance summary for <strong style="color:${BRAND_DARK};">"${escapeHtml(data.campaignName)}"</strong>.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BG_LIGHT};border-radius:8px;margin-bottom:24px;">
      <tr>
        ${statCell(data.clicks.toLocaleString(), "Clicks")}
        ${statCell(`${data.ctr.toFixed(1)}%`, "CTR")}
        ${statCell(data.conversions.toLocaleString(), "Conversions", data.conversions > 0 ? BRAND_EMERALD : BRAND_DARK)}
        ${statCell(`$${data.spend.toFixed(2)}`, "Spend", "#dc2626")}
      </tr>
    </table>

    ${data.conversions > 0 ? `<p style="margin:0 0 20px;font-size:14px;color:${BRAND_EMERALD};font-weight:600;">${data.conversions} conversion${data.conversions === 1 ? "" : "s"} tracked yesterday!</p>` : ""}

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_EMERALD};">
          <a href="${BASE_URL}/broker-portal/analytics" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            View Full Analytics
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_LIGHT};">
      This is your daily campaign digest from the Invest.com.au Partner Portal.
    </p>`;

  return baseTemplate(
    content,
    `${data.clicks} clicks, ${data.conversions} conversions, $${data.spend.toFixed(2)} spend yesterday`
  );
}

// ─── Welcome Drip: Email 1 — Welcome (sent immediately) ────────────────────

export function brokerWelcomeEmail(
  brokerName: string,
  companyName: string
): string {
  const safeName = escapeHtml(brokerName || "there");
  const safeCompany = escapeHtml(companyName || "your company");

  const content = `
    <div style="text-align:center;padding:8px 0 24px;">
      <div style="display:inline-block;width:64px;height:64px;background:${BRAND_EMERALD};border-radius:16px;line-height:64px;text-align:center;">
        <span style="font-size:28px;color:#ffffff;">&#9989;</span>
      </div>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BRAND_DARK};text-align:center;">Welcome to the Partner Portal</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;text-align:center;">
      Hi ${safeName}, your partner account for <strong style="color:${BRAND_DARK};">${safeCompany}</strong> is ready. You're now part of Australia's leading broker advertising marketplace.
    </p>

    <div style="background:${BG_LIGHT};border-radius:8px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:${BRAND_DARK};">Quick-Start Checklist</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#475569;border-bottom:1px solid ${BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top">
                  <span style="display:inline-block;width:24px;height:24px;background:#dcfce7;border-radius:6px;text-align:center;line-height:24px;font-size:13px;color:${BRAND_EMERALD};font-weight:700;">1</span>
                </td>
                <td style="padding-left:8px;">
                  <strong style="color:${BRAND_DARK};">Upload your creative assets</strong>
                  <br><span style="font-size:13px;color:${TEXT_MUTED};">Logos, banners, and screenshots for your campaigns</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#475569;border-bottom:1px solid ${BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top">
                  <span style="display:inline-block;width:24px;height:24px;background:#dcfce7;border-radius:6px;text-align:center;line-height:24px;font-size:13px;color:${BRAND_EMERALD};font-weight:700;">2</span>
                </td>
                <td style="padding-left:8px;">
                  <strong style="color:${BRAND_DARK};">Set up your wallet</strong>
                  <br><span style="font-size:13px;color:${TEXT_MUTED};">Add funds to start running campaigns</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#475569;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top">
                  <span style="display:inline-block;width:24px;height:24px;background:#dcfce7;border-radius:6px;text-align:center;line-height:24px;font-size:13px;color:${BRAND_EMERALD};font-weight:700;">3</span>
                </td>
                <td style="padding-left:8px;">
                  <strong style="color:${BRAND_DARK};">Create your first campaign</strong>
                  <br><span style="font-size:13px;color:${TEXT_MUTED};">Choose placements, set your budget, and go live</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/broker-portal" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              Get Started &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      Need help? Reply to this email or contact <a href="mailto:partners@invest.com.au" style="color:${BRAND_EMERALD};text-decoration:underline;">partners@invest.com.au</a>
    </p>`;

  return baseTemplate(
    content,
    `Welcome to the Invest.com.au Partner Portal, ${safeName}! Here's how to get started.`
  );
}

// ─── Welcome Drip: Email 2 — Setup Guide (sent Day 2) ──────────────────────

export function setupGuideEmail(
  brokerName: string,
  companyName: string,
  hasWallet: boolean,
  hasCampaign: boolean,
  hasCreative: boolean
): string {
  const safeName = escapeHtml(brokerName || "there");
  const safeCompany = escapeHtml(companyName || "your company");

  const checkIcon = `<span style="display:inline-block;width:22px;height:22px;background:${BRAND_EMERALD};border-radius:6px;text-align:center;line-height:22px;font-size:12px;color:#ffffff;font-weight:700;">&#10003;</span>`;
  const emptyIcon = `<span style="display:inline-block;width:22px;height:22px;background:#ffffff;border:2px solid ${BORDER};border-radius:6px;text-align:center;line-height:22px;font-size:12px;color:${TEXT_LIGHT};">&nbsp;</span>`;

  const completedCount = [hasCreative, hasWallet, hasCampaign].filter(Boolean).length;
  const allDone = completedCount === 3;

  // Determine the first incomplete step link
  let ctaLink = `${BASE_URL}/broker-portal`;
  let ctaText = "Continue Setup &rarr;";
  if (!hasCreative) {
    ctaLink = `${BASE_URL}/broker-portal/creatives`;
    ctaText = "Upload Creative Assets &rarr;";
  } else if (!hasWallet) {
    ctaLink = `${BASE_URL}/broker-portal/wallet`;
    ctaText = "Set Up Your Wallet &rarr;";
  } else if (!hasCampaign) {
    ctaLink = `${BASE_URL}/broker-portal/campaigns/new`;
    ctaText = "Create Your First Campaign &rarr;";
  }

  const progressPct = Math.round((completedCount / 3) * 100);

  const content = `
    <p style="margin:0 0 4px;font-size:12px;color:${TEXT_LIGHT};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Setup Progress</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Your Account Setup Checklist</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
      Hi ${safeName}, ${allDone
        ? `you've completed all the setup steps for ${safeCompany}. You're ready to launch!`
        : `here's where ${safeCompany} stands. Complete the remaining steps to start reaching investors.`}
    </p>

    <!-- Progress Bar -->
    <div style="background:${BORDER};border-radius:100px;height:8px;margin-bottom:24px;overflow:hidden;">
      <div style="background:${BRAND_EMERALD};height:8px;border-radius:100px;width:${progressPct}%;"></div>
    </div>
    <p style="margin:-16px 0 24px;font-size:12px;color:${TEXT_MUTED};text-align:right;">${completedCount}/3 complete</p>

    <!-- Checklist -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;background:${hasCreative ? "#f0fdf4" : BG_LIGHT};border-radius:8px 8px 0 0;border-bottom:1px solid ${BORDER};">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="32" valign="middle">${hasCreative ? checkIcon : emptyIcon}</td>
              <td style="padding-left:12px;">
                <span style="font-size:14px;font-weight:600;color:${hasCreative ? BRAND_EMERALD : BRAND_DARK};">${hasCreative ? "Creative assets uploaded" : "Upload creative assets"}</span>
                ${!hasCreative ? `<br><span style="font-size:12px;color:${TEXT_MUTED};">Add logos and banners for your campaigns</span>` : ""}
              </td>
              ${!hasCreative ? `<td width="60" align="right"><a href="${BASE_URL}/broker-portal/creatives" style="font-size:12px;color:${BRAND_EMERALD};font-weight:600;text-decoration:none;">Do this</a></td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:${hasWallet ? "#f0fdf4" : BG_LIGHT};border-bottom:1px solid ${BORDER};">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="32" valign="middle">${hasWallet ? checkIcon : emptyIcon}</td>
              <td style="padding-left:12px;">
                <span style="font-size:14px;font-weight:600;color:${hasWallet ? BRAND_EMERALD : BRAND_DARK};">${hasWallet ? "Wallet funded" : "Set up your wallet"}</span>
                ${!hasWallet ? `<br><span style="font-size:12px;color:${TEXT_MUTED};">Add funds to power your advertising</span>` : ""}
              </td>
              ${!hasWallet ? `<td width="60" align="right"><a href="${BASE_URL}/broker-portal/wallet" style="font-size:12px;color:${BRAND_EMERALD};font-weight:600;text-decoration:none;">Do this</a></td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:${hasCampaign ? "#f0fdf4" : BG_LIGHT};border-radius:0 0 8px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="32" valign="middle">${hasCampaign ? checkIcon : emptyIcon}</td>
              <td style="padding-left:12px;">
                <span style="font-size:14px;font-weight:600;color:${hasCampaign ? BRAND_EMERALD : BRAND_DARK};">${hasCampaign ? "First campaign created" : "Create your first campaign"}</span>
                ${!hasCampaign ? `<br><span style="font-size:12px;color:${TEXT_MUTED};">Pick a placement and start driving leads</span>` : ""}
              </td>
              ${!hasCampaign ? `<td width="60" align="right"><a href="${BASE_URL}/broker-portal/campaigns/new" style="font-size:12px;color:${BRAND_EMERALD};font-weight:600;text-decoration:none;">Do this</a></td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${!allDone ? `<div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${ctaLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>
    </div>` : `<div style="background:#f0fdf4;border-radius:8px;padding:16px 20px;text-align:center;border:1px solid #bbf7d0;">
      <p style="margin:0;font-size:15px;font-weight:700;color:${BRAND_EMERALD};">All set! You're ready to launch your first campaign.</p>
    </div>`}

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      Questions about setup? Our partnerships team is here to help &mdash; <a href="mailto:partners@invest.com.au" style="color:${BRAND_EMERALD};text-decoration:underline;">partners@invest.com.au</a>
    </p>`;

  return baseTemplate(
    content,
    allDone
      ? `${safeName}, your setup is complete! You're ready to launch.`
      : `${safeName}, you're ${completedCount}/3 through setup. Complete your checklist to go live.`
  );
}

// ─── Welcome Drip: Email 3 — First Campaign Tips (sent Day 5) ──────────────

export function firstCampaignTipsEmail(
  brokerName: string,
  companyName: string
): string {
  const safeName = escapeHtml(brokerName || "there");
  const safeCompany = escapeHtml(companyName || "your company");

  const tipBlock = (number: string, title: string, description: string, iconBg: string) => `
    <tr>
      <td style="padding:16px;${number !== "3" ? `border-bottom:1px solid ${BORDER};` : ""}">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="44" valign="top">
              <div style="width:36px;height:36px;background:${iconBg};border-radius:10px;text-align:center;line-height:36px;">
                <span style="font-size:16px;font-weight:800;color:#ffffff;">${number}</span>
              </div>
            </td>
            <td style="padding-left:12px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${BRAND_DARK};">${title}</p>
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${description}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Campaign Tips</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">3 Tips for a Successful First Campaign</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
      Hi ${safeName}, launching your first campaign for ${safeCompany}? Here are proven strategies from top-performing partners on our platform.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BG_LIGHT};border-radius:8px;margin-bottom:24px;">
      ${tipBlock(
        "1",
        "Choose the right placement",
        "Match your placement to user intent. Comparison page placements convert best for sign-ups, while article placements build brand awareness. Start with one high-intent placement and expand from there.",
        BRAND_EMERALD
      )}
      ${tipBlock(
        "2",
        "Use compelling creative",
        "Ads with a clear value proposition get 2&ndash;3x more clicks. Highlight your competitive edge &mdash; low fees, unique features, or current promotions. Keep copy concise and use a strong call-to-action.",
        "#2563eb"
      )}
      ${tipBlock(
        "3",
        "Set a smart budget",
        "Start with a moderate daily budget to gather performance data. After 3&ndash;5 days, review your CTR and conversion rates, then adjust your spend and rate. Use our A/B testing tools to optimise further.",
        "#7c3aed"
      )}
    </table>

    <div style="background:#eff6ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #2563eb;">
      <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
        <strong>Pro tip:</strong> Partners who launch within their first week see 40% better first-month performance. The sooner you start, the sooner you can optimise.
      </p>
    </div>

    <div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/broker-portal/campaigns/new" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              Create Your First Campaign &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      Want a personalised strategy session? <a href="mailto:partners@invest.com.au" style="color:${BRAND_EMERALD};text-decoration:underline;">Book a call with our partnerships team</a>
    </p>`;

  return baseTemplate(
    content,
    `${safeName}, 3 tips to make your first campaign on Invest.com.au a success.`
  );
}

// ─── Welcome Drip: Email 4 — Check-In (sent Day 10) ────────────────────────

export function checkInEmail(
  brokerName: string,
  companyName: string,
  hasActiveCampaign: boolean
): string {
  const safeName = escapeHtml(brokerName || "there");
  const safeCompany = escapeHtml(companyName || "your company");

  const activeCampaignContent = `
    <div style="text-align:center;padding:8px 0 24px;">
      <div style="display:inline-block;width:64px;height:64px;background:#dcfce7;border-radius:16px;line-height:64px;text-align:center;">
        <span style="font-size:28px;">&#128200;</span>
      </div>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};text-align:center;">How's Your Campaign Going?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;text-align:center;">
      Hi ${safeName}, it's been 10 days since ${safeCompany} joined the Partner Portal. Your campaign is live &mdash; here's how to make the most of it.
    </p>

    <div style="background:${BG_LIGHT};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${BRAND_DARK};">Next steps to maximise performance:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">&#x2022;</span>
            Check your analytics to see click and conversion trends
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">&#x2022;</span>
            Try A/B testing different creative to improve CTR
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">&#x2022;</span>
            Consider adding a second placement to expand reach
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/broker-portal/analytics" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              View Your Analytics &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>`;

  const noCampaignContent = `
    <div style="text-align:center;padding:8px 0 24px;">
      <div style="display:inline-block;width:64px;height:64px;background:#fef3c7;border-radius:16px;line-height:64px;text-align:center;">
        <span style="font-size:28px;">&#128075;</span>
      </div>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};text-align:center;">We Noticed You Haven't Launched Yet</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;text-align:center;">
      Hi ${safeName}, it's been 10 days since ${safeCompany} joined the Partner Portal. We'd love to help you get started.
    </p>

    <div style="background:#fffbeb;border-radius:8px;padding:20px;margin-bottom:24px;border:1px solid #fde68a;">
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#92400e;">Need a hand?</p>
      <p style="margin:0 0 16px;font-size:14px;color:#78350f;line-height:1.6;">
        Our partnerships team can help you set up your first campaign, choose the best placements, and create effective ad creative. Many partners see their first leads within 48 hours of launching.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius:6px;background:#92400e;">
            <a href="mailto:partners@invest.com.au?subject=Help%20setting%20up%20campaign%20for%20${encodeURIComponent(safeCompany)}" style="display:inline-block;padding:10px 20px;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">
              Request Setup Help
            </a>
          </td>
        </tr>
      </table>
    </div>

    <div style="background:${BG_LIGHT};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${BRAND_DARK};">Or jump straight in:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">
            <a href="${BASE_URL}/broker-portal/campaigns/new" style="color:${BRAND_EMERALD};font-weight:600;text-decoration:none;">Create a campaign</a>
            <span style="color:${TEXT_MUTED};"> &mdash; Choose from 10+ placement options</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">
            <a href="${BASE_URL}/broker-portal/wallet" style="color:${BRAND_EMERALD};font-weight:600;text-decoration:none;">Top up your wallet</a>
            <span style="color:${TEXT_MUTED};"> &mdash; Start with any amount</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">
            <a href="${BASE_URL}/broker-portal/creatives" style="color:${BRAND_EMERALD};font-weight:600;text-decoration:none;">Upload creative assets</a>
            <span style="color:${TEXT_MUTED};"> &mdash; Logos, banners, and more</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/broker-portal/campaigns/new" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              Launch Your First Campaign &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>`;

  const content = `
    ${hasActiveCampaign ? activeCampaignContent : noCampaignContent}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      This is part of your onboarding series from the Invest.com.au Partner Portal.
    </p>`;

  return baseTemplate(
    content,
    hasActiveCampaign
      ? `${safeName}, check in on your campaign performance after 10 days.`
      : `${safeName}, need help launching your first campaign? We're here for you.`
  );
}

// ─── Quiz Follow-Up: Email 1 — Deep Dive (Day 2) ───────────────────────────

export function quizFollowUp1Email(
  name: string,
  topBroker: {
    name: string;
    slug: string;
    rating?: number;
    asx_fee?: string;
    us_fee?: string;
    chess_sponsored?: boolean;
    pros?: string[];
    tagline?: string;
  },
  experience: string | null,
  investmentRange: string | null
): string {
  const safeName = escapeHtml(name || "there");
  const safeBrokerName = escapeHtml(topBroker.name);
  const safeTagline = topBroker.tagline ? escapeHtml(topBroker.tagline) : "";
  const ratingDisplay = topBroker.rating
    ? `${topBroker.rating}/5`
    : "";

  // Build "Why we matched you" section
  const matchReasons: string[] = [];
  if (experience) {
    matchReasons.push(`your <strong style="color:${BRAND_DARK};">${escapeHtml(experience)}</strong> experience level`);
  }
  if (investmentRange) {
    matchReasons.push(`a <strong style="color:${BRAND_DARK};">${escapeHtml(investmentRange)}</strong> investment range`);
  }
  const matchExplanation = matchReasons.length > 0
    ? `Based on ${matchReasons.join(" and ")}, ${safeBrokerName} stood out as the strongest fit for your investing goals.`
    : `Based on your quiz answers, ${safeBrokerName} stood out as the strongest fit for your investing goals.`;

  // Pros list (max 4)
  const prosItems = (topBroker.pros || []).slice(0, 4);
  const prosHtml = prosItems.length > 0
    ? prosItems
        .map(
          (p) => `
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;line-height:1.6;">
            <span style="color:${BRAND_EMERALD};font-weight:700;margin-right:8px;">&#10003;</span>
            ${escapeHtml(p)}
          </td>
        </tr>`
        )
        .join("")
    : "";

  // Experience-based tip
  let experienceTip = "";
  if (experience) {
    const lower = experience.toLowerCase();
    if (lower.includes("beginner")) {
      experienceTip = `As someone just starting out, look for a platform with strong educational resources and an intuitive interface. ${safeBrokerName} is known for making things simple for new investors.`;
    } else if (lower.includes("intermediate")) {
      experienceTip = `With some experience under your belt, you'll appreciate access to research tools and competitive fees. ${safeBrokerName} offers a solid balance of features and value.`;
    } else if (lower.includes("advanced") || lower.includes("pro")) {
      experienceTip = `As an experienced investor, you'll want advanced charting, deep market access, and professional-grade tools. ${safeBrokerName} delivers on the features that matter most.`;
    }
  }

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Your Quiz Match</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BRAND_DARK};">A Deeper Look at ${safeBrokerName}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
      Hi ${safeName}, a couple of days ago you took our platform quiz and matched with ${safeBrokerName}. Here's a closer look at why it's a great fit for you.
    </p>

    <!-- Why we matched you -->
    <div style="background:#eff6ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #2563eb;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">Why We Matched You</p>
      <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
        ${matchExplanation}
      </p>
    </div>

    <!-- Broker deep dive card -->
    <div style="border:2px solid ${BRAND_EMERALD};border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <div style="background:${BRAND_EMERALD};padding:14px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <span style="font-size:18px;font-weight:800;color:#ffffff;">${safeBrokerName}</span>
            </td>
            ${ratingDisplay ? `<td align="right"><span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);">${ratingDisplay}</span></td>` : ""}
          </tr>
        </table>
      </div>
      <div style="padding:20px;">
        ${safeTagline ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};font-style:italic;">${safeTagline}</p>` : ""}
        <!-- Fee summary -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
          <tr>
            <td style="text-align:center;padding:12px 8px;background:${BG_LIGHT};border-radius:8px 0 0 8px;">
              <p style="margin:0 0 2px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">ASX Fee</p>
              <p style="margin:0;font-size:18px;font-weight:800;color:${BRAND_DARK};">${escapeHtml(topBroker.asx_fee || "N/A")}</p>
            </td>
            <td style="text-align:center;padding:12px 8px;background:${BG_LIGHT};">
              <p style="margin:0 0 2px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">US Fee</p>
              <p style="margin:0;font-size:18px;font-weight:800;color:${BRAND_DARK};">${escapeHtml(topBroker.us_fee || "N/A")}</p>
            </td>
            <td style="text-align:center;padding:12px 8px;background:${BG_LIGHT};border-radius:0 8px 8px 0;">
              <p style="margin:0 0 2px;font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">CHESS</p>
              <p style="margin:0;font-size:18px;font-weight:800;color:${topBroker.chess_sponsored ? BRAND_EMERALD : "#dc2626"};">${topBroker.chess_sponsored ? "Yes" : "No"}</p>
            </td>
          </tr>
        </table>
        ${prosHtml ? `
        <!-- Key strengths -->
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${BRAND_DARK};text-transform:uppercase;letter-spacing:0.5px;">Key Strengths</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          ${prosHtml}
        </table>` : ""}
      </div>
    </div>

    ${experienceTip ? `
    <div style="background:${BG_LIGHT};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Personalised Tip</p>
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${experienceTip}</p>
    </div>` : ""}

    <div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/broker/${escapeHtml(topBroker.slug)}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              Read the Full ${safeBrokerName} Review &rarr;
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      This is part of your personalised platform quiz follow-up series from Invest.com.au.
    </p>`;

  return baseTemplate(
    content,
    `${safeName}, here's a deeper look at why ${safeBrokerName} is your top broker match.`
  );
}

// ─── Quiz Follow-Up: Email 2 — Comparison (Day 5) ──────────────────────────

export function quizFollowUp2Email(
  name: string,
  brokers: {
    name: string;
    slug: string;
    rating?: number;
    asx_fee?: string;
    us_fee?: string;
  }[],
  tradingInterest: string | null
): string {
  const safeName = escapeHtml(name || "there");

  // Build comparison table rows
  const comparisonRows = brokers
    .map(
      (b, i) => `
      <tr${i === 0 ? ` style="background:#f0fdf4;"` : ""}>
        <td style="padding:12px;border-bottom:1px solid #f1f5f9;">
          <span style="font-weight:700;color:${BRAND_DARK};font-size:14px;">${i === 0 ? `<span style="color:${BRAND_EMERALD};">&#9733;</span> ` : ""}${escapeHtml(b.name)}</span>
          ${i === 0 ? `<br><span style="font-size:11px;color:${BRAND_EMERALD};font-weight:600;">YOUR TOP MATCH</span>` : ""}
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:14px;color:${BRAND_DARK};font-weight:600;">
          ${b.rating ? `${b.rating}/5` : "&ndash;"}
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:14px;color:${BRAND_DARK};">
          ${escapeHtml(b.asx_fee || "N/A")}
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:14px;color:${BRAND_DARK};">
          ${escapeHtml(b.us_fee || "N/A")}
        </td>
        <td style="padding:12px;border-bottom:1px solid #f1f5f9;text-align:center;">
          <a href="${BASE_URL}/broker/${escapeHtml(b.slug)}" style="color:${BRAND_EMERALD};font-size:13px;font-weight:600;text-decoration:none;">View &rarr;</a>
        </td>
      </tr>`
    )
    .join("");

  // Trading interest-specific callout
  let interestCallout = "";
  if (tradingInterest) {
    const lower = tradingInterest.toLowerCase();
    if (lower.includes("crypto")) {
      interestCallout = `
      <div style="background:#fef3c7;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #f59e0b;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">For Crypto Investors</p>
        <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
          Did you know not all brokers offer crypto trading in Australia? When comparing, check for the number of supported coins, wallet transfer options, and whether staking rewards are available. Fees can vary dramatically between platforms.
        </p>
      </div>`;
    } else if (lower.includes("income") || lower.includes("dividend")) {
      interestCallout = `
      <div style="background:#eff6ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #2563eb;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;">For Dividend Investors</p>
        <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
          When building an income portfolio, look for CHESS sponsorship (so dividends are paid directly to you), low ongoing fees, and support for DRPs (Dividend Reinvestment Plans). SMSF compatibility is also worth considering for tax-effective income.
        </p>
      </div>`;
    } else if (lower.includes("active") || lower.includes("trad")) {
      interestCallout = `
      <div style="background:#faf5ff;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid #7c3aed;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">For Active Traders</p>
        <p style="margin:0;font-size:14px;color:#5b21b6;line-height:1.6;">
          Frequent traders should focus on per-trade fees (they add up fast), platform speed, charting tools, and conditional order types. Some brokers offer tiered pricing that rewards higher volumes with lower per-trade costs.
        </p>
      </div>`;
    } else if (lower.includes("growth") || lower.includes("long")) {
      interestCallout = `
      <div style="background:#ecfdf5;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid ${BRAND_EMERALD};">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">For Long-Term Growth</p>
        <p style="margin:0;font-size:14px;color:#065f46;line-height:1.6;">
          Buy-and-hold investors should prioritise low brokerage fees (since you trade less often), CHESS sponsorship for security, and access to international markets like the US for diversification. Avoid platforms with inactivity fees.
        </p>
      </div>`;
    }
  }

  const topBrokerName = brokers.length > 0 ? escapeHtml(brokers[0].name) : "your top match";

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Broker Comparison</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">How Does ${topBrokerName} Compare?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
      Hi ${safeName}, choosing the right broker is easier when you see them side by side. Here's how your top match stacks up against two other highly-rated options.
    </p>

    <!-- Comparison table -->
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid ${BORDER};border-radius:8px;">
        <thead>
          <tr style="background:${BG_LIGHT};">
            <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">Broker</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">Rating</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">ASX Fee</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};">US Fee</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.5px;border-bottom:2px solid ${BORDER};"></th>
          </tr>
        </thead>
        <tbody>
          ${comparisonRows}
        </tbody>
      </table>
    </div>

    ${interestCallout}

    <div style="background:${BG_LIGHT};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
        Want to see even more brokers? Our full comparison page lets you filter by fees, features, markets, and more &mdash; so you can find the perfect fit with confidence.
      </p>
    </div>

    <div style="text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${BASE_URL}/compare" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
              Compare All Platforms &rarr;
            </a>
          </td>
        </tr>
      </table>
      <p style="margin-top:12px;">
        <a href="${BASE_URL}/find-advisor" style="color:${BRAND_BLUE};font-weight:600;font-size:13px;text-decoration:underline;">Prefer professional help? Find an advisor →</a>
      </p>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      This is part of your personalised platform quiz follow-up series from Invest.com.au.
    </p>`;

  return baseTemplate(
    content,
    `${safeName}, see how ${topBrokerName} compares to Australia's other top brokers side by side.`
  );
}

// ─── Quiz Follow-Up: Email 3 — Action (Day 8) ──────────────────────────────

export function quizFollowUp3Email(
  name: string,
  topBroker: {
    name: string;
    slug: string;
    affiliate_url?: string;
    deal_text?: string;
  },
  hasActiveDeal: boolean
): string {
  const safeName = escapeHtml(name || "there");
  const safeBrokerName = escapeHtml(topBroker.name);

  // Primary CTA link: affiliate URL if available, otherwise review page
  const ctaUrl = topBroker.affiliate_url
    ? `${BASE_URL}/go/${escapeHtml(topBroker.slug)}`
    : `${BASE_URL}/broker/${escapeHtml(topBroker.slug)}`;
  const ctaText = topBroker.affiliate_url
    ? `Visit ${safeBrokerName} &rarr;`
    : `Read ${safeBrokerName} Review &rarr;`;

  // Deal card (shown prominently if broker has an active deal)
  const dealCard = hasActiveDeal && topBroker.deal_text
    ? `
    <div style="border:2px solid #f59e0b;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <div style="background:#fef3c7;padding:12px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <span style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Limited Offer</span>
            </td>
            <td align="right">
              <span style="font-size:12px;font-weight:600;color:#92400e;">${safeBrokerName}</span>
            </td>
          </tr>
        </table>
      </div>
      <div style="padding:20px;background:#fffbeb;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:800;color:${BRAND_DARK};line-height:1.4;">
          ${escapeHtml(topBroker.deal_text)}
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius:8px;background:#f59e0b;">
              <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
                Claim This Deal &rarr;
              </a>
            </td>
          </tr>
        </table>
      </div>
    </div>`
    : "";

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_EMERALD};text-transform:uppercase;letter-spacing:0.5px;">Your Next Step</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:${BRAND_DARK};">Ready to Start Investing, ${safeName}?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
      You took our platform quiz and ${safeBrokerName} came out on top. Now it's time to take the next step &mdash; opening an account usually takes less than 10 minutes.
    </p>

    ${dealCard}

    <!-- Steps to get started -->
    <div style="background:${BG_LIGHT};border-radius:8px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:${BRAND_DARK};">Getting started is simple:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;border-bottom:1px solid ${BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top">
                  <span style="display:inline-block;width:24px;height:24px;background:${BRAND_EMERALD};border-radius:6px;text-align:center;line-height:24px;font-size:13px;color:#ffffff;font-weight:700;">1</span>
                </td>
                <td style="padding-left:8px;">
                  <strong style="color:${BRAND_DARK};">Open an account online</strong>
                  <br><span style="font-size:13px;color:${TEXT_MUTED};">Most applications are approved within minutes</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;border-bottom:1px solid ${BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top">
                  <span style="display:inline-block;width:24px;height:24px;background:${BRAND_EMERALD};border-radius:6px;text-align:center;line-height:24px;font-size:13px;color:#ffffff;font-weight:700;">2</span>
                </td>
                <td style="padding-left:8px;">
                  <strong style="color:${BRAND_DARK};">Verify your identity</strong>
                  <br><span style="font-size:13px;color:${TEXT_MUTED};">Have your driver's licence or passport ready</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#475569;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top">
                  <span style="display:inline-block;width:24px;height:24px;background:${BRAND_EMERALD};border-radius:6px;text-align:center;line-height:24px;font-size:13px;color:#ffffff;font-weight:700;">3</span>
                </td>
                <td style="padding-left:8px;">
                  <strong style="color:${BRAND_DARK};">Fund your account and start investing</strong>
                  <br><span style="font-size:13px;color:${TEXT_MUTED};">Transfer funds via bank transfer, BPAY, or card</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Social proof -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 24px;">
        <p style="margin:0;font-size:14px;color:${BRAND_EMERALD};font-weight:600;">
          Thousands of Australians have used our quiz to find their perfect broker
        </p>
      </div>
    </div>

    <!-- Primary CTA -->
    <div style="text-align:center;margin-bottom:16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_EMERALD};">
            <a href="${ctaUrl}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>
    </div>

    <!-- Secondary CTA -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${BASE_URL}/broker/${escapeHtml(topBroker.slug)}" style="color:${BRAND_EMERALD};font-size:13px;font-weight:600;text-decoration:none;">Read the full ${safeBrokerName} review &rarr;</a>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};text-align:center;">
      This is the final email in your quiz follow-up series. We hope it helped!<br>
      Questions? Reply to this email or visit our <a href="${BASE_URL}/learn" style="color:${BRAND_EMERALD};text-decoration:underline;">learning hub</a>.
    </p>`;

  return baseTemplate(
    content,
    `${safeName}, your next step to start investing with ${safeBrokerName} is just a click away.`
  );
}

// ─── Notification Email Footer ───────────────────────────────────────────────

/**
 * Simple footer for transactional/notification emails sent from API routes.
 * Includes unsubscribe link, privacy link, and Spam Act 2003 compliance.
 * Use this in inline email HTML that doesn't use the full baseTemplate.
 */
export function notificationFooter(email?: string): string {
  const unsubUrl = email
    ? `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`
    : `${BASE_URL}/unsubscribe`;
  return `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.6;">
    <p style="margin:0;">Invest.com.au — Australia's independent investing comparison platform.</p>
    <p style="margin:4px 0 0;"><a href="${unsubUrl}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> · <a href="${BASE_URL}/privacy" style="color:#64748b;text-decoration:underline;">Privacy</a></p>
  </div>`;
}
