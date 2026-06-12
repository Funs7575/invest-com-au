/**
 * FY Money Wrapped — server-side data assembly.
 *
 * Runs the per-user reads with the caller's user-scoped Supabase client so
 * RLS owner policies authorise everything, then hands the rows to the pure
 * `assembleWrapped` in lib/wrapped.ts. Shared by /wrapped (the page) and
 * /api/account/wrapped-card (the personal share image).
 *
 * Every read fails soft: a broken table costs its card, never the page.
 *
 * The single service-role read (rate_alert_sends) is scoped to the user's
 * OWN subscription ids, which were themselves fetched under RLS — so no
 * cross-user data can leak even though the client bypasses RLS.
 */

import type { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- rate_alert_sends has service_role-only RLS (no authenticated policy, see 20260611100000_rate_alert_mailer_support.sql); the read in countOwnAlertSends is scoped to the caller's OWN subscription ids, themselves fetched under RLS, so no cross-user data leaks. CLAUDE.md § "Two Supabase clients" → service_role-only tables.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  assembleWrapped,
  EMPTY_WRAPPED_ROWS,
  type FyPeriod,
  type WrappedData,
  type WrappedSourceRows,
} from "@/lib/wrapped";

const log = logger("wrapped");

type ServerClient = Awaited<ReturnType<typeof createClient>>;

interface WrappedUser {
  id: string;
  createdAt: string | null;
}

/**
 * Count this FY's alert sends for the user's own subscriptions.
 * rate_alert_sends is service_role-only by design (cron send log, no
 * authenticated-role policy), and may not exist until its migration is
 * pushed — both cases return null and the card degrades to "on watch".
 */
async function countOwnAlertSends(
  subscriptionIds: string[],
  fy: FyPeriod,
): Promise<number | null> {
  if (subscriptionIds.length === 0) return 0;
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("rate_alert_sends")
      .select("id", { count: "exact", head: true })
      .in("subscription_id", subscriptionIds)
      .gte("sent_at", fy.startIso)
      .lt("sent_at", fy.endExclusiveIso);
    if (error) {
      log.warn("rate_alert_sends read failed — alerts card degrades", { err: error.message });
      return null;
    }
    return count ?? 0;
  } catch (err) {
    log.warn("rate_alert_sends count threw — alerts card degrades", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function loadWrappedData(
  supabase: ServerClient,
  user: WrappedUser,
  fy: FyPeriod,
  nowMs: number = Date.now(),
): Promise<WrappedData> {
  const [
    holdingsRes,
    goalsRes,
    manualRes,
    healthRes,
    checkinsRes,
    quizRes,
    bookmarksRes,
    watchlistRes,
    alertSubsRes,
  ] = await Promise.all([
    supabase
      .from("investor_holdings")
      .select("acquired_at, shares, cost_basis_per_share_cents")
      .eq("auth_user_id", user.id),
    supabase
      .from("investor_goals")
      .select(
        "label, target_cents, current_balance_cents, monthly_contribution_cents, expected_return_pct, target_date",
      )
      .eq("auth_user_id", user.id),
    supabase.from("manual_balances").select("amount_cents").eq("user_id", user.id),
    supabase
      .from("user_health_score_log")
      .select("overall, scored_month")
      .eq("user_id", user.id)
      .gte("scored_month", fy.startIso)
      .lte("scored_month", fy.endIso)
      .order("scored_month", { ascending: true }),
    supabase
      .from("user_daily_checkins")
      .select("check_in_date")
      .eq("user_id", user.id)
      .gte("check_in_date", fy.startIso)
      .lte("check_in_date", fy.endIso),
    supabase
      .from("user_quiz_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .gte("completed_at", fy.startIso)
      .lt("completed_at", fy.endExclusiveIso),
    supabase
      .from("user_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", fy.startIso)
      .lt("created_at", fy.endExclusiveIso),
    supabase
      .from("user_watchlist_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("added_at", fy.startIso)
      .lt("added_at", fy.endExclusiveIso),
    supabase
      .from("rate_alert_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("verified", true),
  ]);

  const reads: [string, { error: { message: string } | null }][] = [
    ["investor_holdings", holdingsRes],
    ["investor_goals", goalsRes],
    ["manual_balances", manualRes],
    ["user_health_score_log", healthRes],
    ["user_daily_checkins", checkinsRes],
    ["user_quiz_history", quizRes],
    ["user_bookmarks", bookmarksRes],
    ["user_watchlist_items", watchlistRes],
    ["rate_alert_subscriptions", alertSubsRes],
  ];
  for (const [table, res] of reads) {
    if (res.error) log.warn("wrapped read failed — card degrades", { table, err: res.error.message });
  }

  const manualBalanceCents = ((manualRes.data ?? []) as { amount_cents: number | null }[]).reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0,
  );

  const subscriptionIds = ((alertSubsRes.data ?? []) as { id: string }[]).map((s) => s.id);
  const alertsTriggered = await countOwnAlertSends(subscriptionIds, fy);

  const rows: WrappedSourceRows = {
    ...EMPTY_WRAPPED_ROWS,
    holdings: (holdingsRes.data ?? []) as WrappedSourceRows["holdings"],
    goals: (goalsRes.data ?? []) as WrappedSourceRows["goals"],
    manualBalanceCents,
    healthLog: (healthRes.data ?? []) as WrappedSourceRows["healthLog"],
    checkinDates: ((checkinsRes.data ?? []) as { check_in_date: string }[]).map(
      (c) => c.check_in_date,
    ),
    quizzesCompleted: quizRes.count ?? 0,
    guidesSaved: bookmarksRes.count ?? 0,
    watchlistAdds: watchlistRes.count ?? 0,
    activeAlerts: subscriptionIds.length,
    alertsTriggered,
    accountCreatedAt: user.createdAt,
  };

  return assembleWrapped(rows, fy, nowMs);
}
