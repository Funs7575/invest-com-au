/**
 * Article ↔ forum-thread cross-links (Community master plan, Phase 1.7).
 *
 * There is no explicit relation between `articles` and `forum_threads` in
 * the live schema (and Phase 0–1 is deliberately schema-free), so
 * relevance is computed: a category mapping narrows the candidate pool,
 * then keyword overlap between titles/tags decides what actually shows.
 *
 * Honesty rule (plan §3.5): a candidate with **zero meaningful keyword
 * overlap is never shown** — an empty block beats a weak match. Both
 * fetchers fail soft to `[]` so a Supabase hiccup can never break an
 * article or thread page.
 *
 * Category slugs below are the LIVE prod `forum_categories` rows
 * (verified 2026-06-11): property, shares-etfs, super-smsf, tax,
 * mining-resources, international, crypto, general, ask-an-advisor.
 * The archived seed file (20260802000000) uses pre-squash slugs — do not
 * copy from it (see #1539 ledger-fork lesson).
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const log = logger("community-cross-links");

/** Article `category` → candidate forum category slugs. */
export const ARTICLE_TO_FORUM_CATEGORIES: Record<string, string[]> = {
  tax: ["tax", "super-smsf"],
  smsf: ["super-smsf", "tax"],
  super: ["super-smsf"],
  etfs: ["shares-etfs"],
  strategy: ["shares-etfs", "general"],
  beginners: ["shares-etfs", "general"],
  reviews: ["shares-etfs", "general"],
  crypto: ["crypto"],
  "oil-gas": ["mining-resources"],
  uranium: ["mining-resources"],
  hydrogen: ["mining-resources"],
  property: ["property"],
  news: ["general"],
};

/**
 * Forum category slug → candidate article categories.
 * `international` is deliberately unmapped: cross-border content lives in
 * the /foreign-investment routes, not `articles` — a generic article link
 * there would be a weak match by construction.
 */
export const FORUM_TO_ARTICLE_CATEGORIES: Record<string, string[]> = {
  tax: ["tax", "smsf"],
  "super-smsf": ["smsf", "super", "tax"],
  "shares-etfs": ["etfs", "strategy", "beginners"],
  crypto: ["crypto"],
  "mining-resources": ["oil-gas", "uranium", "hydrogen"],
  property: ["property"],
  general: ["beginners", "strategy"],
  "ask-an-advisor": ["beginners", "strategy"],
};

/**
 * Words too generic to signal topical relevance on a finance site —
 * matching only on these would manufacture fake relatedness.
 */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "without", "your", "you",
  "of", "in", "on", "to", "is", "are", "was", "vs", "how", "what", "why",
  "when", "which", "who", "do", "does", "did", "i", "my", "we", "our",
  "it", "its", "this", "that", "from", "as", "at", "be", "can", "should",
  "will", "would", "could", "have", "has", "had", "not", "but", "if",
  "australia", "australian", "asx", "invest", "investing", "investment",
  "investments", "investor", "investors", "guide", "guides", "best",
  "top", "explained", "complete", "ultimate", "new", "get", "need",
  "know", "make", "money", "finance", "financial", "review", "reviews",
  "2024", "2025", "2026", "2027",
]);

/** Lowercase, strip punctuation, drop stopwords and short tokens. */
export function extractTokens(...texts: (string | null | undefined)[]): Set<string> {
  const tokens = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
      if (raw.length < 3) continue;
      if (STOPWORDS.has(raw)) continue;
      tokens.add(raw);
    }
  }
  return tokens;
}

export function scoreOverlap(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const token of a) {
    if (b.has(token)) score += 1;
  }
  return score;
}

export interface ArticleForLinking {
  title: string;
  category: string | null | undefined;
  tags?: string[] | null;
}

export interface CommunityThreadLink {
  id: number;
  title: string;
  categorySlug: string;
  href: string;
  replyCount: number;
  voteScore: number;
}

interface ThreadRow {
  id: number;
  title: string;
  category_slug: string;
  reply_count: number | null;
  vote_score: number | null;
  created_at: string | null;
}

