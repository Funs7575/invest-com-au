import { createClient } from "@supabase/supabase-js";
import { cached, CacheTTL } from "./cache";
import type { AdvisorGuide } from "./advisor-guides";

/**
 * Supabase client for public cached reads (no cookie/auth state needed).
 */
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Row shape from the `advisor_guide_content` table. */
interface AdvisorGuideRow {
  id: number;
  slug: string;
  advisor_type: string;
  title: string;
  meta_description: string | null;
  intro: string | null;
  sections: { heading: string; body: string }[] | null;
  checklist: string[] | null;
  red_flags: string[] | null;
  faqs: { question: string; answer: string }[] | null;
  cost_guide: unknown;
}

/**
 * Transform a DB row into the AdvisorGuide shape the UI expects.
 * The original code uses `{ q, a }` for FAQs; we normalise from the DB's
 * `{ question, answer }` format.
 */
function rowToGuide(row: AdvisorGuideRow): AdvisorGuide {
  return {
    slug: row.slug,
    type: row.advisor_type as AdvisorGuide["type"],
    title: row.title,
    metaDescription: row.meta_description ?? "",
    intro: row.intro ?? "",
    sections: row.sections ?? [],
    checklist: row.checklist ?? [],
    redFlags: row.red_flags ?? [],
    faqs: (row.faqs ?? []).map((f) => ({ q: f.question, a: f.answer })),
  };
}

/**
 * Fetch a single advisor guide by slug.
 */
export const getAdvisorGuide = cached(
  async (slug: string): Promise<AdvisorGuide | undefined> => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from("advisor_guide_content")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return undefined;
    return rowToGuide(data as AdvisorGuideRow);
  },
  ["advisor-guide"],
  { revalidate: CacheTTL.MODERATE }
);

/**
 * Fetch all advisor guide slugs (for static generation / sitemap).
 */
export const getAllAdvisorGuideSlugs = cached(
  async (): Promise<string[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("advisor_guide_content")
      .select("slug");
    return (data ?? []).map((r: { slug: string }) => r.slug);
  },
  ["advisor-guide", "advisor-guide-slugs"],
  { revalidate: CacheTTL.STATIC }
);
