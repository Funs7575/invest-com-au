import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const log = logger("community:posts");

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { thread_id, body: postBody, parent_id } = body;

    // Validation
    if (!thread_id || !postBody) {
      return NextResponse.json({ error: "Missing required fields: thread_id, body" }, { status: 400 });
    }
    if (typeof postBody !== "string" || postBody.trim().length < 1 || postBody.trim().length > 5000) {
      return NextResponse.json({ error: "Body must be 1-5000 characters" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch thread to check it exists and isn't locked
    const { data: thread, error: threadError } = await admin
      .from("forum_threads")
      .select("id, category_id, is_locked, is_removed")
      .eq("id", thread_id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    if (thread.is_removed) {
      return NextResponse.json({ error: "Thread has been removed" }, { status: 404 });
    }
    if (thread.is_locked) {
      return NextResponse.json({ error: "Thread is locked" }, { status: 403 });
    }

    // If parent_id is provided, verify it exists in the same thread
    if (parent_id) {
      const { data: parentPost, error: parentError } = await admin
        .from("forum_posts")
        .select("id")
        .eq("id", parent_id)
        .eq("thread_id", thread_id)
        .eq("is_removed", false)
        .single();

      if (parentError || !parentPost) {
        return NextResponse.json({ error: "Parent post not found" }, { status: 404 });
      }
    }

    // Get or derive display name
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Anonymous";

    // Insert post
    const { data: post, error: insertError } = await admin
      .from("forum_posts")
      .insert({
        thread_id,
        author_id: user.id,
        author_name: displayName,
        body: postBody.trim(),
        parent_id: parent_id || null,
      })
      .select("id, thread_id, author_name, body, parent_id, created_at")
      .single();

    if (insertError) {
      log.error("Failed to create post", { error: insertError.message });
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    // Update thread counters: reply_count, last_reply_at, last_reply_by
    const { data: currentThread } = await admin
      .from("forum_threads")
      .select("reply_count")
      .eq("id", thread_id)
      .single();

    await admin
      .from("forum_threads")
      .update({
        reply_count: (currentThread?.reply_count ?? 0) + 1,
        last_reply_at: new Date().toISOString(),
        last_reply_by: displayName,
      })
      .eq("id", thread_id);

    // Update category post_count and last_post_at
    const { data: currentCat } = await admin
      .from("forum_categories")
      .select("post_count")
      .eq("id", thread.category_id)
      .single();

    await admin
      .from("forum_categories")
      .update({
        post_count: (currentCat?.post_count ?? 0) + 1,
        last_post_at: new Date().toISOString(),
      })
      .eq("id", thread.category_id);

    // Upsert forum_user_profile with incremented post_count
    const { data: existingProfile } = await admin
      .from("forum_user_profiles")
      .select("post_count")
      .eq("user_id", user.id)
      .single();

    if (existingProfile) {
      await admin
        .from("forum_user_profiles")
        .update({ post_count: (existingProfile.post_count ?? 0) + 1 })
        .eq("user_id", user.id);
    } else {
      await admin
        .from("forum_user_profiles")
        .insert({
          user_id: user.id,
          display_name: displayName,
          reputation: 0,
          thread_count: 0,
          post_count: 1,
          is_moderator: false,
        });
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
