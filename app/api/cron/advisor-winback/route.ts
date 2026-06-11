import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import { sendEmail } from "@/lib/resend";
import { getSuppressedSet } from "@/lib/email-suppression";
import { getTier } from "@/lib/advisor-tiers";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

const log = logger("cron:advisor-winback");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Weekly cron: ONE factual win-back email to lapsed paid advisors.
 *
 * "Lapsed" (the definition the schema actually supports): an advisor
 * whose subscription was cancelled or downgraded to free —
 *   professionals.status = 'active'         (still listed in the directory)
 *   AND advisor_tier = 'free'               (on the unpaid tier now)
 *   AND tier_changed_at IS NOT NULL         (only the downgrade flows stamp
 *                                            this; an advisor on free with a
 *                                            tier_changed_at previously held
 *                                            a paid tier)
 *   AND tier_changed_at between 7 and 120 days ago (grace week after the
 *                                            downgrade; stop after ~4 months)
 *
 * Email claims are limited to what the data supports:
 *   - profile views in the last 30 days (advisor_profile_views)
 *   - new enquiries placed with same-type advisors in their state in the
 *     last 30 days (professional_leads across the cohort, excluding self)
 * Advisors with neither signal are skipped — no filler emails.
 *
 * Consent + dedupe:
 *   - professionals.digest_opt_out = true → never emailed
 *   - suppression list (lib/email-suppression union check) → never emailed
 *     (sendEmail re-checks as a second layer)
 *   - advisor_winback_sends row within WINBACK_COOLDOWN_DAYS → skipped;
 *     the dedupe row is written BEFORE the send (pro-digest pattern) so a
 *     crash can never double-send
 *
 * CTA reuses the existing self-service upgrade page
 * (/advisor-portal/upgrade → Stripe checkout). No new payment flows.
 */

const WINBACK_MIN_DAYS = 7;
const WINBACK_MAX_DAYS = 120;
const WINBACK_COOLDOWN_DAYS = 60;
const MAX_CANDIDATES_PER_RUN = 200;
const COHORT_CACHE_MAX_IDS = 200;

