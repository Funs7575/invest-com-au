/**
 * Monthly Money Review — pure model assembly for the guided ritual.
 *
 * No I/O. Callers fetch the rows (server component via RLS, or the cron via
 * the admin client) and hand them in; this module composes the review model
 * the `/account/review` flow renders and the snapshot that gets persisted.
 *
 * "Since your last review" deltas: there is NO balance-history table, so
 * deltas are computed by diffing the current figures against the PREVIOUS
 * completed review's stored `snapshot` jsonb (the `user_reviews_log.snapshot`
 * column exists for exactly this). The first-ever review has no prior
 * snapshot, so every section frames its numbers as a baseline rather than a
 * change.
 *
 * Compliance: arithmetic on the user's own stored data — same legal footing
 * as /account/decisions and /account/health. Never advice; the page renders
 * GENERAL_ADVICE_WARNING alongside.
 *
 * Fail-soft: every section is independently nullable. A missing/absent data
 * source (e.g. no health-score history, no rate memory) yields a null section
 * rather than throwing — the flow simply skips that screen.
 *
 * Row types are defined locally on purpose (per the migration-discipline note
 * the table is brand-new and intentionally absent from lib/database.types.ts).
 */

import { projectGoal } from "@/lib/goals/project";

// ─── Period helpers ──────────────────────────────────────────────────────────

/** Calendar month identifier, e.g. "2026-06". */
export type ReviewPeriod = string;

