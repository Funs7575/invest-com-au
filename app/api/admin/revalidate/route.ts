import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/revalidate
 *
 * On-demand cache invalidation endpoint. Call this from the admin dashboard
 * (or Supabase webhooks) after content is updated.
 *
 * Auth: requires a Bearer token matching either SUPABASE_SERVICE_ROLE_KEY
 * or CRON_SECRET.
 *
 * Body: { tags: string[] }
 *
 * Available tags (match those defined in lib/cached-data.ts):
 *   - "brokers"           — all broker data (listing + detail + fx)
 *   - "brokers-listing"   — broker listing queries only
 *   - "brokers-full"      — full broker queries only
 *   - "broker-detail"     — single broker by slug
 *   - "brokers-fx"        — FX broker queries
 *   - "broker-reviews"    — user reviews + review stats
 *   - "broker-review-stats" — review stats only
 *   - "broker-questions"  — Q&A data
 *   - "broker-articles"   — articles related to brokers
 *   - "broker-fee-history" — fee change history
 *   - "switch-stories"    — switch stories
 *   - "articles"          — all article data
 *   - "articles-list"     — article listing page
 *   - "article-detail"    — single article by slug
 *   - "articles-recent"   — recent articles (homepage)
 *   - "articles-related"  — related articles sidebar
 *   - "scenarios"         — scenario data
 *   - "quiz-questions"    — quiz questions
 *
 * Example:
 *   curl -X POST https://invest.com.au/api/admin/revalidate \
 *     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"tags": ["brokers", "broker-reviews"]}'
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (
    token !== process.env.SUPABASE_SERVICE_ROLE_KEY &&
    token !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const tags: string[] = body.tags || [];

  if (tags.length === 0) {
    return NextResponse.json(
      { error: "No tags provided" },
      { status: 400 }
    );
  }

  // Revalidate each tag (Next.js 16 requires a cacheLife profile as 2nd arg)
  // Using { expire: 0 } for immediate invalidation from admin actions
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 });
  }

  return NextResponse.json({
    revalidated: tags,
    timestamp: new Date().toISOString(),
  });
}
