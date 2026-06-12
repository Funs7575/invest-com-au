/**
 * Monthly Money Review — server-side data loading.
 *
 * Bridges the raw Supabase rows to the pure `buildReviewModel` assembler in
 * lib/monthly-review.ts. Kept separate so the model logic stays I/O-free and
 * unit-testable, mirroring the decision-inbox (pure lib) ↔ page (fetch) split.
 *
 * Every fetch is wrapped fail-soft: a missing table, an RLS denial, or a
 * transient error degrades that source to empty rather than throwing, so the
 * whole ritual keeps working even before `user_reviews_log` is applied in
 * prod (the feature is flag-gated anyway, but defence in depth is cheap).
 *
 * Works with EITHER Supabase client:
 *   - the RLS server client (page / completion API — scoped to auth.uid())
 *   - the admin client (the monthly-invite cron — cross-user, no JWT)
 * The caller passes the right one and, for the admin path, the explicit
 * userId/email to scope each query.
 */

import { logger } from "@/lib/logger";
import { buildDecisionInbox, type GoalDbRow, type RateMemoryRow } from "@/lib/decision-inbox";
import { listPlansForUser } from "@/lib/getmatched/action-plans";
import { listForUser as listSavedSearches } from "@/lib/saved-searches";
import type { SavedSearchRow } from "@/lib/saved-searches";
import {
  buildReviewModel,
  periodForDate,
  type ReviewBalanceRow,
  type ReviewGoalRow,
  type ReviewHealthRow,
  type ReviewLogRow,
  type ReviewModel,
  type ReviewPeriod,
  type ReviewRateMemoryRow,
  type ReviewSnapshot,
} from "@/lib/monthly-review";

const log = logger("monthly-review-data");

// Minimal structural type for the Supabase query builder we use. Avoids a
// hard dependency on either generated client type (the table is intentionally
// absent from database.types) while keeping the call sites readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export interface LoadReviewOptions {
  /** Override the period (defaults to the current calendar month, UTC). */
  period?: ReviewPeriod;
  todayMs?: number;
}

/**
 * Load + assemble the full review model for a user.
 *
 * `userId` scopes every per-user query. The goals table keys on
 * `auth_user_id`; balances / rate memory / health / checkins key on
 * `user_id`; saved searches + plans take the id directly.
 */
export async function loadReviewModel(
  supabase: AnyClient,
  userId: string,
  options: LoadReviewOptions = {},
): Promise<ReviewModel> {
  const todayMs = options.todayMs ?? Date.now();
  const period = options.period ?? periodForDate(new Date(todayMs));

  const [
    goals,
    balances,
    health,
    rateMemory,
    plans,
    searches,
    priorReviews,
  ] = await Promise.all([
    fetchGoals(supabase, userId),
    fetchBalances(supabase, userId),
    fetchHealth(supabase, userId),
    fetchRateMemory(supabase, userId),
    safe(() => listPlansForUser(userId), [] as Awaited<ReturnType<typeof listPlansForUser>>, "plans"),
    safe(() => listSavedSearches(userId), [] as SavedSearchRow[], "searches"),
    fetchPriorReviews(supabase, userId),
  ]);

  // Open-decision count reuses the exact decision-inbox logic so the number
  // shown here matches /account/decisions.
  const decisionGoalRows: GoalDbRow[] = goals.map((g) => ({
    id: g.id,
    label: g.label,
    goal_type: g.goal_type,
    target_cents: g.target_cents,
    target_date: g.target_date,
    current_balance_cents: g.current_balance_cents,
    monthly_contribution_cents: g.monthly_contribution_cents,
    expected_return_pct: g.expected_return_pct,
  }));
  const decisionRateRows: RateMemoryRow[] = rateMemory.map((r, i) => ({
    id: String(i),
    broker_id: 0,
    broker_name: r.broker_name,
    broker_slug: r.broker_slug,
    product_kind: r.product_kind,
    last_seen_rate_bps: r.last_seen_rate_bps,
    notified_rate_bps: r.notified_rate_bps,
    notified_at: r.notified_at,
    last_seen_at: r.notified_at ?? new Date(todayMs).toISOString(),
  }));
  const openDecisions = buildDecisionInbox(
    decisionGoalRows,
    plans,
    searches,
    decisionRateRows,
    todayMs,
  ).length;

  return buildReviewModel({
    period,
    goals,
    balances,
    health,
    rateMemory,
    openDecisions,
    priorReviews,
    todayMs,
  });
}

// ─── Source fetchers (each fail-soft) ─────────────────────────────────────────

