import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import logger from "@/lib/logger";

const log = logger("account-export");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/export-data
 * Records a user's request to receive a full export of their personal data.
 *
 * Compliance with Australian Privacy Principles (APP 12) and GDPR
 * Article 15. Actual export generation runs asynchronously via the
 * /api/cron/process-data-exports cron and emails a signed download URL.
 *
 * Rate limit: 1 request per user per 24 hours (prevents abuse and
 * gives the back-end time to process before users try again).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (await isRateLimited(`data_export:${user.id}`, 1, 60 * 24)) {
    return NextResponse.json(
      { error: "You can only request one data export per 24 hours." },
      { status: 429 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

  const { data, error } = await supabase
    .from("data_export_requests")
    .insert({
      user_id: user.id,
      email: user.email ?? "",
      ip_address: ip,
      user_agent: userAgent,
      status: "pending",
    })
    .select("id, requested_at")
    .single();

  if (error) {
    log.error("data_export_requests insert failed", error);
    return NextResponse.json({ error: "Failed to record request" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    request_id: data.id,
    requested_at: data.requested_at,
    message:
      "We've received your request. You'll receive an email with a download link within 30 days, as required under the Australian Privacy Principles.",
  });
}
