/**
 * Quiz history persistence.
 *
 * Wraps the `user_quiz_history` table with:
 *   - recordQuizSubmission(...)   — called from /api/quiz-lead and
 *                                   /api/quiz/save-progress
 *   - getLatestForUser(userId)    — used by /account/quizzes to
 *                                   render history
 *   - getLatestForSession(sessionId) — anon fallback for cross-
 *                                       device resume when no
 *                                       user is signed in yet
 *
 * Quiz state used to live only in localStorage — this gives us:
 *   • cross-device resume (start on mobile, finish on desktop)
 *   • history over time (how your answers drifted)
 *   • input for cohort analytics (did users who chose X
 *     actually convert?)
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("quiz-history");

export interface QuizHistoryRow {
  id: number;
  user_id: string | null;
  session_id: string | null;
  answers: Record<string, unknown>;
  inferred_vertical: string | null;
  top_match_slug: string | null;
  completed_at: string | null;
  resumed_from: number | null;
  created_at: string;
}

export async function recordQuizSubmission(input: {
  userId?: string | null;
  sessionId?: string | null;
  answers: Record<string, unknown>;
  inferredVertical?: string | null;
  topMatchSlug?: string | null;
  completed?: boolean;
  resumedFrom?: number | null;
}): Promise<number | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_quiz_history")
      .insert({
        user_id: input.userId ?? null,
        session_id: input.sessionId ?? null,
        answers: input.answers,
        inferred_vertical: input.inferredVertical ?? null,
        top_match_slug: input.topMatchSlug ?? null,
        completed_at: input.completed ? new Date().toISOString() : null,
        resumed_from: input.resumedFrom ?? null,
      })
      .select("id")
      .single();
    if (error) {
      log.warn("user_quiz_history insert failed", { error: error.message });
      return null;
    }
    return data?.id as number;
  } catch (err) {
    log.warn("recordQuizSubmission threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getLatestForUser(
  userId: string,
): Promise<QuizHistoryRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_quiz_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as QuizHistoryRow | null) || null;
  } catch {
    return null;
  }
}

export async function getLatestForSession(
  sessionId: string,
): Promise<QuizHistoryRow | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_quiz_history")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as QuizHistoryRow | null) || null;
  } catch {
    return null;
  }
}

/**
 * Full history for a user — used by /account/quizzes to render
 * "your quizzes over time" so a returning user can diff their
 * answers + see how the recommendations changed.
 */
export async function listForUser(userId: string): Promise<QuizHistoryRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_quiz_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as QuizHistoryRow[] | null) || [];
  } catch {
    return [];
  }
}

/**
 * Merge anonymous session quiz rows into a user's history on signup.
 * Called alongside claimAnonymousSaves so a user who took the
 * quiz anonymously sees their answers on the account page.
 */
export async function claimSessionQuizzes(
  sessionId: string,
  userId: string,
): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("user_quiz_history")
      .update({ user_id: userId }, { count: "exact" })
      .eq("session_id", sessionId)
      .is("user_id", null);
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}
