/**
 * Request-scoped cache helpers.
 *
 * React's `cache()` deduplicates calls within a single render pass
 * — if two different server components both call
 * `getBrokerBySlug('vanguard')`, only one Supabase query runs. This
 * is orthogonal to the cross-request unstable_cache already used
 * in lib/cached-data.ts:
 *
 *   - unstable_cache:  cached across requests for 24h (CacheTTL.STATIC)
 *                      for public broker listings, articles etc.
 *   - cache (React):   deduped within a single request, no TTL
 *                      required — used for queries that depend on
 *                      per-request context (user session, auth,
 *                      params) and so can't live in unstable_cache
 *
 * Exports ready-made memoised readers for the most common
 * per-request queries observed in the audit (broker-detail pages
 * fetching the same broker row twice, community pages walking
 * thread → category → posts sequentially, layout.tsx + page.tsx
 * both re-fetching the same article).
 */

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker, Article } from "@/lib/types";

/**
 * Memoised broker fetch by slug (with reviewer join).
 * Use on /broker/[slug] routes where the metadata, page header,
 * similar-brokers section, and nested components all want the
 * same broker row.
 */
export const getBrokerBySlug = cache(async (slug: string): Promise<Broker | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brokers")
    .select("*, reviewer:team_members!reviewer_id(*)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return (data as Broker | null) || null;
});

/**
 * Memoised article fetch by slug (with author + reviewer join).
 *
 * Article pages historically called this in both generateMetadata()
 * and the page body, doubling the Supabase round-trips on every
 * article render. The cache() wrap dedupes within a single render
 * pass so one query serves both.
 *
 * NOTE: `status = 'published'` filter is applied client-side in the
 * page body where needed — we return the row regardless so
 * generateMetadata() can still surface the title for an unpublished
 * preview URL.
 */
export const getArticleBySlug = cache(async (slug: string): Promise<Article | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("*, author:team_members!author_id(*), reviewer:team_members!reviewer_id(*)")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Article | null) || null;
});

/**
 * Memoised professionals fetch by slug. Same pattern as broker.
 */
export const getProfessionalBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("professionals")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data;
});

/**
 * Memoised current-user fetch. Layouts and pages both ask for the
 * session; without cache() that's two Supabase round-trips on
 * every protected page load.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
