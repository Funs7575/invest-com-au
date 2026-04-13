import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isRateLimited } from "@/lib/rate-limit";
import { createHash } from "crypto";

const log = logger("referrals");

const REFERRAL_CODE_REGEX = /^[A-Za-z0-9]{4,16}$/;

/**
 * Generate a deterministic 8-char alphanumeric referral code from user ID.
 */
function generateReferralCode(userId: string): string {
  const hash = createHash("sha256").update(userId).digest("hex");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    const index = parseInt(hash.substring(i * 2, i * 2 + 2), 16) % chars.length;
    code += chars[index];
  }
  return code;
}

/**
 * GET /api/referrals
 * Return current user's referral code and stats. Auth required.
 * If no referral code exists, generate one.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Check for existing referral code
  let { data: codeRow } = await admin
    .from("referral_codes")
    .select("code, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Generate if missing
  if (!codeRow) {
    const code = generateReferralCode(user.id);
    const { data: inserted, error: insertError } = await admin
      .from("referral_codes")
      .insert({ user_id: user.id, code })
      .select("code, created_at")
      .single();

    if (insertError) {
      // Code collision — try with salt
      const fallback = generateReferralCode(user.id + Date.now());
      const { data: retry, error: retryError } = await admin
        .from("referral_codes")
        .insert({ user_id: user.id, code: fallback })
        .select("code, created_at")
        .single();

      if (retryError) {
        log.error("Failed to create referral code", { error: retryError.message });
        return NextResponse.json({ error: "Failed to generate referral code" }, { status: 500 });
      }
      codeRow = retry;
    } else {
      codeRow = inserted;
    }
  }

  // Fetch referral stats
  const { data: referrals } = await admin
    .from("referrals")
    .select("id, status, reward_granted, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const allReferrals = referrals || [];
  const totalReferred = allReferrals.length;
  const converted = allReferrals.filter((r) => r.status === "converted" || r.status === "rewarded").length;
  const rewarded = allReferrals.filter((r) => r.status === "rewarded" && r.reward_granted).length;

  // Fetch referred user details (masked)
  const referredIds = allReferrals.map((r) => r.id);
  let history: Array<{
    id: number;
    date: string;
    status: string;
    email: string | null;
  }> = [];

  if (allReferrals.length > 0) {
    // Get referred user emails via auth admin (we'll use the referrals data we have)
    history = allReferrals.map((r) => ({
      id: r.id,
      date: r.created_at,
      status: r.status,
      email: null, // masked for privacy
    }));
  }

  return NextResponse.json({
    code: codeRow!.code,
    referral_url: `https://invest.com.au/?ref=${codeRow!.code}`,
    stats: {
      total_referred: totalReferred,
      converted,
      rewards_earned: rewarded,
    },
    history,
  });
}

/**
 * POST /api/referrals
 * Record that the current user was referred by a code.
 * Body: { referral_code: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit — 10 referral-redemption attempts per hour per user.
  // Stops brute-force enumeration of valid codes and prevents abuse of
  // the reward side-effects on repeat POSTs.
  if (await isRateLimited(`referral_redeem:${user.id}`, 10, 60)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const referralCode = typeof body.referral_code === "string" ? body.referral_code.trim() : "";
  // Tight format check — alphanumeric 4-16 chars, matching generator output.
  // Previously any 4-16 char string passed validation, letting callers inject
  // arbitrary characters (escape sequences, wildcards) into downstream queries.
  if (!REFERRAL_CODE_REGEX.test(referralCode)) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Look up the referral code
  const { data: codeRow } = await admin
    .from("referral_codes")
    .select("user_id, code")
    .eq("code", referralCode)
    .maybeSingle();

  if (!codeRow) {
    return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
  }

  // Prevent self-referral
  if (codeRow.user_id === user.id) {
    return NextResponse.json({ error: "You cannot refer yourself" }, { status: 400 });
  }

  // Check if this user was already referred
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You have already been referred" }, { status: 409 });
  }

  // Record the referral
  const { error: insertError } = await admin
    .from("referrals")
    .insert({
      referrer_id: codeRow.user_id,
      referred_id: user.id,
      status: "pending",
    });

  if (insertError) {
    log.error("Failed to record referral", { error: insertError.message });
    return NextResponse.json({ error: "Failed to record referral" }, { status: 500 });
  }

  log.info("Referral recorded", { referrer: codeRow.user_id, referred: user.id });

  return NextResponse.json({ success: true, message: "Referral recorded successfully" });
}