interface LapsedAdvisor {
  id: number;
  name: string | null;
  email: string | null;
  type: string | null;
  location_state: string | null;
  digest_opt_out: boolean | null;
  tier_change_reason: string | null;
  tier_changed_at: string;
}

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  if (await isFeatureDisabled("advisor_winback")) {
    return NextResponse.json({ ok: true, skipped: "kill_switch_on" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINBACK_MAX_DAYS * 86400_000).toISOString();
  const windowEnd = new Date(now.getTime() - WINBACK_MIN_DAYS * 86400_000).toISOString();
  const cooldownStart = new Date(now.getTime() - WINBACK_COOLDOWN_DAYS * 86400_000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();

  const stats = {
    scanned: 0,
    sent: 0,
    opted_out: 0,
    suppressed: 0,
    deduped: 0,
    skipped_no_signal: 0,
    failed: 0,
  };

  const { data: candidates, error } = await supabase
    .from("professionals")
    .select(
      "id, name, email, type, location_state, digest_opt_out, tier_change_reason, tier_changed_at",
    )
    .eq("status", "active")
    .eq("advisor_tier", "free")
    .not("tier_changed_at", "is", null)
    .gte("tier_changed_at", windowStart)
    .lte("tier_changed_at", windowEnd)
    .not("email", "is", null)
    .limit(MAX_CANDIDATES_PER_RUN);

  if (error) {
    log.error("Failed to fetch lapsed advisors", { error: error.message });
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 500 });
  }

  const lapsed = (candidates ?? []) as LapsedAdvisor[];
  stats.scanned = lapsed.length;
  if (lapsed.length === 0) {
    return NextResponse.json({ ok: true, ...stats });
  }

  // One round-trip each for suppression + recent sends across the batch.
  const suppressed = await getSuppressedSet(
    lapsed.map((a) => a.email ?? "").filter(Boolean),
  );
  const { data: recentSends } = await supabase
    .from("advisor_winback_sends")
    .select("professional_id")
    .in("professional_id", lapsed.map((a) => a.id))
    .gte("sent_at", cooldownStart);
  const recentlySent = new Set(
    ((recentSends ?? []) as Array<{ professional_id: number }>).map((r) => r.professional_id),
  );

  // Cohort enquiry counts cached per (type, state) so N lapsed advisors in
  // the same market share two queries.
  const cohortIdsCache = new Map<string, number[]>();

  for (const advisor of lapsed) {
    try {
      const email = (advisor.email ?? "").toLowerCase();
      if (!email) {
        stats.failed++;
        continue;
      }
      if (advisor.digest_opt_out) {
        stats.opted_out++;
        continue;
      }
      if (suppressed.has(email)) {
        stats.suppressed++;
        continue;
      }
      if (recentlySent.has(advisor.id)) {
        stats.deduped++;
        continue;
      }

      // ── Factual claim 1: profile views, last 30 days ──
      const { data: views } = await supabase
        .from("advisor_profile_views")
        .select("view_count")
        .eq("professional_id", advisor.id)
        .gte("view_date", thirtyDaysAgo.split("T")[0]);
      const views30d = ((views ?? []) as Array<{ view_count: number | null }>).reduce(
        (s, v) => s + (v.view_count || 0),
        0,
      );

      // ── Factual claim 2: cohort enquiries (same type + state), last 30d ──
      let cohortEnquiries30d = 0;
      if (advisor.type && advisor.location_state) {
        const cacheKey = `${advisor.type}|${advisor.location_state}`;
        let cohortIds = cohortIdsCache.get(cacheKey);
        if (!cohortIds) {
          const { data: cohort } = await supabase
            .from("professionals")
            .select("id")
            .eq("status", "active")
            .eq("type", advisor.type)
            .eq("location_state", advisor.location_state)
            .limit(COHORT_CACHE_MAX_IDS);
          cohortIds = ((cohort ?? []) as Array<{ id: number }>).map((c) => c.id);
          cohortIdsCache.set(cacheKey, cohortIds);
        }
        const peerIds = cohortIds.filter((id) => id !== advisor.id);
        if (peerIds.length > 0) {
          const { count } = await supabase
            .from("professional_leads")
            .select("id", { count: "exact", head: true })
            .in("professional_id", peerIds)
            .gte("created_at", thirtyDaysAgo);
          cohortEnquiries30d = count ?? 0;
        }
      }

      // No supportable claims → no email. Win-back without a factual hook
      // is just spam.
      if (views30d === 0 && cohortEnquiries30d === 0) {
        stats.skipped_no_signal++;
        continue;
      }

      // Dedupe row FIRST so a crash mid-send can never double-email.
      const { error: writeErr } = await supabase.from("advisor_winback_sends").insert({
        professional_id: advisor.id,
        tier_change_reason: advisor.tier_change_reason,
        profile_views_30d: views30d,
        cohort_enquiries_30d: cohortEnquiries30d,
      });
      if (writeErr) {
        log.error("winback dedupe insert failed", {
          professional_id: advisor.id,
          error: writeErr.message,
        });
        stats.failed++;
        continue;
      }

      const ok = await sendWinbackEmail({
        email,
        name: advisor.name,
        type: advisor.type,
        state: advisor.location_state,
        lapsedAt: advisor.tier_changed_at,
        views30d,
        cohortEnquiries30d,
      });
      if (ok) {
        stats.sent++;
      } else {
        stats.failed++;
      }
    } catch (err) {
      stats.failed++;
      log.error("winback per-advisor failure", {
        id: advisor.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("advisor winback completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

async function sendWinbackEmail(input: {
  email: string;
  name: string | null;
  type: string | null;
  state: string | null;
  lapsedAt: string;
  views30d: number;
  cohortEnquiries30d: number;
}): Promise<boolean> {
  const firstName = escapeHtml((input.name ?? "there").trim().split(" ")[0] || "there");
  const lapsedDate = escapeHtml(
    new Date(input.lapsedAt).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
  const typeLabel = escapeHtml(
    (input.type && PROFESSIONAL_TYPE_LABELS[input.type as keyof typeof PROFESSIONAL_TYPE_LABELS]) ||
      "advisors",
  );

  const claims: string[] = [];
  if (input.views30d > 0) {
    claims.push(
      `<li style="margin:4px 0">Your profile was viewed <strong>${input.views30d.toLocaleString("en-AU")} time${input.views30d === 1 ? "" : "s"}</strong> in the last 30 days.</li>`,
    );
  }
  if (input.cohortEnquiries30d > 0 && input.state) {
    claims.push(
      `<li style="margin:4px 0"><strong>${input.cohortEnquiries30d.toLocaleString("en-AU")} new enquir${input.cohortEnquiries30d === 1 ? "y was" : "ies were"}</strong> placed with ${typeLabel.toLowerCase()} in ${escapeHtml(input.state)} in the last 30 days.</li>`,
    );
  }

  const growth = getTier("growth");
  const planLine = growth
    ? `Plans start at $${(growth.monthlyPriceCents / 100).toFixed(0)}/month and you can change or cancel any time.`
    : "You can change or cancel plans any time.";

  const subject =
    input.views30d > 0
      ? `Your invest.com.au profile: ${input.views30d.toLocaleString("en-AU")} view${input.views30d === 1 ? "" : "s"} in the last 30 days`
      : `Enquiry activity in your area since your plan changed`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <p style="color:#334155;font-size:14px;line-height:1.6">Hi ${firstName},</p>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Since your plan moved to Free on ${lapsedDate}, here's what the numbers say:
      </p>
      <ul style="color:#334155;font-size:14px;line-height:1.6;padding-left:20px">
        ${claims.join("\n        ")}
      </ul>
      <p style="color:#334155;font-size:14px;line-height:1.6">
        Your profile is still live in the directory. If you'd like the higher
        search placement, lower per-lead pricing and bigger monthly lead
        allowance of a paid plan again, you can switch back in a couple of
        minutes. ${escapeHtml(planLine)}
      </p>
      <p style="margin:24px 0">
        <a href="${getSiteUrl()}/advisor-portal/upgrade" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Compare plans &rarr;</a>
      </p>
      <p style="color:#94a3b8;font-size:11px;line-height:1.6">
        You're receiving this because you have an advisor profile on invest.com.au.
        <a href="${getSiteUrl()}/unsubscribe?email=${encodeURIComponent(input.email)}" style="color:#94a3b8">Unsubscribe from these emails</a>
        or manage notification preferences in the <a href="${getSiteUrl()}/advisor-portal" style="color:#94a3b8">advisor portal</a>.
      </p>
    </div>`;

  const { ok, error } = await sendEmail({
    from: "Invest.com.au Advisors <advisors@invest.com.au>",
    to: input.email,
    subject,
    html,
  });
  if (!ok) {
    log.warn("winback send rejected", { to: input.email, error });
  }
  return ok;
}

export const GET = wrapCronHandler("advisor-winback", handler);
