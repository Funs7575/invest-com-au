/**
 * Cron: Monthly Money Review invite — day 1 of each month at 09:00 UTC
 * (member of the monthly-1-9 dispatcher group).
 *
 * Invites eligible users to run their Monthly Money Review at
 * /account/review. DOUBLE-gated:
 *
 *   1. The `monthly_review` feature flag (fail-closed) — when off, the cron
 *      no-ops and nothing is sent, even though `user_reviews_log` may not
 *      exist yet in prod.
 *   2. Per-user email preference — only users with `weekly_digest` enabled
 *      (the same lifecycle-engagement opt-in the decisions digest uses).
 *
 * Suppression: `getSuppressedSet` is consulted up front, and `sendEmail`
 * re-checks at send time — belt and braces.
 *
 * Dedup WITHOUT a new table: before sending, we upsert a PENDING row into
 * user_reviews_log (completed_at NULL, snapshot '{}'). Users who already
 * have any row for this period — pending OR completed — are skipped, so the
 * invite fires at most once per user per month even across dispatcher
 * retries. Completing the review later just stamps completed_at + snapshot
 * on the same row.
 *
 * Push: a preference-gated nudge via dispatchPushToUser (which only sends to
 * users who opted into browser_push).
 */

import { NextRequest, NextResponse } from "next/server";
// Cron context (no user JWT): cross-user reads of prefs/auth + writes to
// user_reviews_log pending rows require service-role per CLAUDE.md § "Two
// Supabase clients" → "Admin routes, webhooks, cron jobs — always legitimate".
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { getSuppressedSet } from "@/lib/email-suppression";
import { dispatchPushToUser } from "@/lib/push-dispatch";
import { requireCronAuth } from "@/lib/cron-auth";
import { withCronRunLog } from "@/lib/cron-run-log";
import { isFlagEnabled } from "@/lib/feature-flags";
import { periodForDate, periodLabel } from "@/lib/monthly-review";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("monthly-review-invites");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";
const REVIEW_URL = `${BASE_URL}/account/review`;
const MAX_PER_RUN = 100;
const BATCH = 5;

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  return withCronRunLog<NextResponse>("monthly-review-invites", async () => {
    // ── Gate 1: feature flag (fail-closed, no userKey → global eval) ──────────
    const flagOn = await isFlagEnabled("monthly_review");
    if (!flagOn) {
      return {
        response: NextResponse.json({ sent: 0, skipped: "flag_off" }),
        stats: { sent: 0, errors: 0, flag_off: 1 },
      };
    }

    const supabase = createAdminClient();
    const period = periodForDate();
    const label = periodLabel(period);

    // ── Gate 2: email preference (weekly_digest opt-in) ───────────────────────
    const { data: prefUsers, error: prefError } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("weekly_digest", true);

    if (prefError) {
      log.error("Failed to fetch weekly_digest prefs", { error: prefError.message });
      return {
        response: NextResponse.json({ error: prefError.message }, { status: 500 }),
        stats: { sent: 0, errors: 1 },
      };
    }

    const optedInIds = (prefUsers ?? [])
      .map((u) => u.user_id as string | null)
      .filter((id): id is string => !!id);

    if (optedInIds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "No opted-in users" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    // ── Already invited / completed this period → skip (dedup via the row) ────
    let alreadyHandled = new Set<string>();
    try {
      const { data: existing } = await supabase
        .from("user_reviews_log")
        .select("user_id")
        .eq("period", period);
      alreadyHandled = new Set((existing ?? []).map((r) => r.user_id as string));
    } catch (err) {
      // Table may be absent in prod even with the flag on — fail soft: treat
      // as "nobody handled yet". The flag gate above is the real guard.
      log.warn("user_reviews_log existence check failed", { err: msg(err) });
    }

    const pendingIds = optedInIds
      .filter((id) => !alreadyHandled.has(id))
      .slice(0, MAX_PER_RUN);

    if (pendingIds.length === 0) {
      return {
        response: NextResponse.json({ sent: 0, message: "All eligible users already invited" }),
        stats: { sent: 0, errors: 0 },
      };
    }

    // ── Resolve emails ────────────────────────────────────────────────────────
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = new Map<string, string>();
    for (const u of authData?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email.toLowerCase());
    }

    const candidateEmails = pendingIds
      .map((id) => emailMap.get(id))
      .filter((e): e is string => !!e);
    const suppressed = await getSuppressedSet(candidateEmails);

    let sent = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < pendingIds.length; i += BATCH) {
      const batch = pendingIds.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(async (userId): Promise<"sent" | "skipped"> => {
          const email = emailMap.get(userId);
          if (!email || suppressed.has(email)) {
            return "skipped";
          }

          // Write the pending row FIRST so a mid-batch failure still records
          // the invite as handled (we'd rather skip a retry than double-send).
          const nowIso = new Date().toISOString();
          const { error: upsertErr } = await supabase.from("user_reviews_log").upsert(
            {
              user_id: userId,
              period,
              completed_at: null,
              snapshot: {},
              updated_at: nowIso,
            },
            { onConflict: "user_id,period", ignoreDuplicates: true },
          );
          if (upsertErr) {
            // If we can't mark it, don't send (avoids un-dedup'd repeats).
            throw new Error(`pending upsert failed: ${upsertErr.message}`);
          }

          const result = await sendEmail({
            to: email,
            subject: `Your ${label} money review is ready`,
            html: buildEmailHtml({ email, label }),
            from: "Invest.com.au <hello@invest.com.au>",
          });
          if (!result.ok) {
            // Suppressed / no-recipient is not a hard error; anything else is.
            if (result.error === "suppressed") {
              return "skipped";
            }
            throw new Error(result.error ?? "send failed");
          }

          // Best-effort push (dispatchPushToUser self-gates on browser_push).
          void dispatchPushToUser(userId, {
            title: `Your ${label} money review`,
            body: "10 minutes — net worth, goals, rates and open decisions.",
            url: "/account/review",
            tag: "monthly-review",
          });

          return "sent";
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          if (r.value === "sent") sent++;
          else skipped++;
        } else {
          errors++;
          log.warn("Monthly review invite failed", { error: msg(r.reason) });
        }
      }

      if (i + BATCH < pendingIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    log.info("Monthly review invites complete", { sent, errors, skipped, period });

    return {
      response: NextResponse.json({
        sent,
        errors,
        skipped,
        period,
        eligible: pendingIds.length,
      }),
      // `errored` mirrors `errors` so withCronRunLog flags the run "partial"
      // (its status check reads stats.errored/stats.failed) when sends fail.
      stats: { sent, errors, errored: errors, skipped },
    };
  });
}

