/**
 * Sold archive — realised-sale capture and retrieval.
 *
 * Strategic groundwork (FIN_NOTEBOOK 2026-06-12): every sold listing is a
 * comparable. This module is the single place that
 *   1. stamps a listing sold (`buildSoldUpdates` — shared by the owner
 *      portal action and the legacy email-verified PUT),
 *   2. reads recent sales back as `ComparableSale`s for the lot page's
 *      comparables module and the public archive strips.
 *
 * Fail-soft contract: the `sold_price_cents` / `sold_at` columns ship in
 * 20260612010200_listing_sold_archive.sql and are founder-applied later.
 * Until then, writes retry without the new columns (status-only) and reads
 * return [] — nothing on the page breaks.
 *
 * Reads use the standard server client: `investment_listings` carries a
 * public `USING (true)` SELECT policy, so sold rows are anon-readable by
 * design (the archive is a public trust surface).
 */

import { createClient } from "@/lib/supabase/server";
import { rawVerticalVariants } from "@/lib/listing-url";
import { formatAudCompact } from "@/lib/listing-kind";
import type { ComparableSale } from "@/lib/listings/lot-profile";
import { logger } from "@/lib/logger";

const log = logger("sold-archive");

/** Max realised-price comps merged into a lot page's comparables module. */
const LOT_COMPS_LIMIT = 3;

/** Postgres "column does not exist" (42703) / PostgREST schema-cache miss
 *  (PGRST204) — the pre-migration states `buildSoldUpdates` callers retry on. */
export function isMissingSoldColumnsError(message: string | undefined): boolean {
  if (!message) return false;
  return /sold_price_cents|sold_at|42703|PGRST204/i.test(message);
}

/**
 * The update payload for a sold transition. `soldPriceCents` is optional —
 * undisclosed sales still count for liquidity, never for price comps.
 * Callers attempt this payload first and retry `{ status: "sold" }` alone
 * when the archive columns are not applied yet.
 */
export function buildSoldUpdates(soldPriceCents?: number | null): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    status: "sold",
    sold_at: new Date().toISOString(),
  };
  if (
    soldPriceCents != null &&
    Number.isFinite(soldPriceCents) &&
    soldPriceCents > 0 &&
    soldPriceCents <= 1_000_000_000_000_00 // $1T guard against fat fingers
  ) {
    updates.sold_price_cents = Math.round(soldPriceCents);
  }
  return updates;
}

interface SoldRow {
  title: string;
  location_state: string | null;
  sold_price_cents: number | null;
  sold_at: string | null;
}

function monthYear(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

/**
 * Recent realised sales in a vertical, shaped as `ComparableSale`s so the
 * lot page can merge them with seller-stated comps. Platform sales are
 * first-party data — they carry a fixed source label so the UI can
 * distinguish them from seller claims.
 */
export async function fetchSoldComparables(
  vertical: string,
  opts: { excludeSlug?: string; limit?: number } = {},
): Promise<ComparableSale[]> {
  const limit = opts.limit ?? LOT_COMPS_LIMIT;
  try {
    const supabase = await createClient();
    let query = supabase
      .from("investment_listings")
      .select("title, location_state, sold_price_cents, sold_at")
      .eq("status", "sold")
      .in("vertical", rawVerticalVariants(vertical))
      .not("sold_price_cents", "is", null)
      .order("sold_at", { ascending: false })
      .limit(limit);
    if (opts.excludeSlug) {
      query = query.neq("slug", opts.excludeSlug);
    }
    const { data, error } = await query;
    if (error) {
      // Pre-migration (missing columns) or transient — the lot page
      // renders seller-stated comps only.
      if (!isMissingSoldColumnsError(error.message)) {
        log.warn("fetchSoldComparables failed", { vertical, error: error.message });
      }
      return [];
    }
    return ((data ?? []) as SoldRow[]).map((row) => ({
      label: [row.title, row.location_state].filter(Boolean).join(" — "),
      price: row.sold_price_cents != null ? formatAudCompact(row.sold_price_cents) : undefined,
      when: monthYear(row.sold_at),
      source: "Sold on Invest.com.au",
    }));
  } catch (err) {
    log.warn("fetchSoldComparables threw", {
      vertical,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Merge platform-realised comps with seller-stated ones for display.
 * Platform data leads (it is verified by definition); the combined list is
 * capped so the module stays scannable.
 */
export function mergeComparables(
  platform: ComparableSale[],
  sellerStated: ComparableSale[],
  cap = 6,
): ComparableSale[] {
  return [...platform, ...sellerStated].slice(0, cap);
}
