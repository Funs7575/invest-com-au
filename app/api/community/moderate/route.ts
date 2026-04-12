import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ADMIN_EMAILS } from "@/lib/admin";

const log = logger("community:moderate");

const VALID_ACTIONS = ["pin", "unpin", "lock", "unlock", "remove"] as const;
type ModAction = (typeof VALID_ACTIONS)[number];

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

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Moderator check
    const isMod = await isModerator(user.id, user.email ?? undefined);
    if (!isMod) {
      return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, thread_id, post_id } = body;

    // Validate action
    if (!action || !VALID_ACTIONS.includes(action as ModAction)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Thread-level actions: pin, unpin, lock, unlock, remove
    if (["pin", "unpin", "lock", "unlock"].includes(action)) {
      if (!thread_id) {
        return NextResponse.json({ error: "thread_id is required for this action" }, { status: 400 });
      }

      const updates: Record<string, unknown> = { updated_at: now };

      switch (action as ModAction) {
        case "pin":
          updates.is_pinned = true;
          break;
        case "unpin":
          updates.is_pinned = false;
          break;
        case "lock":
          updates.is_locked = true;
          break;
        case "unlock":
          updates.is_locked = false;
          break;
      }

      const { data: updated, error: updateError } = await admin
        .from("forum_threads")
        .update(updates)
        .eq("id", thread_id)
        .select("id, title, is_pinned, is_locked, is_removed, updated_at")
        .single();

      if (updateError || !updated) {
        log.error("Failed to moderate thread", { action, thread_id, error: updateError?.message });
        return NextResponse.json({ error: "Thread not found or update failed" }, { status: 404 });
      }

      return NextResponse.json({ thread: updated });
    }

    // Remove action: can target either thread or post
    if (action === "remove") {
      if (thread_id) {
        const { data: updated, error: updateError } = await admin
          .from("forum_threads")
          .update({ is_removed: true, updated_at: now })
          .eq("id", thread_id)
          .select("id, title, is_removed, updated_at")
          .single();

        if (updateError || !updated) {
          log.error("Failed to remove thread", { thread_id, error: updateError?.message });
          return NextResponse.json({ error: "Thread not found or removal failed" }, { status: 404 });
        }

        return NextResponse.json({ thread: updated });
      }

      if (post_id) {
        const { data: updated, error: updateError } = await admin
          .from("forum_posts")
          .update({ is_removed: true, updated_at: now })
          .eq("id", post_id)
          .select("id, is_removed, updated_at")
          .single();

        if (updateError || !updated) {
          log.error("Failed to remove post", { post_id, error: updateError?.message });
          return NextResponse.json({ error: "Post not found or removal failed" }, { status: 404 });
        }

        return NextResponse.json({ post: updated });
      }

      return NextResponse.json({ error: "thread_id or post_id is required for remove action" }, { status: 400 });
    }

    return NextResponse.json({ error: "Unhandled action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
