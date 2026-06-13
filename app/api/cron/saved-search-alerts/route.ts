/**
 * Cron: saved-search-alerts — daily digest fan-out for `saved_searches`.
 *
 * Auth: `requireCronAuth(req)` (CRON_SECRET shared header).
 * Cadence: daily; the Vercel cron schedule is configured in `vercel.json`.
 *
 * Algorithm:
 *   1. Pull every due saved_search: daily rows whose last_alerted_at is
 *      null or older than 23 hours, weekly rows older than 6.5 days (the
 *      weekly frequency was previously accepted by the API but never
 *      processed).
 *   2. Re-run its filter against the matching table (advisors → professionals,
 *      teams → expert_teams, invest → investment_listings — the invest
 *      filters are the /invest browse surface's raw URL params, interpreted
 *      by lib/listings/saved-searches.ts).
 *   3. Compute a stable sha256 of the sorted match ids.
 *      - If equal to last_match_signature → skip (no change since last digest).
 *      - Otherwise send a Resend email + stamp the new signature +
 *        last_alerted_at.
 *   4. Each row is fail-soft: one failure logs a warning and continues; one
 *      bad row never kills the batch.
 *
 * The signature pair (`last_alerted_at` + `last_match_signature`) lets the
 * cron be re-run safely after a partial failure — already-stamped rows are
 * skipped by the 23-hour gate, and stamped-but-unchanged rows are skipped
 * by the signature compare.
 */

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import {
  computeMatchSignature,
  type SavedSearchKind,
  type SavedSearchRow,
} from "@/lib/saved-searches";
import { categoryScope, listingUrl } from "@/lib/listing-url";
import {
  parseInvestFilters,
  matchesInvestFilters,
} from "@/lib/listings/saved-searches";

const log = logger("cron:saved-search-alerts");

export const runtime = "nodejs";
export const maxDuration = 60;

interface MatchedProvider {
  id: number;
  name: string;
  slug: string;
  href: string;
}

/**
 * Re-run the saved filter for an `advisors`-kind search. Filters honoured
 * (best-effort — unknown keys are ignored):
 *   - `state` (string): location_state equals
 *   - `types` (string[]): type in (...)
 *   - `verified` (boolean): verified equals true
 *
 * Always restricts to `status='active'`. Hard cap at 50 results to keep the
 * digest scannable + the email body small.
 */
async function matchAdvisors(filters: Record<string, unknown>): Promise<MatchedProvider[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("professionals")
    .select("id, name, slug, type, verified, location_state")
    .eq("status", "active")
    .limit(50);

  const state = typeof filters.state === "string" ? filters.state : null;
  if (state) q = q.eq("location_state", state);

  const types = Array.isArray(filters.types)
    ? (filters.types.filter((t): t is string => typeof t === "string"))
    : [];
  if (types.length > 0) q = q.in("type", types);

  if (filters.verified === true) q = q.eq("verified", true);

  const { data, error } = await q;
  if (error) {
    log.warn("matchAdvisors query failed", { error: error.message });
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as number,
    name: (r.name as string) || "Advisor",
    slug: (r.slug as string) || "",
    href: `/advisor/${(r.slug as string) || ""}`,
  }));
}

/**
 * Re-run the saved filter for a `teams`-kind search.
 * Filters honoured:
 *   - `state` (string): location_state equals
 *   - `team_category` (string): equals
 *   - `team_type` (string): equals
 *
 * Always restricts to `public=true AND verification_status='verified'`.
 */
async function matchTeams(filters: Record<string, unknown>): Promise<MatchedProvider[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("expert_teams")
    .select("id, name, slug, team_category, team_type, location_state")
    .eq("public", true)
    .eq("verification_status", "verified")
    .limit(50);

  const state = typeof filters.state === "string" ? filters.state : null;
  if (state) q = q.eq("location_state", state);

  const category = typeof filters.team_category === "string" ? filters.team_category : null;
  if (category) q = q.eq("team_category", category);

  const teamType = typeof filters.team_type === "string" ? filters.team_type : null;
  if (teamType) q = q.eq("team_type", teamType);

  const { data, error } = await q;
  if (error) {
    log.warn("matchTeams query failed", { error: error.message });
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as number,
    name: (r.name as string) || "Team",
    slug: (r.slug as string) || "",
    href: `/teams/${(r.slug as string) || ""}`,
  }));
}

