import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("form-event");

export const runtime = "nodejs";

/**
 * POST /api/form-event
 *
 * Client beacon for multi-step form funnel tracking. Writes one
 * row per step event to `form_events`. Rate limited per session
 * so a misbehaving client can't flood the table.
 *
 * Accepts navigator.sendBeacon payloads (Content-Type blob), so
 * we read the raw body and JSON.parse manually.
 */
const ALLOWED_FORMS = new Set([
  "quiz",
  "advisor_enquiry",
  "advisor_signup",
  "advisor_apply",
  "broker_apply",
  "lead_form",
]);

const ALLOWED_EVENTS = new Set(["view", "interact", "complete", "abandon"]);

export async function POST(request: NextRequest) {
  const raw = await request.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const formName = typeof body.form_name === "string" ? body.form_name : null;
  const step = typeof body.step === "string" ? body.step : null;
  const event = typeof body.event === "string" ? body.event : null;

  if (!sessionId || !formName || !step || !event) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!ALLOWED_FORMS.has(formName)) {
    return NextResponse.json({ error: "Unknown form" }, { status: 400 });
  }
  if (!ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  // Rate limit: 120 form events per minute per session — plenty of
  // headroom for a user completing a long form, tight enough that
  // a scripted flood is rejected.
  if (
    !(await isAllowed("form_event", sessionId, {
      max: 120,
      refillPerSec: 120 / 60,
    }))
  ) {
    return NextResponse.json({ error: "Too many form events" }, { status: 429 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("form_events").insert({
    session_id: sessionId,
    user_key: typeof body.user_key === "string" ? body.user_key : null,
    form_name: formName,
    step,
    step_index: typeof body.step_index === "number" ? body.step_index : null,
    event,
    meta:
      body.meta && typeof body.meta === "object"
        ? (body.meta as Record<string, unknown>)
        : null,
  });

  if (error) {
    log.warn("form_events insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
