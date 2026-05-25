/**
 * Decision inbox — pure aggregation of open items across a user's account.
 *
 * No I/O. Accepts already-fetched rows and returns a sorted list of
 * `DecisionItem`s that the `/account/decisions` page renders.
 *
 * Sources:
 *   1. Goals (investor_goals) — off-track or due-soon goals
 *   2. Action plans (get_matched_action_plans) — draft/saved with open checklist
 *   3. Advisor briefs — plans linked to a brief awaiting advisor response
 *   4. Saved searches — active (non-off) email alert filters
 *   5. Rate memory — products where the cron detected a rate change
 *
 * Compliance: arithmetic on user's own stored data — same legal footing as
 * /account/goals projection and /account/health score.
 */

import { projectGoal } from "@/lib/goals/project";
import type { ActionPlan } from "@/lib/getmatched/types";
import type { SavedSearchRow } from "@/lib/saved-searches";

// ─── Input shapes ────────────────────────────────────────────────────────────

export interface GoalDbRow {
  id: number;
  label: string;
  goal_type: string;
  target_cents: number;
  target_date: string;
  current_balance_cents: number;
  monthly_contribution_cents: number;
  expected_return_pct: number;
}

export interface RateMemoryRow {
  id: string;
  broker_id: number;
  broker_name: string;
  broker_slug: string;
  product_kind: string;
  last_seen_rate_bps: number;
  notified_rate_bps: number | null;
  notified_at: string | null;
  last_seen_at: string;
}

// ─── Output shape ────────────────────────────────────────────────────────────

export type DecisionKind = "goal" | "plan" | "brief" | "saved_search" | "rate_alert";
export type DecisionUrgency = "high" | "medium" | "low";
export type BadgeTone = "red" | "amber" | "green" | "blue" | "slate";

export interface DecisionItem {
  key: string;
  kind: DecisionKind;
  title: string;
  subtitle: string;
  urgency: DecisionUrgency;
  badge: string;
  badgeTone: BadgeTone;
  href: string;
  dueLabel: string | null;
  nextAction: string | null;
}

