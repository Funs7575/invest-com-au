import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { classifyText } from "@/lib/text-moderation";
import { notifyUser } from "@/lib/notifications";

const log = logger("advisor-auth:posts");

/** Advisor-facing message for a gated post. Advisors are professionals —
 *  tell them which rule tripped so they can rephrase, unlike the generic
 *  consumer-forum message. */
function gateMessage(reasons: string[]): string {
  const joined = reasons.join(",");
  if (/forward_looking|guaranteed|multiplier|hype/.test(joined)) {
    return "Posts with forward-looking price targets or return promises can't be published under our general-advice posture (ASIC RG 170). Rephrase to past performance or general information and try again.";
  }
  if (/legal|defamation|accusation/.test(joined)) {
    return "Posts containing allegations about identifiable parties need review before publishing. Rephrase or contact the team.";
  }
  return "This post can't be published because it appears to breach our content guidelines. Edit it and try again.";
}

/** Followers are notified when an advisor publishes. Capped so one post by
 *  a large account can't fan out into an unbounded insert loop. */
const FOLLOWER_NOTIFY_CAP = 500;

async function notifyFollowers(
  admin: ReturnType<typeof createAdminClient>,
  professionalId: number,
  postId: number,
  postType: string,
  bodyText: string,
): Promise<void> {
  try {
    const { data: followers } = await admin
      .from("advisor_follows")
      .select("follower_user_id")
      .eq("following_professional_id", professionalId)
      .limit(FOLLOWER_NOTIFY_CAP);
    if (!followers || followers.length === 0) return;

    const { data: pro } = await admin
      .from("professionals")
      .select("name")
      .eq("id", professionalId)
      .single();
    const advisorName = pro?.name ?? "An adviser you follow";
    const excerpt = bodyText.length > 140 ? `${bodyText.slice(0, 137)}...` : bodyText;

    for (const follower of followers) {
      await notifyUser({
        userId: follower.follower_user_id,
        type: "announcement",
        title: `${advisorName} posted a new ${postType}`,
        body: excerpt,
        linkUrl: "/feed",
        emailDeliveryKey: `advisor_post_${postId}`,
      });
    }
  } catch (err) {
    // Notification fan-out must never fail the post itself.
    log.warn("Follower notification fan-out failed", {
      professionalId,
      postId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

const PostSchema = z.object({
  body: z.string().min(1).max(2000),
  post_type: z.enum(["update", "insight", "question", "resource"]).optional().default("update"),
  link_url: z.string().url().optional().nullable(),
  link_title: z.string().max(200).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
});

const DeleteSchema = z.object({
  postId: z.coerce.number().int().positive(),
});

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_posts_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: posts, error } = await admin
    .from("advisor_posts")
    .select("*")
    .eq("professional_id", professionalId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    log.error("Failed to fetch advisor posts", { error: error.message, professionalId });
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  return NextResponse.json({ posts: posts ?? [] });
}

export const POST = withValidatedBody(PostSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_posts_create:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Publish gate — advisor posts render on the public /feed and on profile
  // pages with the platform's authority behind them, so they run the same
  // classifyText pipeline as every other UGC surface. Anything short of
  // auto_publish bounces with the specific reason so the advisor can
  // rephrase (no hidden-hold queue for professional accounts).
  const verdict = classifyText({
    text: body.body,
    title: body.link_title ?? null,
    surface: "advisor_post",
  });
  if (verdict.verdict !== "auto_publish") {
    log.warn("Advisor post blocked by publish gate", {
      professionalId,
      verdict: verdict.verdict,
      reasons: verdict.reasons,
    });
    return NextResponse.json({ error: gateMessage(verdict.reasons) }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: post, error } = await admin
    .from("advisor_posts")
    .insert({
      professional_id: professionalId,
      body: body.body,
      post_type: body.post_type,
      link_url: body.link_url ?? null,
      link_title: body.link_title ?? null,
      image_url: body.image_url ?? null,
      status: "published",
    })
    .select("*")
    .single();

  if (error || !post) {
    log.error("Failed to create advisor post", { error: error?.message, professionalId });
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  await notifyFollowers(admin, professionalId, post.id, body.post_type, body.body);

  return NextResponse.json({ post }, { status: 201 });
});

export const DELETE = withValidatedBody(DeleteSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_posts_delete:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Verify ownership before soft-deleting
  const { data: existing } = await admin
    .from("advisor_posts")
    .select("id, professional_id")
    .eq("id", body.postId)
    .single();

  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (existing.professional_id !== professionalId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin
    .from("advisor_posts")
    .update({ status: "deleted" })
    .eq("id", body.postId);

  if (error) {
    log.error("Failed to delete advisor post", { error: error.message, postId: body.postId });
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
