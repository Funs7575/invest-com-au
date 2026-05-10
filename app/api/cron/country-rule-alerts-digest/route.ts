/**
 * Cron: country-rule-alerts weekly digest (W4.22, queue #15 part 4).
 *
 * Sends a once-a-week roundup of new + updated country regulatory
 * alerts to the newsletter-opted-in audience.
 *
 * Behaviour:
 *   - Queries `country_rule_alerts` for rows where active=true AND
 *     (created_at >= NOW - 7d OR updated_at >= NOW - 7d).
 *   - If zero alerts in window → skip the entire send. We don't send
 *     empty digests; that's spam.
 *   - Otherwise send to `email_captures` rows with
 *     newsletter_opt_in=true AND unsubscribed=false.
 *   - De-dup via `newsletter_sends` keyed on
 *     edition_date='<YYYY-MM-DD>-country-digest'.
 *
 * Why piggyback on `newsletter_opt_in` rather than a dedicated
 * country-digest opt-in column: this is part of the newsletter
 * ecosystem, sends only when there's substance, and respects the
 * existing unsubscribed flag. Adding a separate column for "yes I
 * want country alerts but no I don't want general news" felt like
 * over-segmentation for the size of the list — revisit when we
 * have >5k subscribers.
 *
 * Tier C: cron + email + service-role writes. Wired into
 * lib/cron-groups.ts under weekly-mon-9.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";
import { intentCountryMeta, type IntentCountryCode } from "@/lib/intent-context";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("cron:country-rule-alerts-digest");

export const runtime = "nodejs";
export const maxDuration = 300;

interface AlertRow {
  alert_key: string;
  country_code: string;
  severity: string;
  headline: string;
  body: string;
  source: string;
  cta_href: string | null;
  cta_label: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface SubscriberRow {
  email: string;
  name: string | null;
}

const SEVERITY_COLOUR: Record<string, string> = {
  urgent: "#dc2626",
  warning: "#d97706",
  info: "#0369a1",
};

const SEVERITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  warning: "Heads-up",
  info: "FYI",
};

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();

  const now = new Date();
  const weekAgoIso = new Date(now.getTime() - 7 * 86400_000).toISOString();
  const editionKey = `${now.toISOString().slice(0, 10)}-country-digest`;

  // 1. Find this week's alerts.
  const { data: alerts, error: alertsErr } = await supabase
    .from("country_rule_alerts")
    .select("alert_key, country_code, severity, headline, body, source, cta_href, cta_label, created_at, updated_at")
    .eq("active", true)
    .or(`created_at.gte.${weekAgoIso},updated_at.gte.${weekAgoIso}`)
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (alertsErr) {
    log.error("country_rule_alerts fetch failed", { error: alertsErr.message });
    return NextResponse.json({ error: "alerts_fetch_failed", detail: alertsErr.message }, { status: 500 });
  }

  if (!alerts || alerts.length === 0) {
    log.info("no new alerts this week — skipping digest");
    return NextResponse.json({ ok: true, skipped: "no_alerts_in_window" });
  }

  // 2. Fetch subscriber pool.
  const { data: subscribers, error: subsErr } = await supabase
    .from("email_captures")
    .select("email, name")
    .eq("newsletter_opt_in", true)
    .eq("unsubscribed", false);

  if (subsErr) {
    log.error("email_captures fetch failed", { error: subsErr.message });
    return NextResponse.json({ error: "subs_fetch_failed", detail: subsErr.message }, { status: 500 });
  }

  if (!subscribers || subscribers.length === 0) {
    log.info("no opted-in subscribers");
    return NextResponse.json({ ok: true, skipped: "no_subscribers", alerts: alerts.length });
  }

  // 3. Filter out anyone we've already sent this edition to.
  const { data: alreadySent } = await supabase
    .from("newsletter_sends")
    .select("email")
    .eq("edition_date", editionKey);

  const alreadySentSet = new Set((alreadySent ?? []).map((r) => r.email));
  const recipients = (subscribers as SubscriberRow[]).filter((s) => !alreadySentSet.has(s.email));

  if (recipients.length === 0) {
    log.info("all subscribers already received this edition");
    return NextResponse.json({ ok: true, skipped: "all_already_sent", alerts: alerts.length });
  }

  // 4. Render HTML once — recipients all get the same digest.
  const html = renderDigestHtml(alerts as AlertRow[], now);

  const stats = { sent: 0, failed: 0, deduped: alreadySentSet.size };

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient.email,
      subject: `🌏 This week in cross-border investing — ${alerts.length} update${alerts.length === 1 ? "" : "s"}`,
      html: personaliseHtml(html, recipient),
    });

    if (result.ok) {
      stats.sent += 1;
      await supabase.from("newsletter_sends").insert({
        edition_date: editionKey,
        email: recipient.email,
        sent_at: now.toISOString(),
      });
    } else {
      stats.failed += 1;
      log.warn("send failed", { email: recipient.email, error: result.error });
    }
  }

  log.info("digest sent", { ...stats, alerts: alerts.length });
  return NextResponse.json({ ok: true, ...stats, alerts: alerts.length, edition: editionKey });
}

function renderDigestHtml(alerts: AlertRow[], now: Date): string {
  const dateStr = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const alertsHtml = alerts.map((a) => {
    const meta = isKnownIntentCountry(a.country_code) ? intentCountryMeta(a.country_code) : null;
    const flag = meta?.flag ?? "🌏";
    const label = meta?.label ?? a.country_code.toUpperCase();
    const severityColour = SEVERITY_COLOUR[a.severity] ?? "#475569";
    const severityLabel = SEVERITY_LABEL[a.severity] ?? a.severity;
    const ctaBlock = a.cta_href && a.cta_label
      ? `<a href="https://invest.com.au${escapeHtml(a.cta_href)}" style="display: inline-block; margin-top: 8px; color: #15803d; font-size: 13px; font-weight: 600; text-decoration: none;">${escapeHtml(a.cta_label)} →</a>`
      : "";

    return `
      <div style="border-left: 3px solid ${severityColour}; background: #f8fafc; padding: 14px 16px; margin: 0 0 14px; border-radius: 4px;">
        <div style="font-size: 11px; font-weight: 700; color: ${severityColour}; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px;">
          ${flag} ${escapeHtml(label)} · ${severityLabel}
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">
          ${escapeHtml(a.headline)}
        </div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; margin: 0 0 4px;">
          ${escapeHtml(a.body)}
        </div>
        <div style="font-size: 11px; color: #64748b; font-style: italic; margin: 6px 0 0;">
          Source: ${escapeHtml(a.source)}
        </div>
        ${ctaBlock}
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 32px 24px;">
    <div style="text-align: center; margin: 0 0 24px;">
      <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
        Cross-border investing weekly
      </div>
      <h1 style="font-size: 22px; color: #0f172a; margin: 0;">{{GREETING}} — here's this week</h1>
      <div style="font-size: 13px; color: #64748b; margin: 8px 0 0;">${dateStr} · ${alerts.length} regulatory update${alerts.length === 1 ? "" : "s"}</div>
    </div>

    ${alertsHtml}

    <div style="text-align: center; margin: 32px 0 0; padding: 20px 0 0; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0 0 8px;">
        You're receiving this because you opted into the invest.com.au newsletter.
        <br>
        General information only — not financial advice.
      </p>
      <p style="font-size: 12px; margin: 0;">
        <a href="https://invest.com.au/account/email-preferences" style="color: #64748b;">Email preferences</a>
        &nbsp;·&nbsp;
        <a href="https://invest.com.au/unsubscribe" style="color: #64748b;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function personaliseHtml(html: string, recipient: SubscriberRow): string {
  const greeting = recipient.name ? `Hi ${escapeHtml(recipient.name)}` : "Hi there";
  return html.replace("{{GREETING}}", greeting);
}

const KNOWN_INTENT_CODES = new Set<IntentCountryCode>([
  "uk", "us", "cn", "in", "jp", "sg", "hk", "kr", "my", "nz", "ae", "sa",
]);

function isKnownIntentCountry(code: string): code is IntentCountryCode {
  return KNOWN_INTENT_CODES.has(code as IntentCountryCode);
}
