/**
 * POST /api/account/profile-share
 *
 * Creates a 192-bit opaque share token that embeds a point-in-time snapshot
 * of the authenticated investor's goals, quiz results, watchlist, and latest
 * health score. The token is returned along with a shareable URL the investor
 * can send to an advisor.
 *
 * GET /api/account/profile-share
 *
 * Lists the caller's own share tokens (id, created_at, expires_at, consumed_at).
 * Lets the investor see which tokens have been opened.
 *
 * Auth: Supabase Auth session required.
 * Rate-limit: 10 / 10min / IP on POST (low-volume action); 30 / min on GET.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/url";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:account:profile-share");

export async function GET(request: NextRequest) {
  if (
    !(await isAllowed("account_profile_share_list", ipKey(request), {
      max: 30,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // User-scoped read — owner-select RLS fires.
  const { data, error } = await supabase
    .from("profile_share_tokens")
    .select("id, created_at, expires_at, consumed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    log.warn("list tokens failed", { error: error.message, user_id: user.id });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("account_profile_share_create", ipKey(request), {
      max: 10,
      refillPerSec: 0.017, // ~1 token per minute — 10 per 10 min burst
    }))
  ) {
    return NextResponse.json(
      { error: "Too many share tokens created. Try again later." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Build snapshot in parallel
  const [profileRes, quizRes, watchlistRes, healthRes] = await Promise.all([
    admin
      .from("investor_profiles")
      .select(
        "is_fhb, is_pre_retiree, is_business_owner, is_cross_border, is_hnw, budget_band, experience_level, primary_vertical, display_name",
      )
      .eq("auth_user_id", user.id)
      .maybeSingle(),
    admin
      .from("user_quiz_history")
      .select("inferred_vertical, top_match_slug, completed_at")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("user_watchlist_items")
      .select("item_type, item_slug, display_name")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false })
      .limit(20),
    admin
      .from("user_health_score_log")
      .select("overall, diversification, cost, risk_alignment, engagement, scored_month")
      .eq("user_id", user.id)
      .order("scored_month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const snapshotJson = {
    goals: profileRes.data ?? null,
    quiz: quizRes.data ?? null,
    watchlist: watchlistRes.data ?? [],
    health: healthRes.data ?? null,
  };

  // 192-bit random token (24 bytes → 48 hex chars)
  const tokenBytes = crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await admin.from("profile_share_tokens").insert({
    user_id: user.id,
    token,
    snapshot_json: snapshotJson,
    expires_at: expiresAt,
  });

  if (insertError) {
    log.warn("profile share insert failed", { error: insertError.message, user_id: user.id });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const siteUrl = getSiteUrl();
  log.info("profile share created", { user_id: user.id });

  return NextResponse.json(
    {
      token,
      share_url: `${siteUrl}/shared-profile/${token}`,
      expires_at: expiresAt,
    },
    { status: 201 },
  );
}
