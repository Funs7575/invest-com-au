/**
 * Central revalidateTag() helpers.
 *
 * Every mutation endpoint that changes a row that's cached via
 * `lib/cached-data.ts` (unstable_cache) must call the matching
 * invalidator here. Centralising them means:
 *
 *   - We can grep for every place broker data goes stale
 *   - Adding a new cached reader only needs one tag added in one
 *     place rather than hunting every mutation site
 *   - The tag names stay in sync with the readers
 *
 * Usage:
 *
 *     // in an admin route after a broker update
 *     import { revalidateBrokerTags } from "@/lib/revalidation";
 *     await supabase.from("brokers").update(...).eq("slug", slug);
 *     revalidateBrokerTags(slug);
 *
 * Import is a no-op on the client — revalidateTag from next/cache
 * is a server-only helper.
 */

import { revalidateTag } from "next/cache";

/**
 * Next.js 16 changed the revalidateTag signature to require a
 * cacheLife profile as the second argument. Wrap it once here
 * so the rest of the file can use the familiar single-arg form
 * and stays in sync if the signature shifts again.
 */
function revalidateTagCompat(tag: string): void {
  revalidateTag(tag, { expire: 0 });
}

export function revalidateBrokerTags(slug?: string | null): void {
  revalidateTagCompat("brokers");
  revalidateTagCompat("brokers-listing");
  revalidateTagCompat("brokers-full");
  revalidateTagCompat("brokers-fx");
  if (slug) revalidateTagCompat(`broker-detail-${slug}`);
  revalidateTagCompat("broker-detail");
}

export function revalidateArticleTags(slug?: string | null): void {
  revalidateTagCompat("articles");
  revalidateTagCompat("articles-list");
  revalidateTagCompat("articles-recent");
  if (slug) revalidateTagCompat(`article-detail-${slug}`);
  revalidateTagCompat("article-detail");
}

export function revalidateAdvisorTags(slug?: string | null): void {
  revalidateTagCompat("professionals");
  if (slug) revalidateTagCompat(`professional-${slug}`);
}

export function revalidateReviewTags(brokerSlug?: string | null): void {
  revalidateTagCompat("broker-reviews");
  revalidateTagCompat("broker-review-stats");
  if (brokerSlug) revalidateTagCompat(`broker-reviews-${brokerSlug}`);
}

/**
 * Nuclear option — invalidates every public data tag. Used by the
 * big import/seed/migration routes where the blast radius is
 * already "everything".
 */
export function revalidateAllPublicTags(): void {
  revalidateBrokerTags();
  revalidateArticleTags();
  revalidateAdvisorTags();
  revalidateReviewTags();
}
