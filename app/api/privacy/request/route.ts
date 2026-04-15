/**
 * POST /api/privacy/request
 *
 * Body: { email, type: 'export' | 'delete' }
 *
 * Creates a pending privacy request and emails the requester a
 * verification link. We never act on a privacy request until the
 * user clicks the link — otherwise an attacker could request
 * deletion of anyone's email without access to that inbox.
 *
 * The request row has a random verification_token that the caller
 * exchanges at /api/privacy/verify to actually run the export or
 * delete.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isValidEmail } from "@/lib/validate-email";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { getSiteUrl } from "@/lib/url";
import crypto from "node:crypto";

const log = logger("privacy-request");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Strict rate limit — 3 requests per hour per IP. Privacy endpoints
  // are a prime abuse vector.
  if (!(await isAllowed("privacy_request", ipKey(request), { max: 3, refillPerSec: 3 / 3600 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  const type = body.type === "export" || body.type === "delete" ? body.type : null;

  if (!email || !isValidEmail(email) || !type) {
    return NextResponse.json(
      { error: "Missing or invalid email / type" },
      { status: 400 },
    );
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const supabase = createAdminClient();

  const { error } = await supabase.from("privacy_data_requests").insert({
    request_type: type,
    email,
    verification_token: token,
    requested_by_ip: ipKey(request).slice(0, 64),
  });

  if (error) {
    log.error("privacy_data_requests insert failed", { error: error.message });
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }

  // Send the verification link. We always send to the email provided
  // so an attacker who knows the email still can't act on the
  // request — only the inbox owner gets the link.
  const verifyUrl = `${getSiteUrl()}/api/privacy/verify?token=${encodeURIComponent(token)}`;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const subject =
      type === "export"
        ? "Confirm your data export request — Invest.com.au"
        : "Confirm your data deletion request — Invest.com.au";
    const actionLabel = type === "export" ? "download" : "erase";
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px">Confirm your privacy request</h2>
        <p style="color:#334155;font-size:14px;line-height:1.6">
          We received a request to <strong>${actionLabel}</strong> all data we hold
          for <code>${email}</code>. This link confirms the request — it expires
          in 24 hours and can only be used once.
        </p>
        <p style="margin:24px 0;">
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Confirm ${type} request
          </a>
        </p>
        <p style="color:#94a3b8;font-size:12px;line-height:1.6">
          If you didn't request this, ignore this email — no action will be taken.
        </p>
      </div>`;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Invest.com.au <privacy@invest.com.au>",
        to: [email],
        subject,
        html,
      }),
    }).catch((err) =>
      log.warn("Resend send failed", { err: err instanceof Error ? err.message : String(err) }),
    );
  }

  log.info("Privacy request created", { type, email });
  return NextResponse.json({
    ok: true,
    message: "Check your email for a confirmation link",
  });
}
