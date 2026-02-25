import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 120;

/**
 * Cron: Weekly newsletter — sent every Monday.
 *
 * Content:
 * 1. Fee changes from the past week (broker_data_changes)
 * 2. New articles published this week
 * 3. Active deals & expiring soon
 * 4. One featured broker (rotating)
 *
 * Recipients: email_captures where newsletter_opt_in = true & unsubscribed = false
 * De-duplicates via newsletter_sends table.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";
  const now = new Date();
  const editionDate = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const dateStr = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  // ── 1. Fetch fee changes from last 7 days ──
  const { data: feeChanges } = await supabase
    .from("broker_data_changes")
    .select("broker_slug, field_name, old_value, new_value, changed_at")
    .gte("changed_at", weekAgo)
    .order("changed_at", { ascending: false })
    .limit(10);

  // Get broker names for changes
  const changeSlugs = [...new Set((feeChanges || []).map((c) => c.broker_slug))];
  const { data: changeBrokers } = changeSlugs.length > 0
    ? await supabase.from("brokers").select("slug, name").in("slug", changeSlugs)
    : { data: [] };
  const brokerNameMap = new Map((changeBrokers || []).map((b) => [b.slug, b.name]));

  // ── 2. Fetch new articles from last 7 days ──
  const { data: newArticles } = await supabase
    .from("articles")
    .select("title, slug, category, read_time")
    .gte("published_at", weekAgo)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);

  // ── 3. Fetch active deals ──
  const { data: deals } = await supabase
    .from("brokers")
    .select("name, slug, deal_text, deal_expiry")
    .eq("status", "active")
    .eq("deal", true)
    .not("deal_text", "is", null)
    .order("rating", { ascending: false })
    .limit(5);

  // ── 4. Featured broker (highest rated with a deal) ──
  const featured = deals && deals.length > 0 ? deals[0] : null;

  // ── Build email HTML ──
  const feeChangesHtml = (feeChanges && feeChanges.length > 0)
    ? feeChanges.map((c) => {
        const name = brokerNameMap.get(c.broker_slug) || c.broker_slug;
        const field = c.field_name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
        return `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #1e293b; font-size: 13px;">${name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">${field}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #dc2626; font-size: 13px; text-decoration: line-through;">${c.old_value || "–"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #16a34a; font-weight: 600; font-size: 13px;">${c.new_value || "–"}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">No fee changes this week — all brokers held steady.</td></tr>`;

  const articlesHtml = (newArticles && newArticles.length > 0)
    ? newArticles.map((a) => {
        const cat = a.category || "Guide";
        const time = a.read_time ? `${a.read_time} min read` : "";
        return `<li style="margin-bottom: 8px;">
          <a href="${baseUrl}/article/${a.slug}" style="color: #0f172a; text-decoration: none; font-weight: 600; font-size: 14px;">${a.title}</a>
          <span style="color: #94a3b8; font-size: 12px; margin-left: 6px;">${cat}${time ? ` · ${time}` : ""}</span>
        </li>`;
      }).join("")
    : `<li style="color: #94a3b8; font-size: 13px;">No new articles this week. Check back soon!</li>`;

  const dealsHtml = (deals && deals.length > 0)
    ? deals.map((d) => {
        const expiry = d.deal_expiry
          ? new Date(d.deal_expiry).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
          : null;
        return `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
            <a href="${baseUrl}/broker/${d.slug}" style="font-weight: 600; color: #0f172a; text-decoration: none; font-size: 13px;">${d.name}</a>
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #92400e; font-size: 13px;">🔥 ${d.deal_text}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">${expiry ? `Exp ${expiry}` : "Ongoing"}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">No active deals right now.</td></tr>`;

  const featuredHtml = featured
    ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; font-weight: 700;">🌟 Featured This Week</p>
        <p style="margin: 0 0 8px; font-size: 16px; font-weight: 800; color: #0f172a;">${featured.name}</p>
        <p style="margin: 0 0 12px; font-size: 13px; color: #78350f;">${featured.deal_text}</p>
        <a href="${baseUrl}/broker/${featured.slug}" style="display: inline-block; padding: 8px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">Read Review →</a>
      </div>`
    : "";

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invest.com.au Weekly</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <!-- Header -->
    <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <span style="color: #f59e0b; font-weight: 800; font-size: 16px;">Invest.com.au</span>
      <span style="color: #94a3b8; font-size: 13px;"> · Weekly</span>
      <p style="color: #cbd5e1; font-size: 12px; margin: 4px 0 0;">Week of ${dateStr}</p>
    </div>

    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Here's what changed in the Australian brokerage world this week.
      </p>

      ${featuredHtml}

      <!-- Fee Changes -->
      <h2 style="font-size: 15px; color: #0f172a; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">💰 Fee Changes</h2>
      <div style="overflow-x: auto; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Broker</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Field</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Was</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Now</th>
            </tr>
          </thead>
          <tbody>${feeChangesHtml}</tbody>
        </table>
      </div>

      <!-- New Articles -->
      <h2 style="font-size: 15px; color: #0f172a; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">📚 New This Week</h2>
      <ul style="margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">${articlesHtml}</ul>

      <!-- Deals -->
      <h2 style="font-size: 15px; color: #0f172a; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #f59e0b;">🔥 Active Deals</h2>
      <div style="overflow-x: auto; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${dealsHtml}</tbody>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-top: 16px;">
        <a href="${baseUrl}/compare" style="display: inline-block; padding: 12px 32px; background-color: #f59e0b; color: #1e293b; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Compare All Brokers →</a>
      </div>

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.6; margin: 0;">
          You're receiving this because you signed up at <a href="${baseUrl}" style="color: #94a3b8;">invest.com.au</a>.<br>
          Invest.com.au is an independent comparison site. We may earn commissions from partner links.<br>
          <a href="${baseUrl}/unsubscribe?email={{email}}" style="color: #94a3b8;">Unsubscribe</a> · <a href="${baseUrl}/compare" style="color: #94a3b8;">Compare Brokers</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  // ── Fetch subscribers ──
  const { data: subscribers } = await supabase
    .from("email_captures")
    .select("email")
    .eq("newsletter_opt_in", true)
    .eq("unsubscribed", false)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscribers" });
  }

  // De-duplicate emails
  const uniqueEmails = [...new Set(subscribers.map((s) => s.email.toLowerCase()))];

  // Check which emails already got this edition
  const { data: alreadySent } = await supabase
    .from("newsletter_sends")
    .select("email")
    .eq("edition_date", editionDate);

  const sentSet = new Set((alreadySent || []).map((s) => s.email.toLowerCase()));
  const toSend = uniqueEmails.filter((e) => !sentSet.has(e));

  if (toSend.length === 0) {
    return NextResponse.json({ sent: 0, message: "All subscribers already received this edition" });
  }

  // ── Send emails in batches ──
  let sent = 0;
  let errors = 0;
  const batchSize = 10;

  for (let i = 0; i < toSend.length; i += batchSize) {
    const batch = toSend.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (email) => {
        const personalizedHtml = emailHtml.replace("{{email}}", encodeURIComponent(email));

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Invest.com.au <weekly@invest.com.au>",
            to: [email],
            subject: `📊 Weekly: ${(feeChanges || []).length} fee changes, ${(newArticles || []).length} new articles — ${dateStr}`,
            html: personalizedHtml,
          }),
        });

        if (!res.ok) {
          throw new Error(`Resend ${res.status}`);
        }

        // Record send
        await supabase.from("newsletter_sends").insert({
          email,
          edition_date: editionDate,
        });

        // Update last newsletter timestamp
        await supabase
          .from("email_captures")
          .update({ last_newsletter_at: now.toISOString() })
          .eq("email", email);

        return email;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else errors++;
    }

    // Brief pause between batches to avoid rate limits
    if (i + batchSize < toSend.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return NextResponse.json({
    sent,
    errors,
    totalSubscribers: uniqueEmails.length,
    skippedAlreadySent: sentSet.size,
    feeChanges: (feeChanges || []).length,
    newArticles: (newArticles || []).length,
    activeDeals: (deals || []).length,
    editionDate,
  });
}
