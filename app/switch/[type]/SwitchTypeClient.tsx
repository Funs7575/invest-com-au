"use client";

/**
 * Interactive switching tool: checklist progress tracker + cost-of-staying estimate.
 *
 * AFSL-safe:
 *  - No personal recommendation ("switch to X because it's best for you").
 *  - Only factual process steps and a user-supplied-input cost estimate.
 *  - GENERAL_ADVICE_WARNING is surfaced on the parent page.
 */

import { useState, useMemo } from "react";
import type { SwitchChecklist } from "@/lib/switching";
import {
  calcBrokerSaving,
  calcSuperSaving,
  calcSavingsSaving,
} from "@/lib/switching";

interface Props {
  checklist: SwitchChecklist;
  switchType: string;
}

// ─── Phase labels ─────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  // broker
  prepare: "Prepare",
  open: "Open new account",
  transfer: "Transfer holdings",
  close: "Close old account",
  // super
  check: "Pre-switch check",
  rollover: "Initiate rollover",
  // savings
  migrate: "Migrate payments",
};

// ─── Cost estimate form per type ──────────────────────────────────────────────

function BrokerEstimateForm() {
  const [currentFee, setCurrentFee] = useState("$19.95");
  const [targetFee, setTargetFee] = useState("$0");
  const [trades, setTrades] = useState(24);
  const [avgSize, setAvgSize] = useState(2000);
  const [usPct, setUsPct] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(
    () =>
      showResult
        ? calcBrokerSaving({
            currentAsxFee: currentFee,
            targetAsxFee: targetFee,
            tradesPerYear: trades,
            avgTradeSize: avgSize,
            usAllocationPct: usPct,
          })
        : null,
    [showResult, currentFee, targetFee, trades, avgSize, usPct],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">
        Cost of staying vs switching estimate
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="switch-current-fee" className="block text-xs font-semibold text-slate-600 mb-1">
            Current ASX fee
          </label>
          <input
            id="switch-current-fee"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={currentFee}
            onChange={(e) => { setCurrentFee(e.target.value); setShowResult(false); }}
            placeholder="e.g. $19.95 or 0.5%"
          />
        </div>
        <div>
          <label htmlFor="switch-target-fee" className="block text-xs font-semibold text-slate-600 mb-1">
            Target ASX fee
          </label>
          <input
            id="switch-target-fee"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={targetFee}
            onChange={(e) => { setTargetFee(e.target.value); setShowResult(false); }}
            placeholder="e.g. $0 or $5"
          />
        </div>
        <div>
          <label htmlFor="st-broker-trades" className="block text-xs font-semibold text-slate-600 mb-1">
            Trades per year
          </label>
          <input
            id="st-broker-trades"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={trades}
            onChange={(e) => { setTrades(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-broker-avg-size" className="block text-xs font-semibold text-slate-600 mb-1">
            Avg trade size ($)
          </label>
          <input
            id="st-broker-avg-size"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={avgSize}
            onChange={(e) => { setAvgSize(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-broker-us-pct" className="block text-xs font-semibold text-slate-600 mb-1">
            US shares (%)
          </label>
          <input
            id="st-broker-us-pct"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={usPct}
            onChange={(e) => { setUsPct(Math.min(100, parseInt(e.target.value) || 0)); setShowResult(false); }}
            min={0}
            max={100}
          />
        </div>
      </div>
      <button
        onClick={() => setShowResult(true)}
        className="w-full py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Calculate savings →
      </button>
      {result && <SavingResult annualDiff={result.annualDifference} current={result.currentAnnualCost} target={result.targetAnnualCost} projections={result.projectedSavings} label="brokerage" />}
      <p className="text-xs text-slate-400 mt-2">
        Estimate only — based on your inputs. Not a personal recommendation.
      </p>
    </div>
  );
}

function SuperEstimateForm() {
  const [balance, setBalance] = useState(80000);
  const [currentRate, setCurrentRate] = useState(1.2);
  const [targetRate, setTargetRate] = useState(0.5);
  const [currentFixed, setCurrentFixed] = useState(78);
  const [targetFixed, setTargetFixed] = useState(52);
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(
    () =>
      showResult
        ? calcSuperSaving({
            balance,
            currentFeeRatePct: currentRate,
            targetFeeRatePct: targetRate,
            currentFixedFeeAud: currentFixed,
            targetFixedFeeAud: targetFixed,
          })
        : null,
    [showResult, balance, currentRate, targetRate, currentFixed, targetFixed],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">
        Annual fee saving estimate
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Enter your super balance and both funds&apos; total annual fee percentages (admin + investment fees, found in each fund&apos;s PDS or the ATO YourSuper tool).
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label htmlFor="st-super-balance" className="block text-xs font-semibold text-slate-600 mb-1">
            Super balance ($)
          </label>
          <input
            id="st-super-balance"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={balance}
            onChange={(e) => { setBalance(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-super-current-rate" className="block text-xs font-semibold text-slate-600 mb-1">
            Current fund fee (% p.a.)
          </label>
          <input
            id="st-super-current-rate"
            type="number"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={currentRate}
            onChange={(e) => { setCurrentRate(parseFloat(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-super-target-rate" className="block text-xs font-semibold text-slate-600 mb-1">
            Target fund fee (% p.a.)
          </label>
          <input
            id="st-super-target-rate"
            type="number"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={targetRate}
            onChange={(e) => { setTargetRate(parseFloat(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-super-current-fixed" className="block text-xs font-semibold text-slate-600 mb-1">
            Current fixed fee ($/yr)
          </label>
          <input
            id="st-super-current-fixed"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={currentFixed}
            onChange={(e) => { setCurrentFixed(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-super-target-fixed" className="block text-xs font-semibold text-slate-600 mb-1">
            Target fixed fee ($/yr)
          </label>
          <input
            id="st-super-target-fixed"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={targetFixed}
            onChange={(e) => { setTargetFixed(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
      </div>
      <button
        onClick={() => setShowResult(true)}
        className="w-full py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Calculate fee saving →
      </button>
      {result && <SavingResult annualDiff={result.annualDifference} current={result.currentAnnualFee} target={result.targetAnnualFee} projections={result.projectedSavings} label="fees" />}
      <p className="text-xs text-slate-400 mt-2">
        Estimate only — flat fee comparison based on your inputs. Does not model investment returns. Not a personal recommendation.
      </p>
    </div>
  );
}

function SavingsEstimateForm() {
  const [balance, setBalance] = useState(50000);
  const [currentRate, setCurrentRate] = useState(0.5);
  const [targetRate, setTargetRate] = useState(5.0);
  const [currentFee, setCurrentFee] = useState(0);
  const [targetFee, setTargetFee] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const result = useMemo(
    () =>
      showResult
        ? calcSavingsSaving({
            balance,
            currentRatePct: currentRate,
            targetRatePct: targetRate,
            currentMonthlyFeeAud: currentFee,
            targetMonthlyFeeAud: targetFee,
          })
        : null,
    [showResult, balance, currentRate, targetRate, currentFee, targetFee],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h2 className="text-sm font-bold text-slate-900 mb-4">
        Annual interest gain estimate
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Enter your savings balance and both accounts&apos; ongoing interest rates (not the introductory rate).
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label htmlFor="st-sav-balance" className="block text-xs font-semibold text-slate-600 mb-1">
            Savings balance ($)
          </label>
          <input
            id="st-sav-balance"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={balance}
            onChange={(e) => { setBalance(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-sav-current-rate" className="block text-xs font-semibold text-slate-600 mb-1">
            Current rate (% p.a., ongoing)
          </label>
          <input
            id="st-sav-current-rate"
            type="number"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={currentRate}
            onChange={(e) => { setCurrentRate(parseFloat(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-sav-target-rate" className="block text-xs font-semibold text-slate-600 mb-1">
            Target rate (% p.a., ongoing)
          </label>
          <input
            id="st-sav-target-rate"
            type="number"
            step="0.01"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={targetRate}
            onChange={(e) => { setTargetRate(parseFloat(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-sav-current-fee" className="block text-xs font-semibold text-slate-600 mb-1">
            Current monthly fee ($)
          </label>
          <input
            id="st-sav-current-fee"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={currentFee}
            onChange={(e) => { setCurrentFee(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
        <div>
          <label htmlFor="st-sav-target-fee" className="block text-xs font-semibold text-slate-600 mb-1">
            Target monthly fee ($)
          </label>
          <input
            id="st-sav-target-fee"
            type="number"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={targetFee}
            onChange={(e) => { setTargetFee(parseInt(e.target.value) || 0); setShowResult(false); }}
            min={0}
          />
        </div>
      </div>
      <button
        onClick={() => setShowResult(true)}
        className="w-full py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Calculate interest gain →
      </button>
      {result && (
        <SavingResult
          annualDiff={result.annualDifference}
          current={result.currentAnnualInterest - result.currentAnnualFees}
          target={result.targetAnnualInterest - result.targetAnnualFees}
          projections={result.projectedSavings}
          label="net interest"
          gainLabel="gain"
        />
      )}
      <p className="text-xs text-slate-400 mt-2">
        Estimate only — uses simple (non-compounding) interest. Not a personal recommendation.
      </p>
    </div>
  );
}

// ─── Shared result display ────────────────────────────────────────────────────

interface SavingResultProps {
  annualDiff: number;
  current: number;
  target: number;
  projections: { years: number; saving: number }[];
  label: string;
  gainLabel?: string;
}

function SavingResult({ annualDiff, current, target, projections, label, gainLabel = "saving" }: SavingResultProps) {
  const isPositive = annualDiff > 0;
  return (
    <div
      className={`mt-4 rounded-xl p-4 border ${
        isPositive
          ? "bg-emerald-50 border-emerald-200"
          : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className={`text-2xl font-extrabold ${
            isPositive ? "text-emerald-700" : "text-slate-700"
          }`}
        >
          {isPositive ? "+" : ""}${Math.abs(annualDiff).toLocaleString("en-AU", { maximumFractionDigits: 0 })}
        </span>
        <span className="text-sm text-slate-500">
          estimated annual {isPositive ? gainLabel : "extra cost"} in {label}
        </span>
      </div>
      <div className="flex gap-4 text-xs text-slate-500 mb-3">
        <span>Current: <strong>${current.toLocaleString("en-AU", { maximumFractionDigits: 0 })}/yr</strong></span>
        <span>Target: <strong>${target.toLocaleString("en-AU", { maximumFractionDigits: 0 })}/yr</strong></span>
      </div>
      {isPositive && (
        <div className="grid grid-cols-4 gap-2 text-center border-t border-emerald-200 pt-3">
          {projections.map((p) => (
            <div key={p.years}>
              <p className="text-[0.6rem] text-slate-500">{p.years}yr</p>
              <p className="text-sm font-extrabold text-emerald-700">
                ${p.saving.toLocaleString("en-AU")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checklist with progress tracking ────────────────────────────────────────

function ChecklistSection({ checklist }: { checklist: SwitchChecklist }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const progress =
    checklist.steps.length > 0
      ? Math.round((checked.size / checklist.steps.length) * 100)
      : 0;

  // Group steps by phase
  const phases: { phase: string; steps: { step: (typeof checklist.steps)[number]; idx: number }[] }[] = [];
  for (let i = 0; i < checklist.steps.length; i++) {
    const step = checklist.steps[i]!;
    const last = phases[phases.length - 1];
    if (!last || last.phase !== step.phase) {
      phases.push({ phase: step.phase, steps: [{ step, idx: i }] });
    } else {
      last.steps.push({ step, idx: i });
    }
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 shrink-0">
          {checked.size}/{checklist.steps.length} steps
        </span>
      </div>

      {/* Steps grouped by phase */}
      <div className="space-y-6">
        {phases.map(({ phase, steps }) => (
          <div key={phase}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {PHASE_LABELS[phase] ?? phase}
            </h3>
            <div className="space-y-2">
              {steps.map(({ step, idx }) => {
                const done = checked.has(idx);
                return (
                  <div
                    key={idx}
                    id={`step-${idx + 1}`}
                    className={`border rounded-xl p-4 transition-all cursor-pointer select-none ${
                      done
                        ? "border-violet-200 bg-violet-50 opacity-70"
                        : "border-slate-200 bg-white hover:border-violet-200"
                    }`}
                    onClick={() => toggle(idx)}
                  >
                    <div className="flex gap-3 items-start">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          done
                            ? "bg-violet-600 border-violet-600"
                            : "border-slate-300"
                        }`}
                      >
                        {done && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-semibold ${
                            done ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {step.heading}
                        </p>
                        {!done && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {step.body}
                          </p>
                        )}
                        {step.warning && !done && (
                          <div className="mt-2 flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                            <span className="text-amber-500 shrink-0">⚠️</span>
                            <p className="text-xs text-amber-800">{step.warning}</p>
                          </div>
                        )}
                        {step.source && !done && (
                          <p className="text-[0.65rem] text-slate-400 mt-1">
                            Source: {step.source}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-base font-bold text-emerald-800 mb-1">
            All steps complete!
          </p>
          <p className="text-sm text-emerald-600">
            Your switching checklist is done. Compare providers to find the right destination.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SwitchTypeClient({ checklist, switchType }: Props) {
  return (
    <div>
      {/* Cost estimate form — type specific */}
      {switchType === "broker" && <BrokerEstimateForm />}
      {switchType === "super" && <SuperEstimateForm />}
      {switchType === "savings" && <SavingsEstimateForm />}

      {/* Step-by-step checklist */}
      <div className="mt-6">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Step-by-step checklist ({checklist.steps.length} steps)
        </h2>
        <ChecklistSection checklist={checklist} />
      </div>
    </div>
  );
}
