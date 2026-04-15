import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { runScorecard, type ScorecardInput } from "@/lib/article-scorecard";
import { logger } from "@/lib/logger";

const log = logger("api:admin:article-scorecard");

export const runtime = "nodejs";

/**
 * /api/admin/article-scorecard
 *
 *   POST — run the deterministic scorecard against a draft.
 *          Body: { slug, title, body, excerpt, category, tags,
 *                  template_slug, min_words, required_sections,
 *                  persist? }
 *          Returns: { score, grade, passed_checks, failed_checks,
 *                     remediation }
 *
 * If persist=true, the result is written to article_scorecard_runs
 * so the editor history shows improvements over time. Persistence
 * is opt-in so the editor UI can call this on every keystroke
 * without filling the audit table.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : null;
  const title = typeof body.title === "string" ? body.title : null;
  const articleBody = typeof body.body === "string" ? body.body : null;

  if (!slug || title == null || articleBody == null) {
    return NextResponse.json(
      { error: "Missing slug, title or body" },
      { status: 400 },
    );
  }

  const input: ScorecardInput = {
    title,
    body: articleBody,
    excerpt: typeof body.excerpt === "string" ? body.excerpt : null,
    category: typeof body.category === "string" ? body.category : null,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : null,
    templateSlug:
      typeof body.template_slug === "string" ? body.template_slug : null,
    minWords: typeof body.min_words === "number" ? body.min_words : undefined,
    requiredSections: Array.isArray(body.required_sections)
      ? (body.required_sections as string[])
      : undefined,
  };

  const result = runScorecard(input);

  // Persistence is opt-in because the editor UI runs this on every
  // save/keystroke and we don't want the audit table to fill up.
  if (body.persist === true) {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("article_scorecard_runs").insert({
        article_slug: slug,
        score: result.score,
        grade: result.grade,
        passed_checks: result.passedChecks,
        failed_checks: result.failedChecks,
        remediation: result.remediation,
        run_by: guard.email,
      });
      if (error) {
        log.warn("article_scorecard_runs insert failed", {
          error: error.message,
        });
      }
    } catch (err) {
      log.warn("persist scorecard threw", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    score: result.score,
    grade: result.grade,
    passed_checks: result.passedChecks,
    failed_checks: result.failedChecks,
    remediation: result.remediation,
  });
}

/**
 * GET — fetch the latest scorecard run for a slug, used by the
 *       editor to show "last run" state when the page loads.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("article_scorecard_runs")
    .select("*")
    .eq("article_slug", slug)
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ item: data || null });
}
