import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ADMIN_EMAILS } from "@/lib/admin";
import { isRateLimited } from "@/lib/rate-limit";

const PatchBody = z
  .object({
    title: z.string().trim().min(5).max(200).optional(),
    body: z.string().trim().min(10).max(10000).optional(),
  })
  .refine((d) => d.title !== undefined || d.body !== undefined, {
    message: "No fields to update",
  });

const log = logger("community:thread");

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    // Fetch thread
    const { data: thread, error: threadError } = await admin
      .from("forum_threads")
      .select("*")
      .eq("id", id)
      .eq("is_removed", false)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Increment view_count (fire-and-forget)
    void admin
      .from("forum_threads")
      .update({ view_count: (thread.view_count ?? 0) + 1 })
      .eq("id", id);

    // Fetch posts for the thread
    const { data: posts, error: postsError } = await admin
      .from("forum_posts")
      .select("*")
      .eq("thread_id", id)
      .eq("is_removed", false)
      .order("created_at", { ascending: true });

    if (postsError) {
      log.error("Failed to fetch posts", { error: postsError.message });
    }

    // Gather unique author IDs from thread + posts
    const authorIds = new Set<string>();
    authorIds.add(thread.author_id);
    if (posts) {
      for (const post of posts) {
        authorIds.add(post.author_id);
      }
    }

    // Fetch author profiles for reputation badges
    const { data: profiles } = await admin
      .from("forum_user_profiles")
      .select("user_id, display_name, reputation, badge, is_moderator")
      .in("user_id", Array.from(authorIds));

    const profileMap: Record<string, typeof profiles extends (infer T)[] | null ? T : never> = {};
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.user_id] = p;
      }
    }

    return NextResponse.json({
      thread: { ...thread, author_profile: profileMap[thread.author_id] || null },
      posts: (posts || []).map((post) => ({
        ...post,
        author_profile: profileMap[post.author_id] || null,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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

    // 30 edits per minute per user — generous for legit re-edits,
    // tight enough to block edit-spam attacks that DOS the audit log.
    if (await isRateLimited(`community_thread_edit:${user.id}`, 30, 60)) {
      return NextResponse.json(
        { error: "You're editing too quickly. Please slow down." },
        { status: 429 },
      );
    }

    const admin = createAdminClient();

    // Fetch thread to check ownership
    const { data: thread, error: threadError } = await admin
      .from("forum_threads")
      .select("author_id")
      .eq("id", id)
      .eq("is_removed", false)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const isAuthor = thread.author_id === user.id;
    const isMod = await isModerator(user.id, user.email ?? undefined);

    if (!isAuthor && !isMod) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await req.json();
    const parsed = PatchBody.safeParse(rawBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const msg =
        issue?.message === "No fields to update"
          ? "No fields to update"
          : `Invalid ${typeof issue?.path[0] === "string" ? issue.path[0] : "input"}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.body !== undefined) updates.body = parsed.data.body;
    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await admin
      .from("forum_threads")
      .update(updates)
      .eq("id", id)
      .select("id, title, body, updated_at")
      .single();

    if (updateError) {
      log.error("Failed to update thread", { error: updateError.message });
      return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
    }

    return NextResponse.json({ thread: updated });
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

    // 10 deletions per minute per user — prevents bulk-deletion attacks
    // used to cover tracks of malicious activity or DOS the audit log.
    if (await isRateLimited(`community_thread_delete:${user.id}`, 10, 60)) {
      return NextResponse.json(
        { error: "You're deleting too quickly. Please slow down." },
        { status: 429 },
      );
    }

    const admin = createAdminClient();

    // Fetch thread to check ownership
    const { data: thread, error: threadError } = await admin
      .from("forum_threads")
      .select("author_id")
      .eq("id", id)
      .eq("is_removed", false)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const isAuthor = thread.author_id === user.id;
    const isMod = await isModerator(user.id, user.email ?? undefined);

    if (!isAuthor && !isMod) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await admin
      .from("forum_threads")
      .update({ is_removed: true, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (deleteError) {
      log.error("Failed to soft-delete thread", { error: deleteError.message });
      return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Thread removed" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
