import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { runScorecard } from "@/lib/article-scorecard";
import { logger } from "@/lib/logger";

const log = logger("api:admin:articles-editor:save");

export const runtime = "nodejs";

/**
 * /api/admin/articles-editor/save
 *
 *   POST — upsert an article row from the split-pane editor.
 *          Body: { slug, title, excerpt, content, category,
 *                  tags, status ('draft' | 'published') }
 *
 * Guardrail: refuses to publish (status='published') if the
 * scorecard grades F. Drafts can save freely. The scorecard run
 * is persisted as an audit trail on every save so the admin
 * content-calendar view has a history of grade improvements.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : null;
  const title = typeof body.title === "string" ? body.title : null;
  const content = typeof body.content === "string" ? body.content : null;
  const excerpt = typeof body.excerpt === "string" ? body.excerpt : null;
  const category = typeof body.category === "string" ? body.category : null;
  const tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const status = body.status === "published" ? "published" : "draft";

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase kebab-case" },
      { status: 400 },
    );
  }
  if (!title || title.trim().length < 5) {
    return NextResponse.json({ error: "Title too short" }, { status: 400 });
  }
  if (content == null) {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  // Re-run the scorecard server-side — we don't trust the client's
  // value because the client could send stale state.
  const result = runScorecard({
    title,
    body: content,
    excerpt,
    category,
    tags,
    templateSlug: null,
  });

  if (status === "published" && result.grade === "F") {
    return NextResponse.json(
      {
        error: "Cannot publish while scorecard grade is F",
        failed_checks: result.failedChecks,
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Upsert the article. status=published stamps published_at.
  const { error } = await supabase.from("articles").upsert(
    {
      slug,
      title: title.trim(),
      excerpt: excerpt ? excerpt.trim() : null,
      content,
      category: category || null,
      tags,
      status,
      ...(status === "published"
        ? { published_at: new Date().toISOString() }
        : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );

  if (error) {
    log.warn("articles upsert failed", { error: error.message, slug });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Persist the scorecard run for audit / calendar history
  try {
    await supabase.from("article_scorecard_runs").insert({
      article_slug: slug,
      score: result.score,
      grade: result.grade,
      passed_checks: result.passedChecks,
      failed_checks: result.failedChecks,
      remediation: result.remediation,
      run_by: guard.email,
    });
  } catch (err) {
    log.warn("scorecard run persist failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({
    ok: true,
    status,
    grade: result.grade,
    score: result.score,
  });
}
