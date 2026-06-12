import { NextRequest, NextResponse } from "next/server";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import {
  parseInvestFilters,
  matchesInvestFilters,
  matchSignature,
  describeInvestFilters,
  type MatchableListing,
} from "@/lib/listings/saved-searches";
import { listingUrl } from "@/lib/listing-url";
import { formatListingPrice } from "@/lib/listing-kind";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("cron:listing-alerts");

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Hourly: email saved-search owners (saved_searches, kind='invest') about
 * newly listed marketplace matches. This is the mailer the save-search
 * button has been waiting on — the table, API and account management page
 * shipped earlier; nothing ever sent the alerts (same gap the rate-alert
 * mailer closed for rates).
 *
 * Cadence: the cron runs hourly; each row's email_frequency gates sends —
 *   daily  → only when last_alerted_at is null or ≥ 20h old
 *   weekly → only when last_alerted_at is null or ≥ 6.5d old
 *   off    → never
 * Only listings created since last_alerted_at (first alert: a 26h window)
 * count as "new", and last_match_signature suppresses repeats if a stamp
 * raced. The stamp is written BEFORE the send so a crash can never
 * double-send.
 */
const FIRST_ALERT_LOOKBACK_HOURS = 26;
const DAILY_MIN_GAP_MS = 20 * 3600 * 1000;
const WEEKLY_MIN_GAP_MS = 6.5 * 86400 * 1000;
const MAX_LISTINGS_PER_EMAIL = 5;
const MAX_SEARCHES_PER_RUN = 500;

interface SearchRow {
  id: number;
  user_id: string;
  label: string;
  filters: unknown;
  email_frequency: "off" | "daily" | "weekly";
  last_alerted_at: string | null;
  last_match_signature: string | null;
}

type ListingRow = MatchableListing & {
  id: number;
  slug: string;
  title: string;
  created_at: string;
  price_display?: string | null;
};

function dueForSend(row: SearchRow, now: number): boolean {
  if (row.email_frequency === "off") return false;
  if (!row.last_alerted_at) return true;
  const elapsed = now - new Date(row.last_alerted_at).getTime();
  return row.email_frequency === "weekly"
    ? elapsed >= WEEKLY_MIN_GAP_MS
    : elapsed >= DAILY_MIN_GAP_MS;
}

async function handler(req: NextRequest): Promise<NextResponse> {
  const denied = requireCronAuth(req);
  if (denied) return denied;

  const admin = createAdminClient();
  const now = Date.now();

  const { data: searches, error: searchError } = await admin
    .from("saved_searches")
    .select("id, user_id, label, filters, email_frequency, last_alerted_at, last_match_signature")
    .eq("kind", "invest")
    .neq("email_frequency", "off")
    .limit(MAX_SEARCHES_PER_RUN);

  if (searchError) {
    throw new Error(`saved-search scan failed: ${searchError.message}`);
  }
  const due = ((searches ?? []) as SearchRow[]).filter((row) => dueForSend(row, now));
  if (due.length === 0) {
    return NextResponse.json({ ok: true, searches: searches?.length ?? 0, due: 0, emails: 0 });
  }

  // One listings scan serves every search this run. The widest window any
  // row needs is its own last_alerted_at; cap the scan at the weekly gap.
  const oldestCutoff = new Date(
    Math.min(
      ...due.map((row) =>
        row.last_alerted_at
          ? new Date(row.last_alerted_at).getTime()
          : now - FIRST_ALERT_LOOKBACK_HOURS * 3600 * 1000,
      ),
    ),
  ).toISOString();

  const { data: listings, error: listingsError } = await admin
    .from("investment_listings")
    .select(
      "id, slug, title, description, vertical, sub_category, listing_kind, location_state, asking_price_cents, price_display, firb_eligible, key_metrics, created_at",
    )
    .eq("status", "active")
    .gte("created_at", oldestCutoff)
    .order("created_at", { ascending: false })
    .limit(500);

  if (listingsError) {
    throw new Error(`new-listings scan failed: ${listingsError.message}`);
  }
  const fresh = (listings ?? []) as ListingRow[];
  if (fresh.length === 0) {
    return NextResponse.json({ ok: true, searches: searches?.length ?? 0, due: due.length, emails: 0 });
  }

  const siteUrl = getSiteUrl();
  let emails = 0;
  let matched = 0;

  for (const row of due) {
    const filters = parseInvestFilters(row.filters);
    const cutoff = row.last_alerted_at
      ? row.last_alerted_at
      : new Date(now - FIRST_ALERT_LOOKBACK_HOURS * 3600 * 1000).toISOString();

    const matches = fresh
      .filter((l) => l.created_at > cutoff)
      .filter((l) => matchesInvestFilters(l, filters))
      .slice(0, MAX_LISTINGS_PER_EMAIL);
    if (matches.length === 0) continue;

    const signature = matchSignature(matches.map((l) => l.id));
    if (signature === row.last_match_signature) continue;
    matched += 1;

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(row.user_id);
    const email = userData?.user?.email;
    if (userError || !email) continue;

    // Stamp BEFORE sending — a crash mid-send must not double-send later.
    const { error: stampError } = await admin
      .from("saved_searches")
      .update({
        last_alerted_at: new Date().toISOString(),
        last_match_signature: signature,
      })
      .eq("id", row.id);
    if (stampError) {
      log.warn("stamp failed — skipping send", { searchId: row.id, error: stampError.message });
      continue;
    }

    const label = row.label || describeInvestFilters(filters);
    const items = matches
      .map((l) => {
        const price = formatListingPrice(l)?.value ?? l.price_display ?? "POA";
        return `<li style="margin-bottom:8px"><a href="${siteUrl}${listingUrl(l)}">${escapeHtml(
          l.title,
        )}</a> — ${escapeHtml(price)}</li>`;
      })
      .join("");

    const { ok } = await sendEmail({
      to: email,
      subject: `${matches.length} new listing${matches.length === 1 ? "" : "s"} match “${label}”`,
      html: `
        <p>New on the Invest.com.au marketplace, matching your saved search <strong>${escapeHtml(label)}</strong>:</p>
        <ul>${items}</ul>
        <p style="font-size:12px;color:#64748b">General information only — not an offer, recommendation or endorsement.
        Manage this alert (including frequency or turning it off) at
        <a href="${siteUrl}/account/saved-searches">${siteUrl.replace(/^https?:\/\//, "")}/account/saved-searches</a>.</p>
      `,
    });
    if (ok) emails += 1;
  }

  return NextResponse.json({
    ok: true,
    searches: searches?.length ?? 0,
    due: due.length,
    matched,
    emails,
  });
}

export const GET = wrapCronHandler("listing-alerts", handler);
