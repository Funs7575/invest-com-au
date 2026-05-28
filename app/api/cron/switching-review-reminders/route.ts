import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFlagEnabled } from "@/lib/feature-flags";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { sendEmail } from "@/lib/resend";

const log = logger("cron:switching-review-reminders");

export const runtime = "nodejs";
export const maxDuration = 120;

// Send an annual review reminder once the product has been held ≥364 days
// and either no reminder has been sent or the last one was ≥364 days ago.
const REVIEW_CADENCE_DAYS = 364;
const MAX_BATCH = 500;

/**
 * Daily cron — sends an annual "time to review your products" reminder to
 * users who have been on the same broker/savings account for a year or more
 * and haven't been reminded recently.
 *
 * General information only — not personal financial advice.
 *
 * Idempotency: last_review_reminder_at is updated immediately after a
 * successful send, so a same-day re-run skips already-processed rows.
 */
async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (!(await isFlagEnabled("email_drip_send"))) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_email_drip_send" });
  }

  if (!process.env.RESEND_API_KEY) {
    log.warn("RESEND_API_KEY not set — skipping switching-review-reminders");
    return NextResponse.json({ ok: true, skipped: "no_resend_api_key" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - REVIEW_CADENCE_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();
  const cutoffDate = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  const stats = {
    considered: 0,
    sent: 0,
    skipped: 0,
    no_email: 0,
    errors: 0,
  };

  // Fetch products due for a review reminder.
  // started_at is a date column — compare as text (ISO date sorts lexically).
  const { data: products, error } = await supabase
    .from("user_current_products")
    .select("id, user_id, product_kind, broker_name, started_at, last_review_reminder_at")
    .eq("status", "active")
    .lte("started_at", cutoffDate)
    .or(`last_review_reminder_at.is.null,last_review_reminder_at.lte.${cutoffIso}`)
    .order("started_at", { ascending: true })
    .limit(MAX_BATCH * 3); // over-fetch so we can group by user and still get MAX_BATCH users

  if (error) {
    log.error("Failed to fetch user_current_products", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  // Group by user_id so one email contains all due products for that user.
  interface UserProducts {
    userId: string;
    items: Array<{ id: string; productKind: string; brokerName: string; startedAt: string }>;
  }
  const byUser = new Map<string, UserProducts>();
  for (const p of products ?? []) {
    const userId = p.user_id as string;
    const existing = byUser.get(userId);
    const item = {
      id: p.id as string,
      productKind: p.product_kind as string,
      brokerName: p.broker_name as string,
      startedAt: p.started_at as string,
    };
    if (existing) {
      existing.items.push(item);
    } else {
      byUser.set(userId, { userId, items: [item] });
    }
  }

  const userIds = Array.from(byUser.keys()).slice(0, MAX_BATCH);
  stats.considered = userIds.length;

  if (userIds.length === 0) {
    log.info("switching-review-reminders — no eligible users", stats);
    return NextResponse.json({ ok: true, ...stats });
  }

  // Resolve user_id → email via profiles.
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  if (profilesErr) {
    log.error("Failed to fetch profiles", { error: profilesErr.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const userIdToEmail = new Map<string, string>();
  for (const p of profiles ?? []) {
    const id = p.id as string | null;
    const email = p.email as string | null;
    if (id && email) userIdToEmail.set(id, email.toLowerCase());
  }
  stats.no_email = userIds.length - userIdToEmail.size;

  // Fetch suppression list once.
  const { data: suppressedRows } = await supabase
    .from("email_suppression_list")
    .select("email");
  const suppressedSet = new Set(
    (suppressedRows ?? []).map((r) => (r.email as string).toLowerCase()),
  );

  const siteUrl = getSiteUrl();

  for (const userId of userIds) {
    const email = userIdToEmail.get(userId);
    if (!email) continue;
    if (suppressedSet.has(email)) {
      stats.skipped++;
      continue;
    }

    const info = byUser.get(userId);
    if (!info) continue;

    try {
      const html = renderEmail(email, info.items, siteUrl);
      const result = await sendEmail({
        to: email,
        subject: "Time to review your financial products",
        from: "Invest.com.au <hello@invest.com.au>",
        html,
      });

      if (!result.ok) {
        stats.errors++;
        log.warn("send failed", { userId, error: result.error });
        continue;
      }

      // Update last_review_reminder_at for all products sent in this email.
      const productIds = info.items.map((i) => i.id);
      const { error: updateErr } = await supabase
        .from("user_current_products")
        .update({ last_review_reminder_at: now.toISOString(), updated_at: now.toISOString() })
        .in("id", productIds)
        .eq("user_id", userId);

      if (updateErr) {
        log.warn("Failed to update last_review_reminder_at", {
          userId,
          error: updateErr.message,
        });
      }

      stats.sent++;
    } catch (err) {
      stats.errors++;
      log.error("switching-review-reminders per-user failure", {
        userId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("switching-review-reminders completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

interface ProductItem {
  productKind: string;
  brokerName: string;
  startedAt: string;
}

function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    broker: "Share broker",
    savings_account: "Savings account",
    term_deposit: "Term deposit",
    super: "Super fund",
    crypto: "Crypto exchange",
  };
  return labels[kind] ?? kind;
}

function renderEmail(email: string, items: ProductItem[], siteUrl: string): string {
  const ctaUrl = `${siteUrl}/account?utm_source=email&utm_campaign=switching-review`;
  const itemRows = items
    .map((item) => {
      const years = Math.floor(
        (Date.now() - new Date(item.startedAt).getTime()) / (365.25 * 24 * 3600 * 1000),
      );
      const label = `${kindLabel(item.productKind)}: <strong>${escapeHtml(item.brokerName)}</strong> (${years}+ year${years === 1 ? "" : "s"})`;
      return `<li style="margin:6px 0;color:#334155;font-size:14px;line-height:1.6">${label}</li>`;
    })
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#0f172a;font-size:18px;margin-bottom:16px">Annual product check-in</h2>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        It's been over a year since you started using one or more of the products
        you're tracking on Invest.com.au. Market conditions and fees change — now
        is a good time to compare what else is available.
      </p>
      <p style="color:#334155;font-size:14px;line-height:1.6;margin-top:12px">
        Products due for review:
      </p>
      <ul style="padding-left:20px;margin:8px 0 20px">
        ${itemRows}
      </ul>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        We can show you how much you might save by switching to a lower-cost or
        higher-rate alternative. This is general information only — not personal
        financial advice.
      </p>
      <p style="margin:24px 0">
        <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
          Review my products →
        </a>
      </p>
      <p style="color:#94a3b8;font-size:11px;margin-top:24px">
        You're receiving this because you're tracking products on your Invest.com.au account.
        <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`;
}

export const GET = wrapCronHandler("switching-review-reminders", handler);
