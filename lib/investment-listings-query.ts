import { createClient } from "@/lib/supabase/server";
import type { InvestmentListing, InvestListingVertical } from "@/lib/types";
import { logger } from "@/lib/logger";

const log = logger("invest-listings-query");

/**
 * Upper bound on rows returned per listings page. The category pages
 * render every row, so we cap at 500 to keep the SSR payload bounded
 * — plenty of headroom even once real listings start rolling in.
 */
const DEFAULT_LIMIT = 500;

export interface ListingsQueryOptions {
  /** Optional sub_category filter (e.g. ["art","wine"] for alternatives). */
  subCategories?: readonly string[];
  /** Override the 500-row cap if a caller really needs more (rare). */
  limit?: number;
}

/**
 * Fetches active investment listings for a single vertical, with
 * defensive error handling. Never throws — returns an empty array
 * on any failure (missing table, RLS denial, network timeout, etc.)
 * so the server-rendered page can still return a 200 with a graceful
 * empty state rather than a 503 crash.
 *
 * Usage from a listings page.tsx:
 *
 *     const listings = await fetchListingsByVertical("mining");
 *
 * For the alternatives category where the DB vertical is 'fund' but
 * only a subset of sub_categories belong to alternatives:
 *
 *     const listings = await fetchListingsByVertical("fund", {
 *       subCategories: ["art","wine","watches","cars","coins","whisky"],
 *     });
 */
export async function fetchListingsByVertical(
  vertical: InvestListingVertical,
  options: ListingsQueryOptions = {},
): Promise<InvestmentListing[]> {
  const { subCategories, limit = DEFAULT_LIMIT } = options;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("investment_listings")
      .select("*")
      .eq("vertical", vertical)
      .eq("status", "active")
      .order("listing_type", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (subCategories && subCategories.length > 0) {
      query = query.in("sub_category", subCategories as string[]);
    }

    const { data, error } = await query;

    if (error) {
      // Query ran but returned an error — log server-side and show empty.
      // The most common causes are RLS denials and a missing table
      // (before the migration is applied to an environment).
      log.warn("investment_listings query failed", {
        vertical,
        sub_categories: subCategories?.join(",") ?? null,
        error: error.message,
        code: error.code,
      });
      return [];
    }

    return (data ?? []) as InvestmentListing[];
  } catch (err) {
    // createClient() or the Supabase client can throw synchronously
    // in certain misconfigurations (e.g. missing cookies in an edge
    // runtime). Log and degrade to empty state rather than 503.
    log.error("investment_listings fetch threw", {
      vertical,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Same defensive pattern for the count used in generateMetadata().
 * Returns 0 on any failure — the metadata just omits the count
 * rather than 503ing the whole page.
 */
export async function countListingsByVertical(
  vertical: InvestListingVertical,
  options: ListingsQueryOptions = {},
): Promise<number> {
  const { subCategories } = options;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("investment_listings")
      .select("id", { count: "exact", head: true })
      .eq("vertical", vertical)
      .eq("status", "active");

    if (subCategories && subCategories.length > 0) {
      query = query.in("sub_category", subCategories as string[]);
    }

    const { count, error } = await query;
    if (error) {
      log.warn("investment_listings count failed", {
        vertical,
        error: error.message,
      });
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    log.warn("investment_listings count threw", {
      vertical,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Sub-categories that belong to the "alternatives" URL category.
 * Source of truth: lib/listing-url.ts FUND_SUB_TO_CATEGORY.
 * Duplicated here to avoid a server/client module boundary issue
 * (this module pulls in lib/supabase/server which must not be
 * bundled into a client component).
 */
export const ALTERNATIVES_SUB_CATEGORIES = [
  "art",
  "wine",
  "watches",
  "cars",
  "coins",
  "whisky",
] as const;
