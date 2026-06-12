/**
 * Cron: weekly "demand in your area" digest for demand-board alert
 * subscribers (idea #23, RETENTION_MARKETPLACE_MEGA_SESSIONS).
 *
 * Audience: `prospects` rows captured by POST /api/demand-alerts
 * (source='other', external_id 'demand-alert:<email>') — advisers who
 * are NOT yet registered but asked to hear about open briefs matching
 * their state/type interests.
 *
 * Behaviour:
 *   - Gated behind the `demand_alerts` feature flag (fail-closed: flag
 *     absent ⇒ off ⇒ the cron no-ops). Ships dormant.
 *   - Pulls the anonymised open-demand rows once, then matches each
 *     subscriber's interests in memory. Zero matches ⇒ no email — we
 *     never send empty digests.
 *   - Budget detail in the email follows the board's suppression rule:
 *     a typical-budget line only appears when ≥ MIN_BAND_SAMPLE matched
 *     briefs carry a band. Counts are always safe; single-brief band
 *     detail never is.
 *   - Per-prospect weekly dedupe via `prospects.last_contacted_at`
 *     (skip if contacted < 6 days ago) so a re-run is idempotent.
 *   - Suppression honoured twice: rows with status='unsubscribed' are
 *     excluded here, and lib/resend's sendEmail checks the global
 *     suppression_list before any send. Every email carries the
 *     standard /unsubscribe link, which also flips these prospects to
 *     status='unsubscribed' (see app/api/unsubscribe/route.ts).
 *
 * Registered in lib/cron-groups.ts under weekly-mon-8.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { isFlagEnabled } from "@/lib/feature-flags";
import { sendEmail } from "@/lib/resend";
import { getSiteUrl } from "@/lib/url";
import { escapeHtml } from "@/lib/html-escape";
import {
  aggregateDemand,
  fetchOpenDemandRows,
  budgetBandLabel,
  DEMAND_ALERT_EXTERNAL_PREFIX,
  type DemandSourceRow,
  type DemandSnapshot,
} from "@/lib/demand-board";
import { QUOTE_ADVISOR_TYPES, QUOTE_AU_STATES } from "@/lib/api-schemas";

const log = logger("cron:demand-alerts-digest");

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BATCH = 500;
const MIN_DAYS_BETWEEN_SENDS = 6;
const MAX_CELL_LINES = 8;

const STATE_SET: ReadonlySet<string> = new Set(QUOTE_AU_STATES);
const TYPE_SET: ReadonlySet<string> = new Set(QUOTE_ADVISOR_TYPES);

interface ProspectRow {
  id: string;
  contact_email: string | null;
  status: string;
  last_contacted_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface Interests {
  states: string[];
  types: string[];
}

/** Parse + sanitise stored interests; unknown values are dropped, empty = "all". */
function parseInterests(metadata: Record<string, unknown> | null): Interests {
  const rawStates = Array.isArray(metadata?.states) ? metadata.states : [];
  const rawTypes = Array.isArray(metadata?.advisor_types) ? metadata.advisor_types : [];
  return {
    states: rawStates.filter((s): s is string => typeof s === "string" && STATE_SET.has(s)),
    types: rawTypes.filter((t): t is string => typeof t === "string" && TYPE_SET.has(t)),
  };
}

function matchesInterests(row: DemandSourceRow, interests: Interests): boolean {
  if (interests.states.length > 0) {
    if (!row.location || !interests.states.includes(row.location)) return false;
  }
  if (interests.types.length > 0) {
    const types = row.advisor_types ?? [];
    if (!types.some((t) => interests.types.includes(t))) return false;
  }
  return true;
}

