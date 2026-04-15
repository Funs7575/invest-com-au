import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTouch, type TouchEvent } from "@/lib/attribution";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("attribution:touch");

export const runtime = "nodejs";

/**
 * POST /api/attribution/touch
 *
 * Client beacon for multi-touch attribution. The client sends one
 * event per page view / conversion with session_id + utm params +
 * the current path. Server classifies the channel and writes a row
 * to attribution_touches.
 *
 * Rate limited per session to prevent an abusive client from
 * flooding the table. 60 touches / minute is well above normal
 * browse behaviour.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const event = typeof body.event === "string" ? (body.event as TouchEvent) : null;
  if (!sessionId || !event) {
    return NextResponse.json({ error: "Missing session_id or event" }, { status: 400 });
  }
  if (!["view", "click", "signup", "lead", "conversion"].includes(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  // Per-session rate limit — per-IP limits are too coarse because
  // proxied offices share IPs
  if (!(await isAllowed("attribution_touch", `${sessionId}:${ipKey(request)}`, { max: 60, refillPerSec: 60 / 60 }))) {
    return NextResponse.json({ error: "Too many touches" }, { status: 429 });
  }

  const supabase = createAdminClient();
  const ok = await recordTouch(
    supabase,
    {
      sessionId,
      userKey: typeof body.user_key === "string" ? body.user_key : null,
      event,
      source: typeof body.source === "string" ? body.source : null,
      medium: typeof body.medium === "string" ? body.medium : null,
      campaign: typeof body.campaign === "string" ? body.campaign : null,
      landingPath: typeof body.landing_path === "string" ? body.landing_path : null,
      pagePath: typeof body.page_path === "string" ? body.page_path : null,
      vertical: typeof body.vertical === "string" ? body.vertical : null,
      valueCents: typeof body.value_cents === "number" ? body.value_cents : null,
    },
    !!request.headers.get("referer"),
  );

  if (!ok) {
    log.warn("touch insert failed");
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