// ─── Core builder ────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<DecisionUrgency, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function buildDecisionInbox(
  goals: GoalDbRow[],
  plans: ActionPlan[],
  searches: SavedSearchRow[],
  rateMemory: RateMemoryRow[],
  todayMs: number = Date.now(),
): DecisionItem[] {
  const items: DecisionItem[] = [
    ...goalItems(goals, todayMs),
    ...planItems(plans),
    ...searchItems(searches),
    ...rateAlertItems(rateMemory),
  ];

  items.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  return items;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

function goalItems(goals: GoalDbRow[], todayMs: number): DecisionItem[] {
  return goals.map((goal) => {
    const projection = projectGoal(
      {
        targetCents: Number(goal.target_cents),
        targetDate: goal.target_date,
        currentBalanceCents: Number(goal.current_balance_cents),
        monthlyContributionCents: Number(goal.monthly_contribution_cents),
        expectedReturnPct: Number(goal.expected_return_pct),
      },
      todayMs,
    );

    const targetMs = new Date(`${goal.target_date}T00:00:00Z`).getTime();
    const isOverdue = targetMs < todayMs;
    const monthsLeft = projection.monthsToTarget;
    const isOnTrack = projection.surplusCents >= 0;
    const progressPct = projection.progressPct;
    const targetDollars = Math.round(Number(goal.target_cents) / 100).toLocaleString("en-AU");

    let urgency: DecisionUrgency;
    let badge: string;
    let badgeTone: BadgeTone;

    if (isOverdue) {
      urgency = "high";
      badge = "Overdue";
      badgeTone = "red";
    } else if (!isOnTrack && monthsLeft < 6) {
      urgency = "high";
      badge = "Off track";
      badgeTone = "red";
    } else if (!isOnTrack) {
      urgency = "medium";
      badge = "Off track";
      badgeTone = "amber";
    } else if (monthsLeft <= 3) {
      urgency = "medium";
      badge = "Due soon";
      badgeTone = "amber";
    } else {
      urgency = "low";
      badge = "On track";
      badgeTone = "green";
    }

    const dueLabel = isOverdue
      ? "Target date passed"
      : monthsLeft === 0
        ? "Due this month"
        : monthsLeft === 1
          ? "1 month away"
          : `${monthsLeft} months away`;

    const requiredDollars = Math.round(
      projection.requiredMonthlyContributionCents / 100,
    ).toLocaleString("en-AU");

    const nextAction =
      !isOnTrack && projection.requiredMonthlyContributionCents > 0
        ? `Contribute $${requiredDollars}/mo to hit your target`
        : null;

    return {
      key: `goal:${goal.id}`,
      kind: "goal" as DecisionKind,
      title: goal.label,
      subtitle: `${progressPct}% projected · Target $${targetDollars}`,
      urgency,
      badge,
      badgeTone,
      href: "/account/goals",
      dueLabel,
      nextAction,
    };
  });
}

// ─── Plans & briefs ──────────────────────────────────────────────────────────

function planItems(plans: ActionPlan[]): DecisionItem[] {
  const items: DecisionItem[] = [];

  for (const plan of plans) {
    if (plan.status === "converted" || plan.status === "expired") continue;

    // Brief: plan linked to an advisor brief that's still awaiting response
    if (plan.linked_brief_id && plan.status === "saved") {
      const title = plan.goal ?? `Advisor brief #${plan.linked_brief_id}`;
      items.push({
        key: `brief:${plan.linked_brief_id}`,
        kind: "brief",
        title: capitalise(title),
        subtitle: "Brief sent — waiting for advisors to respond",
        urgency: "high",
        badge: "Awaiting response",
        badgeTone: "amber",
        href: `/account/plans/${plan.id}`,
        dueLabel: null,
        nextAction: "Check your plan to see if advisors have reached out",
      });
      continue;
    }

    const incomplete = plan.checklist.filter((c) => !c.done);
    if (incomplete.length === 0 && plan.status !== "draft") continue;

    const title =
      plan.goal ??
      plan.intent_slug?.replace(/_/g, " ") ??
      "Investment action plan";

    const subtitle =
      incomplete.length > 0
        ? `${incomplete.length} step${incomplete.length > 1 ? "s" : ""} remaining`
        : "No open steps — mark converted or build a brief";

    const urgency: DecisionUrgency = incomplete.length >= 3 ? "medium" : "low";

    items.push({
      key: `plan:${plan.id}`,
      kind: "plan",
      title: capitalise(title),
      subtitle,
      urgency,
      badge: plan.status === "draft" ? "Draft" : "Saved",
      badgeTone: plan.status === "draft" ? "slate" : "blue",
      href: `/account/plans/${plan.id}`,
      dueLabel: null,
      nextAction: incomplete[0]?.label ?? null,
    });
  }

  return items;
}

// ─── Saved searches ───────────────────────────────────────────────────────────

function searchItems(searches: SavedSearchRow[]): DecisionItem[] {
  return searches
    .filter((s) => s.email_frequency !== "off")
    .map((s) => {
      const lastAlerted = s.last_alerted_at
        ? `Last alerted ${new Date(s.last_alerted_at).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "short",
          })}`
        : "Never alerted yet";

      return {
        key: `search:${s.id}`,
        kind: "saved_search" as DecisionKind,
        title: s.label,
        subtitle: `${capitalise(s.kind)} search · ${s.email_frequency} alerts`,
        urgency: "low" as DecisionUrgency,
        badge: "Active alert",
        badgeTone: "blue" as BadgeTone,
        href: "/account/saved-searches",
        dueLabel: lastAlerted,
        nextAction: null,
      };
    });
}

// ─── Rate alerts ──────────────────────────────────────────────────────────────

function rateAlertItems(rows: RateMemoryRow[]): DecisionItem[] {
  return rows
    .filter((r) => r.notified_at !== null && r.notified_rate_bps !== null)
    .map((r) => {
      const fromPct = ((r.notified_rate_bps ?? r.last_seen_rate_bps) / 100).toFixed(2);
      const currentPct = (r.last_seen_rate_bps / 100).toFixed(2);
      const productLabel = r.product_kind === "savings"
        ? "savings account"
        : r.product_kind === "td"
          ? "term deposit"
          : r.product_kind;
      const direction =
        (r.notified_rate_bps ?? 0) > r.last_seen_rate_bps ? "dropped" : "changed";

      return {
        key: `rate:${r.id}`,
        kind: "rate_alert" as DecisionKind,
        title: `${r.broker_name} ${productLabel} rate ${direction}`,
        subtitle: `Was ${fromPct}% · Now showing ${currentPct}% on last visit`,
        urgency: "medium" as DecisionUrgency,
        badge: "Rate changed",
        badgeTone: "amber" as BadgeTone,
        href: `/${r.product_kind === "td" ? "term-deposits" : "savings"}/${r.broker_slug}`,
        dueLabel: `Notified ${new Date(r.notified_at!).toLocaleDateString("en-AU", {
          day: "numeric",
          month: "short",
        })}`,
        nextAction: "Check current rate and compare alternatives",
      };
    });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