/**
 * Pure ranking step (exported for tests): keyword-overlap ≥ 1 required,
 * then sorted by overlap, community validation, recency.
 */
export function rankThreadsForArticle(
  article: ArticleForLinking,
  threads: ThreadRow[],
  limit: number,
): CommunityThreadLink[] {
  const articleTokens = extractTokens(article.title, ...(article.tags ?? []));
  if (articleTokens.size === 0) return [];

  return threads
    .map((thread) => ({
      thread,
      overlap: scoreOverlap(articleTokens, extractTokens(thread.title)),
    }))
    .filter((entry) => entry.overlap >= 1)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        (b.thread.vote_score ?? 0) - (a.thread.vote_score ?? 0) ||
        (b.thread.reply_count ?? 0) - (a.thread.reply_count ?? 0) ||
        (b.thread.created_at ?? "").localeCompare(a.thread.created_at ?? ""),
    )
    .slice(0, limit)
    .map(({ thread }) => ({
      id: thread.id,
      title: thread.title,
      categorySlug: thread.category_slug,
      href: `/community/${thread.category_slug}/${thread.id}`,
      replyCount: thread.reply_count ?? 0,
      voteScore: thread.vote_score ?? 0,
    }));
}

/**
 * "Discussed in the community" candidates for an article page.
 * Anon-readable tables only (same access path the community pages use).
 */
export async function getThreadsForArticle(
  article: ArticleForLinking,
  limit = 3,
): Promise<CommunityThreadLink[]> {
  const category = (article.category ?? "").toLowerCase();
  const forumSlugs = ARTICLE_TO_FORUM_CATEGORIES[category];
  if (!forumSlugs || forumSlugs.length === 0) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("forum_threads")
      .select("id, title, category_slug, reply_count, vote_score, created_at")
      .in("category_slug", forumSlugs)
      .eq("is_removed", false)
      .eq("thread_type", "discussion")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      log.warn("thread cross-link fetch failed", { error: error.message });
      return [];
    }
    return rankThreadsForArticle(article, (data as ThreadRow[] | null) ?? [], limit);
  } catch (err) {
    log.warn("thread cross-link fetch threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

export interface RelatedArticleLink {
  slug: string;
  title: string;
  category: string | null;
  href: string;
  readTime: number | null;
}

interface ArticleRow {
  slug: string;
  title: string;
  category: string | null;
  read_time: number | null;
  tags: string[] | null;
  published_at: string | null;
}

/** Pure ranking step (exported for tests) — mirror of rankThreadsForArticle. */
export function rankArticlesForThread(
  threadTitle: string,
  articles: ArticleRow[],
  limit: number,
): RelatedArticleLink[] {
  const threadTokens = extractTokens(threadTitle);
  if (threadTokens.size === 0) return [];

  return articles
    .map((article) => ({
      article,
      overlap: scoreOverlap(
        threadTokens,
        extractTokens(article.title, ...(article.tags ?? [])),
      ),
    }))
    .filter((entry) => entry.overlap >= 1)
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        (b.article.published_at ?? "").localeCompare(a.article.published_at ?? ""),
    )
    .slice(0, limit)
    .map(({ article }) => ({
      slug: article.slug,
      title: article.title,
      category: article.category,
      href: `/article/${article.slug}`,
      readTime: article.read_time,
    }));
}

/** "Related guides" candidates for a thread page. */
export async function getArticlesForThread(
  thread: { title: string; categorySlug: string },
  limit = 2,
): Promise<RelatedArticleLink[]> {
  const articleCategories = FORUM_TO_ARTICLE_CATEGORIES[thread.categorySlug];
  if (!articleCategories || articleCategories.length === 0) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("slug, title, category, read_time, tags, published_at")
      .eq("status", "published")
      .in("category", articleCategories)
      .order("published_at", { ascending: false })
      .limit(60);

    if (error) {
      log.warn("article cross-link fetch failed", { error: error.message });
      return [];
    }
    return rankArticlesForThread(thread.title, (data as ArticleRow[] | null) ?? [], limit);
  } catch (err) {
    log.warn("article cross-link fetch threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
