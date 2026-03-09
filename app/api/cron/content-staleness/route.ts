import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * GET /api/cron/content-staleness
 * Runs monthly to flag articles that need updating.
 *
 * Staleness scoring:
 * - +30 if article hasn't been updated in 60+ days
 * - +50 if article hasn't been updated in 120+ days
 * - +20 if article references brokers whose fees have changed
 * - +10 if article is not evergreen
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch all published articles
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, title, updated_at, evergreen, related_brokers")
    .eq("status", "published");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch brokers that have been updated recently (fee changes)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentlyChangedBrokers } = await supabase
    .from("brokers")
    .select("slug")
    .eq("status", "active")
    .gt("updated_at", thirtyDaysAgo);

  const changedSlugs = new Set(
    (recentlyChangedBrokers || []).map((b) => b.slug)
  );

  const now = Date.now();
  const results: { id: number; slug: string; title: string; score: number; needsUpdate: boolean }[] = [];

  for (const article of articles || []) {
    let score = 0;

    const updatedAt = new Date(article.updated_at).getTime();
    const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > 120) {
      score += 50;
    } else if (daysSinceUpdate > 60) {
      score += 30;
    }

    if (!article.evergreen) {
      score += 10;
    }

    // Check if any referenced brokers have changed fees
    const relatedBrokers = (article.related_brokers as string[]) || [];
    if (relatedBrokers.some((slug) => changedSlugs.has(slug))) {
      score += 20;
    }

    const needsUpdate = score >= 30;

    results.push({
      id: article.id,
      slug: article.slug,
      title: article.title,
      score,
      needsUpdate,
    });

    // Update the article's staleness data
    await supabase
      .from("articles")
      .update({
        staleness_score: score,
        needs_update: needsUpdate,
        last_audited_at: new Date().toISOString(),
      })
      .eq("id", article.id);
  }

  const staleCount = results.filter((r) => r.needsUpdate).length;

  // Email admin if stale articles found
  if (staleCount > 0) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@invest.com.au";
    if (RESEND_API_KEY) {
      const staleList = results
        .filter((r) => r.needsUpdate)
        .map((r) => `<li><strong>${r.title}</strong> (score: ${r.score})</li>`)
        .join("");
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: ADMIN_EMAIL,
          subject: `${staleCount} article${staleCount !== 1 ? "s" : ""} need updating`,
          html: `<div style="font-family:Arial,sans-serif;max-width:500px"><h2 style="color:#0f172a;font-size:16px">Content Staleness Alert</h2><p style="color:#64748b;font-size:14px">${staleCount} article${staleCount !== 1 ? "s" : ""} scored above the staleness threshold and should be reviewed:</p><ul style="color:#334155;font-size:14px">${staleList}</ul><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app"}/admin/articles" style="display:inline-block;padding:10px 20px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px">Review Articles →</a></div>`,
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    audited: results.length,
    stale: staleCount,
    articles: results.filter((r) => r.needsUpdate),
  });
}
