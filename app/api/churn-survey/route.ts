import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { isValidEmail } from "@/lib/validate-email";

const log = logger("churn-survey");

/**
 * Body schema. Fields are typed but optional/permissive — the inline
 * `isValidEmail` gate and `REASON_CODES` allowlist below stay the
 * gatekeepers (preserving the existing 400 messages), while the handler
 * keeps doing length-truncation / rounding / lowercasing. The schema's
 * role is to reject hard type mismatches before they reach the insert,
 * replacing the previous untyped `body.x` reads.
 *
 * Per-field `.catch(undefined)` means a single malformed field degrades to
 * undefined (which the inline `typeof` guards already treat as null) without
 * discarding valid sibling fields — preserving the previous
 * `request.json().catch(() => ({}))` + per-field `typeof` behaviour exactly,
 * while the object-level `.catch({})` keeps a wholly malformed body falling
 * through to the email gate rather than throwing.
 */
const ChurnSurveySchema = z
  .object({
    email: z.string().optional().catch(undefined),
    reason_code: z.string().optional().catch(undefined),
    comment: z.string().optional().catch(undefined),
    stripe_subscription_id: z.string().optional().catch(undefined),
    plan_label: z.string().optional().catch(undefined),
    months_active: z.number().optional().catch(undefined),
  })
  .catch({});

export const runtime = "nodejs";

/**
 * POST /api/churn-survey
 *
 * Body: { email, reason_code, comment?, stripe_subscription_id?,
 *         plan_label?, months_active? }
 *
 * Captures churn reason codes from the cancellation flow.
 * Rate-limited per IP to 3 submissions/day so an attacker can't
 * flood the reason aggregation.
 */
const REASON_CODES = new Set([
  "too_expensive",
  "not_enough_value",
  "missing_feature",
  "switching_product",
  "temporary_pause",
  "other",
]);

export async function POST(request: NextRequest) {
  if (!(await isAllowed("churn_survey", ipKey(request), { max: 3, refillPerSec: 3 / 86400 }))) {
    return NextResponse.json({ error: "Too many submissions" }, { status: 429 });
  }

  const raw = await request.json().catch(() => ({}));
  const body = ChurnSurveySchema.parse(raw);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const reason = typeof body.reason_code === "string" ? body.reason_code : null;
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!reason || !REASON_CODES.has(reason)) {
    return NextResponse.json({ error: "Invalid reason_code" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("churn_surveys").insert({
    subscriber_email: email,
    stripe_subscription_id:
      typeof body.stripe_subscription_id === "string" ? body.stripe_subscription_id : null,
    reason_code: reason,
    comment: typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : null,
    plan_label: typeof body.plan_label === "string" ? body.plan_label.slice(0, 100) : null,
    months_active: typeof body.months_active === "number" ? Math.round(body.months_active) : null,
  });

  if (error) {
    log.warn("churn_surveys insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
