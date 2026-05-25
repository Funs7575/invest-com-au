/**
 * Forum author badge resolution — verified-advisor attribution.
 *
 * Given a set of forum author user-IDs (from `forum_threads.author_id` or
 * `forum_posts.author_id`), returns a map of which authors hold an active
 * verified-professional profile on the site, along with their public slug
 * and professional type.
 *
 * This is ATTRIBUTION ONLY — factual ("does this forum account belong to an
 * advisor in our directory?"). It is NOT a financial-advice intake or
 * endorsement surface. Any render site that uses this helper MUST display
 * the `GENERAL_ADVICE_WARNING` from `lib/compliance.ts` alongside attributed
 * posts (see `app/community/[category]/[threadId]/page.tsx`).
 *
 * Why admin client?
 * The `professionals` table's RLS allows an advisor to read their own row
 * (auth_user_id = auth.uid()) but does NOT grant anonymous/public SELECT on
 * all rows by user-id list. This lookup is a cross-user query — we receive
 * an arbitrary set of forum author user-IDs and need to resolve any that
 * happen to be advisors. That falls squarely in the documented service-role-
 * legitimate exception in CLAUDE.md under "lib/* helpers doing cross-user
 * queries that can't be scoped to auth.uid()".
 */

// eslint-disable-next-line no-restricted-imports -- Cross-user query: resolves forum author user-IDs against professionals table to provide factual attribution. The per-row RLS policy (auth_user_id = auth.uid()) cannot be used for an arbitrary batch of forum author IDs. Documented service-role-legitimate exception per CLAUDE.md "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";

/** Public attribution shape returned for a verified-advisor forum author. */
export interface AdvisorBadgeInfo {
  /** Public slug — used to link to /advisor/[slug]. */
  slug: string;
  /** ProfessionalType value — used to render the human-readable badge label. */
  type: string;
}

/**
 * Resolve which of the given forum author user-IDs belong to a verified,
 * active professional on the site.
 *
 * Returns a `Map<userId, AdvisorBadgeInfo>`. Authors that are NOT verified
 * professionals are omitted from the map.
 *
 * Errors are swallowed and an empty map is returned — badge display is
 * non-critical and a DB failure must not break the forum thread page.
 *
 * @param authorIds  Deduplicated list of `auth.users.id` values from a
 *                   thread + its posts.
 */
export async function resolveAdvisorBadges(
  authorIds: string[],
): Promise<Map<string, AdvisorBadgeInfo>> {
  if (authorIds.length === 0) return new Map();

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("professionals")
      .select("auth_user_id, slug, type")
      .in("auth_user_id", authorIds)
      .eq("status", "active")
      .eq("verified", true);

    if (error) {
      // Non-critical — return empty map rather than throwing.
      return new Map();
    }

    const result = new Map<string, AdvisorBadgeInfo>();
    for (const row of data ?? []) {
      if (row.auth_user_id) {
        result.set(row.auth_user_id, {
          slug: row.slug,
          type: row.type,
        });
      }
    }
    return result;
  } catch {
    return new Map();
  }
}
