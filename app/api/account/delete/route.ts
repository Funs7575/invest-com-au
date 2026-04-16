import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import logger from "@/lib/logger";

const log = logger("account-delete");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRACE_PERIOD_DAYS = 30;

/**
 * POST /api/account/delete
 * Schedules an authenticated user's account for deletion after a
 * 30-day grace period. The actual purge is run by the existing
 * /api/cron/gdpr-retention-purge job which respects the
 * scheduled_purge_at column.
 *
 * Users may cancel via DELETE on this endpoint (sets status='cancelled').
 *
 * Body: { reason?: string }
 *
 * Compliance with APP 11 (security and destruction of personal info)
 * and GDPR Article 17 (right to erasure).
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
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : null;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  const scheduledPurgeAt = new Date(
    Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("account_deletion_requests")
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? "",
        reason,
        scheduled_purge_at: scheduledPurgeAt,
        ip_address: ip,
        user_agent: userAgent,
        status: "scheduled",
        cancelled_at: null,
      },
      { onConflict: "user_id" }
    )
    .select("id, scheduled_purge_at")
    .single();

  if (error) {
    log.error("account_deletion_requests insert failed", error);
    return NextResponse.json({ error: "Failed to schedule deletion" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    request_id: data.id,
    scheduled_purge_at: data.scheduled_purge_at,
    grace_period_days: GRACE_PERIOD_DAYS,
    message: `Your account is scheduled for permanent deletion in ${GRACE_PERIOD_DAYS} days. You can cancel this at any time during the grace period by signing in and visiting your account settings.`,
  });
}

/**
 * DELETE /api/account/delete
 * Cancels a previously-scheduled account deletion within the grace period.
 */
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("account_deletion_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "scheduled");

  if (error) {
    log.error("account_deletion_requests cancel failed", error);
    return NextResponse.json({ error: "Failed to cancel deletion" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Your account deletion request has been cancelled.",
  });
}
