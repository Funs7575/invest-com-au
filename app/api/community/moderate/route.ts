import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ADMIN_EMAILS } from "@/lib/admin";
import { isAllowed } from "@/lib/rate-limit-db";

const log = logger("community:moderate");

const VALID_ACTIONS = ["pin", "unpin", "lock", "unlock", "remove", "report"] as const;
// Moderator-only actions (everything except "report", which any signed-in user may do).
type ModAction = Exclude<(typeof VALID_ACTIONS)[number], "report">;

const ModerateBody = z.object({
  action: z.enum(["pin", "unpin", "lock", "unlock", "remove", "report"]),
  thread_id: z.number().int().positive().optional(),
  post_id: z.number().int().positive().optional(),
  // "report" payload (any authenticated, non-author user):
  target_type: z.enum(["thread", "post"]).optional(),
  target_id: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

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

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const bodyResult = ModerateBody.safeParse(rawBody);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 },
      );
    }
    const { action, thread_id, post_id, target_type, target_id, reason } = bodyResult.data;

    // ── Report: any authenticated (non-author) user may flag content. ──
    // Records into forum_reports for moderator review; deduped per user/target.
    // This branch runs BEFORE the moderator gate — reporting is not a mod action.
    if (action === "report") {
      if (!target_type || !target_id) {
        return NextResponse.json(
          { error: "target_type and target_id are required to report" },
          { status: 400 },
        );
      }
      if (!(await isAllowed("community_report", `u:${user.id}`, { max: 10, refillPerSec: 10 / 3600 }))) {
        return NextResponse.json(
          { error: "You've reported a lot recently — please slow down." },
          { status: 429 },
        );
      }
      const adminR = createAdminClient();
      const table = target_type === "thread" ? "forum_threads" : "forum_posts";
      const { data: target } = await adminR
        .from(table)
        .select("id, author_id, is_removed")
        .eq("id", target_id)
        .maybeSingle();
      if (!target) {
        return NextResponse.json({ error: `${target_type} not found` }, { status: 404 });
      }
      if (target.is_removed) {
        // Already removed — treat as a successful no-op so the UI stays consistent.
        return NextResponse.json({ ok: true });
      }
      if (target.author_id === user.id) {
        return NextResponse.json({ error: "You can't report your own content" }, { status: 400 });
      }
      const { error: reportErr } = await adminR.from("forum_reports").upsert(
        {
          target_type,
          target_id,
          reporter_user_id: user.id,
          reason: reason ?? null,
          status: "open",
        },
        { onConflict: "target_type,target_id,reporter_user_id" },
      );
      if (reportErr) {
        log.error("Failed to record report", { error: reportErr.message });
        return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
      }
      return NextResponse.json(
        { ok: true, message: "Thanks — our moderators will review this." },
        { status: 201 },
      );
    }

    // ── Moderator-only actions below (pin/unpin/lock/unlock/remove) ──
    const isMod = await isModerator(user.id, user.email ?? undefined);
    if (!isMod) {
      return NextResponse.json({ error: "Moderator access required" }, { status: 403 });
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
