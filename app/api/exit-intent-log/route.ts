import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";

const log = logger("api:exit-intent-log");

export const runtime = "nodejs";

const VALID_ACTIONS = new Set([
  "shown",
  "dismissed",
  "converted_subscribe",
  "converted_quiz",
]);

/**
 * POST /api/exit-intent-log
 *
 * Body: { variant, action, session_id, page_path }
 *
 * Anonymous event log. Used by the ExitIntentModal client
 * component to record impressions, dismissals, and conversions
 * for A/B tuning. session_id is SHA-256 hashed server-side with
 * a salt so the table has no PII — an admin looking at the
 * rollup sees `modal_variant`, `action`, `page_path`, a hashed
 * session, and a timestamp. Nothing that identifies a person.
 */
export async function POST(request: NextRequest) {
  // Generous rate limit — an A/B test that fires once per
  // session tier rarely sends more than a handful of events
  // per user, but a stuck loop could spam.
  if (
    !(await isAllowed("exit_intent_log", ipKey(request), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const variant = typeof body.variant === "string" ? body.variant.slice(0, 60) : null;
  const action = typeof body.action === "string" ? body.action : null;
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const pagePath = typeof body.page_path === "string" ? body.page_path.slice(0, 200) : null;

  if (!variant || !action || !VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const salt = process.env.IP_HASH_SALT || "invest-com-au";
  const sessionHash = sessionId
    ? createHash("sha256").update(sessionId + salt).digest("hex").slice(0, 32)
    : null;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("exit_intent_events").insert({
      modal_variant: variant,
      action,
      session_hash: sessionHash,
      page_path: pagePath,
    });
    if (error) {
      log.warn("exit_intent_events insert failed", { error: error.message });
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.warn("exit-intent-log threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
