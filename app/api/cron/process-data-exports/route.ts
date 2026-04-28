/**
 * Cron: process-data-exports
 *
 * Picks the oldest pending `data_export_requests` row, gathers all
 * user-owned personal data, uploads a JSON archive to private Supabase
 * Storage, creates a 7-day signed download URL, and emails the user.
 * Updates the row to status='ready' on success or status='failed' on error.
 *
 * Compliance: Australian Privacy Principle 12 (APP 12) / GDPR Article 15
 * (right of access). Fulfils the 30-day window promised by the
 * /api/account/export-data response.
 *
 * Processes ONE request per invocation to stay within maxDuration.
 * Runs daily (daily-2 group) alongside gdpr-retention-purge and
 * data-export-monitor. The monitor cron surfaces any stalled requests to
 * the founder at 7- and 25-day thresholds; this processor handles them
 * automatically in < 24 hours under normal conditions.
 *
 * PREREQUISITE — one-time founder action:
 *   Create a private Supabase Storage bucket named "data-exports":
 *   Dashboard → Storage → New bucket → name="data-exports", public=OFF.
 *   If the bucket is missing, the request is marked status='failed' with
 *   a descriptive error_message guiding the fix.
 *
 * FORWARD-COMPATIBLE NOTE:
 *   data_export_requests is defined in
 *   supabase/migrations/20260427_wave_security_observability.sql but that
 *   migration may not yet be applied to live. While it is absent, pending
 *   rows cannot exist and this cron exits immediately each run (no side
 *   effects). See Blocked entry A-MISSING-TABLE-1 in REMEDIATION_QUEUE.md.
 *
 * Queue item: K-06b — audit §7 SEC-06 (2026-04-26).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";

const log = logger("cron-process-data-exports");

export const runtime = "nodejs";
export const maxDuration = 300;

const EXPORT_BUCKET = "data-exports";
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

/**
 * Tables where rows are owned by user_id = auth.uid().
 * These are the primary sources of personal data for an export under APP 12.
 */
const USER_ID_TABLES = [
  "professionals",             // advisor profile details
  "subscriptions",             // billing / subscription plan
  "user_bookmarks",            // saved brokers and articles
  "user_notifications",        // in-app notifications received
  "user_quiz_history",         // quiz answers and recommendation results
  "consultation_bookings",     // booked advisor consultations
  "course_purchases",          // purchased learning courses
  "course_progress",           // course completion progress
  "tos_acceptances",           // terms-of-service / privacy acceptances
  "notification_preferences",  // notification channel opt-ins
  "forum_user_profiles",       // forum display name and avatar
  "forum_votes",               // upvotes and downvotes
  "article_reactions",         // article likes / reactions
] as const;

/**
 * Tables where the user's data is linked by email address rather than
 * user_id. These capture pre-auth submissions (enquiry forms, advisor
 * applications) that may pre-date the user's account creation.
 */
const USER_EMAIL_TABLES = [
  "leads",                // submitted enquiry leads
  "advisor_applications", // advisor-application form submissions
] as const;

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------

