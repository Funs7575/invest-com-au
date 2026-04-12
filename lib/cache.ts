import { unstable_cache } from "next/cache";

/**
 * Cache configuration for different data freshness requirements.
 *
 * Stale times (in seconds):
 * - STATIC: 86400 (24h) — broker list, fee data (updates via admin action)
 * - MODERATE: 3600 (1h) — article content, comparison data
 * - DYNAMIC: 300 (5m) — ratings, review counts, popular content
 */
export const CacheTTL = {
  STATIC: 86400,
  MODERATE: 3600,
  DYNAMIC: 300,
} as const;

/**
 * Type-safe cache wrapper with consistent tag-based invalidation.
 *
 * Usage:
 *   const getBroker = cached(
 *     async (slug: string) => { ...fetch from supabase... },
 *     ["broker"],
 *     { revalidate: CacheTTL.STATIC }
 *   );
 *
 * Tags are used for on-demand revalidation via `revalidateTag()`.
 * The revalidate option sets the ISR-style time-based refresh.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  tags: string[],
  options: { revalidate?: number } = {}
): T {
  return unstable_cache(fn, tags, {
    revalidate: options.revalidate ?? CacheTTL.MODERATE,
    tags,
  }) as unknown as T;
}
