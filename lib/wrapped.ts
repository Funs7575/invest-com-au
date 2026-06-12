/**
 * FY Money Wrapped — pure composition, no I/O.
 *
 * Assembles a per-user end-of-financial-year recap (`WrappedData`) from
 * rows the caller has already fetched, then turns it into an ordered deck
 * of cards (`buildWrappedCards`). Every section is nullable: a card only
 * exists when the user actually has that data, and a brand-new user gets
 * the "your first FY starts now" framing instead of empty noise.
 *
 * Compliance: strictly own-data arithmetic. No comparisons against other
 * users, no percentiles, no investment-performance claims — the recap is
 * a factual summary of what the user saved on the platform, in the same
 * legal lane as /account/net-worth and /account/health.
 *
 * Data fetch lives in lib/wrapped-server.ts; this module stays pure so
 * the whole composition is unit-testable with fixtures.
 */

import { projectGoal } from "@/lib/goals/project";
import { gradeFor, type HealthScore } from "@/lib/user-health-score";

// ─── Financial-year maths ────────────────────────────────────────────────

export interface FyPeriod {
  /** "FY26" — named for the calendar year the FY ends in. */
  label: string;
  /** First day, ISO date: "2025-07-01". */
  startIso: string;
  /** Last day, ISO date: "2026-06-30". */
  endIso: string;
  /** First day of the NEXT FY — handy for `lt` filters on timestamps. */
  endExclusiveIso: string;
  /** 2026 for FY26. */
  endYear: number;
}

export function fyFromEndYear(endYear: number): FyPeriod {
  return {
    label: `FY${String(endYear % 100).padStart(2, "0")}`,
    startIso: `${endYear - 1}-07-01`,
    endIso: `${endYear}-06-30`,
    endExclusiveIso: `${endYear}-07-01`,
    endYear,
  };
}

/** The Australian financial year containing the given date (UTC). */
export function fyForDate(d: Date): FyPeriod {
  const month = d.getUTCMonth() + 1;
  return fyFromEndYear(month >= 7 ? d.getUTCFullYear() + 1 : d.getUTCFullYear());
}

/**
 * The FY the Wrapped page should recap right now. July–September keeps
 * showing the FY that just closed (the wrapped moment outlives June 30);
 * from October the new FY's "so far" story takes over.
 */
export function wrappedFyForDate(d: Date): FyPeriod {
  const month = d.getUTCMonth() + 1;
  const fy = fyForDate(d);
  if (month >= 7 && month <= 9) return fyFromEndYear(fy.endYear - 1);
  return fy;
}

/** Whole days from `nowMs` until the FY's June 30 (inclusive), floor 0. */
export function fyDaysRemaining(fy: FyPeriod, nowMs: number): number {
  const end = Date.parse(`${fy.endIso}T23:59:59Z`);
  if (nowMs >= end) return 0;
  return Math.ceil((end - nowMs) / 86_400_000);
}

// ─── Section types ───────────────────────────────────────────────────────

export interface WrappedBalances {
  totalCents: number;
  holdingsCents: number;
  holdingsCount: number;
  goalsCents: number;
  goalsCount: number;
  manualCents: number;
}

export interface WrappedInvested {
  /** Cost basis the user recorded adding during the FY, in cents. */
  addedCents: number;
  newHoldings: number;
}

export interface WrappedGoals {
  total: number;
  onTrack: number;
  topGoalLabel: string | null;
  /** Projection coverage of the top goal's target (0–999). */
  topGoalProgressPct: number | null;
}

export interface WrappedHealth {
  startOverall: number;
  endOverall: number;
  startGrade: HealthScore["grade"];
  endGrade: HealthScore["grade"];
  /** Distinct scored months inside the FY. */
  months: number;
}

export interface WrappedAlerts {
  /** Verified alert subscriptions linked to the account. */
  activeAlerts: number;
  /** Alert emails sent during the FY; null when the send log is unavailable. */
  alertsTriggered: number | null;
}

export interface WrappedStreak {
  longestRunDays: number;
  totalCheckins: number;
}

export interface WrappedActivity {
  quizzesCompleted: number;
  guidesSaved: number;
  watchlistAdds: number;
  total: number;
}

