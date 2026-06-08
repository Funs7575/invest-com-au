/**
 * Cron: Personalised Morning Brief — daily at 21:00 UTC (8am AEDT).
 *
 * For each user with morning_brief preference enabled:
 *   1. Rate alerts: products in user_rate_memory where a rate change was
 *      detected (notified_rate_bps IS NOT NULL).
 *   2. Advisor posts: new posts from advisors the user follows (past 24h).
 *   3. Profile-matched article: one article matching investor_profiles
 *      primary_vertical from the past 7 days.
 *   4. Market fact: the most recent rate_change_log entry as a one-liner.
 *
 * Deduplication: morning_brief_sends (user_id, send_date) UNIQUE constraint.
 * Sends are batched in groups of 5 with a 200ms pause between batches.
 * Capped at 100 users per invocation (run again if more remain).
 *
 * Compliance: factual comparison and rate data only — no personal advice.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { logger } from "@/lib/logger";
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("personalized-morning-brief");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BriefSection {
  html: string;
  key: string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("personalized-morning-brief", async () => {
    const supabase = createAdminClient();
    const today = new Date();
    const sendDate = today.toISOString().slice(0, 10);
    const dateStr = today.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const dayAgo = new Date(today.getTime() - 86400000).toISOString();
    const weekAgo = new Date(today.getTime() - 7 * 86400000).toISOString();

    // ── 1. Opted-in users ─────────────────────────────────────────────────────

    const { data: prefUsers, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("morning_brief", true);

    if (prefError) {
      log.error("Failed to fetch morning_brief prefs", { error: prefError.message });
      return {
        response: NextResponse.json({ error: prefError.message }, { status: 500 }),
        stats: { sent: 0, errors: 1 },
      };
    }

    if (!prefUsers || prefUsers.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No opted-in users" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    const allUserIds = prefUsers.map((u) => u.user_id as string);

    // ── 2. Dedup: skip users already sent today ───────────────────────────────

    const { data: alreadySent } = await supabase
      .from("morning_brief_sends")
      .select("user_id")
      .eq("send_date", sendDate);

    const sentSet = new Set((alreadySent ?? []).map((s) => s.user_id as string));
    const pendingIds = allUserIds.filter((id) => !sentSet.has(id)).slice(0, 100);

    if (pendingIds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "All users already briefed today" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    // ── 3. Fetch auth emails ──────────────────────────────────────────────────

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    // ── 4. Shared global data ─────────────────────────────────────────────────

    // Latest rate_change_log entry for the "market fact" section
    const { data: rateChanges } = await supabase
      .from("rate_change_log")
      .select("product_kind, broker_slug, old_rate_bps, new_rate_bps, changed_at")
      .order("changed_at", { ascending: false })
      .limit(3);

    // ── 5. Per-user data + send ───────────────────────────────────────────────

    let sent = 0;
    let errors = 0;
    const BATCH = 5;

    for (let i = 0; i < pendingIds.length; i += BATCH) {
      const batch = pendingIds.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async (userId) => {
          const email = emailMap.get(userId);
          if (!email) return;

          // Investor profile for this user
          const { data: profile } = await supabase
            .from("investor_profiles")
            .select("primary_vertical, experience_level")
            .eq("auth_user_id", userId)
            .maybeSingle();

          const vertical = profile?.primary_vertical ?? null;

          // Build sections in parallel
          const [rateSectionResult, advisorSectionResult, articleSectionResult] =
            await Promise.allSettled([
              buildRateSection(supabase, userId),
              buildAdvisorSection(supabase, userId, dayAgo),
              buildArticleSection(supabase, vertical, weekAgo),
            ]);

          const rateSection =
            rateSectionResult.status === "fulfilled" ? rateSectionResult.value : null;
          const advisorSection =
            advisorSectionResult.status === "fulfilled"
              ? advisorSectionResult.value
              : null;
          const articleSection =
            articleSectionResult.status === "fulfilled"
              ? articleSectionResult.value
              : null;
          const marketSection = buildMarketSection(rateChanges ?? []);

          const activeSections = [
            rateSection,
            advisorSection,
            articleSection,
            marketSection,
          ].filter(Boolean) as BriefSection[];

          // Skip if nothing to send (all sections empty)
          if (activeSections.length === 0) return;

          const sectionsHtml = activeSections.map((s) => s.html).join("\n");
          const sectionKeys = activeSections.map((s) => s.key);

          const html = buildEmailHtml({ email, dateStr, sectionsHtml });

          const result = await sendEmail({
            to: email,
            subject: `Your morning brief — ${dateStr}`,
            html,
            from: "Invest.com.au <brief@invest.com.au>",
          });

          if (!result.ok) throw new Error(result.error ?? "send failed");

          await supabase.from("morning_brief_sends").insert({
            user_id: userId,
            send_date: sendDate,
            sections_included: sectionKeys,
          });
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") sent++;
        else {
          errors++;
          log.warn("Morning brief send failed", {
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          });
        }
      }

      if (i + BATCH < pendingIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    log.info("Morning brief complete", {
      sent,
      errors,
      total: pendingIds.length,
      skipped: sentSet.size,
    });

    return {
      response: NextResponse.json({
        sent,
        errors,
        total_eligible: pendingIds.length,
        skipped_already_sent: sentSet.size,
        send_date: sendDate,
      }),
      stats: { sent, errors },
    };
  });
}

// ─── Section builders ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildRateSection(supabase: any, userId: string): Promise<BriefSection | null> {
  const { data: rateRows } = await supabase
    .from("user_rate_memory")
    .select("product_kind, last_seen_rate_bps, notified_rate_bps, brokers(name, slug)")
    .eq("user_id", userId)
    .not("notified_rate_bps", "is", null)
    .limit(3);

  if (!rateRows || rateRows.length === 0) return null;

  const items = rateRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => {
      const brokerName = escapeHtml(r.brokers?.name ?? "A broker");
      const brokerSlug = r.brokers?.slug ?? "";
      const productLabel =
        r.product_kind === "td" ? "term deposit" : "savings rate";
      const currentPct = (r.last_seen_rate_bps / 100).toFixed(2);
      const href = `${BASE_URL}/${r.product_kind === "td" ? "term-deposits" : "savings"}/${brokerSlug}`;
      return `<li style="margin-bottom:8px;font-size:14px;color:#334155">
        <a href="${href}" style="color:#059669;font-weight:600;text-decoration:none">${brokerName}</a>
        — ${productLabel} now at <strong>${currentPct}%</strong>
      </li>`;
    })
    .join("");

  return {
    key: "rate_changes",
    html: `<div style="margin-bottom:24px">
      <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 10px">📊 Rate updates on your watchlist</h2>
      <ul style="padding-left:20px;margin:0">${items}</ul>
      <a href="${BASE_URL}/account/decisions" style="font-size:13px;color:#64748b;text-decoration:none">View decision inbox →</a>
    </div>`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildAdvisorSection(supabase: any, userId: string, since: string): Promise<BriefSection | null> {
  // Get followed advisors
  const { data: follows } = await supabase
    .from("advisor_follows")
    .select("professional_id")
    .eq("follower_user_id", userId);

  if (!follows || follows.length === 0) return null;

  const followedIds = follows.map((f: { professional_id: number }) => f.professional_id);

  const { data: posts } = await supabase
    .from("advisor_posts")
    .select("id, title, body, published_at, professional_id, professionals(slug, display_name)")
    .in("professional_id", followedIds)
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(3);

  if (!posts || posts.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = posts.map((p: any) => {
    const name = escapeHtml(p.professionals?.display_name ?? "An advisor");
    const slug = p.professionals?.slug ?? "";
    const title = escapeHtml(p.title ?? p.body?.slice(0, 80) ?? "New post");
    return `<li style="margin-bottom:10px;font-size:14px;color:#334155">
      <a href="${BASE_URL}/advisor/${slug}" style="color:#0f172a;font-weight:600;text-decoration:none">${name}</a>
      <span style="color:#64748b"> shared: </span>
      <span>${title}</span>
    </li>`;
  }).join("");

  return {
    key: "advisor_posts",
    html: `<div style="margin-bottom:24px">
      <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 10px">💬 From advisors you follow</h2>
      <ul style="padding-left:20px;margin:0">${items}</ul>
    </div>`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildArticleSection(supabase: any, vertical: string | null, since: string): Promise<BriefSection | null> {
  const VERTICAL_KEYWORDS: Record<string, string[]> = {
    shares: ["asx", "shares", "etf", "stocks"],
    crypto: ["crypto", "bitcoin", "blockchain"],
    property: ["property", "real estate", "reit"],
    super: ["super", "smsf", "retirement"],
    smsf: ["smsf", "super", "self-managed"],
  };

  const keywords = vertical ? (VERTICAL_KEYWORDS[vertical] ?? []) : [];

  // Build a category filter — use `ilike` for title matching
  const query = supabase
    .from("articles")
    .select("title, slug, category, read_time")
    .eq("status", "published")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(10);

  const { data: articles } = await query;
  if (!articles || articles.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matched = articles.find((a: any) => {
    const text = `${a.title ?? ""} ${a.category ?? ""}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) ?? (articles[0] as any);

  if (!matched) return null;

  const title = escapeHtml(matched.title ?? "New article");
  const readTime = matched.read_time ? ` · ${matched.read_time} min read` : "";
  const href = `${BASE_URL}/learn/${matched.slug}`;

  return {
    key: "article",
    html: `<div style="margin-bottom:24px">
      <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 10px">📖 Worth reading</h2>
      <p style="font-size:14px;color:#334155;margin:0">
        <a href="${href}" style="color:#059669;font-weight:600;text-decoration:none">${title}</a>
        <span style="color:#94a3b8">${readTime}</span>
      </p>
    </div>`,
  };
}

interface RateChangeRow {
  product_kind: string | null;
  broker_slug: string | null;
  old_rate_bps: number | null;
  new_rate_bps: number | null;
  changed_at: string | null;
}

function buildMarketSection(changes: RateChangeRow[]): BriefSection | null {
  if (changes.length === 0) return null;

  const latest = changes[0];
  if (!latest) return null;

  const product = latest.product_kind === "td" ? "term deposit" : "savings";
  const broker = escapeHtml(latest.broker_slug ?? "a provider");
  const newPct = latest.new_rate_bps ? (latest.new_rate_bps / 100).toFixed(2) : null;
  const fact = newPct
    ? `${broker} updated its ${product} rate to ${newPct}%`
    : `${broker} made a rate change`;

  return {
    key: "market_fact",
    html: `<div style="margin-bottom:24px;background:#f0f9ff;border-left:3px solid #0891b2;padding:12px 16px;border-radius:4px">
      <p style="font-size:13px;font-weight:700;color:#0c4a6e;margin:0 0 4px">💡 Market update</p>
      <p style="font-size:14px;color:#334155;margin:0">${fact}. <a href="${BASE_URL}/rates/today" style="color:#0891b2;text-decoration:none">See all rate moves →</a></p>
    </div>`,
  };
}

// ─── Email assembly ───────────────────────────────────────────────────────────

function buildEmailHtml({
  email,
  dateStr,
  sectionsHtml,
}: {
  email: string;
  dateStr: string;
  sectionsHtml: string;
}): string {
  const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <a href="${BASE_URL}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
      <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">Morning Brief &mdash; ${escapeHtml(dateStr)}</p>
    </div>

    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="font-size:15px;color:#334155;margin:0 0 20px">Good morning,</p>
      ${sectionsHtml}
      <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
        <a href="${BASE_URL}/compare" style="display:inline-block;padding:10px 22px;background:#059669;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Compare platforms</a>
      </div>
    </div>

    <div style="text-align:center;padding:12px 0">
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px">General information only &mdash; not personal financial advice. <a href="${BASE_URL}/disclaimers" style="color:#94a3b8">Disclaimers</a></p>
      <a href="${unsubUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">Unsubscribe from morning brief</a>
      <span style="color:#cbd5e1;margin:0 6px">&middot;</span>
      <a href="${BASE_URL}/account/alerts" style="font-size:11px;color:#94a3b8;text-decoration:underline">Manage email preferences</a>
    </div>
  </div>
</body>
</html>`;
}
