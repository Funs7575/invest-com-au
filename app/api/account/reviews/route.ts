import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:account:reviews");

export const runtime = "nodejs";

/**
 * GET /api/account/reviews
 *
 * Returns all of the authenticated user's broker reviews regardless of
 * moderation status (pending / approved / rejected). Standard RLS only
 * exposes approved rows to authenticated users — the account page needs
 * the full history so the user can track their submission status.
 *
 * Admin client used because user_reviews is linked by email, not
 * auth.uid(), so no auth-scoped RLS policy can target the caller's rows.
 * Scope is limited to the caller's own email address (verified from the
 * auth session), never another user's data.
 */
export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_reviews")
    .select(
      "id, broker_slug, rating, title, body, pros, cons, status, created_at, verified_at, fees_rating, platform_rating, support_rating, reliability_rating",
    )
    .eq("email", user.email)
    .order("created_at", { ascending: false });

  if (error) {
    log.warn("account reviews fetch failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [] });
}
