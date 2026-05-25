import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-auth:follow");

const FollowSchema = z.object({
  professionalId: z.number().int().positive(),
});

export const POST = withValidatedBody(FollowSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_follow_post:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Need auth user UUID for advisor_follows.follower_user_id
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { error } = await admin.from("advisor_follows").insert({
    follower_user_id: user.id,
    following_professional_id: body.professionalId,
  });

  if (error) {
    // 23505 = unique_violation — already following, treat as success
    if (error.code === "23505") {
      return NextResponse.json({ success: true });
    }
    log.error("Failed to follow advisor", { error: error.message, professionalId, target: body.professionalId });
    return NextResponse.json({ error: "Failed to follow advisor" }, { status: 500 });
  }

  // Increment follower_count on the professional being followed (best-effort)
  const { data: proData } = await admin
    .from("professionals")
    .select("follower_count")
    .eq("id", body.professionalId)
    .maybeSingle();
  if (proData !== null) {
    const current = ((proData as { follower_count?: number } | null)?.follower_count ?? 0);
    await admin
      .from("professionals")
      .update({ follower_count: current + 1 })
      .eq("id", body.professionalId);
  }

  return NextResponse.json({ success: true });
});

export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_follow_delete:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = FollowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { professionalId: targetId } = parsed.data;

  const admin = createAdminClient();

  const { error } = await admin
    .from("advisor_follows")
    .delete()
    .eq("follower_user_id", user.id)
    .eq("following_professional_id", targetId);

  if (error) {
    log.error("Failed to unfollow advisor", { error: error.message, professionalId, target: targetId });
    return NextResponse.json({ error: "Failed to unfollow advisor" }, { status: 500 });
  }

  // Decrement follower_count (best-effort)
  const { data: proData } = await admin
    .from("professionals")
    .select("follower_count")
    .eq("id", targetId)
    .maybeSingle();
  if (proData !== null) {
    const current = ((proData as { follower_count?: number } | null)?.follower_count ?? 1);
    await admin
      .from("professionals")
      .update({ follower_count: Math.max(0, current - 1) })
      .eq("id", targetId);
  }

  return NextResponse.json({ success: true });
}
