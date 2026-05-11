"use client";

import { useMemo, useState } from "react";
import { projectGoal, monthsBetween } from "@/lib/holdings/goal-projection";

export interface GoalRow {
  id: number;
  label: string;
  goalType: string;
  targetCents: number;
  targetDate: string;
  currentBalanceCents: number;
  monthlyContributionCents: number;
  expectedReturnPct: number;
  notes: string | null;
}

const GOAL_TYPES = ["retirement", "home", "education", "travel", "general"] as const;

interface Props {
  initialGoals: GoalRow[];
  currentValueCents: number;
}

const fmtAud = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function GoalsBlock({ initialGoals, currentValueCents }: Props) {
  const [goals, setGoals] = useState<GoalRow[]>(initialGoals);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const projections = useMemo(() => {
    const now = new Date();
    return goals.map((g) => {
      const months = monthsBetween(now, new Date(`${g.targetDate}T00:00:00Z`));
      // Starting value: prefer the goal's saved current_balance_cents when
      // set (lets users track non-portfolio goals like "house deposit in
      // savings"); fall back to live portfolio value so investment-style
      // goals reflect actual holdings.
      const startCents = g.currentBalanceCents > 0
        ? g.currentBalanceCents
        : currentValueCents;
      return {
        goal: g,
        result: projectGoal({
          currentValueCents: startCents,
          targetCents: g.targetCents,
          monthsToTarget: months,
          monthlyContributionCents: g.monthlyContributionCents,
          annualReturnPct: g.expectedReturnPct,
        }),
      };
    });
  }, [goals, currentValueCents]);

  const handleAdd = async (form: FormData) => {
    setError(null);
    setSaving(true);
    const body = {
      label: String(form.get("label") ?? "").trim(),
      goal_type: String(form.get("goalType") ?? "general"),
      target_cents: Math.round(Number(form.get("target") ?? 0) * 100),
      target_date: String(form.get("targetDate") ?? ""),
      current_balance_cents: Math.round(Number(form.get("currentBalance") ?? 0) * 100),
      monthly_contribution_cents: Math.round(Number(form.get("monthly") ?? 0) * 100),
      expected_return_pct: Number(form.get("returnPct") ?? 6),
      notes: (String(form.get("notes") ?? "").trim() || null),
    };
    try {
      const res = await fetch("/api/account/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "add_failed");
      }
      const j = (await res.json()) as {
        item: {
          id: number;
          label: string;
          goal_type: string;
          target_cents: string | number;
          target_date: string;
          current_balance_cents: string | number;
          monthly_contribution_cents: string | number;
          expected_return_pct: string | number;
          notes: string | null;
        };
      };
      const newRow: GoalRow = {
        id: j.item.id,
        label: j.item.label,
        goalType: j.item.goal_type,
        targetCents: Number(j.item.target_cents),
        targetDate: j.item.target_date,
        currentBalanceCents: Number(j.item.current_balance_cents),
        monthlyContributionCents: Number(j.item.monthly_contribution_cents),
        expectedReturnPct: Number(j.item.expected_return_pct),
        notes: j.item.notes,
      };
      setGoals((prev) =>
        [...prev, newRow].sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
      );
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add goal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const snapshot = goals;
    setDeletingId(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      const res = await fetch("/api/account/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete_failed");
    } catch {
      setGoals(snapshot);
      setError("Could not delete goal. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-base font-semibold text-indigo-900">Goals</h2>
        <p className="text-xs text-indigo-800/80">
          Projection only — general information, not financial advice.
        </p>
      </div>

      {goals.length === 0 && !showAdd && (
        <p className="text-sm text-indigo-900/90 mb-3">
          Track a savings or investment goal. Examples: house deposit by 2030,
          $500k retirement nest egg by 2040.
        </p>
      )}

      {projections.length > 0 && (
        <ul className="space-y-3 mb-3">
          {projections.map(({ goal, result }) => (
            <li
              key={goal.id}
              className="bg-white border border-indigo-100 rounded-lg p-3"
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">
                    {goal.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Target {fmtAud(goal.targetCents)} by {goal.targetDate} ·
                    {" "}
                    {goal.monthlyContributionCents > 0
                      ? `${fmtAud(goal.monthlyContributionCents)}/mo`
                      : "no contributions"}
                    {" · "}
                    {goal.expectedReturnPct.toFixed(1)}% assumed return
                    {goal.currentBalanceCents > 0 && (
                      <> · started at {fmtAud(goal.currentBalanceCents)}</>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <StatusPill status={result.status} />
                  <button
                    type="button"
                    onClick={() => void handleDelete(goal.id)}
                    disabled={deletingId === goal.id}
                    className="block text-xs text-red-700 hover:text-red-900 mt-1 disabled:opacity-50"
                  >
                    {deletingId === goal.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-700 mt-2">{result.summary}</p>
              {goal.notes && (
                <p className="text-xs text-slate-500 italic mt-1">
                  {goal.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {!showAdd ? (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-sm font-semibold text-indigo-800 hover:text-indigo-900 underline underline-offset-2"
        >
          + Add a goal
        </button>
      ) : (
        <form
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white border border-indigo-200 rounded-lg p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void handleAdd(fd);
          }}
        >
          <label className="sm:col-span-3">
            <span className="block text-xs font-medium text-slate-700 mb-1">Label</span>
            <input
              type="text"
              name="label"
              required
              maxLength={120}
              placeholder="House deposit"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Type</span>
            <select
              name="goalType"
              defaultValue="general"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {GOAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Target (AUD)</span>
            <input
              type="number"
              name="target"
              required
              min="1"
              step="100"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Target date</span>
            <input
              type="date"
              name="targetDate"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Starting balance (AUD)</span>
            <input
              type="number"
              name="currentBalance"
              defaultValue="0"
              min="0"
              step="100"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Monthly contrib (AUD)</span>
            <input
              type="number"
              name="monthly"
              defaultValue="0"
              min="0"
              step="50"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Assumed return (%/yr)</span>
            <input
              type="number"
              name="returnPct"
              defaultValue="6"
              min="-20"
              max="30"
              step="0.1"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="sm:col-span-4">
            <span className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</span>
            <input
              type="text"
              name="notes"
              maxLength={500}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-2 text-sm text-slate-700 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save goal"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="text-sm text-red-700 mt-2" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: "on-track" | "short" | "ahead" | "past-due" }) {
  const map = {
    "on-track": { label: "On track", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    "ahead": { label: "Ahead", cls: "bg-emerald-100 text-emerald-900 border-emerald-300" },
    "short": { label: "Short", cls: "bg-amber-100 text-amber-900 border-amber-300" },
    "past-due": { label: "Past due", cls: "bg-red-100 text-red-900 border-red-300" },
  } as const;
  const { label, cls } = map[status];
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 border rounded ${cls}`}>
      {label}
    </span>
  );
}
