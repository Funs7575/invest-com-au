/**
 * DB helper for the /how-to-invest-in/[vertical] guide pages (Wave 7).
 *
 * Pulls a vertical's live marketplace stats — total count, the cheapest
 * entry ticket, and a few sample listings — so the guide pages show
 * real, self-updating data rather than static doorway content.
 *
 * Server-only (uses the cookie-scoped server client). Failure-tolerant:
 * any DB error returns empty stats so the guide still renders its
 * editorial sections.
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { InvestmentListing } from "@/lib/types";

const log = logger("invest-guide-data");
const SAMPLE_LIMIT = 6;

export interface InvestGuideListings {
  /** Up to SAMPLE_LIMIT newest active listings in the vertical. */
  listings: InvestmentListing[];
  /** Total count of active listings in the vertical. */
  count: number;
  /** Cheapest entry ticket in AUD (asking price or min-investment), or null. */
  minTicketAud: number | null;
}

export async function getInvestGuideListings(
  verticals: string[],
  subCategories?: string[],
): Promise<InvestGuideListings> {
  const empty: InvestGuideListings = { listings: [], count: 0, minTicketAud: null };
  if (!verticals || verticals.length === 0) return empty;

  try {
    const supabase = await createClient();

    // Count (head request — no rows transferred).
    let countQuery = supabase
      .from("investment_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .in("vertical", verticals);
    if (subCategories && subCategories.length > 0) {
      countQuery = countQuery.in("sub_category", subCategories);
    }
    const { count: total, error: countErr } = await countQuery;
    if (countErr) {
      log.warn("guide count failed", { error: countErr.message, verticals });
    }

    // Sample listings (newest first) for the card strip.
    let rowsQuery = supabase
      .from("investment_listings")
      .select("*")
      .eq("status", "active")
      .in("vertical", verticals)
      .order("created_at", { ascending: false })
      .limit(SAMPLE_LIMIT);
    if (subCategories && subCategories.length > 0) {
      rowsQuery = rowsQuery.in("sub_category", subCategories);
    }
    const { data: rows, error: rowsErr } = await rowsQuery;
    if (rowsErr) {
      log.warn("guide rows failed", { error: rowsErr.message, verticals });
      return { ...empty, count: total ?? 0 };
    }

    const listings = (rows ?? []) as InvestmentListing[];

    // Cheapest entry ticket: min over asking_price_cents AND the common
    // min-investment key_metrics, across ALL active listings in the
    // vertical (not just the sampled rows). Cheap to compute with a
    // narrow column select.
    let minQuery = supabase
      .from("investment_listings")
      .select("asking_price_cents, key_metrics")
      .eq("status", "active")
      .in("vertical", verticals);
    if (subCategories && subCategories.length > 0) {
      minQuery = minQuery.in("sub_category", subCategories);
    }
    const { data: priceRows } = await minQuery;
    let minTicketAud: number | null = null;
    for (const r of (priceRows ?? []) as Array<{ asking_price_cents: number | null; key_metrics: Record<string, unknown> | null }>) {
      const km = r.key_metrics ?? {};
      const minInvest = num(km["min_investment_aud"]) ?? num(km["min_commit_aud"]) ?? num(km["min_investment"]);
      const candidates: number[] = [];
      if (r.asking_price_cents != null) candidates.push(r.asking_price_cents / 100);
      if (minInvest != null) candidates.push(minInvest);
      for (const c of candidates) {
        if (c > 0 && (minTicketAud == null || c < minTicketAud)) minTicketAud = c;
      }
    }

    return {
      listings,
      count: total ?? listings.length,
      minTicketAud: minTicketAud != null ? Math.round(minTicketAud) : null,
    };
  } catch (err) {
    log.error("getInvestGuideListings threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
