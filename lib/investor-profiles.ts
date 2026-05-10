/**
 * Investor profile helpers (W2 Phase 2).
 *
 * `investor_profiles` is a typed cache layered on top of `user_quiz_history`
 * + `iv_intent_country` cookie. The smart-recs ranker reads from this table
 * directly; structured columns are SQL-filterable in a way that quiz-answer
 * JSONB isn't.
 *
 * Sync paths:
 *   - `/api/quiz-lead` calls `syncQuizToInvestorProfile(sessionId, userId)`
 *     after a successful quiz submission for an authenticated user.
 *   - The claim-on-signup flow (`/api/account/claim-anonymous`) calls
 *     `syncQuizToInvestorProfile(sessionId, userId)` when a fresh signup
 *     has anonymous quiz history under the same `_inv_sid` cookie.
 *
 * No anon access. RLS scopes reads + writes to auth.uid() owner; this
 * module uses createAdminClient() server-side.
 *
 * Compliance: life-event flags fuel CONTENT routing only ("popular with
 * FHB users", "FHOG guides surfaced first"). Never used to drive
 * personal-advice copy. See lib/compliance.ts for disclaimer copy.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { IntentCountryCode } from "./intent-context";

const log = logger("investor-profiles");

export type BudgetBand = "small" | "medium" | "large" | "whale";
export type ExperienceLevel = "beginner" | "intermediate" | "pro";

export interface InvestorProfile {
  authUserId: string;
  displayName: string | null;
  isFhb: boolean;
  isPreRetiree: boolean;
  isBusinessOwner: boolean;
  isCrossBorder: boolean;
  isHnw: boolean;
  intentCountrySnapshot: IntentCountryCode | null;
  budgetBand: BudgetBand | null;
  experienceLevel: ExperienceLevel | null;
  primaryVertical: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch the user's profile row. Returns null when no row exists yet.
 */
export async function getInvestorProfile(userId: string): Promise<InvestorProfile | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("investor_profiles")
      .select("*")
      .eq("auth_user_id", userId)
      .maybeSingle();
    if (error) {
      log.warn("getInvestorProfile failed", { userId, error: error.message });
      return null;
    }
    if (!data) return null;
    return rowToProfile(data as Record<string, unknown>);
  } catch (err) {
    log.warn("getInvestorProfile threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Upsert a partial profile patch keyed by auth_user_id. Caller passes
 * snake_case DB column names; this function maps to the typed columns.
 * Idempotent — safe to call repeatedly with the same patch.
 */
export async function upsertInvestorProfile(
  userId: string,
  patch: Partial<{
    display_name: string | null;
    is_fhb: boolean;
    is_pre_retiree: boolean;
    is_business_owner: boolean;
    is_cross_border: boolean;
    is_hnw: boolean;
    intent_country_snapshot: IntentCountryCode | null;
    budget_band: BudgetBand | null;
    experience_level: ExperienceLevel | null;
    primary_vertical: string | null;
    meta: Record<string, unknown>;
  }>,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("investor_profiles")
      .upsert(
        {
          auth_user_id: userId,
          ...patch,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" },
      );
    if (error) {
      log.warn("upsertInvestorProfile failed", { userId, error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("upsertInvestorProfile threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Read the user's most-recent quiz answers (by session_id or user_id),
 * extract the structured signals, and upsert them onto investor_profiles.
 *
 * Called from /api/quiz-lead on submit (when authed) and from the
 * claim-on-signup path when an anon quiz row gets attached to a fresh
 * user. Idempotent.
 */
export async function syncQuizToInvestorProfile(opts: {
  userId: string;
  sessionId?: string | null;
}): Promise<boolean> {
  const { userId, sessionId } = opts;
  try {
    const supabase = createAdminClient();
    // Prefer the user-keyed row (fresh signup paths); fall back to session-keyed.
    let row: Record<string, unknown> | null = null;
    {
      const { data } = await supabase
        .from("user_quiz_history")
        .select("answers, inferred_vertical, top_match_slug, completed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) row = data as Record<string, unknown>;
    }
    if (!row && sessionId) {
      const { data } = await supabase
        .from("user_quiz_history")
        .select("answers, inferred_vertical, top_match_slug, completed_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) row = data as Record<string, unknown>;
    }

    if (!row) return false;

    const answers = row.answers as Record<string, unknown> | null;
    const raw = (answers?.raw as Record<string, unknown> | undefined) ?? null;
    const inferredVertical = row.inferred_vertical as string | null;

    const intentCountry = extractIntentCountryFromAnswers(raw);
    const budgetBand = extractBudgetBand(raw);
    const experienceLevel = extractExperienceLevel(raw);

    // Life-event derivation rules (factual extraction, not advice).
    const isFhb = raw?.goal === "home";
    const isCrossBorder = intentCountry !== null;
    const isPreRetiree = raw?.goal === "super" || raw?.complexity === "retiring_soon";
    const isHnw = budgetBand === "whale";
    const isBusinessOwner = raw?.complexity === "business_owner";

    return upsertInvestorProfile(userId, {
      is_fhb: !!isFhb,
      is_pre_retiree: !!isPreRetiree,
      is_business_owner: !!isBusinessOwner,
      is_cross_border: !!isCrossBorder,
      is_hnw: !!isHnw,
      intent_country_snapshot: intentCountry,
      budget_band: budgetBand,
      experience_level: experienceLevel,
      primary_vertical: inferredVertical,
    });
  } catch (err) {
    log.warn("syncQuizToInvestorProfile threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ─── Internals ──────────────────────────────────────────────────────────────

function rowToProfile(r: Record<string, unknown>): InvestorProfile {
  return {
    authUserId: r.auth_user_id as string,
    displayName: (r.display_name as string | null) ?? null,
    isFhb: r.is_fhb === true,
    isPreRetiree: r.is_pre_retiree === true,
    isBusinessOwner: r.is_business_owner === true,
    isCrossBorder: r.is_cross_border === true,
    isHnw: r.is_hnw === true,
    intentCountrySnapshot: (r.intent_country_snapshot as IntentCountryCode | null) ?? null,
    budgetBand: (r.budget_band as BudgetBand | null) ?? null,
    experienceLevel: (r.experience_level as ExperienceLevel | null) ?? null,
    primaryVertical: (r.primary_vertical as string | null) ?? null,
    meta: ((r.meta as Record<string, unknown> | null) ?? {}),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
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

function extractIntentCountryFromAnswers(
  raw: Record<string, unknown> | null,
): IntentCountryCode | null {
  if (!raw) return null;
  const v = raw.investor_country;
  if (typeof v !== "string") return null;
  return QUIZ_KEY_TO_INTENT[v] ?? null;
}

function extractBudgetBand(raw: Record<string, unknown> | null): BudgetBand | null {
  if (!raw) return null;
  const v = raw.amount;
  return v === "small" || v === "medium" || v === "large" || v === "whale" ? v : null;
}

function extractExperienceLevel(
  raw: Record<string, unknown> | null,
): ExperienceLevel | null {
  if (!raw) return null;
  const v = raw.experience;
  return v === "beginner" || v === "intermediate" || v === "pro" ? v : null;
}
