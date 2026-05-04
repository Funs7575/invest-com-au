import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * POST /api/admin/revalidate
 *
 * On-demand cache invalidation endpoint. Call this from the admin dashboard
 * (or Supabase webhooks) after content is updated.
 *
 * Auth: requires a Bearer token matching CRON_SECRET (via requireCronAuth).
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
 *   curl -X POST https://invest-com-au.vercel.app/api/admin/revalidate \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"tags": ["brokers", "broker-reviews"]}'
 */
const TagsBody = z.object({ tags: z.array(z.string()).min(1) });

export async function POST(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = TagsBody.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "No tags provided" }, { status: 400 });
  }

  const { tags } = parsed.data;

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
