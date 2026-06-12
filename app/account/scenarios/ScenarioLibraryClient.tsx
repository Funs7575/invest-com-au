"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  calculatorMetaFor,
  openInCalculatorHref,
  SCENARIO_NAME_MAX,
  type ScenarioOwnerView,
} from "@/lib/scenarios";
import {
  compareScenarioBlobs,
  formatFieldDelta,
  type FieldDeltaRow,
} from "@/lib/scenario-compare";

// ─── Types ──────────────────────────────────────────────────────────────────

type Scenario = ScenarioOwnerView;

interface Props {
  initialScenarios: Scenario[];
}

// ─── Group helper ─────────────────────────────────────────────────────────────

interface CalcGroup {
  key: string;
  label: string;
  icon: string;
  scenarios: Scenario[];
}

function groupByCalculator(scenarios: Scenario[]): CalcGroup[] {
  const map = new Map<string, Scenario[]>();
  for (const s of scenarios) {
    const arr = map.get(s.calculator_key) ?? [];
    arr.push(s);
    map.set(s.calculator_key, arr);
  }
  return Array.from(map.entries()).map(([key, list]) => {
    const meta = calculatorMetaFor(key);
    return { key, label: meta.label, icon: meta.icon, scenarios: list };
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScenarioLibraryClient({ initialScenarios }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Compare selection (scenario ids). Only same-calculator picks are allowed.
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const groups = useMemo(() => groupByCalculator(scenarios), [scenarios]);

  const selectedScenarios = useMemo(
    () => scenarios.filter((s) => selected.includes(s.id)),
    [scenarios, selected],
  );
  // The calculator_key the current selection is locked to (first pick wins).
  const selectionCalcKey = selectedScenarios[0]?.calculator_key ?? null;

  // ── Selection ───────────────────────────────────────────────────────────────
  const toggleSelect = useCallback(
    (s: Scenario) => {
      setSelected((prev) => {
        if (prev.includes(s.id)) return prev.filter((id) => id !== s.id);
        // Lock selection to one calculator_key; cap at 3.
        const lockedKey =
          scenarios.find((x) => x.id === prev[0])?.calculator_key ?? null;
        if (lockedKey && lockedKey !== s.calculator_key) return prev;
        if (prev.length >= 3) return prev;
        return [...prev, s.id];
      });
    },
    [scenarios],
  );

  const clearSelection = useCallback(() => {
    setSelected([]);
    setCompareOpen(false);
  }, []);

  // ── Rename ──────────────────────────────────────────────────────────────────
  const handleRename = useCallback(async (s: Scenario) => {
    const next = window.prompt("Rename scenario", s.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === s.name) return;
    if (trimmed.length > SCENARIO_NAME_MAX) {
      setError(`Names must be ${SCENARIO_NAME_MAX} characters or fewer.`);
      return;
    }
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch("/api/account/scenarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, name: trimmed }),
      });
      if (!res.ok) throw new Error("rename_failed");
      const body = (await res.json()) as { item: Scenario };
      setScenarios((prev) =>
        prev.map((x) => (x.id === s.id ? body.item : x)),
      );
    } catch {
      setError("Couldn't rename that scenario. Please try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (s: Scenario) => {
    if (!window.confirm(`Delete "${s.name}"? This can't be undone.`)) return;
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch("/api/account/scenarios", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id }),
      });
      if (!res.ok) throw new Error("delete_failed");
      setScenarios((prev) => prev.filter((x) => x.id !== s.id));
      setSelected((prev) => prev.filter((id) => id !== s.id));
    } catch {
      setError("Couldn't delete that scenario. Please try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  // ── Share generate / revoke ──────────────────────────────────────────────────
  const handleShare = useCallback(async (s: Scenario) => {
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/account/scenarios/${s.id}/share`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("share_failed");
      const body = (await res.json()) as { share_token: string };
      setScenarios((prev) =>
        prev.map((x) =>
          x.id === s.id ? { ...x, share_token: body.share_token } : x,
        ),
      );
    } catch {
      setError("Couldn't create a share link. Please try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleRevoke = useCallback(async (s: Scenario) => {
    setBusyId(s.id);
    setError(null);
    try {
      const res = await fetch(`/api/account/scenarios/${s.id}/share`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("revoke_failed");
      setScenarios((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, share_token: null } : x)),
      );
    } catch {
      setError("Couldn't revoke the share link. Please try again.");
    } finally {
      setBusyId(null);
    }
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/account" className="hover:text-slate-700">
            Account
          </Link>
          <span>/</span>
          <span className="text-slate-700">Scenarios</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          My Scenarios
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Named what-if scenarios you&apos;ve saved from calculators. Reopen
          them, compare two or three of the same calculator, or share a
          read-only link.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {scenarios.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-600 mb-4">
              You haven&apos;t saved any scenarios yet. Open a calculator and
              use &ldquo;Save as scenario&rdquo; to keep your inputs.
            </p>
            <Link
              href="/calculators"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-4 py-2 rounded-lg"
            >
              <Icon name="calculator" size={14} /> Browse calculators
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    name={group.icon}
                    size={16}
                    className="text-violet-600"
                  />
                  <h2 className="text-sm font-bold text-slate-900">
                    {group.label}
                  </h2>
                  <span className="text-xs text-slate-400">
                    ({group.scenarios.length})
                  </span>
                </div>

                <ul className="space-y-2">
                  {group.scenarios.map((s) => {
                    const checked = selected.includes(s.id);
                    const selectDisabled =
                      !checked &&
                      ((selectionCalcKey !== null &&
                        selectionCalcKey !== s.calculator_key) ||
                        selected.length >= 3);
                    return (
                      <li
                        key={s.id}
                        className="bg-white border border-slate-200 rounded-2xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={selectDisabled}
                            onChange={() => toggleSelect(s)}
                            aria-label={`Select "${s.name}" to compare`}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400 disabled:opacity-40"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Updated{" "}
                              {new Date(s.updated_at).toLocaleDateString()}
                              {s.share_token ? " · shared" : ""}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <Link
                                href={openInCalculatorHref(
                                  s.calculator_key,
                                  s.inputs,
                                )}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200"
                              >
                                <Icon name="external-link" size={12} /> Open
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleRename(s)}
                                disabled={busyId === s.id}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(s)}
                                disabled={busyId === s.id}
                                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50"
                              >
                                <Icon name="trash-2" size={12} /> Delete
                              </button>
                            </div>

                            <ShareRow
                              scenario={s}
                              busy={busyId === s.id}
                              onShare={() => handleShare(s)}
                              onRevoke={() => handleRevoke(s)}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Compliance */}
        {scenarios.length > 0 && (
          <p className="mt-8 text-[11px] text-slate-400 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
        )}
      </div>

      {/* Compare bar */}
      {selected.length >= 2 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-slate-700">
              <strong>{selected.length}</strong> selected to compare
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="text-sm font-semibold px-3 py-2 text-slate-600 hover:text-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className="text-sm font-bold px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Compare →
              </button>
            </div>
          </div>
        </div>
      )}

      {compareOpen && selectedScenarios.length >= 2 && (
        <CompareModal
          scenarios={selectedScenarios}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Share row ────────────────────────────────────────────────────────────────

function ShareRow({
  scenario,
  busy,
  onShare,
  onRevoke,
}: {
  scenario: Scenario;
  busy: boolean;
  onShare: () => void;
  onRevoke: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    scenario.share_token && typeof window !== "undefined"
      ? `${window.location.origin}/scenarios/shared/${scenario.share_token}`
      : scenario.share_token
        ? `https://invest.com.au/scenarios/shared/${scenario.share_token}`
        : null;

  const copy = useCallback(async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the input below is selectable as a fallback */
    }
  }, [url]);

  if (!scenario.share_token) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={onShare}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50"
        >
          <Icon name="link" size={12} /> Create share link
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
      >
        <Icon name={copied ? "check" : "copy"} size={12} />
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={onRevoke}
        disabled={busy}
        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 disabled:opacity-50"
      >
        Revoke
      </button>
      {url && (
        <input
          type="text"
          readOnly
          value={url}
          aria-label="Share link"
          onFocus={(e) => e.currentTarget.select()}
          className="text-[11px] text-slate-500 border border-slate-200 rounded px-2 py-1 w-full sm:w-auto sm:flex-1 min-w-0"
        />
      )}
    </div>
  );
}

// ─── Compare modal ────────────────────────────────────────────────────────────

function CompareModal({
  scenarios,
  onClose,
}: {
  scenarios: Scenario[];
  onClose: () => void;
}) {
  const meta = calculatorMetaFor(scenarios[0]?.calculator_key ?? "");

  // Prefer comparing result snapshots when every scenario has one; otherwise
  // fall back to inputs. Both reuse the neutral-language delta contract.
  const allHaveSnapshot = scenarios.every(
    (s) => s.results_snapshot && Object.keys(s.results_snapshot).length > 0,
  );
  const blobs = scenarios.map((s) =>
    allHaveSnapshot ? s.results_snapshot : s.inputs,
  );
  const rows: FieldDeltaRow[] = compareScenarioBlobs(blobs);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Compare ${meta.label} scenarios`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
    >
      <div className="bg-white w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-violet-700 text-white px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-violet-200">
              {meta.label} · {allHaveSnapshot ? "Results" : "Inputs"}
            </p>
            <h2 className="text-base font-bold">Compare scenarios</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close compare"
            className="text-violet-200 hover:text-white text-sm font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {/* Header row of scenario names */}
          <div
            className="grid gap-2 text-[11px] font-bold text-slate-500 border-b border-slate-200 pb-2 mb-1"
            style={{
              gridTemplateColumns: `1.4fr repeat(${scenarios.length}, 1fr) 1fr`,
            }}
          >
            <span>Field</span>
            {scenarios.map((s, i) => (
              <span key={s.id} className="text-right truncate" title={s.name}>
                {String.fromCharCode(65 + i)}. {s.name}
              </span>
            ))}
            <span className="text-right">Δ vs A</span>
          </div>

          {rows.map((row, idx) => (
            <div
              key={row.key}
              className="grid gap-2 text-xs py-1.5 border-b border-slate-100 last:border-b-0 items-baseline"
              style={{
                gridTemplateColumns: `1.4fr repeat(${scenarios.length}, 1fr) 1fr`,
                backgroundColor: idx % 2 ? "rgba(248,250,252,0.6)" : undefined,
              }}
            >
              <span className="text-slate-600 font-medium">{row.label}</span>
              {row.displays.map((d, i) => (
                <span
                  key={i}
                  className="text-right font-semibold text-slate-800"
                >
                  {d}
                </span>
              ))}
              <span
                className={`text-right font-semibold text-[11px] ${
                  !row.numeric || row.absoluteDelta === null
                    ? "text-slate-400"
                    : row.size === "larger"
                      ? "text-sky-700"
                      : row.size === "smaller"
                        ? "text-orange-700"
                        : "text-slate-500"
                }`}
              >
                {row.numeric ? formatFieldDelta(row) : "—"}
              </span>
            </div>
          ))}

          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            &ldquo;Δ vs A&rdquo; is the numerical difference of the last column
            relative to column A — factual, not a recommendation about which
            scenario is preferable. {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </div>
    </div>
  );
}
