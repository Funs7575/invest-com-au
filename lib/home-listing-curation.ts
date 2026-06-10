/**
 * Homepage marketplace-teaser curation — pure and unit-tested.
 *
 * Selection policy (2026-06-10 homepage cleanup, see FIN_NOTEBOOK):
 *   1. Equity raises are excluded outright. The homepage must not
 *      amplify retail-exposed primary capital raises while the startup
 *      portal carries no s708 wholesale gate — CSF-intermediary
 *      escalator, REGULATORY-AVOID-LIST §A.
 *   2. Listings with imagery rank first (better hero unit), then by
 *      paid tier: premium > featured > standard.
 *   3. Round-robin across verticals (max 2 per vertical) so one
 *      category can't dominate the visible grid.
 *   4. Paid placements are capped at 3 of the 6 visible cards. Paid
 *      placement is a flat-fee `listing_type` upgrade and is always
 *      labelled (SponsorChip + ADVERTISER_DISCLOSURE_SHORT); the cap
 *      keeps the shopfront from reading as bought outright (RG 246
 *      separation of advertising from factual display). When organic
 *      supply can't fill the window the cap relaxes rather than
 *      rendering gaps.
 */

export interface CuratableListing {
  vertical: string;
  images: string[] | null;
  listing_type: string | null;
  listing_kind?: string | null;
}

export const HOME_TEASER_VISIBLE = 6;
export const HOME_TEASER_PAID_CAP = 3;
export const HOME_TEASER_PER_VERTICAL_CAP = 2;

const TIER_WEIGHT: Record<string, number> = { premium: 3, featured: 2, standard: 1 };

export function isPaidTier(listingType: string | null | undefined): boolean {
  return listingType === "featured" || listingType === "premium";
}

function hasImage(l: CuratableListing): boolean {
  return !!(l.images && l.images.length > 0 && l.images[0]);
}

export interface CurationOptions {
  visibleCount?: number;
  paidCap?: number;
  perVerticalCap?: number;
}

/**
 * Order listings for the homepage teaser. The first `visibleCount`
 * entries are the cards to render; the remainder trails in ranked
 * order for callers that need a longer slice (hero reel previews).
 */
export function curateHomepageListings<T extends CuratableListing>(
  rows: ReadonlyArray<T>,
  {
    visibleCount = HOME_TEASER_VISIBLE,
    paidCap = HOME_TEASER_PAID_CAP,
    perVerticalCap = HOME_TEASER_PER_VERTICAL_CAP,
  }: CurationOptions = {},
): T[] {
  // 1. Compliance gate — never surface primary raises on the homepage.
  const eligible = rows.filter((l) => l.listing_kind !== "equity_raise");

  // 2. Image-first, then paid tier.
  const scored = [...eligible].sort((a, b) => {
    const imgDiff = Number(hasImage(b)) - Number(hasImage(a));
    if (imgDiff !== 0) return imgDiff;
    return (
      (TIER_WEIGHT[b.listing_type ?? "standard"] ?? 0) -
      (TIER_WEIGHT[a.listing_type ?? "standard"] ?? 0)
    );
  });

  // 3. Greedy window selection — walk the ranking and admit a listing
  // only while it fits BOTH constraints (per-vertical cap, paid cap).
  // A single pass matters: applying the caps sequentially let image-less
  // organic rows fill slots while imaged organic rows of already-capped
  // verticals sat in overflow.
  const verticalCounts = new Map<string, number>();
  const visible: T[] = [];
  const rest: T[] = [];
  let paidUsed = 0;
  for (const l of scored) {
    if (visible.length < visibleCount) {
      const used = verticalCounts.get(l.vertical) ?? 0;
      const paid = isPaidTier(l.listing_type);
      if (used < perVerticalCap && (!paid || paidUsed < paidCap)) {
        visible.push(l);
        verticalCounts.set(l.vertical, used + 1);
        if (paid) paidUsed += 1;
        continue;
      }
    }
    rest.push(l);
  }
  // Supply-constrained: relax the caps rather than render an empty slot.
  while (visible.length < visibleCount && rest.length > 0) {
    visible.push(rest.shift() as T);
  }

  return [...visible, ...rest];
}
