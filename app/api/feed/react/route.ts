import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// eslint-disable-next-line no-restricted-imports -- advisor_post_reactions has no authenticated INSERT policy (public read + service_role only); the write must go through the admin client after we verify the caller's auth user. Same pattern as the advisor-side react route.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("feed:react");

const ReactSchema = z.object({
  postId: z.coerce.number().int().positive(),
  reaction_type: z.enum(["like", "insightful", "celebrate"]),
});

/**
 * Any signed-in user (not just advisors) can react to a published advisor
 * post. True toggle semantics: same reaction again removes it; a different
 * reaction replaces it. Returns the fresh count so the client can reconcile
 * its optimistic state.
 */
export const POST = withValidatedBody(ReactSchema, async (request: NextRequest, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`feed_react:${ip}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Only published, non-held posts accept reactions.
  const { data: post } = await admin
    .from("advisor_posts")
    .select("id, status")
    .eq("id", body.postId)
    .maybeSingle();
  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("advisor_post_reactions")
    .select("id, reaction_type")
    .eq("post_id", body.postId)
    .eq("user_id", user.id)
    .maybeSingle();

  let reacted: boolean;
  if (existing && existing.reaction_type === body.reaction_type) {
    // Same reaction again → unreact.
    const { error } = await admin.from("advisor_post_reactions").delete().eq("id", existing.id);
    if (error) {
      log.error("Unreact failed", { error: error.message, postId: body.postId });
      return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
    }
    reacted = false;
  } else {
    const { error } = await admin
      .from("advisor_post_reactions")
      .upsert(
        { post_id: body.postId, user_id: user.id, reaction_type: body.reaction_type },
        { onConflict: "post_id,user_id" },
      );
    if (error) {
      log.error("React upsert failed", { error: error.message, postId: body.postId });
      return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
    }
    reacted = true;
  }

  // Recount from the table (race-safe) and refresh the denormalised counter.
  const { count } = await admin
    .from("advisor_post_reactions")
    .select("id", { count: "exact", head: true })
    .eq("post_id", body.postId);

  await admin
    .from("advisor_posts")
    .update({ reaction_count: count ?? 0 })
    .eq("id", body.postId);

  return NextResponse.json({
    success: true,
    reacted,
    reaction_type: reacted ? body.reaction_type : null,
    reaction_count: count ?? 0,
  });
});
