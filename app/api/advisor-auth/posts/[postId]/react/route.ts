import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-auth:posts:react");

const ReactSchema = z.object({
  reaction_type: z.enum(["like", "insightful", "celebrate"]),
});

export function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  return withValidatedBody(
    ReactSchema,
    async (req, body) => {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
      if (await isRateLimited(`advisor_react:${ip}`, 60, 60)) {
        return NextResponse.json({ error: "Too many requests." }, { status: 429 });
      }

      const professionalId = await requireAdvisorSession(req);
      if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

      // Get auth user ID for the reaction (advisor_post_reactions.user_id is UUID)
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

      const resolvedParams = await params;
      const postId = parseInt(resolvedParams.postId, 10);
      if (isNaN(postId) || postId <= 0) {
        return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
      }

      const { reaction_type } = body;
      const admin = createAdminClient();

      // Try upsert — if the exact (post_id, user_id) pair already exists,
      // treat it as a toggle (unreact) rather than an error.
      const { error: upsertError } = await admin
        .from("advisor_post_reactions")
        .upsert(
          { post_id: postId, user_id: user.id, reaction_type },
          { onConflict: "post_id,user_id" },
        );

      if (upsertError) {
        log.error("Reaction upsert failed", { error: upsertError.message, postId });
        return NextResponse.json({ error: "Failed to react" }, { status: 500 });
      }

      // Recalculate the true reaction count from DB (avoids races)
      const { count, error: countError } = await admin
        .from("advisor_post_reactions")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);

      if (countError) {
        log.error("Reaction count failed", { error: countError.message, postId });
        return NextResponse.json({ error: "Failed to update count" }, { status: 500 });
      }

      const { error: updateError } = await admin
        .from("advisor_posts")
        .update({ reaction_count: count ?? 0 })
        .eq("id", postId);

      if (updateError) {
        log.error("Reaction count update failed", { error: updateError.message, postId });
      }

      return NextResponse.json({ success: true, reaction_count: count ?? 0 });
    },
  )(request);
}