async function fetchGoals(supabase: AnyClient, userId: string): Promise<ReviewGoalRow[]> {
  try {
    const { data, error } = await supabase
      .from("investor_goals")
      .select(
        "id, label, goal_type, target_cents, target_date, current_balance_cents, monthly_contribution_cents, expected_return_pct",
      )
      .eq("auth_user_id", userId);
    if (error) {
      log.warn("goals fetch failed", { userId, error: error.message });
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: Number(r.id),
      label: String(r.label),
      goal_type: String(r.goal_type),
      target_cents: Number(r.target_cents),
      target_date: String(r.target_date),
      current_balance_cents: Number(r.current_balance_cents),
      monthly_contribution_cents: Number(r.monthly_contribution_cents),
      expected_return_pct: Number(r.expected_return_pct),
    }));
  } catch (err) {
    log.warn("goals fetch threw", { userId, err: msg(err) });
    return [];
  }
}

async function fetchBalances(supabase: AnyClient, userId: string): Promise<ReviewBalanceRow[]> {
  try {
    const { data, error } = await supabase
      .from("manual_balances")
      .select("label, amount_cents, category")
      .eq("user_id", userId);
    if (error) {
      log.warn("balances fetch failed", { userId, error: error.message });
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      label: String(r.label),
      amount_cents: Number(r.amount_cents),
      category: String(r.category),
    }));
  } catch (err) {
    log.warn("balances fetch threw", { userId, err: msg(err) });
    return [];
  }
}

async function fetchHealth(supabase: AnyClient, userId: string): Promise<ReviewHealthRow[]> {
  try {
    const { data, error } = await supabase
      .from("user_health_score_log")
      .select("overall, scored_month, scored_at")
      .eq("user_id", userId)
      .order("scored_month", { ascending: false })
      .limit(12);
    if (error) {
      log.warn("health fetch failed", { userId, error: error.message });
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      overall: Number(r.overall),
      scored_month: String(r.scored_month ?? ""),
      scored_at: String(r.scored_at ?? ""),
    }));
  } catch (err) {
    log.warn("health fetch threw", { userId, err: msg(err) });
    return [];
  }
}

async function fetchRateMemory(
  supabase: AnyClient,
  userId: string,
): Promise<ReviewRateMemoryRow[]> {
  try {
    const { data, error } = await supabase
      .from("user_rate_memory")
      .select("product_kind, last_seen_rate_bps, notified_rate_bps, notified_at, brokers(name, slug)")
      .eq("user_id", userId);
    if (error) {
      log.warn("rate memory fetch failed", { userId, error: error.message });
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      broker_name: r.brokers?.name ?? "Your bank",
      broker_slug: r.brokers?.slug ?? "",
      product_kind: String(r.product_kind),
      last_seen_rate_bps: Number(r.last_seen_rate_bps),
      notified_rate_bps: r.notified_rate_bps === null ? null : Number(r.notified_rate_bps),
      notified_at: r.notified_at === null ? null : String(r.notified_at),
    }));
  } catch (err) {
    log.warn("rate memory fetch threw", { userId, err: msg(err) });
    return [];
  }
}

async function fetchPriorReviews(
  supabase: AnyClient,
  userId: string,
): Promise<ReviewLogRow[]> {
  try {
    const { data, error } = await supabase
      .from("user_reviews_log")
      .select("period, completed_at, snapshot")
      .eq("user_id", userId)
      .order("period", { ascending: false })
      .limit(36);
    if (error) {
      // Table may not exist yet in prod — fail soft to "no history".
      log.warn("reviews log fetch failed", { userId, error: error.message });
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      period: String(r.period),
      completed_at: r.completed_at === null ? null : String(r.completed_at),
      snapshot: (r.snapshot as ReviewSnapshot | null) ?? null,
    }));
  } catch (err) {
    log.warn("reviews log fetch threw", { userId, err: msg(err) });
    return [];
  }
}

// ─── History (for the page's past-reviews list) ───────────────────────────────

export interface ReviewHistoryEntry {
  period: ReviewPeriod;
  completedAt: string | null;
  netWorthCents: number | null;
  healthOverall: number | null;
}

/** Completed reviews newest-first, mapped to a compact history shape. */
export async function loadReviewHistory(
  supabase: AnyClient,
  userId: string,
): Promise<ReviewHistoryEntry[]> {
  const rows = await fetchPriorReviews(supabase, userId);
  return rows
    .filter((r) => r.completed_at !== null)
    .map((r) => ({
      period: r.period,
      completedAt: r.completed_at,
      netWorthCents:
        r.snapshot && typeof r.snapshot.netWorthCents === "number"
          ? r.snapshot.netWorthCents
          : null,
      healthOverall: r.snapshot?.healthOverall ?? null,
    }));
}

// ─── Utils ───────────────────────────────────────────────────────────────────

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.warn(`${label} fetch threw`, { err: msg(err) });
    return fallback;
  }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
