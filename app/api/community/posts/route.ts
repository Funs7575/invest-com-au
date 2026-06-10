import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import {
  autoModerationReason,
  FORUM_DISABLED_MESSAGE,
  FORUM_HOLD_MESSAGE,
  FORUM_REJECT_MESSAGE,
  gateForumContent,
  isCommunityPostingDisabled,
} from "@/lib/community/moderation";
import { captureServerEvent } from "@/lib/posthog/server";
import { notifyUser } from "@/lib/notifications";

const PostBody = z.object({
  thread_id: z.number().int().positive(),
  body: z.string().min(1).max(5000),
  parent_id: z.number().int().positive().optional(),
  is_anonymous: z.boolean().optional(),
  debate_position: z.enum(["bull", "bear"]).optional(),
});

const log = logger("community:posts");

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Kill switch (automation_kill_switches: community_posting) — shared
    // with thread creation so one row pauses the whole surface.
    if (await isCommunityPostingDisabled()) {
      return NextResponse.json({ error: FORUM_DISABLED_MESSAGE }, { status: 503 });
    }

    // Rate limit — 20 posts per hour per user. Prevents a compromised
    // account or impatient bot from flooding threads.
    if (await isRateLimited(`community_post:${user.id}`, 20, 60)) {
      return NextResponse.json(
        { error: "You're posting too quickly. Please slow down and try again shortly." },
        { status: 429 }
      );
    }

    const parsed = PostBody.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "thread_id and body (1-5000 chars) are required" }, { status: 400 });
    }
    const { thread_id, body: postBody, parent_id, is_anonymous, debate_position } = parsed.data;

    const admin = createAdminClient();

    // Fetch thread to check it exists and isn't locked. author_id/title
    // stay server-side — used only for the reply notification below.
    const { data: thread, error: threadError } = await admin
      .from("forum_threads")
      .select("id, category_id, author_id, title, is_locked, is_removed")
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

    // If parent_id is provided, verify it exists in the same thread.
    // author_id is kept server-side for the nested-reply notification.
    let parentAuthorId: string | null = null;
    if (parent_id) {
      const { data: parentPost, error: parentError } = await admin
        .from("forum_posts")
        .select("id, author_id")
        .eq("id", parent_id)
        .eq("thread_id", thread_id)
        .eq("is_removed", false)
        .single();

      if (parentError || !parentPost) {
        return NextResponse.json({ error: "Parent post not found" }, { status: 404 });
      }
      parentAuthorId = parentPost.author_id;
    }

    // Publish gate — same classifyText pipeline as every other UGC surface.
    const gate = await gateForumContent({ kind: "post", body: postBody.trim() });
    captureServerEvent(user.id, "community_post_submitted", {
      thread_id,
      gate_action: gate.action,
      risk_score: gate.riskScore,
      gate_reasons: gate.reasons.join(","),
      is_nested_reply: !!parent_id,
    });

    if (gate.action === "reject") {
      log.warn("Post rejected by publish gate", { userId: user.id, reasons: gate.reasons });
      return NextResponse.json({ error: FORUM_REJECT_MESSAGE }, { status: 400 });
    }

    // Get or derive display name; anonymous posts redact the real name
    const realDisplayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Anonymous";
    const displayName = is_anonymous ? "Anonymous Investor" : realDisplayName;

    // Insert post — held submissions land hidden (is_removed=true) until
    // a moderator approves them from /admin/community.
    const { data: post, error: insertError } = await admin
      .from("forum_posts")
      .insert({
        thread_id,
        author_id: user.id,
        author_name: displayName,
        body: postBody.trim(),
        parent_id: parent_id || null,
        is_anonymous: is_anonymous ?? false,
        post_type: debate_position ? "debate" : "reply",
        debate_position: debate_position ?? null,
        is_removed: gate.action === "hold",
      })
      .select("id, thread_id, author_name, body, parent_id, created_at")
      .single();

    if (insertError) {
      log.error("Failed to create post", { error: insertError.message });
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    if (gate.action === "hold") {
      // Queue for review; counters skipped (approve recounts from rows).
      const { error: reportError } = await admin.from("forum_reports").upsert(
        {
          target_type: "post",
          target_id: post.id,
          reporter_user_id: user.id,
          reason: autoModerationReason(gate.reasons),
          status: "open",
        },
        { onConflict: "target_type,target_id,reporter_user_id" },
      );
      if (reportError) {
        log.error("Failed to queue held post for review", {
          postId: post.id,
          error: reportError.message,
        });
      }
      return NextResponse.json(
        { post: null, pending_review: true, message: FORUM_HOLD_MESSAGE },
        { status: 202 },
      );
    }

    // Reply notifications — thread author always, parent-post author on
    // nested replies. Self-replies and author==parent overlaps are skipped.
    // displayName is already anonymity-masked, so nothing leaks.
    const notifyTargets = new Set<string>();
    if (thread.author_id && thread.author_id !== user.id) {
      notifyTargets.add(thread.author_id);
    }
    if (parentAuthorId && parentAuthorId !== user.id) {
      notifyTargets.add(parentAuthorId);
    }
    if (notifyTargets.size > 0) {
      const { data: threadCategory } = await admin
        .from("forum_categories")
        .select("slug")
        .eq("id", thread.category_id)
        .single();
      const threadTitle =
        (thread.title ?? "your thread").length > 80
          ? `${(thread.title ?? "").slice(0, 77)}...`
          : (thread.title ?? "your thread");
      for (const targetUserId of notifyTargets) {
        await notifyUser({
          userId: targetUserId,
          type: "reply",
          title: `New reply on "${threadTitle}"`,
          body: `${displayName} replied in the community forum.`,
          linkUrl: `/community/${threadCategory?.slug ?? ""}/${thread_id}`,
        });
      }
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

    // Upsert forum_user_profile with incremented post_count.
    //
    // Race-safe path: ensure profile exists first via upsert with
    // ignoreDuplicates, then atomically increment post_count via
    // RPC if available, falling back to fetch + write. The previous
    // select-then-insert pattern would 500 on concurrent first posts
    // because the UNIQUE(user_id) constraint trips before the SELECT
    // sees the other request's row.
    await admin
      .from("forum_user_profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName,
          reputation: 0,
          thread_count: 0,
          post_count: 0,
          is_moderator: false,
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

    // Now safely increment post_count. Read-modify-write race here is
    // acceptable: counters drift slightly under contention but never
    // produce a 500. Long-term, replace with a SQL RPC that does
    // UPDATE ... SET post_count = post_count + 1.
    const { data: profile } = await admin
      .from("forum_user_profiles")
      .select("post_count")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile) {
      await admin
        .from("forum_user_profiles")
        .update({ post_count: (profile.post_count ?? 0) + 1 })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