// ─── Email template (matches the decisions-digest plain-HTML pattern) ─────────

function buildEmailHtml({ email, label }: { email: string; label: string }): string {
  const unsubUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:20px">
      <a href="${BASE_URL}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
      <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">Monthly Money Review &mdash; ${escapeHtml(label)}</p>
    </div>

    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:20px">
      <h1 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 6px">Your ${escapeHtml(label)} money review is ready</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px">A guided 10-minute check-in on what's moved since last month — your net worth, goals, rates and open decisions. One small action per section.</p>

      <ul style="font-size:14px;color:#475569;line-height:1.8;padding-left:18px;margin:0 0 20px">
        <li>💰 Net worth — what changed since your last review</li>
        <li>🎯 Goals — progress and what's on or off track</li>
        <li>📊 Rates — any of your tracked rates that moved</li>
        <li>📨 Open decisions — what's waiting for you</li>
      </ul>

      <div style="text-align:center">
        <a href="${REVIEW_URL}?utm_source=monthly_review&utm_medium=email" style="display:inline-block;padding:12px 26px;background:#0f172a;color:white;text-decoration:none;border-radius:9px;font-size:14px;font-weight:700">Start your review →</a>
      </div>
    </div>

    <div style="text-align:center;padding:10px 0">
      <p style="font-size:11px;color:#94a3b8;margin:0 0 6px">General information only — not personal financial advice. Figures are arithmetic on your own saved data.</p>
      <a href="${unsubUrl}" style="font-size:11px;color:#94a3b8;text-decoration:underline">Unsubscribe</a>
      <span style="color:#cbd5e1;margin:0 6px">&middot;</span>
      <a href="${BASE_URL}/account/notifications" style="font-size:11px;color:#94a3b8;text-decoration:underline">Manage preferences</a>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
