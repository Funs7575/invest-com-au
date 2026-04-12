import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { feeDigestEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

const log = logger("cron-fee-digest");

export const maxDuration = 60;

/**
 * Cron: Weekly fee digest — sent every Monday at 9am.
 *
 * Collects broker_data_changes from the past 7 days and sends a
 * digest email to fee_alert_subscriptions where frequency='weekly'.
 * Respects each subscriber's broker_slugs and alert_type preferences.
 * Uses newsletter_sends table to avoid duplicate sends.
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

  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";
  const now = new Date();
  const editionKey = `fee-digest-${now.toISOString().slice(0, 10)}`;
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const weekLabel = new Date(now.getTime() - 7 * 86400000).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
  }) + " \u2013 " + now.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── 1. Fetch fee changes from last 7 days ──
  const { data: feeChanges, error: changesError } = await supabase
    .from("broker_data_changes")
    .select("broker_slug, field_name, old_value, new_value, changed_at")
    .in("field_name", ["asx_fee", "asx_fee_value", "us_fee", "us_fee_value", "fx_rate", "inactivity_fee", "fee_page"])
    .gte("changed_at", weekAgo)
    .order("changed_at", { ascending: false })
    .limit(50);

  if (changesError) {
    log.error("Error fetching fee changes", { error: changesError.message });
    return NextResponse.json({ error: changesError.message }, { status: 500 });
  }

  // Get broker names for all changed slugs
  const changedSlugs = [...new Set((feeChanges || []).map((c) => c.broker_slug))];
  const { data: brokers } = changedSlugs.length > 0
    ? await supabase.from("brokers").select("slug, name").in("slug", changedSlugs)
    : { data: [] };
  const brokerNameMap = new Map((brokers || []).map((b) => [b.slug, b.name]));

  // ── 2. Fetch weekly digest subscribers ──
  const { data: subscribers, error: subError } = await supabase
    .from("fee_alert_subscriptions")
    .select("email, broker_slugs, alert_type, unsubscribe_token")
    .eq("verified", true)
    .eq("frequency", "weekly");

  if (subError) {
    log.error("Error fetching fee digest subscribers", { error: subError.message });
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({
      sent: 0,
      changes: feeChanges?.length || 0,
      message: "No weekly subscribers found",
    });
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const sub of subscribers) {
    // ── 3. Check for duplicate send ──
    const { data: alreadySent } = await supabase
      .from("newsletter_sends")
      .select("id")
      .eq("email", sub.email)
      .eq("edition_date", editionKey)
      .maybeSingle();

    if (alreadySent) {
      skippedCount++;
      continue;
    }

    // ── 4. Filter changes by subscriber preferences ──
    let relevantChanges = feeChanges || [];

    // Filter by broker_slugs if subscriber has specific brokers
    if (sub.broker_slugs && sub.broker_slugs.length > 0) {
      relevantChanges = relevantChanges.filter((c) =>
        sub.broker_slugs.includes(c.broker_slug)
      );
    }

    // Filter by alert_type preference
    if (sub.alert_type === "increase") {
      relevantChanges = relevantChanges.filter((c) => {
        const oldNum = parseFloat(c.old_value);
        const newNum = parseFloat(c.new_value);
        return isNaN(oldNum) || isNaN(newNum) || newNum > oldNum;
      });
    } else if (sub.alert_type === "decrease") {
      relevantChanges = relevantChanges.filter((c) => {
        const oldNum = parseFloat(c.old_value);
        const newNum = parseFloat(c.new_value);
        return isNaN(oldNum) || isNaN(newNum) || newNum < oldNum;
      });
    }

    // Build template data
    const templateChanges = relevantChanges.map((c) => ({
      broker: brokerNameMap.get(c.broker_slug) || c.broker_slug,
      slug: c.broker_slug,
      field: c.field_name,
      oldValue: c.old_value || "N/A",
      newValue: c.new_value || "N/A",
      changedAt: c.changed_at,
    }));

    // Generate email HTML
    const html = feeDigestEmail(templateChanges, weekLabel)
      .replace(
        /\{\{unsubscribe_url\}\}/g,
        `${baseUrl}/fee-alerts?unsubscribe=${sub.unsubscribe_token || ""}`
      );

    const changeCount = templateChanges.length;
    const subject = changeCount > 0
      ? `Weekly Fee Digest: ${changeCount} change${changeCount === 1 ? "" : "s"} detected`
      : "Weekly Fee Digest: No changes this week";

    // ── 5. Send the email ──
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au <alerts@invest.com.au>",
          to: sub.email,
          subject,
          html,
        }),
      });

      if (res.ok) {
        // ── 6. Record send to avoid duplicates ──
        await supabase.from("newsletter_sends").insert({
          email: sub.email,
          edition_date: editionKey,
        });
        sentCount++;
      } else {
        const errText = await res.text().catch(() => "unknown");
        log.error("Resend error sending fee digest", { email: sub.email, errText });
      }
    } catch (err) {
      log.error("Failed to send fee digest", { email: sub.email, err: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    sent: sentCount,
    skipped: skippedCount,
    totalSubscribers: subscribers.length,
    totalChanges: feeChanges?.length || 0,
    editionKey,
    timestamp: now.toISOString(),
  });
}
