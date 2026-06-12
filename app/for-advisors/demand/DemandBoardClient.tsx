"use client";

/**
 * Interactive half of /for-advisors/demand: state/type filtering over the
 * pre-aggregated anonymised snapshot, the earnings estimator, and the
 * "alert me" email capture.
 *
 * IMPORTANT: only `import type` from lib/demand-board here — value imports
 * would pull the service-role Supabase client into the browser bundle.
 * Everything renderable arrives as serialisable props from the server page.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { formatCurrency } from "@/lib/utils";
import type { DemandSnapshot } from "@/lib/demand-board";

interface EstimatorProps {
  bandLabel: string | null;
  bandMidpointAud: number | null;
  basis: "accepted" | "open" | null;
  acceptedCount: number;
}

interface TypeOption {
  value: string;
  label: string;
}

interface Props {
  snapshot: DemandSnapshot;
  estimator: EstimatorProps;
  alertStateOptions: string[];
  alertTypeOptions: TypeOption[];
}

const CAPACITY_OPTIONS = [1, 2, 3, 5, 8, 10] as const;

function recencyLabel(hours: number | null): string | null {
  if (hours === null) return null;
  if (hours < 1) return "newest posted just now";
  if (hours < 24) return `newest posted ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `newest posted ${days}d ago`;
}

export default function DemandBoardClient({ snapshot, estimator, alertStateOptions, alertTypeOptions }: Props) {
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [capacity, setCapacity] = useState<number>(3);

  const typeLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of alertTypeOptions) map.set(opt.value, opt.label);
    return map;
  }, [alertTypeOptions]);

  // Rows for the board list under the current filters.
  const visible = useMemo(() => {
    const cells = snapshot.cells.filter(
      (c) => (stateFilter === "all" || c.state === stateFilter) && (typeFilter === "all" || c.type === typeFilter),
    );

    if (stateFilter === "all") {
      // Group by type across states.
      const byType = new Map<string, { type: string; label: string; count: number; states: Array<{ state: string; count: number }> }>();
      for (const cell of cells) {
        const row = byType.get(cell.type) ?? { type: cell.type, label: cell.label, count: 0, states: [] };
        row.count += cell.count;
        row.states.push({ state: cell.state, count: cell.count });
        byType.set(cell.type, row);
      }
      return Array.from(byType.values())
        .map((row) => ({ ...row, states: row.states.sort((a, b) => b.count - a.count) }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }

    // Single state: one row per type in that state.
    return cells
      .map((cell) => ({
        type: cell.type,
        label: cell.label,
        count: cell.count,
        states: [{ state: cell.state, count: cell.count }],
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [snapshot.cells, stateFilter, typeFilter]);

  const visibleTotal = visible.reduce((sum, row) => sum + row.count, 0);

  const selectedStateSummary =
    stateFilter === "all" ? null : (snapshot.byState.find((s) => s.state === stateFilter) ?? null);

  const filterDescription = `${typeFilter === "all" ? "All specialties" : (typeLabelByValue.get(typeFilter) ?? typeFilter)} · ${
    stateFilter === "all" ? "all states" : stateFilter
  }`;

  const monthlyEstimate =
    estimator.bandMidpointAud !== null ? estimator.bandMidpointAud * capacity : null;

  return (
    <section className="bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-12">
        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Open briefs by specialty &amp; state</h2>
            <p className="text-sm text-slate-600 mt-1">
              Counts, budget bands and recency only — brief details stay private until you&apos;re verified.
            </p>
          </div>
          <div>
            <label htmlFor="demand-type-filter" className="block text-xs font-semibold text-slate-700 mb-1">
              Specialty
            </label>
            <select
              id="demand-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-600"
            >
              <option value="all">All specialties</option>
              {alertTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div role="group" aria-label="Filter by state" className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setStateFilter("all")}
            aria-pressed={stateFilter === "all"}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              stateFilter === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
            }`}
          >
            All states · {snapshot.totalOpen}
          </button>
          {alertStateOptions.map((state) => {
            const count = snapshot.byState.find((s) => s.state === state)?.count ?? 0;
            const active = stateFilter === state;
            return (
              <button
                key={state}
                type="button"
                onClick={() => setStateFilter(active ? "all" : state)}
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:border-slate-500"
                }`}
              >
                {state} · {count}
              </button>
            );
          })}
        </div>

        {/* ── Result summary ──────────────────────────────────────── */}
        <p className="text-sm text-slate-700 mb-4" aria-live="polite">
          <span className="font-bold">{visibleTotal}</span> open brief{visibleTotal === 1 ? "" : "s"} —{" "}
          {filterDescription}
          {selectedStateSummary && (
            <span className="text-slate-500">
              {" "}
              · {selectedStateSummary.postedThisWeek} posted this week
              {recencyLabel(selectedStateSummary.newestAgeHours) ? ` · ${recencyLabel(selectedStateSummary.newestAgeHours)}` : ""}
            </span>
          )}
        </p>

        {/* ── Board list / empty state ────────────────────────────── */}
        {visible.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <div className="w-10 h-10 mx-auto mb-3 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center">
              <Icon name="bell" size={16} />
            </div>
            <p className="text-sm font-semibold text-slate-900">No open briefs match this filter right now</p>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Demand moves weekly. Set an alert and we&apos;ll email you when{" "}
              {typeFilter === "all" ? "new briefs" : `${typeLabelByValue.get(typeFilter) ?? "matching"} briefs`}
              {stateFilter === "all" ? "" : ` in ${stateFilter}`} land.
            </p>
            <a
              href="#demand-alerts"
              className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
            >
              <Icon name="bell" size={13} />
              Set a demand alert
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((row) => (
              <li key={row.type} className="bg-white border border-slate-200 rounded-xl p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {row.label}
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-xs font-bold">
                      {row.count} open
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5 flex flex-wrap gap-1.5">
                    {row.states.map((s) => (
                      <span key={s.state} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        <Icon name="map-pin" size={10} />
                        {s.state} {s.count}
                      </span>
                    ))}
                    {(() => {
                      const bandLabel = snapshot.byType.find((t) => t.type === row.type)?.medianBandLabel ?? null;
                      return stateFilter === "all" && bandLabel ? (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                          typical budget {bandLabel}
                        </span>
                      ) : null;
                    })()}
                  </p>
                </div>
                <Link
                  href="/advisor-signup?utm_source=demand-board&utm_campaign=demand-row"
                  className="mt-3 sm:mt-0 inline-flex items-center gap-1.5 shrink-0 text-sm font-bold text-violet-700 hover:text-violet-900"
                >
                  Respond to these
                  <Icon name="arrow-right" size={12} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* ── Budget mix ──────────────────────────────────────────── */}
        {snapshot.bandMix && snapshot.bandMix.length > 0 && (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-extrabold text-slate-900 mb-3">Stated budgets across open briefs</h3>
            <ul className="space-y-2">
              {snapshot.bandMix.map((band) => {
                const max = Math.max(...(snapshot.bandMix ?? []).map((b) => b.count), 1);
                const pct = Math.max(6, Math.round((band.count / max) * 100));
                return (
                  <li key={band.band} className="flex items-center gap-3 text-xs">
                    <span className="w-28 shrink-0 font-semibold text-slate-700">{band.label}</span>
                    <span className="flex-1 bg-slate-100 rounded-full h-2.5" role="presentation">
                      <span className="block h-2.5 rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 text-right font-bold text-slate-900">{band.count}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-slate-500 mt-3">
              Briefs without a stated budget are excluded. Budget detail is hidden for very small samples so
              individual briefs can&apos;t be identified.
            </p>
          </div>
        )}

        {/* ── Earnings estimator ──────────────────────────────────── */}
        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Icon name="calculator" size={16} className="text-amber-400" />
              Earnings estimator
            </h3>
            {monthlyEstimate !== null && estimator.bandLabel ? (
              <>
                <label htmlFor="demand-capacity" className="block text-xs font-semibold text-slate-300 mt-4 mb-1">
                  Briefs you could take on per month
                </label>
                <select
                  id="demand-capacity"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full sm:w-56 px-3 py-2 rounded-xl text-sm bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {CAPACITY_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} brief{n === 1 ? "" : "s"} / month
                    </option>
                  ))}
                </select>
                <p className="mt-4 text-sm text-slate-300" aria-live="polite">
                  Estimated advice fees:{" "}
                  <span className="block text-3xl font-extrabold text-white mt-1">
                    {formatCurrency(monthlyEstimate)} <span className="text-base font-bold text-slate-300">/ month</span>
                  </span>
                  <span className="text-xs text-slate-400">≈ {formatCurrency(monthlyEstimate * 12)} a year at the same rate</span>
                </p>
                <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                  Estimate only:{" "}
                  {estimator.basis === "accepted"
                    ? `median accepted budget band over the last 90 days (${estimator.bandLabel}, conservative midpoint)`
                    : `median stated budget band of currently open briefs (${estimator.bandLabel}, conservative midpoint)`}{" "}
                  × your selected capacity. Actual results depend on your categories, pricing, response time and
                  win rate. General information only — not a forecast, guarantee or financial advice.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                Not enough recent marketplace data for a meaningful estimate yet. Set an alert below and check
                back — the board refreshes every 5 minutes.
              </p>
            )}
          </div>

          {/* ── Alert capture ─────────────────────────────────────── */}
          <DemandAlertForm
            stateOptions={alertStateOptions}
            typeOptions={alertTypeOptions}
            initialStates={stateFilter === "all" ? [] : [stateFilter]}
            initialTypes={typeFilter === "all" ? [] : [typeFilter]}
          />
        </div>
      </div>
    </section>
  );
}

// ── Alert form ───────────────────────────────────────────────────────────────

interface AlertFormProps {
  stateOptions: string[];
  typeOptions: TypeOption[];
  initialStates: string[];
  initialTypes: string[];
}

function DemandAlertForm({ stateOptions, typeOptions, initialStates, initialTypes }: AlertFormProps) {
  const [email, setEmail] = useState("");
  const [states, setStates] = useState<string[]>(initialStates);
  const [types, setTypes] = useState<string[]>(initialTypes);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const toggle = (list: string[], value: string, set: (next: string[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/demand-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), states, advisor_types: types, website }),
      });
      if (res.ok) {
        setStatus("success");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMessage(
        res.status === 429
          ? "Too many attempts — please try again in a few minutes."
          : data.error || "Something went wrong. Please try again.",
      );
      setStatus("error");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div id="demand-alerts" className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
          <Icon name="check" size={18} />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">You&apos;re on the list</h3>
        <p className="text-sm text-slate-600 mt-2 max-w-sm">
          We&apos;ll email you a weekly snapshot of open briefs matching your interests. Ready to respond to
          them now?
        </p>
        <Link
          href="/advisor-signup?utm_source=demand-board&utm_campaign=alert-success"
          className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl"
        >
          Join the adviser network
          <Icon name="arrow-right" size={13} />
        </Link>
      </div>
    );
  }

  return (
    <form id="demand-alerts" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6" aria-describedby="demand-alerts-consent">
      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
        <Icon name="bell" size={16} className="text-violet-700" />
        Alert me about new briefs
      </h3>
      <p className="text-sm text-slate-600 mt-1">
        Not ready to register? Get a weekly email when briefs matching your specialty and state land.
      </p>

      <label htmlFor="demand-alert-email" className="block text-xs font-semibold text-slate-700 mt-4 mb-1">
        Work email
      </label>
      <input
        id="demand-alert-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourfirm.com.au"
        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-600"
      />

      {/* Honeypot — hidden from real users and assistive tech */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="demand-alert-website">Website</label>
        <input
          id="demand-alert-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-slate-700 mb-1.5">States (leave empty for all)</legend>
        <div className="flex flex-wrap gap-1.5">
          {stateOptions.map((state) => {
            const active = states.includes(state);
            return (
              <button
                key={state}
                type="button"
                onClick={() => toggle(states, state, setStates)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? "bg-violet-700 text-white border-violet-700"
                    : "bg-white text-slate-700 border-slate-300 hover:border-violet-600"
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-xs font-semibold text-slate-700 mb-1.5">Specialties (leave empty for all)</legend>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
          {typeOptions.map((opt) => {
            const active = types.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(types, opt.value, setTypes)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? "bg-violet-700 text-white border-violet-700"
                    : "bg-white text-slate-700 border-slate-300 hover:border-violet-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {status === "error" && errorMessage && (
        <p className="mt-3 text-xs font-semibold text-red-700" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white text-sm font-bold px-5 py-3 rounded-xl"
      >
        {status === "submitting" ? "Saving…" : "Set my weekly alert"}
      </button>
      <p id="demand-alerts-consent" className="mt-3 text-[11px] leading-relaxed text-slate-500">
        By subscribing you agree to receive a weekly demand digest from Invest.com.au. One email a week at
        most, unsubscribe any time via the link in every email. We never share your address.
      </p>
    </form>
  );
}
