/**
 * DB helper for /invest-in/[state] state landing pages (Wave 8 SEO).
 *
 * Returns a state's live marketplace footprint — total active listings,
 * a per-category breakdown, and a few sample listings — so each state
 * page shows real, self-updating geo deal-flow rather than static copy.
 *
 * Server-only; failure-tolerant (empty stats on error).
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { InvestmentListing } from "@/lib/types";
import { categoryForListing, isCanonicalVertical } from "@/lib/listing-url";

const log = logger("invest-state-data");
const SAMPLE_LIMIT = 6;

export interface InvestStateData {
  total: number;
  /** Per /invest category slug → count, descending. */
  byCategory: Array<{ slug: string; count: number }>;
  listings: InvestmentListing[];
}

export async function getInvestStateData(stateCode: string): Promise<InvestStateData> {
  const empty: InvestStateData = { total: 0, byCategory: [], listings: [] };
  if (!stateCode) return empty;

  try {
    const supabase = await createClient();

    // All active listings in the state — narrow column select for the
    // category rollup, plus a separate sample fetch for cards. We roll up
    // via categoryForListing (the same function the /invest client uses to
    // bucket listings) so each chip links to a filter that actually
    // returns rows. Guide-vertical sector-hub listings (oil-gas, uranium,
    // …) are excluded so they don't pollute the breakdown.
    const { data: rollupRows, error: rollupErr } = await supabase
      .from("investment_listings")
      .select("vertical, sub_category")
      .eq("status", "active")
      .eq("location_state", stateCode);
    if (rollupErr) {
      log.warn("state rollup failed", { error: rollupErr.message, stateCode });
      return empty;
    }

    const rows = (rollupRows ?? []) as Array<{ vertical: string; sub_category: string | null }>;
    const canonicalRows = rows.filter((r) => isCanonicalVertical(r.vertical));
    const catCounts = new Map<string, number>();
    for (const r of canonicalRows) {
      const slug = categoryForListing({
        vertical: r.vertical as InvestmentListing["vertical"],
        sub_category: r.sub_category ?? undefined,
      });
      catCounts.set(slug, (catCounts.get(slug) ?? 0) + 1);
    }
    const byCategory = Array.from(catCounts.entries())
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);

    const { data: sampleRows } = await supabase
      .from("investment_listings")
      .select("*")
      .eq("status", "active")
      .eq("location_state", stateCode)
      .order("created_at", { ascending: false })
      .limit(SAMPLE_LIMIT);

    return {
      total: rows.length,
      byCategory,
      listings: (sampleRows ?? []) as InvestmentListing[],
    };
  } catch (err) {
    log.error("getInvestStateData threw", { err: err instanceof Error ? err.message : String(err) });
    return empty;
  }
}
