/**
 * Programmatic versus-pair enumeration.
 *
 * Builds the canonical set of `slug-a-vs-slug-b` pairs from live broker
 * inventory, grouped by platform_type. Beats a hand-curated list because:
 *
 *   * New brokers auto-appear in /versus/... coverage without a code edit
 *   * Inactive or removed brokers stop generating pairs immediately
 *   * Sitemap and generateStaticParams share a single source of truth
 *
 * We deliberately only pair brokers of the same platform_type — a crypto
 * exchange versus a term deposit is not a useful comparison.
 *
 * Pair slugs are alphabetically sorted so `a-vs-b` and `b-vs-a` collapse
 * to the same canonical URL.
 */

import type { PlatformType } from "./types";

interface BrokerPairRow {
  slug: string;
  name: string;
  rating: number | null;
  platform_type: PlatformType;
}

export interface VersusPair {
  slug: string;
  /** Rating product (a.rating × b.rating) used to rank popularity. */
  score: number;
  platform_type: PlatformType;
}

/**
 * Produce every canonical pair within a platform_type group.
 * Sorted descending by `score` so callers can easily take the top N.
 */
export function generateVersusPairs(rows: BrokerPairRow[]): VersusPair[] {
  const byType = new Map<PlatformType, BrokerPairRow[]>();
  for (const r of rows) {
    const bucket = byType.get(r.platform_type) ?? [];
    bucket.push(r);
    byType.set(r.platform_type, bucket);
  }

  const pairs: VersusPair[] = [];
  for (const [platform_type, bucket] of byType) {
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i]!;
        const b = bucket[j]!;
        const [first, second] = [a.slug, b.slug].sort();
        pairs.push({
          slug: `${first}-vs-${second}`,
          score: (a.rating ?? 0) * (b.rating ?? 0),
          platform_type,
        });
      }
    }
  }

  pairs.sort((p, q) => q.score - p.score);
  return pairs;
}

/**
 * Related-comparison suggestions for a given pair. Returns other pairs
 * that share a broker OR are in the same platform_type — useful for
 * cross-linking and spreading crawl budget across the graph.
 */
export function getRelatedVersusPairs(
  pair: VersusPair,
  all: VersusPair[],
  limit = 6,
): VersusPair[] {
  const [a, b] = pair.slug.split("-vs-");
  return all
    .filter((p) => {
      if (p.slug === pair.slug) return false;
      if (p.platform_type !== pair.platform_type) return false;
      return p.slug.includes(a!) || p.slug.includes(b!);
    })
    .slice(0, limit);
}
