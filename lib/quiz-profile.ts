/**
 * Quiz profile — cross-page recommendations foundation (W4.20).
 *
 * After a visitor submits the find-advisor quiz, we store the row
 * id of their `user_quiz_history` insert in an http-only `iv_quiz_session`
 * cookie. Any subsequent page can then fetch their inferred profile
 * (vertical, top match, country, completion timestamp) and render a
 * personalised recommendations strip — without re-asking, without
 * waiting for sign-up, and without leaking the answers payload to the
 * client bundle.
 *
 * The cookie carries an opaque session UUID, not the answers themselves.
 * The actual profile is fetched server-side from `user_quiz_history` on
 * each page render (memoised via React `cache()` for the duration of a
 * single request — repeated calls in the same render tree share one DB
 * round-trip).
 *
 * Read path: every public page can call `getQuizProfile()` and either
 * use the result to personalise or fall back to non-personalised content
 * if the cookie is absent.
 *
 * Write path: `/api/quiz-lead` calls `setQuizSessionCookie(sessionId)`
 * after a successful `recordQuizSubmission`. The cookie sticks for 90
 * days (matches `iv_intent_country` TTL) so a returning visitor's
 * profile follows them across sessions.
 *
 * Intentionally http-only: no client-side JS reads this cookie. UX that
 * needs the profile imports the server helper directly. Keeps the
 * payload small (just a UUID) and prevents tampering.
 */

import { cookies } from "next/headers";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { IntentCountryCode } from "./intent-context";

export const QUIZ_SESSION_COOKIE = "iv_quiz_session";
export const QUIZ_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days, matches iv_intent_country

const log = logger("quiz-profile");

/**
 * Lightweight typed shape for the bits of quiz answers the ranker uses.
 * Captured from `answers.raw` keys — see `app/quiz/page.tsx` for the
 * canonical option list. Values are case-insensitive lower-snake.
 */
export type QuizBudget = "small" | "medium" | "large" | "whale" | null;
export type QuizExperience = "beginner" | "intermediate" | "pro" | null;

export interface QuizProfile {
  sessionId: string;
  /** Inferred vertical from the quiz (broker_diy / advisor_match / international / etc.) */
  vertical: string | null;
  /** Top broker/advisor slug returned to the user — handy for "your top match" pinning */
  topMatchSlug: string | null;
  /** Intent country if the quiz captured one (separate from iv_intent_country) */
  intentCountry: IntentCountryCode | null;
  /** Budget band from the quiz — feeds the ranker's price-tier preference */
  budget: QuizBudget;
  /** Experience level — beginner = simpler tools, pro = advanced features */
  experience: QuizExperience;
  /** ISO timestamp of when the row was completed (null = quiz abandoned mid-flow) */
  completedAt: string | null;
  /** ISO timestamp of when the row was first inserted */
  createdAt: string;
}

/**
 * Set the quiz-session cookie. Called from `/api/quiz-lead` after the
 * `user_quiz_history` row is persisted. The argument is the row's
 * `session_id` (a client-generated UUID), NOT the row id — keeping it
 * a UUID lets the client and the cookie agree on the same key without
 * round-tripping the DB-assigned id back.
 */
export async function setQuizSessionCookie(sessionId: string): Promise<void> {
  if (!sessionId || typeof sessionId !== "string") return;
  const trimmed = sessionId.trim().slice(0, 100);
  if (!trimmed) return;
  const c = await cookies();
  c.set(QUIZ_SESSION_COOKIE, trimmed, {
    maxAge: QUIZ_SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Clear the quiz-session cookie. Called when a user signs out (the
 * server action layer is the right place, but we expose the helper
 * here so it lives next to the writer).
 */
export async function clearQuizSessionCookie(): Promise<void> {
  const c = await cookies();
  c.delete(QUIZ_SESSION_COOKIE);
}

/**
 * Fetch the visitor's quiz profile from `user_quiz_history` keyed by
 * their `iv_quiz_session` cookie. Returns null when the cookie is
 * absent OR the row is not found (e.g. the row was deleted, or the
 * cookie persisted from a wiped DB).
 *
 * Wrapped in React `cache()` so a single render that calls this from
 * multiple components (header, sidebar, content strip) only hits the
 * DB once.
 */
export const getQuizProfile = cache(async (): Promise<QuizProfile | null> => {
  const c = await cookies();
  const sessionId = c.get(QUIZ_SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("user_quiz_history")
      .select("session_id, answers, inferred_vertical, top_match_slug, completed_at, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      log.warn("getQuizProfile fetch failed", { error: error.message });
      return null;
    }
    if (!data) return null;

    return {
      sessionId,
      vertical: data.inferred_vertical ?? null,
      topMatchSlug: data.top_match_slug ?? null,
      intentCountry: extractIntentCountry(data.answers),
      budget: extractBudget(data.answers),
      experience: extractExperience(data.answers),
      completedAt: data.completed_at ?? null,
      createdAt: data.created_at as string,
    };
  } catch (err) {
    log.warn("getQuizProfile threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
});

/**
 * Pull the visitor's intent country out of the stored quiz answers.
 * The quiz stores it under `answers.raw.investor_country` as a
 * snake_case key (united_kingdom, hong_kong, …) — we map back to the
 * 2-letter `IntentCountryCode`. Returns null when the answer is
 * missing or unrecognised so callers can fall back to `iv_intent_country`.
 */
function extractIntentCountry(answers: unknown): IntentCountryCode | null {
  if (!answers || typeof answers !== "object") return null;
  const a = answers as Record<string, unknown>;
  const raw = a.raw as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return null;
  const key = raw.investor_country;
  if (typeof key !== "string") return null;
  return QUIZ_KEY_TO_INTENT[key] ?? null;
}

/**
 * Extract the budget answer. The quiz stores the option key under
 * `answers.raw.amount` (small / medium / large / whale per
 * `INVESTMENT_MAP` in `/api/quiz-lead/route.ts`). Return null when the
 * answer is missing or unrecognised so the ranker degrades gracefully.
 */
function extractBudget(answers: unknown): QuizBudget {
  if (!answers || typeof answers !== "object") return null;
  const raw = (answers as Record<string, unknown>).raw as
    | Record<string, unknown>
    | undefined;
  if (!raw || typeof raw !== "object") return null;
  const v = raw.amount;
  if (v === "small" || v === "medium" || v === "large" || v === "whale") {
    return v;
  }
  return null;
}

function extractExperience(answers: unknown): QuizExperience {
  if (!answers || typeof answers !== "object") return null;
  const raw = (answers as Record<string, unknown>).raw as
    | Record<string, unknown>
    | undefined;
  if (!raw || typeof raw !== "object") return null;
  const v = raw.experience;
  if (v === "beginner" || v === "intermediate" || v === "pro") {
    return v;
  }
  return null;
}

const QUIZ_KEY_TO_INTENT: Record<string, IntentCountryCode> = {
  united_kingdom: "uk",
  united_states: "us",
  china: "cn",
  india: "in",
  japan: "jp",
  singapore: "sg",
  hong_kong: "hk",
  south_korea: "kr",
  malaysia: "my",
  new_zealand: "nz",
  united_arab_emirates: "ae",
  saudi_arabia: "sa",
};