/**
 * Re-run the saved filter for an `invest`-kind search. The stored filters
 * are the /invest browse surface's raw URL params (category/sub/state/
 * price-bucket/kind/firb/q); the DB query narrows on the indexed columns
 * and the pure matcher applies the full vocabulary (ticket buckets, derived
 * listing kinds, POA exclusion) in process.
 */
async function matchInvest(filters: Record<string, unknown>): Promise<MatchedProvider[]> {
  const supabase = createAdminClient();
  const parsed = parseInvestFilters(filters);

  let q = supabase
    .from("investment_listings")
    .select(
      "id, slug, title, description, vertical, sub_category, listing_kind, location_state, asking_price_cents, firb_eligible, siv_complying, key_metrics",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);
  if (parsed.state) q = q.ilike("location_state", parsed.state);
  // Scope category-bound searches server-side so the recency cap can't
  // starve a less-active category out of its matches. categoryScope
  // covers derived categories too (alternatives/private-credit narrow on
  // fund sub_categories, listed-securities on listing_kind) — without it
  // those searches would scan the newest 500 rows across every sector and
  // could stamp last_alerted_at having never seen their own matches. The
  // scope over-fetches by design; matchesInvestFilters stays the arbiter.
  if (parsed.category && parsed.category !== "all") {
    const scope = categoryScope(parsed.category);
    if (scope) {
      if (scope.verticals.length > 0) q = q.in("vertical", scope.verticals);
      if (scope.subCategories) q = q.in("sub_category", scope.subCategories);
      if (scope.listingKind) q = q.eq("listing_kind", scope.listingKind);
    }
  }

  const { data, error } = await q;
  if (error) {
    log.warn("matchInvest query failed", { error: error.message });
    return [];
  }
  return (data ?? [])
    .filter((row) => matchesInvestFilters(row, parsed))
    .slice(0, 50)
    .map((row) => ({
      id: row.id as number,
      name: (row.title as string) || "Listing",
      slug: (row.slug as string) || "",
      href: listingUrl(row as Parameters<typeof listingUrl>[0]),
    }));
}

async function runMatch(
  kind: SavedSearchKind,
  filters: Record<string, unknown>,
): Promise<MatchedProvider[] | null> {
  if (kind === "advisors") return matchAdvisors(filters);
  if (kind === "teams") return matchTeams(filters);
  if (kind === "invest") return matchInvest(filters);
  // Future kinds — skip rather than misfire.
  return null;
}