async function handler(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  // Fail-closed launch gate: `demand_alerts` must be explicitly created
  // AND enabled before a single email leaves. Missing flag ⇒ off.
  if (!(await isFlagEnabled("demand_alerts"))) {
    return NextResponse.json({ ok: true, skipped: "flag_demand_alerts_off" });
  }

  if (!process.env.RESEND_API_KEY) {
    log.warn("RESEND_API_KEY not set — exiting cron without sends");
    return NextResponse.json({ ok: true, skipped: "no_resend_api_key" });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const stats = {
    considered: 0,
    sent: 0,
    skipped_no_match: 0,
    skipped_recent: 0,
    suppressed: 0,
    errors: 0,
  };

  const { data: prospectsRaw, error: prospectsErr } = await supabase
    .from("prospects")
    .select("id, contact_email, status, last_contacted_at, metadata")
    .eq("source", "other")
    .like("external_id", `${DEMAND_ALERT_EXTERNAL_PREFIX}%`)
    .neq("status", "unsubscribed")
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);

  if (prospectsErr) {
    log.error("prospects fetch failed", { error: prospectsErr.message });
    return NextResponse.json({ ok: false, error: "prospects_fetch_failed" }, { status: 500 });
  }

  const prospects = (prospectsRaw ?? []) as ProspectRow[];
  if (prospects.length === 0) {
    log.info("no demand-alert subscribers");
    return NextResponse.json({ ok: true, ...stats });
  }

  // One anonymised demand fetch shared across every subscriber.
  const openRows = await fetchOpenDemandRows();
  if (openRows.length === 0) {
    log.info("no open public demand — skipping all digests");
    return NextResponse.json({ ok: true, skipped: "no_open_demand", subscribers: prospects.length });
  }

  const siteUrl = getSiteUrl();
  const recentCutoffMs = now.getTime() - MIN_DAYS_BETWEEN_SENDS * 24 * 3_600_000;

  for (const prospect of prospects) {
    const email = prospect.contact_email?.trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    stats.considered += 1;

    if (prospect.last_contacted_at && Date.parse(prospect.last_contacted_at) > recentCutoffMs) {
      stats.skipped_recent += 1;
      continue;
    }

    const interests = parseInterests(prospect.metadata);
    const matched = openRows.filter((row) => matchesInterests(row, interests));
    if (matched.length === 0) {
      stats.skipped_no_match += 1;
      continue;
    }

    try {
      const snapshot = aggregateDemand(matched, now);
      const subject = `${snapshot.totalOpen} open advice brief${snapshot.totalOpen === 1 ? "" : "s"} matching your alert`;
      const result = await sendEmail({
        to: email,
        subject,
        from: "Invest.com.au <hello@invest.com.au>",
        html: renderDigestHtml(snapshot, interests, email, siteUrl),
      });

      if (!result.ok) {
        if (result.error === "suppressed") {
          stats.suppressed += 1;
        } else {
          stats.errors += 1;
          log.warn("send failed", { error: result.error });
        }
        continue;
      }

      // Stamp AFTER a successful send so a transient Resend failure
      // doesn't mark the prospect as contacted.
      const update: Record<string, unknown> = {
        last_contacted_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      if (prospect.status === "new") update.status = "contacted";
      const { error: stampErr } = await supabase.from("prospects").update(update).eq("id", prospect.id);
      if (stampErr) {
        // Email already shipped — warn, don't fail the run. Worst case
        // is one duplicate next run.
        log.warn("last_contacted_at stamp failed", { error: stampErr.message });
      }
      stats.sent += 1;
    } catch (err) {
      stats.errors += 1;
      log.error("per-prospect digest failure", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("demand digest completed", stats);
  return NextResponse.json({ ok: true, ...stats });
}

function interestSummary(interests: Interests, snapshot: DemandSnapshot): string {
  const typePart =
    interests.types.length > 0
      ? snapshot.byType
          .filter((t) => interests.types.includes(t.type))
          .map((t) => t.label)
          .slice(0, 3)
          .join(", ") || "your selected specialties"
      : "all specialties";
  const statePart = interests.states.length > 0 ? interests.states.join(", ") : "all of Australia";
  return `${typePart} · ${statePart}`;
}

function renderDigestHtml(
  snapshot: DemandSnapshot,
  interests: Interests,
  email: string,
  siteUrl: string,
): string {
  const cellLines = snapshot.cells
    .slice(0, MAX_CELL_LINES)
    .map(
      (cell) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 600;">${escapeHtml(cell.label)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155;">${escapeHtml(cell.state)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; text-align: right;">${cell.count} open</td>
        </tr>`,
    )
    .join("");

  // Band detail only above the suppression threshold — never expose the
  // budget of an identifiable single brief.
  const budgetLine = snapshot.medianOpenBand
    ? `<p style="font-size: 13px; color: #334155; margin: 12px 0 0;">Typical stated budget across these briefs: <strong>${escapeHtml(budgetBandLabel(snapshot.medianOpenBand))}</strong>.</p>`
    : "";

  const boardUrl = `${siteUrl}/for-advisors/demand?utm_source=email&utm_campaign=demand-alerts-digest`;
  const signupUrl = `${siteUrl}/advisor-signup?utm_source=email&utm_campaign=demand-alerts-digest`;

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 32px 24px;">
    <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px;">
      Demand in your area
    </div>
    <h1 style="font-size: 22px; color: #0f172a; margin: 0 0 4px;">
      ${snapshot.totalOpen} open brief${snapshot.totalOpen === 1 ? "" : "s"} matching your alert
    </h1>
    <p style="font-size: 13px; color: #64748b; margin: 0 0 20px;">
      ${escapeHtml(interestSummary(interests, snapshot))} · ${snapshot.postedThisWeek} posted in the last 7 days
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 0 0 4px;">
      ${cellLines}
    </table>
    ${budgetLine}

    <p style="margin: 24px 0 0;">
      <a href="${boardUrl}" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">See the live demand board →</a>
    </p>
    <p style="margin: 12px 0 0;">
      <a href="${signupUrl}" style="font-size: 13px; color: #15803d; font-weight: 600; text-decoration: none;">Join the adviser network to respond to these briefs →</a>
    </p>

    <div style="margin: 32px 0 0; padding: 20px 0 0; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0 0 8px;">
        Counts and budget bands are anonymised aggregates of live consumer briefs on Invest.com.au —
        estimates only, general information, not a guarantee of work or earnings.
        You're receiving this because you set a demand alert on invest.com.au.
      </p>
      <p style="font-size: 12px; margin: 0;">
        <a href="${siteUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #64748b;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const GET = wrapCronHandler("demand-alerts-digest", handler);
