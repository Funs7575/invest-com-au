import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:feed");

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_feed_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Need auth user ID to query advisor_follows.follower_user_id (UUID column)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Get followed professional IDs
  const { data: follows } = await admin
    .from("advisor_follows")
    .select("following_professional_id")
    .eq("follower_user_id", user.id);

  const followedIds = follows?.map((f) => f.following_professional_id) ?? [];
  followedIds.push(professionalId); // include own posts

  // Get posts from followed advisors + own posts
  const { data: posts, error } = await admin
    .from("advisor_posts")
    .select("*, professional:professionals(id, name, firm_name, profile_image_url, slug)")
    .in("professional_id", followedIds)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    log.error("Failed to fetch advisor feed", { error: error.message, professionalId });
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] });
}
