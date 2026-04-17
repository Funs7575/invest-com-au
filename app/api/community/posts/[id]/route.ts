import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ADMIN_EMAILS } from "@/lib/admin";
import { isRateLimited } from "@/lib/rate-limit";

const log = logger("community:post");

async function isModerator(userId: string, userEmail: string | undefined): Promise<boolean> {
  if (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("forum_user_profiles")
    .select("is_moderator")
    .eq("user_id", userId)
    .single();

  return data?.is_moderator === true;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 30 edits per minute per user — see threads/[id]/route.ts for rationale.
    if (await isRateLimited(`community_post_edit:${user.id}`, 30, 60)) {
      return NextResponse.json(
        { error: "You're editing too quickly. Please slow down." },
        { status: 429 },
      );
    }

    const admin = createAdminClient();

    // Fetch post to check ownership
    const { data: post, error: postError } = await admin
      .from("forum_posts")
      .select("author_id")
      .eq("id", id)
      .eq("is_removed", false)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Author only for edits
    if (post.author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: only the author can edit a post" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.body || typeof body.body !== "string" || body.body.trim().length < 1 || body.body.trim().length > 5000) {
      return NextResponse.json({ error: "Body must be 1-5000 characters" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await admin
      .from("forum_posts")
      .update({
        body: body.body.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, body, updated_at")
      .single();

    if (updateError) {
      log.error("Failed to update post", { error: updateError.message });
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json({ post: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // 10 deletions per minute per user — see threads/[id]/route.ts for rationale.
    if (await isRateLimited(`community_post_delete:${user.id}`, 10, 60)) {
      return NextResponse.json(
        { error: "You're deleting too quickly. Please slow down." },
        { status: 429 },
      );
    }

    const admin = createAdminClient();

    // Fetch post to check ownership
    const { data: post, error: postError } = await admin
      .from("forum_posts")
      .select("author_id")
      .eq("id", id)
      .eq("is_removed", false)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isAuthor = post.author_id === user.id;
    const isMod = await isModerator(user.id, user.email ?? undefined);

    if (!isAuthor && !isMod) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await admin
      .from("forum_posts")
      .update({ is_removed: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) {
      log.error("Failed to soft-delete post", { error: deleteError.message });
      return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Post removed" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