function buildDigestHtml(
  row: SavedSearchRow,
  matches: MatchedProvider[],
  baseUrl: string,
): string {
  const items = matches
    .slice(0, 10)
    .map(
      (m) =>
        `<li style="margin-bottom:8px"><a href="${baseUrl}${m.href}" style="color:#059669;text-decoration:none;font-weight:600">${escapeHtml(m.name)}</a></li>`,
    )
    .join("");
  const more =
    matches.length > 10
      ? `<p style="font-size:12px;color:#94a3b8;margin-top:8px">+ ${matches.length - 10} more</p>`
      : "";
  const manageUrl = `${baseUrl}/account/saved-searches`;
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <a href="${baseUrl}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
      <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">Saved-search digest</p>
    </div>
    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px">
      <h1 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px">${escapeHtml(row.label)}</h1>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px">${matches.length} new match${matches.length === 1 ? "" : "es"} for your saved ${row.kind === "advisors" ? "advisor" : row.kind === "teams" ? "team" : "listing"} search.</p>
      <ul style="padding-left:20px;margin:0">${items}</ul>
      ${more}
    </div>
    <div style="text-align:center;padding:16px 0">
      <a href="${manageUrl}" style="font-size:12px;color:#94a3b8;text-decoration:underline">Manage saved searches</a>
    </div>
  </div>
</body></html>`;
}


export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
  const weeklyCutoff = new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

  // Pull due rows. The 23-hour gate covers `null` last_alerted_at (PostgREST
  // `or` filter: never-alerted rows are due immediately). Weekly rows ride
  // the same daily run and are gated to a 6.5-day gap below.
  const { data, error } = await supabase
    .from("saved_searches")
    .select(
      "id, user_id, kind, label, filters, email_frequency, last_alerted_at, last_match_signature, created_at, updated_at",
    )
    .neq("email_frequency", "off")
    // Gate weekly rows in the predicate — a 1–6-day-old weekly search must
    // not consume batch capacity it can't use (it would be loop-skipped).
    .or(
      `and(email_frequency.eq.daily,or(last_alerted_at.is.null,last_alerted_at.lt.${cutoff})),` +
        `and(email_frequency.eq.weekly,or(last_alerted_at.is.null,last_alerted_at.lt.${weeklyCutoff}))`,
    )
    .limit(500);

  if (error) {
    log.error("saved_searches query failed", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data as SavedSearchRow[] | null) ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0, skipped: 0, errors: 0 });
  }

  // Hydrate user emails once for the whole batch — auth.admin.listUsers
  // paginates but our cap of 500 saved-search rows in a single run keeps
  // this manageable. If we ever exceed page size we'd switch to per-row
  // getUserById, but the join is cheaper at our volume.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const emailMap = new Map<string, string>();
  try {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) {
      if (u.email && userIds.includes(u.id)) emailMap.set(u.id, u.email);
    }
  } catch (err) {
    log.warn("auth.admin.listUsers failed", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      if (
        row.email_frequency === "weekly" &&
        row.last_alerted_at !== null &&
        row.last_alerted_at >= weeklyCutoff
      ) {
        skipped += 1;
        continue;
      }
      const matches = await runMatch(row.kind, row.filters);
      if (matches === null) {
        // Unsupported kind (e.g. 'invest') — stamp last_alerted_at so we
        // don't re-evaluate every minute, but don't send an email.
        await supabase
          .from("saved_searches")
          .update({ last_alerted_at: new Date().toISOString() })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }

      if (matches.length === 0) {
        // No matches at all — stamp last_alerted_at, leave signature null
        // (or unchanged). Don't email.
        await supabase
          .from("saved_searches")
          .update({ last_alerted_at: new Date().toISOString() })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }

      const signature = computeMatchSignature(matches);
      if (signature === row.last_match_signature) {
        // No change since last digest — skip the email but stamp
        // last_alerted_at so the row drops out of the 23h window.
        await supabase
          .from("saved_searches")
          .update({ last_alerted_at: new Date().toISOString() })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }

      const email = emailMap.get(row.user_id);
      if (!email) {
        log.warn("No email for user, skipping", { userId: row.user_id, rowId: row.id });
        skipped += 1;
        continue;
      }

      const result = await sendEmail({
        to: email,
        subject: `New matches for "${row.label}"`,
        html: buildDigestHtml(row, matches, baseUrl),
      });

      if (!result.ok) {
        log.warn("digest send failed", { rowId: row.id, error: result.error });
        errors += 1;
        continue;
      }

      await supabase
        .from("saved_searches")
        .update({
          last_alerted_at: new Date().toISOString(),
          last_match_signature: signature,
        })
        .eq("id", row.id);

      sent += 1;
    } catch (err) {
      // Fail-soft per row — never let one user's failure kill the batch.
      log.warn("digest row threw", {
        rowId: row.id,
        err: err instanceof Error ? err.message : String(err),
      });
      errors += 1;
    }
  }

  log.info("saved-search-alerts batch done", {
    processed: rows.length,
    sent,
    skipped,
    errors,
  });

  return NextResponse.json({
    processed: rows.length,
    sent,
    skipped,
    errors,
  });
}