export interface WrappedData {
  fy: FyPeriod;
  /** True while today is still inside the recapped FY. */
  inProgress: boolean;
  daysRemaining: number;
  /** Account was created during this FY. */
  isFirstFy: boolean;
  hasAnyData: boolean;
  balances: WrappedBalances | null;
  invested: WrappedInvested | null;
  goals: WrappedGoals | null;
  health: WrappedHealth | null;
  alerts: WrappedAlerts | null;
  streak: WrappedStreak | null;
  activity: WrappedActivity | null;
}

// ─── Source rows (what the loader hands in) ──────────────────────────────

export interface WrappedSourceRows {
  holdings: {
    acquired_at: string | null;
    shares: number | null;
    cost_basis_per_share_cents: number | null;
  }[];
  goals: {
    label: string;
    target_cents: number;
    current_balance_cents: number;
    monthly_contribution_cents: number;
    expected_return_pct: number;
    target_date: string;
  }[];
  /** Sum of manual_balances.amount_cents. */
  manualBalanceCents: number;
  /** user_health_score_log rows inside the FY, any order. */
  healthLog: { overall: number; scored_month: string }[];
  /** user_daily_checkins.check_in_date values inside the FY. */
  checkinDates: string[];
  quizzesCompleted: number;
  guidesSaved: number;
  watchlistAdds: number;
  activeAlerts: number;
  /** null = rate_alert_sends unavailable (table absent / read failed). */
  alertsTriggered: number | null;
  accountCreatedAt: string | null;
}

export const EMPTY_WRAPPED_ROWS: WrappedSourceRows = {
  holdings: [],
  goals: [],
  manualBalanceCents: 0,
  healthLog: [],
  checkinDates: [],
  quizzesCompleted: 0,
  guidesSaved: 0,
  watchlistAdds: 0,
  activeAlerts: 0,
  alertsTriggered: null,
  accountCreatedAt: null,
};

// ─── Small pure helpers ──────────────────────────────────────────────────

/** Longest run of consecutive calendar days in a list of ISO dates. */
export function longestRunDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = Date.parse(`${unique[i - 1]}T00:00:00Z`);
    const curr = Date.parse(`${unique[i]}T00:00:00Z`);
    if (curr - prev === 86_400_000) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

/** "$18,240" — whole Australian dollars from cents. */
export function formatAudCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

function holdingCostCents(h: WrappedSourceRows["holdings"][number]): number {
  const shares = Number(h.shares ?? 0);
  const basis = Number(h.cost_basis_per_share_cents ?? 0);
  if (!Number.isFinite(shares) || !Number.isFinite(basis)) return 0;
  return shares * basis;
}

function isWithinFy(iso: string | null, fy: FyPeriod): boolean {
  if (!iso) return false;
  const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  if (!Number.isFinite(t)) return false;
  return t >= Date.parse(`${fy.startIso}T00:00:00Z`) && t < Date.parse(`${fy.endExclusiveIso}T00:00:00Z`);
}

// ─── Assembly ────────────────────────────────────────────────────────────

