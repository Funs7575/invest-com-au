import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { checkAutopilotGate } from "@/lib/autopilot";
import { withCronRunLog } from "@/lib/cron-run-log";
import { premiumDigestEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:premium-digest");

/**
 * Cron: Pro research digest — weekly, Mondays (weekly-mon-8 group).
 *
 * The consumer counterpart to /api/cron/pro-digest (which is B2B advisor
 * brief outreach): sends ACTIVE Pro subscribers a summary of the
 * pro_research_reports published in the last 7 days. Summaries + links
 * only — the report body stays behind the server-side paywall on
 * /pro/research/[slug] (lib/server/premium-content.ts).
 *
 * Recipients: subscriptions.status in (active, trialing) → profiles.email,
 * minus anyone who set investor_profiles.meta.research_digest = false
 * (digest is part of the paid membership, so default is ON; the
 * /api/account/digest-prefs PUT exposes the opt-out).
 *
 * Idempotency: newsletter_sends with edition_date "premium-YYYY-MM-DD" —
 * the prefix namespaces these rows away from the free weekly newsletter,
 * which keys the same table with a bare date.
 *
 * Skips entirely (sent: 0) on weeks with no new research — no filler email.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;
  const gated = await checkAutopilotGate("premium-digest");
  if (gated) return gated;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  return withCronRunLog<NextResponse>("premium-digest", async () => {
    const supabase = createAdminClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";
    const now = new Date();
    const editionKey = `premium-${now.toISOString().slice(0, 10)}`;
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const dateStr = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

    // ── 1. New research this week ──
    const { data: reports, error: reportsError } = await supabase
      .from("pro_research_reports")
      .select("slug, title, kicker, summary, reading_time_minutes")
      .gte("published_at", weekAgo)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(6);

    if (reportsError) {
      log.error("reports fetch failed", { error: reportsError.message });
      return {
        response: NextResponse.json({ ok: false, error: "reports_fetch_failed" }, { status: 500 }),
        stats: { sent: 0 },
      };
    }

    if (!reports || reports.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No new research this week", editionKey }),
        stats: { sent: 0, reports: 0 },
      };
    }

    // ── 2. Active Pro subscribers → emails ──
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("user_id")
      .in("status", ["active", "trialing"])
      .limit(1000);

    const userIds = [...new Set((subs || []).map((s) => s.user_id as string).filter(Boolean))];
    if (userIds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No active Pro subscribers", editionKey }),
        stats: { sent: 0, reports: reports.length },
      };
    }

    const [{ data: profiles }, { data: investorProfiles }] = await Promise.all([
      supabase.from("profiles").select("id, email").in("id", userIds),
      supabase.from("investor_profiles").select("auth_user_id, meta").in("auth_user_id", userIds),
    ]);

    // Opt-out check: research_digest is ON unless explicitly set to false.
    const optedOut = new Set(
      (investorProfiles || [])
        .filter((p) => (p.meta as Record<string, unknown> | null)?.research_digest === false)
        .map((p) => p.auth_user_id as string)
    );

    const emails = [
      ...new Set(
        (profiles || [])
          .filter((p) => p.email && !optedOut.has(p.id as string))
          .map((p) => (p.email as string).toLowerCase())
      ),
    ];

    if (emails.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No eligible recipients", editionKey }),
        stats: { sent: 0, reports: reports.length, optedOut: optedOut.size },
      };
    }

    // ── 3. Dedup against this edition ──
    const { data: alreadySent } = await supabase
      .from("newsletter_sends")
      .select("email")
      .eq("edition_date", editionKey);

    const sentSet = new Set((alreadySent || []).map((s) => (s.email as string).toLowerCase()));
    const toSend = emails.filter((e) => !sentSet.has(e));

    if (toSend.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "All Pro members already received this edition", editionKey }),
        stats: { sent: 0, skipped: sentSet.size, reports: reports.length },
      };
    }

    // ── 4. Build + send ──
    const emailHtml = premiumDigestEmail({
      reports: reports.map((r) => ({
        title: r.title as string,
        slug: r.slug as string,
        kicker: (r.kicker as string) || undefined,
        summary: (r.summary as string) || undefined,
        readingTimeMinutes: (r.reading_time_minutes as number) || undefined,
      })),
      dateStr,
    });
    const subject =
      reports.length === 1
        ? `Pro research: ${reports[0]?.title ?? "new report this week"}`
        : `Pro research: ${reports.length} new reports this week`;

    let sent = 0;
    let errors = 0;
    const batchSize = 10;

    for (let i = 0; i < toSend.length; i += batchSize) {
      const batch = toSend.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (email) => {
          const unsubscribeUrl = `${baseUrl}/account`;
          const personalizedHtml = emailHtml.replace("{{unsubscribe_url}}", unsubscribeUrl);

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Invest.com.au Pro <pro@invest.com.au>",
              to: [email],
              subject,
              html: personalizedHtml,
            }),
          });
          if (!res.ok) throw new Error(`Resend ${res.status}`);

          await supabase.from("newsletter_sends").insert({ email, edition_date: editionKey });
          return email;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else errors++;
      }

      if (i + batchSize < toSend.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (errors > 0) log.warn("premium digest partial failures", { sent, errors });

    return {
      response: NextResponse.json({
        sent,
        errors,
        eligible: emails.length,
        skippedAlreadySent: sentSet.size,
        reports: reports.length,
        editionKey,
      }),
      stats: { sent, errors, reports: reports.length },
    };
  });
}
