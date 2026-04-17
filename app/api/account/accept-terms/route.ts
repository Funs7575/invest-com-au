import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("accept-terms");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/accept-terms
 * Records a user's explicit acceptance of the current ToS + Privacy
 * Policy versions. Required for legally-defensible click-through —
 * a footer link is not consent.
 *
 * Body: { tos_version: string, privacy_version: string }
 *
 * The version strings are the dates the documents were last updated,
 * surfaced to the form via NEXT_PUBLIC_TOS_VERSION and
 * NEXT_PUBLIC_PRIVACY_VERSION (or hard-coded constants in lib/compliance).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tos_version =
    typeof body.tos_version === "string" ? body.tos_version.slice(0, 50) : null;
  const privacy_version =
    typeof body.privacy_version === "string"
      ? body.privacy_version.slice(0, 50)
      : null;

  if (!tos_version || !privacy_version) {
    return NextResponse.json(
      { error: "tos_version and privacy_version are required" },
      { status: 400 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  const { error } = await supabase.from("tos_acceptances").insert({
    user_id: user.id,
    tos_version,
    privacy_version,
    ip_address: ip,
    user_agent: userAgent,
  });

  // Duplicate (already accepted this version pair) is success, not error
  if (error && error.code !== "23505") {
    log.error("tos_acceptances insert failed", error);
    return NextResponse.json({ error: "Failed to record acceptance" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