export function assembleWrapped(
  rows: WrappedSourceRows,
  fy: FyPeriod,
  nowMs: number,
): WrappedData {
  // Balances — same sources as /account/net-worth, holdings at cost so the
  // number is stable and free of market-price fetches.
  const holdingsCents = Math.round(rows.holdings.reduce((sum, h) => sum + holdingCostCents(h), 0));
  const goalsCents = rows.goals.reduce((sum, g) => sum + (g.current_balance_cents ?? 0), 0);
  const manualCents = rows.manualBalanceCents;
  const hasBalances = rows.holdings.length > 0 || rows.goals.length > 0 || manualCents > 0;
  const balances: WrappedBalances | null = hasBalances
    ? {
        totalCents: holdingsCents + goalsCents + manualCents,
        holdingsCents,
        holdingsCount: rows.holdings.length,
        goalsCents,
        goalsCount: rows.goals.length,
        manualCents,
      }
    : null;

  // Money put to work this FY — holdings the user recorded acquiring
  // inside the window, valued at their recorded cost.
  const fyHoldings = rows.holdings.filter((h) => isWithinFy(h.acquired_at, fy));
  const addedCents = Math.round(fyHoldings.reduce((sum, h) => sum + holdingCostCents(h), 0));
  const invested: WrappedInvested | null =
    fyHoldings.length > 0 && addedCents > 0
      ? { addedCents, newHoldings: fyHoldings.length }
      : null;

  // Goals — "on track" = projection lands at or above target by target_date.
  let goals: WrappedGoals | null = null;
  if (rows.goals.length > 0) {
    let onTrack = 0;
    let topLabel: string | null = null;
    let topPct: number | null = null;
    for (const g of rows.goals) {
      const projection = projectGoal(
        {
          targetCents: g.target_cents,
          targetDate: g.target_date,
          currentBalanceCents: g.current_balance_cents,
          monthlyContributionCents: g.monthly_contribution_cents,
          expectedReturnPct: g.expected_return_pct,
        },
        nowMs,
      );
      if (projection.surplusCents >= 0) onTrack += 1;
      if (topPct === null || projection.progressPct > topPct) {
        topPct = projection.progressPct;
        topLabel = g.label;
      }
    }
    goals = {
      total: rows.goals.length,
      onTrack,
      topGoalLabel: topLabel,
      topGoalProgressPct: topPct,
    };
  }

  // Health-score trend — first vs last scored month inside the FY.
  let health: WrappedHealth | null = null;
  if (rows.healthLog.length > 0) {
    const sorted = [...rows.healthLog].sort((a, b) => a.scored_month.localeCompare(b.scored_month));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first && last) {
      health = {
        startOverall: first.overall,
        endOverall: last.overall,
        startGrade: gradeFor(first.overall),
        endGrade: gradeFor(last.overall),
        months: new Set(sorted.map((r) => r.scored_month)).size,
      };
    }
  }

  // Rate alerts — only worth a card when something is actually set up
  // or actually fired.
  const alerts: WrappedAlerts | null =
    rows.activeAlerts > 0 || (rows.alertsTriggered ?? 0) > 0
      ? { activeAlerts: rows.activeAlerts, alertsTriggered: rows.alertsTriggered }
      : null;

  // Check-in streak inside the FY.
  const uniqueCheckins = new Set(rows.checkinDates).size;
  const streak: WrappedStreak | null =
    uniqueCheckins > 0
      ? { longestRunDays: longestRunDays(rows.checkinDates), totalCheckins: uniqueCheckins }
      : null;

  // Research activity.
  const activityTotal = rows.quizzesCompleted + rows.guidesSaved + rows.watchlistAdds;
  const activity: WrappedActivity | null =
    activityTotal > 0
      ? {
          quizzesCompleted: rows.quizzesCompleted,
          guidesSaved: rows.guidesSaved,
          watchlistAdds: rows.watchlistAdds,
          total: activityTotal,
        }
      : null;

  const isFirstFy = rows.accountCreatedAt !== null && isWithinFy(rows.accountCreatedAt, fy);
  const hasAnyData = Boolean(balances || invested || goals || health || alerts || streak || activity);

  return {
    fy,
    inProgress: fyDaysRemaining(fy, nowMs) > 0 && nowMs >= Date.parse(`${fy.startIso}T00:00:00Z`),
    daysRemaining: fyDaysRemaining(fy, nowMs),
    isFirstFy,
    hasAnyData,
    balances,
    invested,
    goals,
    health,
    alerts,
    streak,
    activity,
  };
}

// ─── Card deck ───────────────────────────────────────────────────────────

export type WrappedTone = "violet" | "emerald" | "amber" | "sky" | "rose" | "slate";

