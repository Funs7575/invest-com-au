/**
 * "From the community" block for the weekly newsletter (plan Phase 1.7).
 *
 * Picks the threads genuinely worth a subscriber's attention this week:
 * visible discussion threads with real engagement (at least one reply or
 * one net upvote — counters are reconciled to real rows since #1539, so
 * these numbers are honest). If nothing qualifies, the caller gets `[]`
 * and the email template omits the section entirely — the block never
 * pads itself with dead threads.
 *
 * Edge-safe: used by app/api/cron/weekly-newsletter (runtime "edge"), so
 * no Node built-ins here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CommunityHighlight {
  title: string;
  /** Site-relative path; the email template prefixes its BASE_URL. */
  path: string;
  replies: number;
  votes: number;
  category: string | null;
}

export interface HighlightThreadRow {
  id: number;
  title: string;
  category_slug: string;
  thread_type: string;
  is_removed: boolean | null;
  reply_count: number | null;
  vote_score: number | null;
  created_at: string | null;
  last_reply_at: string | null;
}

export const HIGHLIGHT_LIMIT = 3;

/**
 * Pure selection step (exported for tests): filter to qualifying threads,
 * rank by engagement, cap. Replies weigh more than votes — a conversation
 * is a stronger newsletter hook than a silent upvote.
 */
export function selectCommunityHighlights(
  rows: HighlightThreadRow[],
  categoryNames: Record<string, string> = {},
  limit = HIGHLIGHT_LIMIT,
): CommunityHighlight[] {
  return rows
    .filter(
      (row) =>
        row.is_removed !== true &&
        row.thread_type === "discussion" &&
        ((row.reply_count ?? 0) >= 1 || (row.vote_score ?? 0) >= 1),
    )
    .sort(
      (a, b) =>
        ((b.reply_count ?? 0) * 3 + (b.vote_score ?? 0) * 2) -
          ((a.reply_count ?? 0) * 3 + (a.vote_score ?? 0) * 2) ||
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
    )
    .slice(0, limit)
    .map((row) => ({
      title: row.title,
      path: `/community/${row.category_slug}/${row.id}`,
      replies: row.reply_count ?? 0,
      votes: row.vote_score ?? 0,
      category: categoryNames[row.category_slug] ?? null,
    }));
}

/**
 * Fetch this week's qualifying threads. Fail-soft: any error returns `[]`
 * so the newsletter still sends without the community section.
 */
export async function fetchCommunityHighlights(
  // The weekly-newsletter cron passes its admin client; an untyped client
  // keeps this helper decoupled from the generated Database generics.
  supabase: Pick<SupabaseClient, "from">,
  now: Date = new Date(),
): Promise<CommunityHighlight[]> {
  try {
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

    const { data: threads, error } = await supabase
      .from("forum_threads")
      .select(
        "id, title, category_slug, thread_type, is_removed, reply_count, vote_score, created_at, last_reply_at",
      )
      .eq("is_removed", false)
      .eq("thread_type", "discussion")
      .or(`created_at.gte.${weekAgo},last_reply_at.gte.${weekAgo}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !threads || threads.length === 0) return [];

    const { data: categories } = await supabase
      .from("forum_categories")
      .select("slug, name");

    const categoryNames: Record<string, string> = {};
    for (const category of (categories ?? []) as { slug: string; name: string }[]) {
      categoryNames[category.slug] = category.name;
    }

    return selectCommunityHighlights(
      threads as HighlightThreadRow[],
      categoryNames,
    );
  } catch {
    return [];
  }
}