async function gatherUserData(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  userEmail: string,
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  // Auth profile (retrieved via the Supabase admin auth service).
  const { data: authResponse } = await supabase.auth.admin.getUserById(userId);
  if (authResponse.user) {
    const u = authResponse.user;
    data.auth_profile = {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      updated_at: u.updated_at,
      email_confirmed_at: u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata,
    };
  }

  // User-id-linked tables — admin client is untyped so any table name is valid.
  for (const table of USER_ID_TABLES) {
    try {
      const { data: rows, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId);
      if (error) {
        log.warn(`query failed: ${table}`, { message: error.message });
      } else {
        data[table] = rows ?? [];
      }
    } catch (err) {
      log.warn(`exception querying ${table}`, { err });
    }
  }

  // Email-linked tables — captures pre-auth form data.
  for (const table of USER_EMAIL_TABLES) {
    try {
      const { data: rows, error } = await supabase
        .from(table)
        .select("*")
        .eq("email", userEmail);
      if (error) {
        log.warn(`query failed: ${table} (by email)`, { message: error.message });
      } else {
        data[table] = rows ?? [];
      }
    } catch (err) {
      log.warn(`exception querying ${table} by email`, { err });
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Email builder
// ---------------------------------------------------------------------------

function exportReadyEmail(opts: {
  email: string;
  downloadUrl: string;
  expiresAt: string;
}): { subject: string; html: string } {
  const expiryDate = new Date(opts.expiresAt).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: "Your personal data export is ready to download",
    html: `
<p>Hi,</p>
<p>Your invest.com.au personal data export is ready. Click the button below to download a copy of all information we hold about your account.</p>
<p style="margin:24px 0">
  <a href="${opts.downloadUrl}"
     style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
    Download your data export
  </a>
</p>
<p style="color:#64748b;font-size:14px">
  The link expires on <strong>${expiryDate}</strong> (7 days).
  After that, you can request a new export from your
  <a href="${SITE_URL}/account/privacy">privacy settings</a>.
</p>
<p>The export is a JSON file containing your profile, activity, and all personal data held by invest.com.au, provided under the Australian Privacy Principles (APP 12) and GDPR Article 15.</p>
<p>If you didn't request this export, please contact us immediately at <a href="mailto:privacy@invest.com.au">privacy@invest.com.au</a>.</p>
<p style="font-size:12px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">
  This email was sent to ${opts.email} because a data export was requested for this account.<br>
  invest.com.au &middot; <a href="${SITE_URL}/account/privacy">Privacy settings</a>
</p>
    `.trim(),
  };
}

// ---------------------------------------------------------------------------
// Cron handler
// ---------------------------------------------------------------------------

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  // Step 1: Find the oldest pending request.
  const { data: pending, error: selectError } = await supabase
    .from("data_export_requests")
    .select("id, user_id, email, requested_at")
    .eq("status", "pending")
    .order("requested_at", { ascending: true })
    .limit(1)
    .single();

  if (selectError) {
    if (selectError.code === "PGRST116") {
      // No rows — nothing to process.
      log.info("No pending data export requests");
      return NextResponse.json({ ok: true, processed: 0 });
    }
    if (selectError.message?.includes("does not exist")) {
      // Migration not yet applied to live DB (see A-MISSING-TABLE-1 in queue).
      log.info("data_export_requests table not found — migration not yet applied to live");
      return NextResponse.json({ ok: true, processed: 0, note: "table_not_found" });
    }
    log.error("Failed to query data_export_requests", { message: selectError.message });
    return NextResponse.json({ ok: false, error: selectError.message }, { status: 500 });
  }

  if (!pending) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  // Step 2: Claim it with a CAS-style update — guards against two cron fires
  // overlapping on the same row (the eq("status","pending") is the guard).
  const { data: claimed, error: claimError } = await supabase
    .from("data_export_requests")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", pending.id)
    .eq("status", "pending")
    .select("id, user_id, email, requested_at")
    .single();

  if (claimError || !claimed) {
    // Already claimed by another instance — graceful exit.
    log.info("Request was already claimed by another instance", { id: pending.id });
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const { id: requestId, user_id: userId, email } = claimed;
  log.info("Processing data export", { requestId, userId });

  const markFailed = async (msg: string) => {
    await supabase
      .from("data_export_requests")
      .update({
        status: "failed",
        error_message: msg.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
  };

  // Step 3: Gather user-owned data.
  const userData = await gatherUserData(supabase, userId, email);

  // Step 4: Build the JSON export bundle.
  const bundle = {
    export_id: String(requestId),
    user_id: userId,
    email,
    requested_at: claimed.requested_at,
    generated_at: new Date().toISOString(),
    compliance:
      "Australian Privacy Principle 12 (APP 12) — right of access to personal information. " +
      "GDPR Article 15 — right of access by the data subject.",
    data: userData,
  };

  // Step 5: Upload to private Supabase Storage bucket.
  const storagePath = `${userId}/${requestId}.json`;
  const { error: uploadError } = await supabase.storage
    .from(EXPORT_BUCKET)
    .upload(storagePath, JSON.stringify(bundle, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (uploadError) {
    const hint = uploadError.message.includes("Bucket not found")
      ? ` — create a private bucket named "${EXPORT_BUCKET}" in Supabase Dashboard → Storage`
      : "";
    const msg = `Storage upload failed: ${uploadError.message}${hint}`;
    await markFailed(msg);
    log.error("Storage upload failed", { requestId, error: uploadError.message });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Step 6: Create a signed URL (private — bucket is not public).
  const { data: signed, error: signedError } = await supabase.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed?.signedUrl) {
    const msg = `Signed URL creation failed: ${signedError?.message ?? "no URL returned"}`;
    await markFailed(msg);
    log.error("Signed URL creation failed", { requestId, error: signedError?.message });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  // Step 7: Email the user (best-effort — Resend failure is non-fatal; the
  // download URL is persisted in the DB row so the user can find it in
  // /account/privacy if the email is lost).
  const { subject, html } = exportReadyEmail({
    email,
    downloadUrl: signed.signedUrl,
    expiresAt,
  });
  const emailResult = await sendEmail({ to: email, subject, html });
  if (!emailResult.ok) {
    log.warn("Failed to send export-ready email (non-fatal)", {
      requestId,
      error: emailResult.error,
    });
  }

  // Step 8: Mark the request as ready.
  const { error: updateError } = await supabase
    .from("data_export_requests")
    .update({
      status: "ready",
      download_url: signed.signedUrl,
      expires_at: expiresAt,
      fulfilled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    // File is uploaded and email likely sent. The data-export-monitor will
    // alert if this row stays in processing too long.
    log.error("Failed to mark request ready", { requestId, error: updateError.message });
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  log.info("Data export complete", { requestId, userId, email_sent: emailResult.ok });

  return NextResponse.json({
    ok: true,
    processed: 1,
    request_id: requestId,
    email_sent: emailResult.ok,
  });
}

export const GET = wrapCronHandler("process-data-exports", handler);
