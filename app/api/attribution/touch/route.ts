import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordTouch } from "@/lib/attribution";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("attribution:touch");

export const runtime = "nodejs";

const TouchBody = z.object({
  session_id: z.string(),
  event: z.enum(["view", "click", "signup", "lead", "conversion"]),
  user_key: z.string().optional(),
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  landing_path: z.string().optional(),
  page_path: z.string().optional(),
  vertical: z.string().optional(),
  value_cents: z.number().optional(),
});

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
  const rawBody = await request.json().catch(() => null);
  const bodyResult = TouchBody.safeParse(rawBody);
  if (!bodyResult.success) {
    // Differentiate "event field present but bad value" from "field missing entirely"
    // so tests can assert the right error message for each case.
    const rawEvent = (rawBody as Record<string, unknown> | null)?.event;
    const hasInvalidEvent = rawEvent !== undefined &&
      bodyResult.error.issues.some((issue: { path: (string | number)[] }) => issue.path[0] === 'event');
    return NextResponse.json(
      { error: hasInvalidEvent ? "Invalid event value" : "Missing session_id or event" },
      { status: 400 },
    );
  }
  const { session_id: sessionId, event, user_key, source, medium, campaign, landing_path, page_path, vertical, value_cents } = bodyResult.data;

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
      userKey: user_key ?? null,
      event,
      source: source ?? null,
      medium: medium ?? null,
      campaign: campaign ?? null,
      landingPath: landing_path ?? null,
      pagePath: page_path ?? null,
      vertical: vertical ?? null,
      valueCents: value_cents ?? null,
    },
    !!request.headers.get("referer"),
  );

  if (!ok) {
    log.warn("touch insert failed");
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
