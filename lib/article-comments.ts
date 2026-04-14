/**
 * Article comments + reactions.
 *
 * Comments go through `classifyText` for auto-publication with the
 * same rules as broker/advisor reviews. Everything that isn't
 * auto_publish stays in 'pending' and shows up in the admin
 * moderation queue instead of on the page.
 *
 * Reactions are dedup'd per (article_slug, user or ip_hash,
 * reaction) so the counter can't be griefed.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { classifyText } from "@/lib/text-moderation";
import { logger } from "@/lib/logger";
import { createHash } from "node:crypto";

const log = logger("article-comments");

export type CommentStatus = "pending" | "published" | "rejected" | "removed";
export type ReactionKind = "helpful" | "like" | "confused" | "disagree";

export interface ArticleCommentRow {
  id: number;
  article_slug: string;
  author_id: string | null;
  author_name: string;
  author_email: string;
  parent_id: number | null;
  body: string;
  status: CommentStatus;
  helpful_count: number;
  created_at: string;
}

const VALID_REACTIONS: ReactionKind[] = [
  "helpful",
  "like",
  "confused",
  "disagree",
];

export function isValidReaction(v: unknown): v is ReactionKind {
  return typeof v === "string" && (VALID_REACTIONS as string[]).includes(v);
}

export async function listPublishedComments(
  articleSlug: string,
): Promise<ArticleCommentRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("article_comments")
      .select(
        "id, article_slug, author_id, author_name, author_email, parent_id, body, status, helpful_count, created_at",
      )
      .eq("article_slug", articleSlug)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data as ArticleCommentRow[] | null) || [];
  } catch {
    return [];
  }
}

export interface SubmitCommentInput {
  articleSlug: string;
  authorId: string | null;
  authorName: string;
  authorEmail: string;
  body: string;
  parentId?: number | null;
  authorPriorCount?: number;
  authorPriorRejections?: number;
}

export interface SubmitCommentResult {
  ok: boolean;
  id?: number;
  status?: CommentStatus;
  reason?: string;
}

/**
 * Insert a new comment. Always runs `classifyText` first and maps
 * the verdict:
 *   auto_publish → 'published'
 *   escalate     → 'pending'
 *   auto_reject  → 'rejected'  (still stored so admins can see what tried)
 */
export async function submitComment(
  input: SubmitCommentInput,
): Promise<SubmitCommentResult> {
  if (!input.body || input.body.trim().length < 10) {
    return { ok: false, reason: "too_short" };
  }
  if (input.body.length > 5000) {
    return { ok: false, reason: "too_long" };
  }
  if (!input.authorName || !input.authorEmail) {
    return { ok: false, reason: "missing_author" };
  }

  const verdict = classifyText({
    text: input.body,
    surface: "qa_answer",
    authorId: input.authorId,
    authorVerified: !!input.authorId,
    authorPriorCount: input.authorPriorCount ?? 0,
    authorPriorRejections: input.authorPriorRejections ?? 0,
  });

  const status: CommentStatus =
    verdict.verdict === "auto_publish"
      ? "published"
      : verdict.verdict === "auto_reject"
        ? "rejected"
        : "pending";

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("article_comments")
      .insert({
        article_slug: input.articleSlug.slice(0, 200),
        author_id: input.authorId,
        author_name: input.authorName.slice(0, 100),
        author_email: input.authorEmail.toLowerCase().slice(0, 254),
        parent_id: input.parentId ?? null,
        body: input.body.slice(0, 5000),
        status,
        auto_moderated_at: new Date().toISOString(),
        auto_moderated_verdict: verdict.verdict,
      })
      .select("id")
      .single();
    if (error) {
      log.warn("article_comments insert failed", { error: error.message });
      return { ok: false, reason: "db_error" };
    }
    return { ok: true, id: data?.id as number, status };
  } catch (err) {
    log.warn("submitComment threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "exception" };
  }
}

// ─── Reactions ─────────────────────────────────────────────────────

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(ip + (process.env.IP_HASH_SALT || "invest-com-au"))
    .digest("hex")
    .slice(0, 32);
}

export async function reactToArticle(input: {
  articleSlug: string;
  reaction: ReactionKind;
  userId: string | null;
  ipHash: string | null;
}): Promise<boolean> {
  if (!isValidReaction(input.reaction)) return false;
  if (!input.userId && !input.ipHash) return false;
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("article_reactions").insert({
      article_slug: input.articleSlug.slice(0, 200),
      user_id: input.userId,
      ip_hash: input.userId ? null : input.ipHash,
      reaction: input.reaction,
    });
    if (error && !/duplicate key/i.test(error.message)) {
      log.warn("reactToArticle insert failed", { error: error.message });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface ReactionCounts {
  helpful: number;
  like: number;
  confused: number;
  disagree: number;
}

export async function getReactionCounts(
  articleSlug: string,
): Promise<ReactionCounts> {
  const counts: ReactionCounts = {
    helpful: 0,
    like: 0,
    confused: 0,
    disagree: 0,
  };
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("article_reactions")
      .select("reaction")
      .eq("article_slug", articleSlug);
    for (const row of (data as { reaction: ReactionKind }[] | null) || []) {
      if (isValidReaction(row.reaction)) counts[row.reaction] += 1;
    }
    return counts;
  } catch {
    return counts;
  }
}