export interface WrappedCard {
  key:
    | "intro"
    | "balances"
    | "invested"
    | "goals"
    | "health"
    | "alerts"
    | "streak"
    | "activity"
    | "finale";
  /** Small uppercase label above the headline. */
  kicker: string;
  /** The one big stat / statement. */
  headline: string;
  /** Supporting sentence(s). */
  body: string;
  tone: WrappedTone;
  cta?: { href: string; label: string };
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * One-line summary for sharing ("FY26 — $48,210 tracked · 2 of 3 goals on
 * track · health score C → B"). Caps at four segments, highest-signal first.
 */
export function wrappedShareSummary(data: WrappedData): string {
  const segments: string[] = [];
  if (data.balances) segments.push(`${formatAudCents(data.balances.totalCents)} tracked`);
  if (data.invested) segments.push(`${formatAudCents(data.invested.addedCents)} put to work`);
  if (data.goals) {
    segments.push(`${data.goals.onTrack} of ${data.goals.total} ${plural(data.goals.total, "goal", "goals")} on track`);
  }
  if (data.health && data.health.months >= 2 && data.health.startGrade !== data.health.endGrade) {
    segments.push(`health score ${data.health.startGrade} → ${data.health.endGrade}`);
  }
  if (data.streak && data.streak.longestRunDays >= 2) {
    segments.push(`${data.streak.longestRunDays}-day streak`);
  }
  if (data.alerts && (data.alerts.alertsTriggered ?? 0) > 0) {
    segments.push(`${data.alerts.alertsTriggered} rate ${plural(data.alerts.alertsTriggered ?? 0, "alert", "alerts")} fired`);
  }
  if (data.activity) {
    segments.push(`${data.activity.total} research ${plural(data.activity.total, "move", "moves")}`);
  }
  if (segments.length === 0) return `${data.fy.label} — a clean slate.`;
  return `${data.fy.label} — ${segments.slice(0, 4).join(" · ")}`;
}

export function buildWrappedCards(data: WrappedData): WrappedCard[] {
  const cards: WrappedCard[] = [];
  const fyLabel = data.fy.label;

  // Intro.
  if (data.hasAnyData) {
    cards.push({
      key: "intro",
      kicker: "Your year in money",
      headline: data.inProgress ? `${fyLabel}, nearly wrapped.` : `${fyLabel}, wrapped.`,
      body: data.inProgress
        ? `${data.daysRemaining} ${plural(data.daysRemaining, "day", "days")} left on the financial-year clock. Here's what you've tracked, saved and set in motion so far — built entirely from your own saved data.`
        : `The financial year is done. Here's what you tracked, saved and set in motion — built entirely from your own saved data.`,
      tone: "violet",
    });
  } else {
    cards.push({
      key: "intro",
      kicker: "Your year in money",
      headline: "Your first FY starts now.",
      body: `Nothing saved yet — which means a clean slate. Set a goal, track a holding or run the health check, and next year's Wrapped will have a story to tell.`,
      tone: "violet",
    });
  }

  if (data.balances) {
    const parts: string[] = [];
    if (data.balances.holdingsCount > 0) {
      parts.push(
        `${data.balances.holdingsCount} ${plural(data.balances.holdingsCount, "holding", "holdings")} at cost`,
      );
    }
    if (data.balances.goalsCount > 0) {
      parts.push(`${data.balances.goalsCount} goal ${plural(data.balances.goalsCount, "balance", "balances")}`);
    }
    if (data.balances.manualCents > 0) parts.push("your manual balances");
    const joined =
      parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
    cards.push({
      key: "balances",
      kicker: "What you're tracking",
      headline: formatAudCents(data.balances.totalCents),
      body: `Across ${joined} — the picture you've built here, one entry at a time.`,
      tone: "emerald",
      cta: { href: "/account/net-worth", label: "See the live view" },
    });
  }

  if (data.invested) {
    cards.push({
      key: "invested",
      kicker: "Put to work",
      headline: `+${formatAudCents(data.invested.addedCents)}`,
      body: `Recorded across ${data.invested.newHoldings} ${plural(data.invested.newHoldings, "new holding", "new holdings")} this FY — money you chose to put to work.`,
      tone: "sky",
      cta: { href: "/account/holdings", label: "Review your holdings" },
    });
  }

  if (data.goals) {
    const g = data.goals;
    const headline =
      g.onTrack === g.total
        ? g.total === 1
          ? "1 of 1 on track"
          : `All ${g.total} on track`
        : `${g.onTrack} of ${g.total} on track`;
    let body = "Projected from your balances, contributions and the return you assumed.";
    if (g.topGoalLabel && g.topGoalProgressPct !== null) {
      body =
        g.topGoalProgressPct >= 100
          ? `“${g.topGoalLabel}” is projected to meet its target by the date you set.`
          : `“${g.topGoalLabel}” is projected to reach ${g.topGoalProgressPct}% of its target by the date you set.`;
    }
    cards.push({
      key: "goals",
      kicker: "Goals",
      headline,
      body,
      tone: "violet",
      cta: { href: "/account/goals", label: "Check your goals" },
    });
  }

  if (data.health) {
    const h = data.health;
    const moved = h.months >= 2 && h.startOverall !== h.endOverall;
    const headline =
      h.months >= 2 && h.startGrade !== h.endGrade ? `${h.startGrade} → ${h.endGrade}` : `Grade ${h.endGrade}`;
    const body =
      h.months >= 2
        ? moved
          ? `Your financial health score went ${h.startOverall} to ${h.endOverall} out of 100 across ${h.months} monthly snapshots.`
          : `Your financial health score held at ${h.endOverall}/100 across ${h.months} monthly snapshots.`
        : `Your first scored month came in at ${h.endOverall}/100.`;
    cards.push({
      key: "health",
      kicker: "Health score",
      headline,
      body,
      tone: "emerald",
      cta: { href: "/account/health", label: "See the full breakdown" },
    });
  }

  if (data.alerts) {
    const fired = data.alerts.alertsTriggered ?? 0;
    cards.push({
      key: "alerts",
      kicker: "Rate watch",
      headline:
        fired > 0
          ? `${fired} ${plural(fired, "alert", "alerts")} fired`
          : `${data.alerts.activeAlerts} ${plural(data.alerts.activeAlerts, "alert", "alerts")} on watch`,
      body:
        fired > 0
          ? `Your rate alerts flagged ${fired} ${plural(fired, "move", "moves")} this FY — the market shifted, and you heard about it.`
          : "Standing watch on rates and fees, so you don't have to keep refreshing comparison tables.",
      tone: "amber",
      cta: { href: "/account/alerts", label: "Manage alerts" },
    });
  }

  if (data.streak) {
    const s = data.streak;
    cards.push({
      key: "streak",
      kicker: "Showing up",
      headline:
        s.longestRunDays >= 2
          ? `${s.longestRunDays}-day streak`
          : `${s.totalCheckins} ${plural(s.totalCheckins, "check-in", "check-ins")}`,
      body:
        s.longestRunDays >= 2
          ? `You checked in ${s.totalCheckins} ${plural(s.totalCheckins, "day", "days")} this FY, with your longest run at ${s.longestRunDays} days straight. Small habits, compounding.`
          : `You checked in ${s.totalCheckins} ${plural(s.totalCheckins, "day", "days")} this FY. Small habits, compounding.`,
      tone: "rose",
    });
  }

  if (data.activity) {
    const a = data.activity;
    const bits: string[] = [];
    if (a.quizzesCompleted > 0) {
      bits.push(`${a.quizzesCompleted} ${plural(a.quizzesCompleted, "quiz", "quizzes")} finished`);
    }
    if (a.guidesSaved > 0) bits.push(`${a.guidesSaved} ${plural(a.guidesSaved, "guide", "guides")} saved`);
    if (a.watchlistAdds > 0) {
      bits.push(`${a.watchlistAdds} watchlist ${plural(a.watchlistAdds, "add", "adds")}`);
    }
    const joined =
      bits.length > 1 ? `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}` : (bits[0] ?? "");
    cards.push({
      key: "activity",
      kicker: "Research done",
      headline: `${a.total} research ${plural(a.total, "move", "moves")}`,
      body: `${joined.charAt(0).toUpperCase()}${joined.slice(1)}. That's homework most people never do.`,
      tone: "sky",
    });
  }

  // Finale.
  const nextFy = fyFromEndYear(data.fy.endYear + 1);
  cards.push({
    key: "finale",
    kicker: data.inProgress ? "Before June 30" : "Next",
    headline: data.hasAnyData
      ? data.inProgress
        ? "Finish strong."
        : `Bring on ${nextFy.label}.`
      : "Start your story.",
    body: data.hasAnyData
      ? wrappedShareSummary(data)
      : `Set yourself up now and ${nextFy.label}'s recap writes itself.`,
    tone: "slate",
  });

  return cards;
}
