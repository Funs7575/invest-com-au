import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("feed:posts");

const PAGE_SIZE = 20;

/**
 * Public cursor-paginated read of the advisor insights feed. Backs the
 * "Load more" button on /feed. Cursor is the smallest post id the client
 * has already rendered (`before`), so pages stay stable as new posts land.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`feed_posts_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const beforeRaw = request.nextUrl.searchParams.get("before");
  const before = beforeRaw ? Number.parseInt(beforeRaw, 10) : null;
  if (beforeRaw !== null && (!Number.isFinite(before) || (before as number) <= 0)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .from("advisor_posts")
      .select(
        "id, body, post_type, link_url, link_title, reaction_count, comment_count, created_at, professional:professionals(name, slug, photo_url, type)",
      )
      .eq("status", "published")
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);
    if (before !== null) {
      query = query.lt("id", before);
    }

    const { data, error } = await query;
    if (error) {
      log.error("Feed page fetch failed", { error: error.message });
      return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
    }

    const posts = data ?? [];
    return NextResponse.json(
      { posts, hasMore: posts.length === PAGE_SIZE },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    log.error("Feed page fetch threw", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}
