"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { invalidateMoneyProfileCache } from "@/hooks/use-money-profile";
import ConfettiBurst from "@/components/delight/ConfettiBurst";
import {
  MONEY_STATES,
  type MoneyCoverage,
  type MoneyProfile,
} from "@/lib/money-profile";

interface Props {
  initial: MoneyProfile;
  initialCoverage: MoneyCoverage;
}

/**
 * "Money details" — the editor for the self-declared half of the Money
 * Profile. Derived numbers (savings / super / portfolio) are shown
 * read-only with links to their single source of truth, so there's never
 * a second place to maintain a balance.
 */
export default function MoneyDetailsForm({ initial, initialCoverage }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [coverage, setCoverage] = useState(initialCoverage);
  const [derived, setDerived] = useState(initial);
  // Completion moment: confetti + headline the save that takes the
  // profile to 100% — finishing setup should feel like an event.
  const [justCompleted, setJustCompleted] = useState(false);
  const [coverageDelta, setCoverageDelta] = useState(0);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const num = (name: string): number | null => {
      const raw = String(fd.get(name) ?? "").trim();
      if (!raw) return null;
      const n = Number(raw.replace(/[,$\s]/g, ""));
      return Number.isFinite(n) ? Math.round(n) : null;
    };
    const body = {
      state: String(fd.get("state") ?? "") || "",
      age: num("age"),
      annual_income: num("annual_income"),
      monthly_savings: num("monthly_savings"),
      target_retirement_age: num("target_retirement_age"),
    };
    try {
      const res = await fetch("/api/account/money-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not save");
      const prevPct = coverage.pct;
      if (json.coverage) {
        const next = json.coverage as MoneyCoverage;
        setCoverage(next);
        setCoverageDelta(Math.max(0, next.pct - prevPct));
        setJustCompleted(next.pct === 100 && prevPct < 100);
      }
      if (json.profile) setDerived(json.profile as MoneyProfile);
      invalidateMoneyProfileCache();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number | null): string =>
    n === null
      ? "—"
      : new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: "AUD",
          maximumFractionDigits: 0,
        }).format(n);

  return (
    <section className="relative mt-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      {justCompleted && <ConfettiBurst />}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-base font-bold text-slate-900">Money details</h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            coverage.pct === 100
              ? "bg-emerald-600 text-white border border-emerald-600"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }${justCompleted ? " badge-pulse" : ""}`}
        >
          {coverage.pct === 100 ? "Complete ✓" : `${coverage.pct}% complete`}
        </span>
      </div>
      {justCompleted ? (
        <p className="text-xs font-semibold text-emerald-700 mb-5">
          That&apos;s everything — every calculator on the site now starts with
          your numbers. Try the{" "}
          <Link href="/fire-calculator" className="underline underline-offset-2">
            FIRE calculator
          </Link>{" "}
          and watch it fill itself.
        </p>
      ) : (
        <p className="text-xs text-slate-500 mb-5">
          Saved once, used everywhere: calculators across the site pre-fill from
          these numbers so you stop re-typing them. Your own data, only visible
          to you.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block text-xs font-semibold text-slate-700">
            State
            <select
              name="state"
              defaultValue={initial.state ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal bg-white"
            >
              <option value="">Not set</option>
              {MONEY_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Age
            <input
              name="age"
              type="number"
              min={16}
              max={100}
              defaultValue={initial.age ?? ""}
              placeholder="e.g. 34"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Annual income (before tax)
            <input
              name="annual_income"
              type="text"
              inputMode="numeric"
              defaultValue={initial.annual_income ?? ""}
              placeholder="e.g. 95000"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Monthly savings
            <input
              name="monthly_savings"
              type="text"
              inputMode="numeric"
              defaultValue={initial.monthly_savings ?? ""}
              placeholder="e.g. 1500"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Target retirement age
            <input
              name="target_retirement_age"
              type="number"
              min={40}
              max={90}
              defaultValue={initial.target_retirement_age ?? ""}
              placeholder="e.g. 60"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save money details"}
          </button>
          {saved && (
            <span className="text-xs font-semibold text-emerald-600">
              {coverageDelta > 0 && coverage.pct < 100
                ? `Saved ✓ +${coverageDelta}% — calculators just got smarter for you`
                : "Saved ✓"}
            </span>
          )}
          {error && (
            <span role="alert" className="text-xs text-red-600">
              {error}
            </span>
          )}
        </div>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-700 mb-2">
          Tracked automatically{" "}
          <span className="font-normal text-slate-400">
            — update at the source, calculators pick it up
          </span>
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="text-slate-500">Savings</dt>
            <dd className="font-semibold text-slate-800">{fmt(derived.savings_balance)}</dd>
            <Link href="/account/net-worth" className="text-emerald-700 underline underline-offset-2">
              Net worth
            </Link>
          </div>
          <div>
            <dt className="text-slate-500">Super</dt>
            <dd className="font-semibold text-slate-800">{fmt(derived.super_balance)}</dd>
            <Link href="/account/net-worth" className="text-emerald-700 underline underline-offset-2">
              Net worth
            </Link>
          </div>
          <div>
            <dt className="text-slate-500">Portfolio</dt>
            <dd className="font-semibold text-slate-800">{fmt(derived.portfolio_value)}</dd>
            <Link href="/account/holdings" className="text-emerald-700 underline underline-offset-2">
              Holdings
            </Link>
          </div>
          <div>
            <dt className="text-slate-500">Current broker</dt>
            <dd className="font-semibold text-slate-800">
              {derived.current_broker_slug ?? "—"}
            </dd>
            <Link href="/quick-audit" className="text-emerald-700 underline underline-offset-2">
              Quick audit
            </Link>
          </div>
        </dl>
      </div>
    </section>
  );
}
