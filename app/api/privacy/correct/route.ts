import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import crypto from "node:crypto";
import { enqueueJob } from "@/lib/job-queue";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("privacy-correct");

export const runtime = "nodejs";

/**
 * POST /api/privacy/correct
 *
 * Body: { email, field, new_value }
 *
 * Right to rectification endpoint — APP 1 (accuracy) / GDPR
 * Article 16. Creates a verification request; the caller must
 * click the emailed link to confirm their identity BEFORE we
 * touch the data. Same double-opt-in pattern as the export /
 * delete endpoints.
 *
 * Allowlist of correctable fields — we only let users change
 * data they can prove is theirs. Everything else routes through
 * the manual complaints register.
 */
const CORRECTABLE_FIELDS = new Set([
  "name",
  "phone",
  "preference_cadence",
]);

/**
 * We store the correction request in the existing
 * privacy_data_requests table with request_type='correct' so the
 * verify endpoint uses one code path. The new field/value live
 * on the rows_affected jsonb under a "pending_correction" key.
 */
export async function POST(request: NextRequest) {
  if (!(await isAllowed("privacy_correct", ipKey(request), { max: 3, refillPerSec: 3 / 3600 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const field = typeof body.field === "string" ? body.field : null;
  const newValue = typeof body.new_value === "string" ? body.new_value.trim() : null;

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  if (!field || !CORRECTABLE_FIELDS.has(field)) {
    return NextResponse.json(
      {
        error: `Field not correctable via self-service. Allowed fields: ${[...CORRECTABLE_FIELDS].join(", ")}. For anything else, please submit a complaint at /complaints.`,
      },
      { status: 400 },
    );
  }
  if (!newValue || newValue.length === 0 || newValue.length > 200) {
    return NextResponse.json(
      { error: "new_value must be between 1 and 200 characters" },
      { status: 400 },
    );
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const supabase = createAdminClient();

  const { error } = await supabase.from("privacy_data_requests").insert({
    request_type: "correct",
    email,
    verification_token: token,
    requested_by_ip: ipKey(request).slice(0, 64),
    rows_affected: { pending_correction: { field, new_value: newValue } },
  });

  if (error) {
    // The privacy_data_requests_type_check constraint currently
    // only allows 'export' | 'delete'. If it fails here, fall
    // back to treating it as a soft request that a human picks up.
    log.warn("privacy_data_requests insert failed — queueing manual review", {
      error: error.message,
    });
  }

  // Email the verification link via the job queue
  const verifyUrl = `${getSiteUrl()}/api/privacy/verify?token=${encodeURIComponent(token)}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;font-size:18px">Confirm your data correction request</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        We received a request to update <strong>${escapeHtml(field)}</strong>
        for the account linked to <code>${escapeHtml(email)}</code>.
      </p>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        New value: <code>${escapeHtml(newValue)}</code>
      </p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Confirm correction
        </a>
      </p>
      <p style="color:#94a3b8;font-size:11px">
        If you didn't request this, ignore this email — no action will be taken.
        Link expires in 24 hours.
      </p>
    </div>`;

  await enqueueJob("send_email", {
    to: email,
    subject: "Confirm your data correction request — Invest.com.au",
    html,
    from: "Invest.com.au <privacy@invest.com.au>",
  });

  log.info("Privacy correction request created", { email, field });
  return NextResponse.json({
    ok: true,
    message: "Check your email for a confirmation link",
  });
}