/** The period for a given instant, in UTC. */
export function periodForDate(date: Date = new Date()): ReviewPeriod {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** The period immediately before `period` ("2026-01" → "2025-12"). */
export function previousPeriod(period: ReviewPeriod): ReviewPeriod {
  const [y, m] = period.split("-").map(Number) as [number, number];
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Whole-month distance between two periods (a − b). "2026-03","2026-01" → 2. */
export function periodDiffMonths(a: ReviewPeriod, b: ReviewPeriod): number {
  const [ay, am] = a.split("-").map(Number) as [number, number];
  const [by, bm] = b.split("-").map(Number) as [number, number];
  return (ay - by) * 12 + (am - bm);
}

/** Human label for a period, e.g. "June 2026". */
export function periodLabel(period: ReviewPeriod): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  // Day 15 avoids any timezone day-rollover landing in the wrong month.
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── Input row shapes (locally defined; table not in database.types) ──────────

export interface ReviewGoalRow {
  id: number;
  label: string;
  goal_type: string;
  target_cents: number;
  target_date: string;
  current_balance_cents: number;
  monthly_contribution_cents: number;
  expected_return_pct: number;
}

export interface ReviewBalanceRow {
  label: string;
  amount_cents: number;
  category: string;
}

export interface ReviewHealthRow {
  overall: number;
  scored_month: string; // ISO date
  scored_at: string;
}

export interface ReviewRateMemoryRow {
  broker_name: string;
  broker_slug: string;
  product_kind: string;
  last_seen_rate_bps: number;
  notified_rate_bps: number | null;
  notified_at: string | null;
}

/** A previously-stored review row (the prior snapshot powers deltas). */
export interface ReviewLogRow {
  period: ReviewPeriod;
  completed_at: string | null;
  snapshot: ReviewSnapshot | null;
}

// ─── Snapshot (persisted to user_reviews_log.snapshot) ────────────────────────

export interface ReviewSnapshot {
  /** Schema version so future shape changes can be migrated/ignored safely. */
  v: 1;
  /** Total net worth in cents (manual balances summed). */
  netWorthCents: number;
  /** Per-goal projected progress at snapshot time, keyed by goal id. */
  goals: Record<string, { progressPct: number; currentBalanceCents: number }>;
  /** Overall health score at snapshot time, or null if none recorded. */
  healthOverall: number | null;
  /** Count of open decisions at snapshot time. */
  openDecisions: number;
  /** ISO instant the snapshot was taken. */
  takenAt: string;
}

// ─── Output model ────────────────────────────────────────────────────────────

export type ReviewSectionKey = "net_worth" | "goals" | "rates" | "decisions";

export interface ReviewNudge {
  label: string;
  href: string;
}

export interface ReviewSectionBase {
  key: ReviewSectionKey;
  /** Short headline shown on the section screen. */
  headline: string;
  /** One-line supporting copy (the "since last review" sentence). */
  detail: string;
  /** Whether this is the user's first review (baseline framing). */
  baseline: boolean;
  /** Single nudge action linking into an existing surface. */
  nudge: ReviewNudge;
}

export interface NetWorthSection extends ReviewSectionBase {
  key: "net_worth";
  totalCents: number;
  deltaCents: number | null;
}

export interface GoalsSection extends ReviewSectionBase {
  key: "goals";
  goals: Array<{
    id: number;
    label: string;
    progressPct: number;
    deltaPct: number | null;
    onTrack: boolean;
  }>;
}

export interface RatesSection extends ReviewSectionBase {
  key: "rates";
  changed: Array<{
    brokerName: string;
    brokerSlug: string;
    productKind: string;
    fromPct: string;
    currentPct: string;
  }>;
}

export interface DecisionsSection extends ReviewSectionBase {
  key: "decisions";
  openCount: number;
}

export type ReviewSection =
  | NetWorthSection
  | GoalsSection
  | RatesSection
  | DecisionsSection;

export interface ReviewModel {
  period: ReviewPeriod;
  periodLabel: string;
  /** True when no prior completed review exists. */
  isBaseline: boolean;
  /** Sections to walk through, in order. Null sections are omitted. */
  sections: ReviewSection[];
  /** The snapshot to persist when the user completes this review. */
  snapshot: ReviewSnapshot;
  /** Consecutive-month streak INCLUDING this period once completed. */
  streak: number;
  /** Whether this period has already been completed. */
  alreadyCompleted: boolean;
}

// ─── Inputs bundle ───────────────────────────────────────────────────────────

export interface ReviewInputs {
  period: ReviewPeriod;
  goals: ReviewGoalRow[];
  balances: ReviewBalanceRow[];
  /** Health-score history, any order; most-recent overall is used. */
  health: ReviewHealthRow[];
  /** Rate memory rows; only rows the cron flagged (notified_*) are surfaced. */
  rateMemory: ReviewRateMemoryRow[];
  /** Count of open decision-inbox items (computed by the caller). */
  openDecisions: number;
  /** Prior completed reviews, any order. Used for deltas + streak. */
  priorReviews: ReviewLogRow[];
  todayMs?: number;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildReviewModel(inputs: ReviewInputs): ReviewModel {
  const todayMs = inputs.todayMs ?? Date.now();
  const period = inputs.period;

  const completed = inputs.priorReviews.filter((r) => r.completed_at !== null);
  const thisReview = completed.find((r) => r.period === period) ?? null;
  const alreadyCompleted = thisReview !== null;

  // Prior snapshot = the most recent completed review STRICTLY before `period`.
  const prior = completed
    .filter((r) => periodDiffMonths(period, r.period) > 0)
    .sort((a, b) => periodDiffMonths(b.period, a.period) - 0) // newest prior first
    .sort((a, b) => (a.period < b.period ? 1 : -1))[0];
  const priorSnapshot = prior?.snapshot ?? null;
  const isBaseline = priorSnapshot === null;

  // ── Net worth ──────────────────────────────────────────────────────────────
  const netWorthCents = inputs.balances.reduce(
    (sum, b) => sum + (Number.isFinite(b.amount_cents) ? b.amount_cents : 0),
    0,
  );

  // ── Goals (projected progress per goal) ──────────────────────────────────────
  const goalProgress = inputs.goals.map((g) => {
    const projection = projectGoal(
      {
        targetCents: Number(g.target_cents),
        targetDate: g.target_date,
        currentBalanceCents: Number(g.current_balance_cents),
        monthlyContributionCents: Number(g.monthly_contribution_cents),
        expectedReturnPct: Number(g.expected_return_pct),
      },
      todayMs,
    );
    return {
      id: g.id,
      label: g.label,
      progressPct: projection.progressPct,
      currentBalanceCents: Number(g.current_balance_cents),
      onTrack: projection.surplusCents >= 0,
    };
  });

  // ── Health (most recent overall) ─────────────────────────────────────────────
  const latestHealth = pickLatestHealth(inputs.health);

  // ── Snapshot to persist ──────────────────────────────────────────────────────
  const snapshot: ReviewSnapshot = {
    v: 1,
    netWorthCents,
    goals: Object.fromEntries(
      goalProgress.map((g) => [
        String(g.id),
        { progressPct: g.progressPct, currentBalanceCents: g.currentBalanceCents },
      ]),
    ),
    healthOverall: latestHealth?.overall ?? null,
    openDecisions: inputs.openDecisions,
    takenAt: new Date(todayMs).toISOString(),
  };

  // ── Sections ─────────────────────────────────────────────────────────────────
  const sections: ReviewSection[] = [];

  const netWorthSection = buildNetWorthSection(
    netWorthCents,
    priorSnapshot,
    isBaseline,
  );
  if (netWorthSection) sections.push(netWorthSection);

  const goalsSection = buildGoalsSection(goalProgress, priorSnapshot, isBaseline);
  if (goalsSection) sections.push(goalsSection);

  const ratesSection = buildRatesSection(inputs.rateMemory, isBaseline);
  if (ratesSection) sections.push(ratesSection);

  const decisionsSection = buildDecisionsSection(
    inputs.openDecisions,
    priorSnapshot,
    isBaseline,
  );
  if (decisionsSection) sections.push(decisionsSection);

  // ── Streak (consecutive months INCLUDING this period once done) ──────────────
  const completedPeriods = new Set(completed.map((r) => r.period));
  completedPeriods.add(period); // count this period as if completed
  const streak = consecutiveMonthStreak(completedPeriods, period);

  return {
    period,
    periodLabel: periodLabel(period),
    isBaseline,
    sections,
    snapshot,
    streak,
    alreadyCompleted,
  };
}

// ─── Section builders ────────────────────────────────────────────────────────

function buildNetWorthSection(
  totalCents: number,
  prior: ReviewSnapshot | null,
  baseline: boolean,
): NetWorthSection {
  const deltaCents =
    prior && typeof prior.netWorthCents === "number"
      ? totalCents - prior.netWorthCents
      : null;

  let detail: string;
  if (baseline || deltaCents === null) {
    detail =
      totalCents > 0
        ? `Your starting net worth is ${formatDollars(totalCents)}. We'll track the change from here each month.`
        : "Add your savings, super and property balances to start tracking your net worth month to month.";
  } else if (deltaCents === 0) {
    detail = `Net worth held steady at ${formatDollars(totalCents)} since your last review.`;
  } else {
    const dir = deltaCents > 0 ? "up" : "down";
    detail = `Net worth is ${dir} ${formatDollars(Math.abs(deltaCents))} since your last review — now ${formatDollars(totalCents)}.`;
  }

  return {
    key: "net_worth",
    headline: "Your net worth",
    detail,
    baseline,
    totalCents,
    deltaCents,
    nudge: { label: "Update your balances", href: "/account/net-worth" },
  };
}

function buildGoalsSection(
  goals: Array<{
    id: number;
    label: string;
    progressPct: number;
    onTrack: boolean;
  }>,
  prior: ReviewSnapshot | null,
  baseline: boolean,
): GoalsSection | null {
  if (goals.length === 0) {
    // Still worth a screen: nudge them to set a goal.
    return {
      key: "goals",
      headline: "Your goals",
      detail: "You haven't set a financial goal yet. A target gives every month's review something to measure against.",
      baseline,
      goals: [],
      nudge: { label: "Set a goal", href: "/account/goals" },
    };
  }

  const enriched = goals.map((g) => {
    const priorPct = prior?.goals?.[String(g.id)]?.progressPct;
    const deltaPct =
      typeof priorPct === "number" ? g.progressPct - priorPct : null;
    return {
      id: g.id,
      label: g.label,
      progressPct: g.progressPct,
      deltaPct,
      onTrack: g.onTrack,
    };
  });

  const offTrack = enriched.filter((g) => !g.onTrack);
  const detail = baseline
    ? `Tracking ${goals.length} goal${goals.length === 1 ? "" : "s"}. We'll show how each one moves from here.`
    : offTrack.length > 0
      ? `${offTrack.length} of your ${goals.length} goal${goals.length === 1 ? "" : "s"} ${offTrack.length === 1 ? "is" : "are"} behind. See what it takes to catch up.`
      : `All ${goals.length} of your goal${goals.length === 1 ? "" : "s"} are projected on track. Keep it going.`;

  return {
    key: "goals",
    headline: "Your goals",
    detail,
    baseline,
    goals: enriched,
    nudge: { label: "Review your goals", href: "/account/goals" },
  };
}

function buildRatesSection(
  rateMemory: ReviewRateMemoryRow[],
  baseline: boolean,
): RatesSection | null {
  // Only surface rows where the rate-change cron actually flagged a move.
  const flagged = rateMemory.filter(
    (r) => r.notified_at !== null && r.notified_rate_bps !== null,
  );

  if (flagged.length === 0) {
    // No table data / no flagged changes → skip the screen entirely.
    return null;
  }

  const changed = flagged.map((r) => {
    const fromBps = r.notified_rate_bps ?? r.last_seen_rate_bps;
    return {
      brokerName: r.broker_name,
      brokerSlug: r.broker_slug,
      productKind: r.product_kind,
      fromPct: (fromBps / 100).toFixed(2),
      currentPct: (r.last_seen_rate_bps / 100).toFixed(2),
    };
  });

  const first = changed[0]!;
  const detail =
    changed.length === 1
      ? `Your ${productLabel(first.productKind)} rate at ${first.brokerName} moved from ${first.fromPct}% to ${first.currentPct}%. Worth a look.`
      : `${changed.length} of your tracked rates have moved since your last visit. Compare what's on offer now.`;

  return {
    key: "rates",
    headline: "Your rates",
    detail,
    baseline,
    changed,
    nudge: {
      label: "Compare current rates",
      href: `/${first.productKind === "td" ? "term-deposits" : "savings"}`,
    },
  };
}

function buildDecisionsSection(
  openCount: number,
  prior: ReviewSnapshot | null,
  baseline: boolean,
): DecisionsSection {
  const priorCount =
    prior && typeof prior.openDecisions === "number"
      ? prior.openDecisions
      : null;

  let detail: string;
  if (openCount === 0) {
    detail = "Nothing open right now — you're all caught up.";
  } else if (baseline || priorCount === null) {
    detail = `You have ${openCount} open decision${openCount === 1 ? "" : "s"} waiting — goals, plans, briefs or alerts that need a look.`;
  } else if (openCount > priorCount) {
    detail = `${openCount} open decision${openCount === 1 ? "" : "s"} (${openCount - priorCount} more than last review).`;
  } else if (openCount < priorCount) {
    detail = `Down to ${openCount} open decision${openCount === 1 ? "" : "s"} — ${priorCount - openCount} fewer than last review. Nice.`;
  } else {
    detail = `Still ${openCount} open decision${openCount === 1 ? "" : "s"} to work through.`;
  }

  return {
    key: "decisions",
    headline: "Open decisions",
    detail,
    baseline,
    openCount,
    nudge: { label: "Open your decision inbox", href: "/account/decisions" },
  };
}

// ─── Streak math (consecutive completed months) ───────────────────────────────

/**
 * Count of consecutive completed monthly periods ending at `endPeriod`.
 * Mirrors lib/streak.ts's consecutive-day logic, but in month units and
 * keyed on period strings rather than dates. Returns 0 if `endPeriod`
 * itself isn't in the set.
 */
export function consecutiveMonthStreak(
  completedPeriods: Set<ReviewPeriod>,
  endPeriod: ReviewPeriod,
): number {
  if (!completedPeriods.has(endPeriod)) return 0;
  let streak = 1;
  let cursor = previousPeriod(endPeriod);
  while (completedPeriods.has(cursor)) {
    streak++;
    cursor = previousPeriod(cursor);
  }
  return streak;
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function pickLatestHealth(rows: ReviewHealthRow[]): ReviewHealthRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    // Prefer scored_month, fall back to scored_at.
    const am = a.scored_month || a.scored_at;
    const bm = b.scored_month || b.scored_at;
    return bm.localeCompare(am);
  })[0]!;
}

function productLabel(kind: string): string {
  if (kind === "savings") return "savings account";
  if (kind === "td") return "term deposit";
  return kind;
}

export function formatDollars(cents: number): string {
  const dollars = Math.round(cents / 100);
  return `$${dollars.toLocaleString("en-AU")}`;
}
