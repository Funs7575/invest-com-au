"use client";

import { useMemo, useState } from "react";
import { projectGoal } from "@/lib/goals/project";

export interface GoalRow {
  id: number;
  label: string;
  goalType: "house_deposit" | "retirement" | "education" | "generic";
  targetCents: number;
  targetDate: string;
  currentBalanceCents: number;
  monthlyContributionCents: number;
  expectedReturnPct: number;
  notes: string | null;
}

interface Props {
  initialItems: GoalRow[];
}

const GOAL_TYPES = [
  { value: "house_deposit", label: "🏠 House deposit", defaultReturn: 5.5 },
  { value: "retirement",    label: "🏖️ Retirement",   defaultReturn: 7.0 },
  { value: "education",     label: "🎓 Education",     defaultReturn: 5.0 },
  { value: "generic",       label: "🎯 Other goal",    defaultReturn: 6.5 },
] as const;

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function GoalsClient({ initialItems }: Props) {
  const [items, setItems] = useState<GoalRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultGoalType, setDefaultGoalType] = useState<typeof GOAL_TYPES[number]["value"]>("house_deposit");

  const handleAdd = async (form: FormData) => {
    setError(null);
    setAdding(true);
    const goalType = String(form.get("goal_type") ?? "generic") as GoalRow["goalType"];
    const body = {
      label: String(form.get("label") ?? "").trim(),
      goal_type: goalType,
      target_cents: Math.round(Number(form.get("target") ?? 0) * 100),
      target_date: String(form.get("target_date") ?? ""),
      current_balance_cents: Math.round(Number(form.get("current_balance") ?? 0) * 100),
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
      <section className="bg-white border border-slate-200 rounded-xl p-4">
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
            <input type="number" name="target" required min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Target date" required cols="sm:col-span-2">
            <input type="date" name="target_date" required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Expected return %/yr" cols="sm:col-span-2">
            <input type="number" name="expected_return" min={-10} max={30} step={0.1}
              defaultValue={GOAL_TYPES.find((g) => g.value === defaultGoalType)?.defaultReturn ?? 6.5}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Current balance" cols="sm:col-span-2">
            <input type="number" name="current_balance" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Monthly contribution" cols="sm:col-span-2">
            <input type="number" name="monthly_contribution" min={0} step={1}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="Notes" cols="sm:col-span-2">
            <input type="text" name="notes" maxLength={500}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="sm:col-span-6 flex justify-end">
            <button type="submit" disabled={adding}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50">
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
          <p className="text-sm text-slate-500 italic">No goals yet — add your first above.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((g) => (
              <GoalCard key={g.id} goal={g} onDelete={() => void handleDelete(g.id)} deleting={deletingId === g.id} />
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
}: {
  goal: GoalRow;
  onDelete: () => void;
  deleting: boolean;
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
        <Stat label="Current" value={fmt(goal.currentBalanceCents)} />
        <Stat label="Monthly" value={fmt(goal.monthlyContributionCents)} />
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
        Pure projection. Returns aren't guaranteed. General information only — see your financial planner for advice.
      </p>

      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="text-xs text-red-700 hover:text-red-900 mt-2 disabled:opacity-50"
      >
        {deleting ? "Removing…" : "Remove goal"}
      </button>
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
