/**
 * lib/getmatched/listing-top-match.ts
 *
 * Decision Engine listings lane (docs/plans/UNIFIED_MATCHING_ENGINE.md §P4
 * wiring): when resolve's lanes include "listings", load the active listing
 * pool and rank SPECIFIC listings for this user via the pure P4 scorer
 * (`lib/listings/match-listings.ts`) — vertical affinity, ticket size vs
 * budget, state, FIRB gate for non-residents, CSF hard-excluded.
 *
 * Uses the server (anon) client: `investment_listings` has a public-read
 * SELECT policy, so service-role would be an unnecessary escalation (see
 * CLAUDE.md "Two Supabase clients"). Fail-soft everywhere — any error
 * returns [] and the lane keeps its browse link, exactly today's behaviour.
 */
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { listingUrl } from "@/lib/listing-url";
import {
  listingContextFromAnswers,
  matchListings,
  type MatchableListing,
} from "@/lib/listings/match-listings";
import type { LaneResolution } from "./resolve-lanes";
import type { ActionPlanAnswers, ListingMatch } from "./types";

const log = logger("getmatched:listing-top-match");

// Display-safe columns only — no owner contact / moderation / commercial
// internals. `sub_category` rides along for listingUrl's fund overrides.
const POOL_SELECT =
  "id, slug, title, vertical, sub_category, listing_kind, location_state, " +
  "asking_price_cents, price_display, listing_type, firb_eligible, images, " +
  "status, created_at";

/** Newest-first pool size the scorer ranks over per resolve. */
const POOL_SIZE = 80;

type ListingRow = MatchableListing & { sub_category?: string | null };

/** Whether the resolved lanes actually surface the listings lane. */
export function lanesIncludeListings(
  lanes: LaneResolution | null | undefined,
): boolean {
  if (!lanes) return false;
  return lanes.hero === "listings" || lanes.secondary.includes("listings");
}

const AUD = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });

function priceLabel(l: MatchableListing): string | null {
  if (l.price_display) return l.price_display;
  if (l.asking_price_cents != null) {
    return `A$${AUD.format(Math.round(l.asking_price_cents / 100))}`;
  }
  return null;
}

/** Rank specific listings for a get-matched plan via the P4 scorer. */
export async function computeTopListings(
  answers: ActionPlanAnswers,
  limit = 3,
): Promise<ListingMatch[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_listings")
      .select(POOL_SELECT)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(POOL_SIZE);

    if (error) {
      log.warn("listing pool load failed — lane keeps its browse link", {
        err: error.message,
      });
      return [];
    }

    const rows = (data ?? []) as unknown as ListingRow[];
    const ranked = matchListings(rows, listingContextFromAnswers(answers), limit);

    return ranked.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      vertical: l.vertical,
      location_state: l.location_state ?? null,
      price_display: priceLabel(l),
      image_url: l.images?.[0] ?? null,
      reasons: l.matchReasons,
      href: listingUrl({
        vertical: l.vertical,
        sub_category: (l as ListingRow).sub_category ?? null,
        listing_kind: l.listing_kind ?? null,
        slug: l.slug,
      }),
    }));
  } catch (err) {
    log.warn("listing lane failed — falling back to empty", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * The single call resolve makes: compute listing matches only when the
 * lanes actually include the listings lane; [] otherwise (no DB touch).
 */
export async function listingMatchesForLanes(
  answers: ActionPlanAnswers,
  lanes: LaneResolution | null | undefined,
  limit = 3,
): Promise<ListingMatch[]> {
  if (!lanesIncludeListings(lanes)) return [];
  return computeTopListings(answers, limit);
}
