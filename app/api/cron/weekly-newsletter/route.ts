import { createAdminClient } from "@/lib/supabase/admin";
import { weeklyDigestEmail } from "@/lib/email-templates";
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "edge";
export const maxDuration = 120;

/**
 * Cron: Weekly newsletter — sent every Monday.
 *
 * Content:
 * 1. Fee changes from the past week (broker_data_changes)
 * 2. New articles published this week
 * 3. Active deals & expiring soon
 *
 * Uses weeklyDigestEmail() template from lib/email-templates.ts.
 * Stores each edition in newsletter_editions table for the web archive.
 * Recipients: email_captures where newsletter_opt_in = true & unsubscribed = false.
 * De-duplicates via newsletter_sends table.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const supabase = createAdminClient();

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

  // ── Build email HTML using shared template ──
  const templateFeeChanges = (feeChanges || []).map((c) => ({
    broker: brokerNameMap.get(c.broker_slug) || c.broker_slug,
    field: c.field_name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
    oldValue: c.old_value || "\u2013",
    newValue: c.new_value || "\u2013",
  }));

  const templateArticles = (newArticles || []).map((a) => ({
    title: a.title,
    slug: a.slug,
    category: a.category || undefined,
    readTime: a.read_time || undefined,
  }));

  const templateDeals = (deals || []).map((d) => ({
    broker: d.name,
    slug: d.slug,
    dealText: d.deal_text,
    expiry: d.deal_expiry
      ? new Date(d.deal_expiry).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
      : undefined,
  }));

  const emailHtml = weeklyDigestEmail({
    feeChanges: templateFeeChanges,
    newArticles: templateArticles,
    activeDeals: templateDeals,
  });

  // ── Store edition in newsletter_editions ──
  const subject = `📊 Weekly: ${(feeChanges || []).length} fee changes, ${(newArticles || []).length} new articles — ${dateStr}`;

  await supabase.from("newsletter_editions").upsert(
    {
      edition_date: editionDate,
      subject,
      html_content: emailHtml,
      fee_changes_count: (feeChanges || []).length,
      articles_count: (newArticles || []).length,
      deals_count: (deals || []).length,
    },
    { onConflict: "edition_date" }
  );

  // ── Fetch subscribers ──
  const { data: subscribers } = await supabase
    .from("email_captures")
    .select("email")
    .eq("newsletter_opt_in", true)
    .eq("unsubscribed", false)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No subscribers", editionDate });
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
        const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
        const personalizedHtml = emailHtml.replace("{{unsubscribe_url}}", unsubscribeUrl);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Invest.com.au <weekly@invest.com.au>",
            to: [email],
            subject,
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

  // Update subscribers_sent count on the edition
  if (sent > 0) {
    await supabase
      .from("newsletter_editions")
      .update({ subscribers_sent: sent + sentSet.size })
      .eq("edition_date", editionDate);
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
