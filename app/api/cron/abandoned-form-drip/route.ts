import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("cron:abandoned-form-drip");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Daily cron — recovers sessions that started a lead form but
 * never completed it.
 *
 * Recovery criteria:
 *   1. form_events has at least one 'view' for advisor_enquiry /
 *      broker_apply / lead_form in the last 48-72 hours
 *   2. no 'complete' event for the same session
 *   3. email_captures has a row for the session_id (user gave us
 *      an email at some point — usually via the quiz or email
 *      capture modal)
 *   4. email_captures.recovery_sent_at is null
 *   5. email is not in email_suppression_list and not marked bounced
 *
 * Writes recovery_sent_at so the same session is never emailed
 * twice. Fire-and-forget email send.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("abandoned_form_drip")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const stats = { scanned: 0, sent: 0, suppressed: 0, no_email: 0, failed: 0 };

  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

  // Step 1: find candidate sessions — started a lead form in the
  // 48-72h window, no complete event, grouped by session_id
  const { data: viewEvents } = await supabase
    .from("form_events")
    .select("session_id, form_name")
    .in("form_name", ["advisor_enquiry", "broker_apply", "lead_form"])
    .eq("event", "view")
    .gte("created_at", seventyTwoHoursAgo)
    .lte("created_at", fortyEightHoursAgo);

  const candidates = new Set<string>();
  const sessionForm = new Map<string, string>();
  for (const e of viewEvents || []) {
    candidates.add(e.session_id as string);
    if (!sessionForm.has(e.session_id as string)) {
      sessionForm.set(e.session_id as string, e.form_name as string);
    }
  }

  // Step 2: remove any session that DID complete
  if (candidates.size > 0) {
    const { data: completes } = await supabase
      .from("form_events")
      .select("session_id")
      .in("session_id", [...candidates])
      .eq("event", "complete");
    for (const c of completes || []) candidates.delete(c.session_id as string);
  }

  stats.scanned = candidates.size;
  if (candidates.size === 0) {
    return NextResponse.json({ ok: true, ...stats });
  }

  // Step 3: find email captures for these sessions that haven't
  // been sent a recovery email yet
  const { data: captures } = await supabase
    .from("email_captures")
    .select("email, session_id, recovery_sent_at, status")
    .in("session_id", [...candidates])
    .is("recovery_sent_at", null);

  // Step 4: pull the suppression list
  const { data: suppressed } = await supabase
    .from("email_suppression_list")
    .select("email");
  const suppressedSet = new Set(
    (suppressed || []).map((r) => (r.email as string).toLowerCase()),
  );

  for (const cap of captures || []) {
    try {
      const email = (cap.email as string).toLowerCase();
      if ((cap.status as string) === "bounced" || suppressedSet.has(email)) {
        stats.suppressed++;
        continue;
      }

      const form = sessionForm.get(cap.session_id as string) || "lead_form";
      await sendRecoveryEmail(email, form);
      await supabase
        .from("email_captures")
        .update({ recovery_sent_at: now.toISOString() })
        .eq("email", email);
      stats.sent++;
    } catch (err) {
      stats.failed++;
      log.error("abandoned form recovery per-row failure", {
        email: cap.email,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Any session that had no email capture
  stats.no_email = candidates.size - (captures?.length || 0);

  log.info("abandoned form recovery completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

async function sendRecoveryEmail(email: string, form: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const friendlyForm =
    form === "advisor_enquiry"
      ? "advisor enquiry"
      : form === "broker_apply"
        ? "broker application"
        : "lead form";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;font-size:18px">Picked it back up?</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        You started a ${escapeHtml(friendlyForm)} with us a couple of days ago but didn&apos;t
        finish it. Common reasons people pause:
      </p>
      <ul style="color:#334155;font-size:14px;line-height:1.8">
        <li>Wanted to check fees before committing — try the <a href="${getSiteUrl()}/fee-impact" style="color:#0f172a;font-weight:600">fee calculator</a></li>
        <li>Wasn&apos;t sure which broker to compare — try the <a href="${getSiteUrl()}/quiz" style="color:#0f172a;font-weight:600">60-second quiz</a></li>
        <li>Needed a human opinion — <a href="${getSiteUrl()}/find-advisor" style="color:#0f172a;font-weight:600">find an advisor</a></li>
      </ul>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Come back when you&apos;re ready — your progress is saved.
      </p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">
        <a href="${getSiteUrl()}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Invest.com.au <hello@invest.com.au>",
      to: [email],
      subject: `Still thinking about it? (We saved your progress)`,
      html,
    }),
  }).catch((err) =>
    log.warn("resend send failed", {
      err: err instanceof Error ? err.message : String(err),
    }),
  );
}

export const GET = wrapCronHandler("abandoned-form-drip", handler);
