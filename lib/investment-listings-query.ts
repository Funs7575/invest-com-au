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

// Infrastructure and private-credit are URL categories that live
// under the 'fund' vertical distinguished by sub_category. See
// lib/listing-url.ts FUND_SUB_TO_CATEGORY for the canonical mapping.
export const INFRASTRUCTURE_SUB_CATEGORIES = ["infrastructure"] as const;
export const PRIVATE_CREDIT_SUB_CATEGORIES = ["private_credit"] as const;

/**
 * Fetches the listings that match a specific sub_category within a
 * vertical. Used by /invest/{category}/listings/[slug] when the slug
 * resolves to a sub-category (as opposed to a single listing slug).
 *
 * Never throws — returns [] on any failure so the caller can render
 * a graceful empty state.
 */
export async function fetchListingsBySubCategory(
  vertical: InvestListingVertical,
  subCategory: string,
  limit: number = DEFAULT_LIMIT,
): Promise<InvestmentListing[]> {
  if (!subCategory) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_listings")
      .select("*")
      .eq("vertical", vertical)
      .eq("sub_category", subCategory)
      .eq("status", "active")
      .order("listing_type", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      log.warn("investment_listings subcategory query failed", {
        vertical,
        sub_category: subCategory,
        error: error.message,
        code: error.code,
      });
      return [];
    }
    return (data ?? []) as InvestmentListing[];
  } catch (err) {
    log.error("investment_listings subcategory fetch threw", {
      vertical,
      sub_category: subCategory,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Fetches a single listing by slug within a vertical. Returns null
 * on any failure (not found, DB error, etc.) — never throws. The
 * caller decides what to do with null (show empty state, try a
 * different lookup, etc.).
 */
export async function fetchListingBySlug(
  vertical: InvestListingVertical,
  slug: string,
): Promise<InvestmentListing | null> {
  if (!slug) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_listings")
      .select("*")
      .eq("vertical", vertical)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      log.warn("investment_listings slug lookup failed", {
        vertical,
        slug,
        error: error.message,
        code: error.code,
      });
      return null;
    }
    return (data as InvestmentListing | null) ?? null;
  } catch (err) {
    log.error("investment_listings slug lookup threw", {
      vertical,
      slug,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Fetches up to `limit` related listings in the same vertical and
 * (optionally) same sub-category, excluding the given slug. Used on
 * single-listing detail pages. Returns [] on any failure.
 */
export async function fetchRelatedListings(
  vertical: InvestListingVertical,
  excludeSlug: string,
  subCategory: string | null | undefined,
  limit: number = 3,
): Promise<InvestmentListing[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("investment_listings")
      .select("*")
      .eq("vertical", vertical)
      .eq("status", "active")
      .neq("slug", excludeSlug)
      .limit(limit);
    if (subCategory) {
      query = query.eq("sub_category", subCategory);
    }
    const { data, error } = await query;
    if (error) {
      log.warn("investment_listings related fetch failed", {
        vertical,
        exclude_slug: excludeSlug,
        error: error.message,
      });
      return [];
    }
    return (data ?? []) as InvestmentListing[];
  } catch (err) {
    log.error("investment_listings related fetch threw", {
      vertical,
      exclude_slug: excludeSlug,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
