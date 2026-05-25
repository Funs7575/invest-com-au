"use client";

import { useMemo, useId, useState } from "react";
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
}

interface Props {
  initialItems: GoalRow[];
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

interface FieldErrors {
  label?: string;
  target?: string;
  target_date?: string;
}

export default function GoalsClient({ initialItems }: Props) {
  const [items, setItems] = useState<GoalRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defaultGoalType, setDefaultGoalType] = useState<typeof GOAL_TYPES[number]["value"]>("house_deposit");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formId = useId();

  const handleAdd = async (form: FormData): Promise<boolean> => {
    // Client-side field validation
    const labelVal = String(form.get("label") ?? "").trim();
    const targetVal = Number(form.get("target") ?? 0);
    const targetDateVal = String(form.get("target_date") ?? "");

    const errs: FieldErrors = {};
    if (!labelVal) errs.label = "Goal name is required.";
    if (!targetVal || targetVal <= 0) errs.target = "Enter a target amount greater than $0.";
    if (!targetDateVal) errs.target_date = "Target date is required.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return false;
    }
    setFieldErrors({});
    setError(null);
    setAdding(true);
    const goalType = String(form.get("goal_type") ?? "generic") as GoalRow["goalType"];
    const body = {
      label: labelVal,
      goal_type: goalType,
      target_cents: Math.round(targetVal * 100),
      target_date: targetDateVal,
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
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add goal.");
      return false;
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
            const target = e.currentTarget;
            void handleAdd(fd).then((ok) => {
              if (ok) target.reset();
            });
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
          <Field label="Goal name" required cols="sm:col-span-4" error={fieldErrors.label} errorId={`${formId}-label-err`}>
            <input type="text" name="label" required maxLength={120}
              placeholder="e.g. House deposit by 2030"
              aria-invalid={fieldErrors.label ? true : undefined}
              aria-describedby={fieldErrors.label ? `${formId}-label-err` : undefined}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${fieldErrors.label ? "border-red-500 focus:ring-red-400" : "border-slate-300"}`} />
          </Field>
          <Field label="Target $ (AUD)" required cols="sm:col-span-2" error={fieldErrors.target} errorId={`${formId}-target-err`}>
            <input type="number" name="target" required min={0} step={1}
              aria-invalid={fieldErrors.target ? true : undefined}
              aria-describedby={fieldErrors.target ? `${formId}-target-err` : undefined}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${fieldErrors.target ? "border-red-500 focus:ring-red-400" : "border-slate-300"}`} />
          </Field>
          <Field label="Target date" required cols="sm:col-span-2" error={fieldErrors.target_date} errorId={`${formId}-date-err`}>
            <input type="date" name="target_date" required
              aria-invalid={fieldErrors.target_date ? true : undefined}
              aria-describedby={fieldErrors.target_date ? `${formId}-date-err` : undefined}
              className={`w-full border rounded-lg px-3 py-2 text-sm ${fieldErrors.target_date ? "border-red-500 focus:ring-red-400" : "border-slate-300"}`} />
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
          <div className="sm:col-span-6 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              💡 Use your{" "}
              <a href="/account/vault" className="underline hover:text-slate-700">
                Document Vault
              </a>{" "}
              to upload bank or super statements as a reference for current balances.
            </p>
            <button type="submit" disabled={adding} aria-busy={adding}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 shrink-0 inline-flex items-center gap-2">
              {adding && (
                <svg aria-hidden="true" className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        Pure projection. Returns are not guaranteed. General information only — see your financial planner for advice.
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
  error,
  errorId,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  cols?: string;
  error?: string;
  errorId?: string;
}) {
  return (
    <div className={`block ${cols ?? ""}`}>
      <label className="block">
        <span className="block text-xs font-medium text-slate-700 mb-1">
          {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
        </span>
        {children}
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
