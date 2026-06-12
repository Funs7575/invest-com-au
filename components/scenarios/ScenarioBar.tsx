"use client";

/**
 * ScenarioBar — the "Save as scenario" + "Load scenario" affordance any
 * calculator can drop into its `CalculatorShell` (via the optional `scenario`
 * prop) or render directly.
 *
 * Contract
 * --------
 * - Renders NOTHING unless `enabled` (the `scenario_workspace` flag, resolved
 *   server-side and passed down) is true — so the whole feature stays dormant
 *   behind the flag with zero footprint when off.
 * - Anonymous users get a sign-in nudge instead of save/load (no anonymous
 *   scenarios — these live in `user_scenarios`, an RLS owner-scoped table).
 * - "Save" POSTs the current `inputs` (+ optional `resultsSnapshot`) to
 *   /api/account/scenarios. "Load" lists this calculator's saved scenarios and
 *   calls `onLoad(inputs)` so the calculator restores them in place.
 *
 * The component is calculator-agnostic: it never inspects the input shape.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useUser } from "@/lib/hooks/useUser";
import {
  SCENARIO_NAME_MAX,
  type ScenarioOwnerView,
} from "@/lib/scenarios";

export interface ScenarioBarProps {
  /**
   * Whether the `scenario_workspace` flag is on. Optional: when omitted, the
   * bar resolves the flag itself via /api/account/scenarios/enabled so a
   * calculator can drop it in with no server-side plumbing (keeps ISR pages
   * static). Pass it explicitly only if the page already resolved the flag.
   */
  enabled?: boolean;
  /** This calculator's `useCalculatorState` key / `calculator_key`. */
  calculatorKey: string;
  /** Current calculator inputs to capture on save. */
  inputs: Record<string, unknown>;
  /** Optional pre-computed headline figures stored alongside the inputs. */
  resultsSnapshot?: Record<string, unknown>;
  /** Restore a saved scenario's inputs into the calculator. */
  onLoad: (inputs: Record<string, unknown>) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error" | "limit";

export default function ScenarioBar({
  enabled,
  calculatorKey,
  inputs,
  resultsSnapshot,
  onLoad,
}: ScenarioBarProps) {
  const { user, loading } = useUser();

  // Resolve the flag client-side when the page didn't pass it. Fails closed.
  const [resolvedEnabled, setResolvedEnabled] = useState<boolean | null>(
    enabled ?? null,
  );
  useEffect(() => {
    if (enabled !== undefined) {
      setResolvedEnabled(enabled);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/scenarios/enabled");
        const body = (await res.json()) as { enabled?: boolean };
        if (!cancelled) setResolvedEnabled(Boolean(body.enabled));
      } catch {
        if (!cancelled) setResolvedEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const [name, setName] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioOwnerView[] | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const fetchedRef = useRef(false);

  // ── Load this calculator's scenarios (lazy, on first picker open) ────────────
  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/account/scenarios", { method: "GET" });
      if (!res.ok) {
        setScenarios([]);
        return;
      }
      const body = (await res.json()) as { items: ScenarioOwnerView[] };
      setScenarios(
        body.items.filter((s) => s.calculator_key === calculatorKey),
      );
    } catch {
      setScenarios([]);
    } finally {
      setListLoading(false);
    }
  }, [calculatorKey]);

  useEffect(() => {
    if (pickerOpen && !fetchedRef.current) {
      fetchedRef.current = true;
      void loadList();
    }
  }, [pickerOpen, loadList]);

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Give your scenario a name first.");
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/account/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculator_key: calculatorKey,
          name: trimmed.slice(0, SCENARIO_NAME_MAX),
          inputs,
          results_snapshot: resultsSnapshot ?? null,
        }),
      });
      if (res.status === 409) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMsg(body.error ?? "You've reached your scenario limit.");
        setSaveState("limit");
        return;
      }
      if (!res.ok) throw new Error("save_failed");
      setSaveState("saved");
      setName("");
      // Invalidate the cached list so a subsequent Load reflects the new row.
      fetchedRef.current = false;
      setScenarios(null);
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setErrorMsg("Couldn't save. Please try again.");
      setSaveState("error");
    }
  }, [name, calculatorKey, inputs, resultsSnapshot]);

  // ── Gating ──────────────────────────────────────────────────────────────────
  if (!resolvedEnabled) return null; // flag off / unresolved ⇒ no footprint
  if (loading) return null; // resolve auth before deciding what to show

  // Anonymous: sign-in nudge instead of save/load.
  if (!user) {
    return (
      <div
        data-testid="scenario-bar-signin"
        className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3"
      >
        <p className="text-xs text-violet-900 font-semibold mb-1">
          Save this as a scenario
        </p>
        <p className="text-xs text-violet-700 mb-2">
          Sign in to save named scenarios, reopen them later, and compare them
          side-by-side.
        </p>
        <Link
          href={`/auth/login?next=${encodeURIComponent(`/${calculatorKey.replace(/_/g, "-")}`)}`}
          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          Sign in to save
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="scenario-bar"
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Icon name="git-branch" size={14} className="text-violet-600" />
        <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          Scenarios
        </p>
        <Link
          href="/account/scenarios"
          className="ml-auto text-[11px] font-semibold text-violet-600 hover:underline"
        >
          Manage →
        </Link>
      </div>

      {/* Save */}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`scenario-name-${calculatorKey}`}>
          Scenario name
        </label>
        <input
          id={`scenario-name-${calculatorKey}`}
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (saveState !== "idle") setSaveState("idle");
          }}
          placeholder='e.g. "Aggressive DCA"'
          maxLength={SCENARIO_NAME_MAX}
          className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className={`shrink-0 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
            saveState === "saved"
              ? "bg-emerald-600 text-white"
              : "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
          }`}
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved!"
              : "Save"}
        </button>
      </div>

      {(saveState === "error" || saveState === "limit") && errorMsg && (
        <p role="alert" className="text-xs text-red-600">
          {errorMsg}
        </p>
      )}

      {/* Load */}
      <div>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
        >
          <Icon
            name={pickerOpen ? "chevron-up" : "chevron-down"}
            size={12}
          />
          Load a saved scenario
        </button>

        {pickerOpen && (
          <div className="mt-2">
            {listLoading || scenarios === null ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : scenarios.length === 0 ? (
              <p className="text-xs text-slate-400">
                No saved scenarios for this calculator yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {scenarios.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {s.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onLoad(s.inputs);
                        setPickerOpen(false);
                      }}
                      className="shrink-0 text-xs font-bold px-3 py-1 bg-violet-100 text-violet-700 rounded-md hover:bg-violet-200"
                    >
                      Load
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
