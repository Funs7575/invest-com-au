import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("follows:advisor");

const FollowSchema = z.object({
  professionalId: z.number().int().positive(),
});

/** POST /api/follows/advisor — any authenticated user follows an advisor */
export const POST = withValidatedBody(FollowSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`follows_advisor_post:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to follow advisors." }, { status: 401 });

  const admin = createAdminClient();

  const { error } = await admin.from("advisor_follows").insert({
    follower_user_id: user.id,
    following_professional_id: body.professionalId,
  });

  if (error) {
    if (error.code === "23505") {
      // Already following — treat as success
      return NextResponse.json({ success: true, alreadyFollowing: true });
    }
    log.error("Failed to follow advisor", { error: error.message, userId: user.id, professionalId: body.professionalId });
    return NextResponse.json({ error: "Failed to follow advisor." }, { status: 500 });
  }

  // Increment follower_count (best-effort, read-modify-write)
  const { data: proData } = await admin
    .from("professionals")
    .select("follower_count")
    .eq("id", body.professionalId)
    .maybeSingle();
  if (proData !== null) {
    const current = (proData as { follower_count?: number } | null)?.follower_count ?? 0;
    const { error: incrementError } = await admin.from("professionals").update({ follower_count: current + 1 }).eq("id", body.professionalId);
    if (incrementError) {
      log.warn("follower_count increment failed (best-effort)", { error: incrementError.message, professionalId: body.professionalId });
    }
  }

  return NextResponse.json({ success: true });
});

/** DELETE /api/follows/advisor — any authenticated user unfollows an advisor */
export async function DELETE(request: Request) {
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0]) ?? "unknown";
  if (await isRateLimited(`follows_advisor_delete:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage follows." }, { status: 401 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = FollowSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { professionalId } = parsed.data;

  const admin = createAdminClient();

  const { error } = await admin
    .from("advisor_follows")
    .delete()
    .eq("follower_user_id", user.id)
    .eq("following_professional_id", professionalId);

  if (error) {
    log.error("Failed to unfollow advisor", { error: error.message, userId: user.id, professionalId });
    return NextResponse.json({ error: "Failed to unfollow advisor." }, { status: 500 });
  }

  // Decrement follower_count (best-effort, read-modify-write)
  const { data: proData } = await admin
    .from("professionals")
    .select("follower_count")
    .eq("id", professionalId)
    .maybeSingle();
  if (proData !== null) {
    const current = (proData as { follower_count?: number } | null)?.follower_count ?? 1;
    const { error: decrementError } = await admin.from("professionals").update({ follower_count: Math.max(0, current - 1) }).eq("id", professionalId);
    if (decrementError) {
      log.warn("follower_count decrement failed (best-effort)", { error: decrementError.message, professionalId });
    }
  }

  return NextResponse.json({ success: true });
}
