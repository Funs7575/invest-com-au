import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectForwardLookingStatements } from "@/lib/text-moderation";
import { logger } from "@/lib/logger";

const log = logger("api:admin:commodity-news-briefs");

export const runtime = "nodejs";

/**
 * /api/admin/commodity-news-briefs
 *
 * Rapid-publish pipeline for commodity-sector news follow-ups.
 *
 *   GET                                  — list every draft + published
 *                                          brief (admin queue)
 *   POST { sector_slug, event_title,
 *          event_date, source_url,
 *          article_slug, body, excerpt, category }
 *                                        — create BOTH the article row
 *                                          and the commodity_news_briefs
 *                                          row in one step. Runs the
 *                                          body through the forward-
 *                                          looking-statement detector
 *                                          and refuses to auto-publish
 *                                          if any hits are found — the
 *                                          row stays 'draft'.
 *   PATCH { id, action: 'publish'|'retire' }
 *                                        — flip status; publish also
 *                                          stamps articles.status.
 *
 * The two-table write isn't transactional because Supabase JS doesn't
 * expose begin/commit at this layer. Instead we write the article
 * first — if that fails, the brief never lands, which is the safer
 * direction (no orphaned briefs pointing at missing articles).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("commodity_news_briefs")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const sectorSlug = typeof body.sector_slug === "string" ? body.sector_slug : null;
  const eventTitle = typeof body.event_title === "string" ? body.event_title : null;
  const eventDate = typeof body.event_date === "string" ? body.event_date : null;
  const articleSlug = typeof body.article_slug === "string" ? body.article_slug : null;
  const sourceUrl = typeof body.source_url === "string" ? body.source_url : null;
  const articleBody = typeof body.body === "string" ? body.body : null;
  const excerpt = typeof body.excerpt === "string" ? body.excerpt : null;
  const category = typeof body.category === "string" ? body.category : "news";

  if (!sectorSlug || !eventTitle || !eventDate || !articleSlug || !articleBody) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return NextResponse.json(
      { error: "event_date must be YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (!/^[a-z0-9-]+$/.test(articleSlug)) {
    return NextResponse.json(
      { error: "article_slug must be kebab-case" },
      { status: 400 },
    );
  }

  // Forward-looking statement guardrail. A brief with any hit is
  // written as 'draft' so a human reviewer can decide whether to
  // rewrite or sign off. The actual compliance review happens in
  // /admin/moderation — this is just the classifier pass.
  const flags: string[] = [];
  const forwardHits = detectForwardLookingStatements(articleBody);
  if (forwardHits.length > 0) {
    flags.push(...forwardHits.map((h) => `forward_looking:${h}`));
  }
  if (!sourceUrl || !/^https?:\/\//.test(sourceUrl)) {
    flags.push("missing_or_invalid_source_url");
  }
  if (articleBody.length < 300) {
    flags.push("body_too_short");
  }
  if (!/general advice/i.test(articleBody)) {
    flags.push("missing_general_advice_warning_in_body");
  }

  const shouldPublishImmediately = flags.length === 0;
  const supabase = createAdminClient();

  // 1. Upsert the article row — article is the canonical content
  //    so it must exist even if the brief row fails to insert.
  const { error: articleErr } = await supabase.from("articles").upsert(
    {
      slug: articleSlug,
      title: eventTitle,
      excerpt: excerpt || eventTitle,
      body: articleBody,
      category,
      status: shouldPublishImmediately ? "published" : "draft",
      published_at: shouldPublishImmediately ? new Date().toISOString() : null,
      tags: [sectorSlug, "news", "commodity"],
    },
    { onConflict: "slug" },
  );
  if (articleErr) {
    log.warn("articles upsert failed", { error: articleErr.message });
    return NextResponse.json(
      { error: `Article insert failed: ${articleErr.message}` },
      { status: 500 },
    );
  }

  // 2. Upsert the news_briefs row linking to the article.
  const { error: briefErr } = await supabase.from("commodity_news_briefs").upsert(
    {
      sector_slug: sectorSlug,
      article_slug: articleSlug,
      event_title: eventTitle,
      event_date: eventDate,
      source_url: sourceUrl,
      reviewed_by: guard.email,
      compliance_flags: flags.length > 0 ? flags : null,
      status: shouldPublishImmediately ? "published" : "draft",
      published_at: shouldPublishImmediately ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "article_slug" },
  );
  if (briefErr) {
    log.warn("commodity_news_briefs upsert failed", { error: briefErr.message });
    return NextResponse.json(
      { error: `Brief insert failed: ${briefErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: shouldPublishImmediately ? "published" : "draft",
    compliance_flags: flags,
  });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "number" ? body.id : null;
  const action = body.action as "publish" | "retire" | undefined;
  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("commodity_news_briefs")
    .select("article_slug")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "publish") {
    const nowIso = new Date().toISOString();
    await supabase
      .from("commodity_news_briefs")
      .update({
        status: "published",
        published_at: nowIso,
        reviewed_by: guard.email,
        updated_at: nowIso,
      })
      .eq("id", id);
    // Mirror onto the article row so the public page goes live.
    await supabase
      .from("articles")
      .update({ status: "published", published_at: nowIso })
      .eq("slug", existing.article_slug);
    return NextResponse.json({ ok: true, status: "published" });
  }

  if (action === "retire") {
    await supabase
      .from("commodity_news_briefs")
      .update({
        status: "retired",
        retired_at: new Date().toISOString(),
      })
      .eq("id", id);
    await supabase
      .from("articles")
      .update({ status: "archived" })
      .eq("slug", existing.article_slug);
    return NextResponse.json({ ok: true, status: "retired" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
