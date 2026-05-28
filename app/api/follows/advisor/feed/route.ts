import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("follows:advisor-feed");

/** GET /api/follows/advisor/feed — posts from advisors the current user follows.
 *  Returns 401 when unauthenticated; empty posts array when authenticated but
 *  not following anyone. */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`follows_advisor_feed_get:${ip}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your following feed." }, { status: 401 });

  const admin = createAdminClient();

  const { data: follows } = await admin
    .from("advisor_follows")
    .select("following_professional_id")
    .eq("follower_user_id", user.id);

  const followedIds = follows?.map((f) => f.following_professional_id) ?? [];

  if (followedIds.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  const { data: posts, error } = await admin
    .from("advisor_posts")
    .select("id, body, post_type, link_url, link_title, reaction_count, comment_count, created_at, professional:professionals(name, slug, photo_url, type)")
    .in("professional_id", followedIds)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    log.error("Failed to fetch following feed", { error: error.message, userId: user.id });
    return NextResponse.json({ error: "Failed to fetch feed." }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] });
}
