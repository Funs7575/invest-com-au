"use client";

import { useMemo, useState } from "react";
import { projectGoal } from "@/lib/goals/project";

export interface GoalRow {
  id: number;
  label: string;
  goalType: "house_deposit" | "retirement" | "fire" | "debt_free" | "education" | "generic";
  targetCents: number;
  targetDate: string;
  currentBalanceCents: number;
  monthlyContributionCents: number;
  expectedReturnPct: number;
  notes: string | null;
  /** Whether this goal is shared with the user's household (household_id set). */
  shared?: boolean;
}

interface Props {
  initialItems: GoalRow[];
  /**
   * When true (households flag on AND the user has an accepted partner), each
   * goal card shows a "Share with household" toggle. Off → no toggle at all.
   */
  householdEnabled?: boolean;
}

const GOAL_TYPES = [
  { value: "house_deposit", label: "🏠 House deposit",          defaultReturn: 5.5 },
  { value: "retirement",    label: "🏖️ Retirement",             defaultReturn: 7.0 },
  { value: "fire",          label: "🔥 FIRE (retire early)",    defaultReturn: 7.0 },
  { value: "debt_free",     label: "💳 Debt-free",              defaultReturn: 0.0 },
  { value: "education",     label: "🎓 Education",              defaultReturn: 5.0 },
  { value: "generic",       label: "🎯 Other goal",             defaultReturn: 6.5 },
] as const;

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function GoalsClient({ initialItems, householdEnabled = false }: Props) {
  const [items, setItems] = useState<GoalRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultGoalType, setDefaultGoalType] = useState<typeof GOAL_TYPES[number]["value"]>("house_deposit");

  // Optimistically flip a goal's shared state, calling the share API. Rolls
  // back on failure. Owner-only write — enforced server-side.
  const handleToggleShare = async (id: number, shared: boolean) => {
    const snapshot = items;
    setItems((prev) => prev.map((g) => (g.id === id ? { ...g, shared } : g)));
    try {
      const res = await fetch("/api/account/household/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "goal", item_id: id, shared }),
      });
      if (!res.ok) throw new Error("share_failed");
    } catch {
      setItems(snapshot);
      setError("Could not update sharing. Try again.");
    }
  };

  const handleAdd = async (form: FormData) => {
    setError(null);
    setAdding(true);
    const targetDateVal = String(form.get("target_date") ?? "");
    if (targetDateVal && targetDateVal < new Date().toISOString().slice(0, 10)) {
      setError("Target date must be in the future.");
      setAdding(false);
      return;
    }
    const targetCents = Math.round(Number(form.get("target") ?? 0) * 100);
    const currentBalanceCents = Math.round(Number(form.get("current_balance") ?? 0) * 100);
    if (targetCents > 0 && currentBalanceCents > targetCents) {
      setError("Current balance exceeds target — consider increasing the target amount.");
      setAdding(false);
      return;
    }
    const goalType = String(form.get("goal_type") ?? "generic") as GoalRow["goalType"];
    const body = {
      label: String(form.get("label") ?? "").trim(),
      goal_type: goalType,
      target_cents: targetCents,
      target_date: String(form.get("target_date") ?? ""),
      current_balance_cents: currentBalanceCents,
      monthly_contribution_cents: Math.round(Number(form.get("monthly_contribution") ?? 0) * 100),
      expected_return_pct: Number(form.get("expected_return") ?? 6.5),
      notes: String(form.get("notes") ?? "").trim() || null,
    };
    try {
      const res = await fetch("/api/account/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Could not add goal.");
      const j = (await res.json()) as { item: Record<string, unknown> };
      const r = j.item as Record<string, unknown>;
      const newRow: GoalRow = {
        id: r.id as number,
        label: r.label as string,
        goalType: r.goal_type as GoalRow["goalType"],
        targetCents: Number(r.target_cents),
        targetDate: r.target_date as string,
        currentBalanceCents: Number(r.current_balance_cents),
        monthlyContributionCents: Number(r.monthly_contribution_cents),
        expectedReturnPct: Number(r.expected_return_pct),
        notes: (r.notes as string | null) ?? null,
        shared: false,
      };
      setItems((prev) => [...prev, newRow].sort((a, b) => a.targetDate.localeCompare(b.targetDate)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add goal.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const snapshot = items;
    setDeletingId(id);
    setItems((prev) => prev.filter((g) => g.id !== id));
    try {
      const res = await fetch("/api/account/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete_failed");
    } catch {
      setItems(snapshot);
      setError("Could not delete goal. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <section id="goals-add-form" className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Add goal</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-6 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void handleAdd(fd);
            e.currentTarget.reset();
          }}
        >
          <Field label="Goal type" cols="sm:col-span-2">
            <select
              name="goal_type"
              defaultValue={defaultGoalType}
              onChange={(e) => setDefaultGoalType(e.target.value as typeof defaultGoalType)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {GOAL_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Goal name" required cols="sm:col-span-4">
            <input type="text" name="label" required maxLength={120}
              placeholder="e.g. House deposit by 2030"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Target $ (AUD)" required cols="sm:col-span-2">
            <input type="number" inputMode="decimal" name="target" required min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Target date" required cols="sm:col-span-2">
            <input type="date" name="target_date" required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Expected return %/yr" cols="sm:col-span-2">
            <input type="number" inputMode="decimal" name="expected_return" min={-10} max={30} step={0.1}
              defaultValue={GOAL_TYPES.find((g) => g.value === defaultGoalType)?.defaultReturn ?? 6.5}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Current balance" cols="sm:col-span-2">
            <input type="number" inputMode="decimal" name="current_balance" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Monthly contribution" cols="sm:col-span-2">
            <input type="number" inputMode="decimal" name="monthly_contribution" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Notes" cols="sm:col-span-2">
            <input type="text" name="notes" maxLength={500}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="sm:col-span-6 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              💡 Use your{" "}
              <a href="/account/vault" className="underline hover:text-slate-700">
                Document Vault
              </a>{" "}
              to upload bank or super statements as a reference for current balances.
            </p>
            <button type="submit" disabled={adding} aria-busy={adding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
              {adding && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {adding ? "Adding…" : "Add goal"}
            </button>
          </div>
        </form>
        {error && <p className="text-sm text-red-700 mt-2" role="alert">{error}</p>}
      </section>

      {/* Goals list with projections */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Your goals</h2>
        {items.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-3">No goals yet. Define a target to start tracking your progress.</p>
            <button
              type="button"
              onClick={() => document.getElementById("goals-add-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              Add your first goal
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                onDelete={() => void handleDelete(g.id)}
                deleting={deletingId === g.id}
                householdEnabled={householdEnabled}
                onToggleShare={(shared) => void handleToggleShare(g.id, shared)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GoalCard({
  goal,
  onDelete,
  deleting,
  householdEnabled,
  onToggleShare,
}: {
  goal: GoalRow;
  onDelete: () => void;
  deleting: boolean;
  householdEnabled: boolean;
  onToggleShare: (shared: boolean) => void;
}) {
  const projection = useMemo(
    () =>
      projectGoal({
        targetCents: goal.targetCents,
        targetDate: goal.targetDate,
        currentBalanceCents: goal.currentBalanceCents,
        monthlyContributionCents: goal.monthlyContributionCents,
        expectedReturnPct: goal.expectedReturnPct,
      }),
    [goal],
  );
  const onTrack = projection.surplusCents >= 0;
  const tone = onTrack
    ? "bg-emerald-50 border-emerald-200"
    : "bg-amber-50 border-amber-200";
  const meta = GOAL_TYPES.find((t) => t.value === goal.goalType);

  return (
    <li className={`border rounded-xl p-4 ${tone}`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h3 className="text-base font-semibold text-slate-900">
          {meta?.label ?? "🎯"} {goal.label}
        </h3>
        <span className="text-xs text-slate-600">
          target {fmt(goal.targetCents)} by {goal.targetDate}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
        <Stat label="Current" value={goal.currentBalanceCents === 0 ? "—" : fmt(goal.currentBalanceCents)} />
        <Stat label="Monthly" value={goal.monthlyContributionCents === 0 ? "—" : fmt(goal.monthlyContributionCents)} />
        <Stat label="Projected" value={fmt(projection.projectedBalanceCents)} highlight={onTrack ? "good" : "warn"} />
        <Stat
          label={onTrack ? "Surplus" : "Shortfall"}
          value={fmt(Math.abs(projection.surplusCents))}
          highlight={onTrack ? "good" : "warn"}
        />
      </div>

      {/* Progress bar */}
      <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden mb-2">
        <div
          className={`h-full ${onTrack ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${Math.min(100, projection.progressPct)}%` }}
        />
      </div>
      <p className="text-xs text-slate-700">
        {projection.monthsToTarget} months to target ·{" "}
        {onTrack
          ? `On track (${projection.progressPct}% of goal projected)`
          : `Need ${fmt(projection.requiredMonthlyContributionCents)}/mo to hit target`}
      </p>

      <p className="text-[10px] text-slate-500 italic mt-2">
        Pure projection. Returns are not guaranteed. General information only — see your financial planner for advice.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="text-xs text-red-700 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? "Removing…" : "Remove goal"}
        </button>
        {householdEnabled && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={goal.shared ?? false}
              onChange={(e) => onToggleShare(e.target.checked)}
              className="h-3.5 w-3.5 accent-violet-600"
            />
            <span>Share with household</span>
          </label>
        )}
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "good" | "warn";
}) {
  const valueCls =
    highlight === "good"
      ? "text-emerald-900"
      : highlight === "warn"
        ? "text-amber-900"
        : "text-slate-900";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-semibold ${valueCls}`}>{value}</p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  cols,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  cols?: string;
}) {
  return (
    <label className={`block ${cols ?? ""}`}>
      <span className="block text-xs font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}
