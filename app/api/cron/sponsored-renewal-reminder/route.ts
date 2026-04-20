import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { SITE_URL } from "@/lib/seo";

const log = logger("cron:sponsored-renewal-reminder");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Daily sweep that emails the booker 7 days before a sponsored
 * placement ends. Idempotent via the renewal_reminder_sent_at column
 * (a partial index keeps the lookup cheap).
 *
 * Window picked: ends_at BETWEEN now+6d AND now+8d. The 2-day window
 * is deliberately wider than the daily cadence so a skipped run does
 * not silently drop a reminder on the floor — the next run still
 * catches it.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 6 * 86_400_000).toISOString();
  const windowEnd = new Date(now.getTime() + 8 * 86_400_000).toISOString();

  const { data: due, error } = await supabase
    .from("sponsored_placement_bookings")
    .select("id, broker_slug, tier, ends_at, created_by, notes")
    .eq("status", "active")
    .is("renewal_reminder_sent_at", null)
    .gte("ends_at", windowStart)
    .lte("ends_at", windowEnd)
    .limit(100);

  if (error) {
    log.error("due_query_failed", { err: error.message });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, reminded: 0 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn("RESEND_API_KEY missing — cannot send reminders");
    return NextResponse.json({ ok: true, reminded: 0, reason: "no_api_key" });
  }

  let reminded = 0;
  let skipped = 0;

  for (const booking of due) {
    const email = extractEmail(booking.created_by, booking.notes);
    if (!email) {
      log.warn("no_email_resolvable", { booking_id: booking.id });
      skipped++;
      continue;
    }

    const brokerDisplay = await resolveBrokerName(supabase, booking.broker_slug);
    const endsAtLabel = new Date(booking.ends_at).toLocaleDateString("en-AU", {
      dateStyle: "medium",
    });
    const prettyTierLabel = prettyTier(booking.tier);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: [email],
          subject: `Your ${prettyTierLabel} slot ends ${endsAtLabel} — renew now?`,
          html: renderEmail({
            brokerName: brokerDisplay,
            tierLabel: prettyTierLabel,
            endsAtLabel,
          }),
        }),
      });
      if (!res.ok) {
        log.error("resend_api_error", {
          booking_id: booking.id,
          status: res.status,
        });
        skipped++;
        continue;
      }
    } catch (err) {
      log.error("resend_fetch_failed", {
        booking_id: booking.id,
        err: err instanceof Error ? err.message : String(err),
      });
      skipped++;
      continue;
    }

    const { error: updErr } = await supabase
      .from("sponsored_placement_bookings")
      .update({ renewal_reminder_sent_at: now.toISOString() })
      .eq("id", booking.id);
    if (updErr) {
      // Worst case: reminder sent, flag not flipped → duplicate email
      // tomorrow. Still less bad than silent churn.
      log.error("mark_sent_failed", {
        booking_id: booking.id,
        err: updErr.message,
      });
    }
    reminded++;
  }

  return NextResponse.json({ ok: true, reminded, skipped });
}

/** @internal exported for unit tests */
export function extractEmail(
  createdBy: string | null,
  notes: string | null,
): string | null {
  if (createdBy && createdBy.includes("@")) return createdBy.trim();
  if (notes) {
    const m = notes.match(/<([^>]+@[^>]+)>/);
    if (m) return m[1];
    if (notes.includes("@")) return notes.trim();
  }
  return null;
}

async function resolveBrokerName(
  supabase: ReturnType<typeof createAdminClient>,
  slug: string,
): Promise<string> {
  const { data } = await supabase
    .from("brokers")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();
  return data?.name ?? slug;
}

function prettyTier(t: string): string {
  return t
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function renderEmail({
  brokerName,
  tierLabel,
  endsAtLabel,
}: {
  brokerName: string;
  tierLabel: string;
  endsAtLabel: string;
}): string {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
    <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
      <span style="color: #fff; font-weight: 800; font-size: 16px;">Renewal reminder — 7 days to go</span>
    </div>
    <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Your ${escapeBasic(tierLabel)} slot for ${escapeBasic(brokerName)} ends ${escapeBasic(endsAtLabel)}</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
        Want to keep the placement live without a gap? Re-book now and we'll roll the next window on seamlessly the moment the current one ends — no impressions lost.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${SITE_URL}/advertise/featured-placement" style="display: inline-block; padding: 12px 28px; background: #f59e0b; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Renew my placement →</a>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.55; margin: 16px 0 0;">
        See live campaign stats any time in your <a href="${SITE_URL}/broker-portal/sponsored-slots" style="color: #2563eb;">Broker Portal dashboard</a>.
      </p>
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
        Invest.com.au — Independent investing education &amp; comparison<br>
        <a href="${SITE_URL}/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

function escapeBasic(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
