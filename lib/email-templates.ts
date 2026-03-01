/**
 * Shared HTML email template system for Invest.com.au.
 *
 * All templates use inline CSS for maximum email client compatibility.
 * Brand color: green #16a34a, text: dark slate #0f172a.
 * Max-width 600px, mobile-friendly.
 */

const BRAND_GREEN = "#16a34a";
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
            <td style="background:${BRAND_GREEN};padding:20px 24px;border-radius:12px 12px 0 0;">
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
            <span style="color:${BRAND_GREEN};font-weight:700;margin-right:8px;">1.</span>
            Compare broker fees side-by-side
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_GREEN};font-weight:700;margin-right:8px;">2.</span>
            Set up fee change alerts to stay informed
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_GREEN};font-weight:700;margin-right:8px;">3.</span>
            Take the broker quiz to find your best match
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#475569;">
            <span style="color:${BRAND_GREEN};font-weight:700;margin-right:8px;">4.</span>
            Save brokers to your shortlist for easy comparison
          </td>
        </tr>
      </table>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_GREEN};">
          <a href="${BASE_URL}/compare" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
            Compare Brokers Now
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_LIGHT};">
      Questions? Reply to this email or visit our <a href="${BASE_URL}/learn" style="color:${BRAND_GREEN};text-decoration:underline;">learning hub</a>.
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
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:${BRAND_GREEN};font-weight:600;font-size:14px;">${escapeHtml(c.newFee)}</td>
    </tr>`
    )
    .join("");

  const content = `
    <div style="display:inline-block;padding:4px 12px;background:#dcfce7;border-radius:100px;margin-bottom:16px;">
      <span style="font-size:12px;font-weight:700;color:${BRAND_GREEN};text-transform:uppercase;letter-spacing:0.5px;">Fee Alert</span>
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
        <td style="border-radius:8px;background:${BRAND_GREEN};">
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
      <span style="font-size:12px;font-weight:700;color:${BRAND_GREEN};text-transform:uppercase;letter-spacing:0.5px;">Approved</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND_DARK};">Campaign Approved</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
      Great news! Your campaign <strong style="color:${BRAND_DARK};">"${escapeHtml(campaignName)}"</strong> for <strong style="color:${BRAND_DARK};">${escapeHtml(brokerName)}</strong> has been reviewed and approved.
    </p>
    <div style="background:${BG_LIGHT};border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid ${BRAND_GREEN};">
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
        Your campaign will go live on its scheduled start date. Make sure your wallet has sufficient balance to cover the campaign costs.
      </p>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_GREEN};">
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
      You can edit the campaign and resubmit it for review. If you have questions, contact our partnerships team at <a href="mailto:partners@invest.com.au" style="color:${BRAND_GREEN};text-decoration:underline;">partners@invest.com.au</a>.
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
        <td style="border-radius:8px;background:${BRAND_GREEN};">
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
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:${BRAND_GREEN};font-weight:600;font-size:13px;">${escapeHtml(c.newValue)}</td>
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
    <h2 style="font-size:15px;color:${BRAND_DARK};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${BRAND_GREEN};">Fee Changes</h2>
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
    <h2 style="font-size:15px;color:${BRAND_DARK};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${BRAND_GREEN};">New This Week</h2>
    <ul style="margin:0 0 24px;padding-left:20px;line-height:1.8;">${articlesHtml}</ul>

    <!-- Deals -->
    <h2 style="font-size:15px;color:${BRAND_DARK};margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${BRAND_GREEN};">Active Deals</h2>
    <div style="overflow-x:auto;margin-bottom:24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <tbody>${dealsHtml}</tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-top:8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="border-radius:8px;background:${BRAND_GREEN};">
            <a href="${BASE_URL}/compare" style="display:inline-block;padding:12px 32px;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">
              Compare All Brokers
            </a>
          </td>
        </tr>
      </table>
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
        ${statCell(data.conversions.toLocaleString(), "Conversions", data.conversions > 0 ? BRAND_GREEN : BRAND_DARK)}
        ${statCell(`$${data.spend.toFixed(2)}`, "Spend", "#dc2626")}
      </tr>
    </table>

    ${data.conversions > 0 ? `<p style="margin:0 0 20px;font-size:14px;color:${BRAND_GREEN};font-weight:600;">${data.conversions} conversion${data.conversions === 1 ? "" : "s"} tracked yesterday!</p>` : ""}

    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:8px;background:${BRAND_GREEN};">
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
