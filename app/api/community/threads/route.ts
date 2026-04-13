import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("community:threads");

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const categorySlug = searchParams.get("category");
    const sort = searchParams.get("sort") || "recent";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    // Resolve category_id from slug if provided
    let categoryId: string | null = null;
    if (categorySlug) {
      const { data: cat, error: catError } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("slug", categorySlug)
        .eq("status", "active")
        .single();

      if (catError || !cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      categoryId = cat.id;
    }

    // Build the query
    let query = supabase
      .from("forum_threads")
      .select("id, category_id, author_id, author_name, title, slug, is_pinned, is_locked, reply_count, view_count, vote_score, last_reply_at, created_at", { count: "exact" })
      .eq("is_removed", false);

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // Sort: pinned first, then by chosen sort
    query = query.order("is_pinned", { ascending: false });

    switch (sort) {
      case "popular":
        query = query.order("vote_score", { ascending: false });
        break;
      case "unanswered":
        query = query.eq("reply_count", 0).order("created_at", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      log.error("Failed to fetch threads", { error: error.message });
      return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
    }

    return NextResponse.json({
      threads: data,
      total: count ?? 0,
      page,
      limit,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit — 5 new threads per hour per user. Thread creation is
    // costlier than post replies (each spawns a moderation surface and a
    // category bump), so the cap is tighter than for posts.
    if (await isRateLimited(`community_thread:${user.id}`, 5, 60)) {
      return NextResponse.json(
        { error: "You've created too many threads recently. Please wait before starting another." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { category_slug, title, body: threadBody } = body;

    // Validation
    if (!category_slug || !title || !threadBody) {
      return NextResponse.json({ error: "Missing required fields: category_slug, title, body" }, { status: 400 });
    }
    if (typeof title !== "string" || title.trim().length < 5 || title.trim().length > 200) {
      return NextResponse.json({ error: "Title must be 5-200 characters" }, { status: 400 });
    }
    if (typeof threadBody !== "string" || threadBody.trim().length < 10 || threadBody.trim().length > 10000) {
      return NextResponse.json({ error: "Body must be 10-10000 characters" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Resolve category
    const { data: category, error: catError } = await admin
      .from("forum_categories")
      .select("id")
      .eq("slug", category_slug)
      .eq("status", "active")
      .single();

    if (catError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Get or derive display name
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Anonymous";

    const slug = generateSlug(title.trim());

    // Insert thread
    const { data: thread, error: insertError } = await admin
      .from("forum_threads")
      .insert({
        category_id: category.id,
        author_id: user.id,
        author_name: displayName,
        title: title.trim(),
        slug,
        body: threadBody.trim(),
      })
      .select("id, slug, title, created_at")
      .single();

    if (insertError) {
      log.error("Failed to create thread", { error: insertError.message });
      return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
    }

    // Update category thread_count and last_thread_id
    const { data: currentCat } = await admin
      .from("forum_categories")
      .select("thread_count")
      .eq("id", category.id)
      .single();

    await admin
      .from("forum_categories")
      .update({
        thread_count: (currentCat?.thread_count ?? 0) + 1,
        last_thread_id: thread.id,
        last_post_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    // Upsert forum_user_profile with incremented thread_count
    const { data: existingProfile } = await admin
      .from("forum_user_profiles")
      .select("thread_count")
      .eq("user_id", user.id)
      .single();

    if (existingProfile) {
      await admin
        .from("forum_user_profiles")
        .update({ thread_count: (existingProfile.thread_count ?? 0) + 1 })
        .eq("user_id", user.id);
    } else {
      await admin
        .from("forum_user_profiles")
        .insert({
          user_id: user.id,
          display_name: displayName,
          reputation: 0,
          thread_count: 1,
          post_count: 0,
          is_moderator: false,
        });
    }

    return NextResponse.json({ thread }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
