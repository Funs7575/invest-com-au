/**
 * DB-backed glossary loader.
 *
 * Primary source of truth for the /glossary pages and related-term
 * widgets. Wraps the `public.glossary_terms` table in a cached server
 * function so the page can stay on ISR (`revalidate = 86400`) without
 * hammering the DB.
 *
 * Static `GLOSSARY_ENTRIES` in `lib/glossary.ts` remains for:
 *   * Client-side `JargonTooltip` (doesn't run SQL)
 *   * Graceful fallback if the DB is unreachable during build
 */

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { GLOSSARY_ENTRIES, type GlossaryEntry } from "@/lib/glossary";

interface GlossaryRow {
  slug: string;
  term: string;
  definition: string;
  category: string | null;
}

async function fetchPublishedGlossary(): Promise<GlossaryEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("glossary_terms")
      .select("slug, term, definition, category")
      .eq("status", "published")
      .order("term", { ascending: true });
    if (error || !data) return GLOSSARY_ENTRIES;
    return (data as GlossaryRow[]).map((r) => ({
      slug: r.slug,
      term: r.term,
      definition: r.definition,
      category: r.category ?? undefined,
    }));
  } catch {
    return GLOSSARY_ENTRIES;
  }
}

/**
 * Cached for 24h — the glossary page revalidates on the same cadence
 * (ISR 86400s). Editors update the DB and see changes on next
 * revalidation.
 */
export const getGlossaryEntries = unstable_cache(
  fetchPublishedGlossary,
  ["glossary-terms-v1"],
  { revalidate: 86_400, tags: ["glossary"] },
);

export async function getGlossaryBySlug(
  slug: string,
): Promise<GlossaryEntry | null> {
  const all = await getGlossaryEntries();
  return all.find((e) => e.slug === slug) ?? null;
}
