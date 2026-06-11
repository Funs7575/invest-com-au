/**
 * Forum counter recounts — recompute denormalised counters from the actual
 * underlying rows instead of incrementing/decrementing in place.
 *
 * Counters must reflect *visible* (is_removed=false) content only: the seed
 * migration initialised reply_count/vote_score above the real row counts
 * (an honesty bug — see FIN_NOTEBOOK 2026-06-10), and the moderation
 * approve/remove flow flips visibility after the original bumps ran.
 * Recounting from source rows is idempotent and self-healing, so both the
 * moderate route and the reconciliation script call these.
 *
 * Service-role rationale: counters span other users' rows and run from
 * admin/moderator paths and ops scripts only (per the CLAUDE.md
 * service-role scope: admin routes + cross-user lib helpers).
 */

// eslint-disable-next-line no-restricted-imports -- Cross-user query: recounts span every author's threads/posts/votes and run only from moderator routes and ops scripts, where no user JWT could pass RLS for other users' rows. Documented service-role-legitimate exception per CLAUDE.md "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("community:recount");

/** Recompute reply_count + vote_score for one thread from live rows. */
export async function recountThread(threadId: number): Promise<void> {
  const admin = createAdminClient();

  const { count: replyCount, error: postsError } = await admin
    .from("forum_posts")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", threadId)
    .eq("is_removed", false);

  // Prod column is `value` (the local migration file says `vote` — ledger
  // fork; the vote API route also writes `value`). Verified against live
  // information_schema 2026-06-10.
  const { data: votes, error: votesError } = await admin
    .from("forum_votes")
    .select("value")
    .eq("target_type", "thread")
    .eq("target_id", threadId);

  if (postsError || votesError) {
    log.warn("recountThread query failed", {
      threadId,
      postsError: postsError?.message,
      votesError: votesError?.message,
    });
    return;
  }

  const voteScore = (votes ?? []).reduce((sum, v) => sum + (v.value ?? 0), 0);

  const { error: updateError } = await admin
    .from("forum_threads")
    .update({ reply_count: replyCount ?? 0, vote_score: voteScore })
    .eq("id", threadId);

  if (updateError) {
    log.warn("recountThread update failed", { threadId, error: updateError.message });
  }
}

/** Recompute thread_count + post_count for one category from live rows. */
export async function recountCategory(categoryId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: threads, error: threadsError } = await admin
    .from("forum_threads")
    .select("id")
    .eq("category_id", categoryId)
    .eq("is_removed", false);

  if (threadsError) {
    log.warn("recountCategory threads query failed", {
      categoryId,
      error: threadsError.message,
    });
    return;
  }

  const threadIds = (threads ?? []).map((t) => t.id);

  let postCount = 0;
  if (threadIds.length > 0) {
    const { count, error: postsError } = await admin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .eq("is_removed", false);
    if (postsError) {
      log.warn("recountCategory posts query failed", {
        categoryId,
        error: postsError.message,
      });
      return;
    }
    postCount = count ?? 0;
  }

  const { error: updateError } = await admin
    .from("forum_categories")
    .update({ thread_count: threadIds.length, post_count: postCount })
    .eq("id", categoryId);

  if (updateError) {
    log.warn("recountCategory update failed", { categoryId, error: updateError.message });
  }
}

/**
 * Full-forum reconciliation: every category and every thread. Used by
 * scripts/community-reconcile-counters.ts; bounded by forum size, so fine
 * to run synchronously at current scale (hundreds of rows).
 */
export async function recountAllForumCounters(): Promise<{
  categories: number;
  threads: number;
}> {
  const admin = createAdminClient();

  const { data: categories } = await admin.from("forum_categories").select("id");
  for (const cat of categories ?? []) {
    await recountCategory(cat.id);
  }

  const { data: threads } = await admin.from("forum_threads").select("id");
  for (const thread of threads ?? []) {
    await recountThread(thread.id);
  }

  return { categories: categories?.length ?? 0, threads: threads?.length ?? 0 };
}
