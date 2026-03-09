import { createClient } from "@supabase/supabase-js";
import { cached, CacheTTL } from "./cache";
import type { VersusEditorial } from "./versus-content";

/**
 * Supabase client for public cached reads (no cookie/auth state needed).
 */
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Row shape from the `versus_editorials` table. */
interface VersusEditorialRow {
  id: number;
  slug: string;
  broker_a_slug: string;
  broker_b_slug: string;
  title: string;
  meta_description: string | null;
  intro: string | null;
  choose_a: string | null;
  choose_b: string | null;
  sections: { heading: string; body: string }[] | null;
  verdict: string | null;
  faqs: { question: string; answer: string }[] | null;
}

/**
 * Transform a DB row into the VersusEditorial shape that the UI expects.
 * This keeps the rest of the codebase unchanged.
 */
function rowToEditorial(row: VersusEditorialRow): VersusEditorial {
  return {
    key: row.slug,
    tldr: row.intro ?? "",
    chooseA: row.choose_a ?? "",
    chooseB: row.choose_b ?? "",
    sections: row.sections ?? [],
    faqs: row.faqs ?? undefined,
  };
}

/**
 * Fetch a versus editorial by broker slugs.
 * Normalises slug order (alphabetical) so "stake-vs-commsec" and
 * "commsec-vs-stake" both resolve to the same row.
 */
export const getVersusEditorial = cached(
  async (slugs: string[]): Promise<VersusEditorial | null> => {
    const sorted = [...slugs].sort();
    const key = sorted.join("-vs-");

    const supabase = getClient();
    const { data, error } = await supabase
      .from("versus_editorials")
      .select("*")
      .eq("slug", key)
      .single();

    if (error || !data) return null;
    return rowToEditorial(data as VersusEditorialRow);
  },
  ["versus-editorial"],
  { revalidate: CacheTTL.MODERATE }
);

/**
 * Fetch all versus editorial slugs (used for sitemap / static generation).
 */
export const getAllVersusEditorialKeys = cached(
  async (): Promise<string[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("versus_editorials")
      .select("slug");
    return (data ?? []).map((r: { slug: string }) => r.slug);
  },
  ["versus-editorial", "versus-editorial-keys"],
  { revalidate: CacheTTL.STATIC }
);
