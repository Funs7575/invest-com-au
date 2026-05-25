"use client";

/**
 * Scenario Planner — client component.
 *
 * Composes retirement, super-contributions, and investment-income-tax
 * projections into one unified view. Save up to 3 named scenarios to
 * `user_calculator_state` (key: "scenario_planner") and compare two
 * side-by-side.
 *
 * AFSL compliance: all outputs are factual projections with
 * GENERAL_ADVICE_WARNING displayed prominently. No personalised
 * recommendations are produced.
 */

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { formatCurrency } from "@/lib/utils";
import { useCalculatorState } from "@/hooks/use-calculator-state";
import {
  computeScenario,
  DEFAULT_SG_RATE,
  SCENARIO_PLANNER_CALC_KEY,
  type ScenarioInput,
  type ScenarioResult,
  type ScenarioPlannerSnapshot,
} from "@/lib/scenario-engine";

// ─── nanoid-lite (no dependency needed) ──────────────────────────────────────
function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Default inputs ───────────────────────────────────────────────────────────
const DEFAULT_INPUTS: Required<ScenarioInput> = {
  currentAge: 35,
  retirementAge: 67,
  annualSalary: 100_000,
  employerSgRate: DEFAULT_SG_RATE,
  currentSuperBalance: 150_000,
  extraConcessionalContribs: 0,
  nonConcessionalContribs: 0,
  unusedCarryForwardCap: 0,
  expectedReturnPct: 7,
  inflationRatePct: 3,
  desiredRetirementIncome: 60_000,
  annualInterestIncome: 0,
  annualUnfrankedDividends: 0,
  annualFrankedDividends: 0,
  frankingPct: 100,
  annualCapitalGain: 0,
  capitalGainDiscountEligible: false,
};

// ─── Max saved scenarios ──────────────────────────────────────────────────────
const MAX_SAVED = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function fmtPct(fraction: number, decimals = 1): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InputField({
  label,
  hint,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  max,
  type = "number",
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
        {hint && (
          <span className="font-normal text-slate-400 ml-1">{hint}</span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-10" : "pr-3"} py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green" | "amber" | "red" | "violet";
}) {
  const colours = {
    green: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-700",
    violet: "text-violet-700",
  };
  return (
    <div className="bg-slate-50 rounded-xl p-4 text-center">
      <p className="text-[0.62rem] text-slate-500 font-semibold uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-base font-extrabold ${accent ? colours[accent] : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Results view ─────────────────────────────────────────────────────────────

function ResultsPanel({ result }: { result: ScenarioResult }) {
  const { retirement, superContributions, investmentTax, inputs } = result;

  const fundedPct = pct(
    retirement.projectedSuperAtRetirement,
    retirement.targetBalance4PctRule,
  );
  const concessionalUsedPct = pct(
    superContributions.totalConcessional,
    superContributions.effectiveCap,
  );

  return (
    <div className="space-y-5">
      {/* ── Retirement overview ─────────────────────────────────────── */}
      <div
        className={`rounded-2xl p-5 ${
          retirement.isOnTrack
            ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200"
            : "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
        }`}
      >
        <p
          className="text-xs font-semibold mb-1"
          style={{ color: retirement.isOnTrack ? "#059669" : "#d97706" }}
        >
          Projected super at age {inputs.retirementAge}
        </p>
        <p
          className="text-3xl font-black mb-1"
          style={{ color: retirement.isOnTrack ? "#047857" : "#b45309" }}
        >
          {formatCurrency(retirement.projectedSuperAtRetirement)}
        </p>
        <p className="text-xs text-slate-600 mb-3">
          Lasts approximately{" "}
          <strong>{retirement.drawdownYears} years</strong> at{" "}
          {formatCurrency(inputs.desiredRetirementIncome)}/yr
          (inflation-adjusted)
        </p>

        {/* Progress bar */}
        <div className="w-full bg-white/60 rounded-full h-2.5 mb-1">
          <div
            className={`h-2.5 rounded-full transition-all ${
              retirement.isOnTrack ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{ width: `${fundedPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{Math.round(fundedPct)}% funded</span>
          <span className="text-slate-500">
            Target: {formatCurrency(retirement.targetBalance4PctRule)}
          </span>
        </div>

        {retirement.isOnTrack ? (
          <p className="text-xs font-bold text-emerald-700 mt-2">
            On track for retirement
          </p>
        ) : (
          <p className="text-xs font-bold text-amber-700 mt-2">
            Gap: {formatCurrency(Math.abs(retirement.gapToTarget))} (4% rule)
          </p>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          label="Years to retire"
          value={String(retirement.yearsToRetirement)}
          accent="violet"
        />
        <StatBox
          label="Annual employer SG"
          value={formatCurrency(retirement.annualEmployerContrib)}
          accent="violet"
        />
        <StatBox
          label="Super tax saving p.a."
          value={formatCurrency(superContributions.taxSavingOnExtraContribs)}
          accent="green"
        />
        <StatBox
          label="Investment tax p.a."
          value={
            investmentTax.taxOnInvestmentIncome > 0
              ? formatCurrency(investmentTax.taxOnInvestmentIncome)
              : "$0"
          }
          accent={investmentTax.taxOnInvestmentIncome > 0 ? "amber" : undefined}
        />
      </div>

      {/* ── Milestone table ────────────────────────────────────────────── */}
      {retirement.milestones.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900">
              Balance at Key Ages
            </p>
          </div>
          {retirement.milestones.map((m, i) => {
            const barPct = pct(
              m.balance,
              retirement.projectedSuperAtRetirement * 1.05,
            );
            return (
              <div
                key={m.age}
                className={`px-4 py-3 border-b border-slate-100 last:border-b-0 ${
                  i === retirement.milestones.length - 1 ? "bg-violet-50/40" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">
                    Age {m.age}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(m.balance)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-violet-400 h-1.5 rounded-full"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Super contributions ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wide">
          Super Contributions (This Year)
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Employer SG</span>
            <span className="font-semibold">
              {formatCurrency(retirement.annualEmployerContrib)}
            </span>
          </div>
          {inputs.extraConcessionalContribs > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">
                Extra concessional (salary sacrifice / deductible)
              </span>
              <span className="font-semibold">
                {formatCurrency(inputs.extraConcessionalContribs)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-100 pt-2">
            <span className="text-slate-700 font-medium">
              Total concessional
            </span>
            <span className="font-bold">
              {formatCurrency(superContributions.totalConcessional)}
            </span>
          </div>

          {/* Cap progress */}
          <div>
            <div className="flex justify-between text-[0.65rem] text-slate-400 mb-0.5">
              <span>Cap: {formatCurrency(superContributions.effectiveCap)}</span>
              <span>{Math.round(concessionalUsedPct)}% used</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  superContributions.concessionalExcess > 0
                    ? "bg-red-400"
                    : concessionalUsedPct >= 90
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, concessionalUsedPct)}%` }}
              />
            </div>
          </div>

          {superContributions.concessionalExcess > 0 && (
            <p className="text-red-600 font-medium">
              {formatCurrency(superContributions.concessionalExcess)} over cap
            </p>
          )}

          <div className="flex justify-between text-red-600">
            <span>
              Super tax ({fmtPct(superContributions.effectiveSuperTaxRate, 0)}
              {superContributions.isHighEarner ? " Div 293" : ""})
            </span>
            <span className="font-semibold">
              −{formatCurrency(superContributions.totalSuperTax)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2">
            <span className="text-slate-700 font-medium">
              Net concessional in super
            </span>
            <span className="font-bold">
              {formatCurrency(superContributions.netConcessionalInSuper)}
            </span>
          </div>
          {inputs.extraConcessionalContribs > 0 &&
            superContributions.taxSavingOnExtraContribs > 0 && (
              <p className="text-emerald-600 font-medium text-[0.65rem]">
                Tax saving vs taking extra as income:{" "}
                <strong>
                  {formatCurrency(superContributions.taxSavingOnExtraContribs)}
                </strong>
              </p>
            )}
        </div>
      </div>

      {/* ── Investment income tax ──────────────────────────────────────── */}
      {(inputs.annualInterestIncome > 0 ||
        inputs.annualUnfrankedDividends > 0 ||
        inputs.annualFrankedDividends > 0 ||
        inputs.annualCapitalGain > 0) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wide">
            Investment Income Tax (Annual)
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Total assessable income</span>
              <span className="font-semibold">
                {formatCurrency(investmentTax.totalAssessableIncome)}
              </span>
            </div>
            {investmentTax.frankingCredits > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Franking credit offset</span>
                <span className="font-semibold">
                  −{formatCurrency(investmentTax.frankingCredits)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">
                Net tax on investment income
              </span>
              <span className="font-semibold text-amber-700">
                {formatCurrency(investmentTax.taxOnInvestmentIncome)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-700 font-medium">
                Net investment income (after tax)
              </span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(investmentTax.netInvestmentIncome)}
              </span>
            </div>
            <p className="text-slate-400 text-[0.65rem]">
              Effective rate on investment income:{" "}
              {investmentTax.effectiveRateOnInvestmentIncome.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compare panel ────────────────────────────────────────────────────────────

function ComparePanel({
  a,
  b,
}: {
  a: { label: string; result: ScenarioResult };
  b: { label: string; result: ScenarioResult };
}) {
  type Row = { label: string; va: string; vb: string; better?: "a" | "b" | "tie" };

  const rows: Row[] = [
    {
      label: "Projected super at retirement",
      va: formatCurrency(a.result.retirement.projectedSuperAtRetirement),
      vb: formatCurrency(b.result.retirement.projectedSuperAtRetirement),
      better:
        a.result.retirement.projectedSuperAtRetirement >
        b.result.retirement.projectedSuperAtRetirement
          ? "a"
          : a.result.retirement.projectedSuperAtRetirement <
              b.result.retirement.projectedSuperAtRetirement
            ? "b"
            : "tie",
    },
    {
      label: "4% rule target",
      va: formatCurrency(a.result.retirement.targetBalance4PctRule),
      vb: formatCurrency(b.result.retirement.targetBalance4PctRule),
    },
    {
      label: "Gap to target",
      va: formatCurrency(Math.abs(a.result.retirement.gapToTarget)),
      vb: formatCurrency(Math.abs(b.result.retirement.gapToTarget)),
      better:
        a.result.retirement.gapToTarget <= b.result.retirement.gapToTarget
          ? "a"
          : "b",
    },
    {
      label: "On track",
      va: a.result.retirement.isOnTrack ? "Yes" : "No",
      vb: b.result.retirement.isOnTrack ? "Yes" : "No",
    },
    {
      label: "Drawdown years",
      va: String(a.result.retirement.drawdownYears),
      vb: String(b.result.retirement.drawdownYears),
      better:
        a.result.retirement.drawdownYears > b.result.retirement.drawdownYears
          ? "a"
          : a.result.retirement.drawdownYears <
              b.result.retirement.drawdownYears
            ? "b"
            : "tie",
    },
    {
      label: "Super tax saving p.a.",
      va: formatCurrency(a.result.superContributions.taxSavingOnExtraContribs),
      vb: formatCurrency(b.result.superContributions.taxSavingOnExtraContribs),
      better:
        a.result.superContributions.taxSavingOnExtraContribs >
        b.result.superContributions.taxSavingOnExtraContribs
          ? "a"
          : a.result.superContributions.taxSavingOnExtraContribs <
              b.result.superContributions.taxSavingOnExtraContribs
            ? "b"
            : "tie",
    },
    {
      label: "Investment tax p.a.",
      va: formatCurrency(a.result.investmentTax.taxOnInvestmentIncome),
      vb: formatCurrency(b.result.investmentTax.taxOnInvestmentIncome),
      better:
        a.result.investmentTax.taxOnInvestmentIncome <
        b.result.investmentTax.taxOnInvestmentIncome
          ? "a"
          : a.result.investmentTax.taxOnInvestmentIncome >
              b.result.investmentTax.taxOnInvestmentIncome
            ? "b"
            : "tie",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-3 bg-violet-600 text-white text-xs font-bold">
        <div className="px-4 py-3">Metric</div>
        <div className="px-4 py-3 text-center border-l border-violet-500">
          {a.label}
        </div>
        <div className="px-4 py-3 text-center border-l border-violet-500">
          {b.label}
        </div>
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          className={`grid grid-cols-3 text-xs border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}`}
        >
          <div className="px-4 py-2.5 text-slate-600 font-medium">
            {row.label}
          </div>
          <div
            className={`px-4 py-2.5 text-center font-semibold border-l border-slate-100 ${
              row.better === "a" ? "text-emerald-700 bg-emerald-50/60" : "text-slate-800"
            }`}
          >
            {row.va}
          </div>
          <div
            className={`px-4 py-2.5 text-center font-semibold border-l border-slate-100 ${
              row.better === "b" ? "text-emerald-700 bg-emerald-50/60" : "text-slate-800"
            }`}
          >
            {row.vb}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScenarioPlannerClient() {
  // ── Inputs ──────────────────────────────────────────────────────────────────
  const [currentAge, setCurrentAge] = useState(DEFAULT_INPUTS.currentAge);
  const [retirementAge, setRetirementAge] = useState(
    DEFAULT_INPUTS.retirementAge,
  );
  const [annualSalary, setAnnualSalary] = useState(DEFAULT_INPUTS.annualSalary);
  const [employerSgPct, setEmployerSgPct] = useState(
    DEFAULT_SG_RATE * 100,
  );
  const [currentSuperBalance, setCurrentSuperBalance] = useState(
    DEFAULT_INPUTS.currentSuperBalance,
  );
  const [extraConcessionalContribs, setExtraConcessionalContribs] = useState(
    DEFAULT_INPUTS.extraConcessionalContribs,
  );
  const [nonConcessionalContribs, setNonConcessionalContribs] = useState(
    DEFAULT_INPUTS.nonConcessionalContribs,
  );
  const [unusedCarryForwardCap, setUnusedCarryForwardCap] = useState(
    DEFAULT_INPUTS.unusedCarryForwardCap,
  );
  const [expectedReturnPct, setExpectedReturnPct] = useState(
    DEFAULT_INPUTS.expectedReturnPct,
  );
  const [inflationRatePct, setInflationRatePct] = useState(
    DEFAULT_INPUTS.inflationRatePct,
  );
  const [desiredRetirementIncome, setDesiredRetirementIncome] = useState(
    DEFAULT_INPUTS.desiredRetirementIncome,
  );
  const [annualInterestIncome, setAnnualInterestIncome] = useState(0);
  const [annualUnfrankedDividends, setAnnualUnfrankedDividends] = useState(0);
  const [annualFrankedDividends, setAnnualFrankedDividends] = useState(0);
  const [frankingPct, setFrankingPct] = useState(100);
  const [annualCapitalGain, setAnnualCapitalGain] = useState(0);
  const [capitalGainDiscountEligible, setCapitalGainDiscountEligible] =
    useState(false);

  // ── View state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"inputs" | "results" | "compare">(
    "inputs",
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [scenarioName, setScenarioName] = useState("My Scenario");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [compareIdxA, setCompareIdxA] = useState(0);
  const [compareIdxB, setCompareIdxB] = useState(1);

  // ── Persistence (user_calculator_state) ─────────────────────────────────────
  const {
    value: persisted,
    setValue: setPersisted,
  } = useCalculatorState<{ scenarios: ScenarioPlannerSnapshot["scenarios"] }>(
    SCENARIO_PLANNER_CALC_KEY,
    { scenarios: [] },
  );

  // ── Computation (real-time) ──────────────────────────────────────────────────
  const result: ScenarioResult = useMemo(
    () =>
      computeScenario({
        currentAge,
        retirementAge,
        annualSalary,
        employerSgRate: employerSgPct / 100,
        currentSuperBalance,
        extraConcessionalContribs,
        nonConcessionalContribs,
        unusedCarryForwardCap,
        expectedReturnPct,
        inflationRatePct,
        desiredRetirementIncome,
        annualInterestIncome,
        annualUnfrankedDividends,
        annualFrankedDividends,
        frankingPct,
        annualCapitalGain,
        capitalGainDiscountEligible,
      }),
    [
      currentAge,
      retirementAge,
      annualSalary,
      employerSgPct,
      currentSuperBalance,
      extraConcessionalContribs,
      nonConcessionalContribs,
      unusedCarryForwardCap,
      expectedReturnPct,
      inflationRatePct,
      desiredRetirementIncome,
      annualInterestIncome,
      annualUnfrankedDividends,
      annualFrankedDividends,
      frankingPct,
      annualCapitalGain,
      capitalGainDiscountEligible,
    ],
  );

  // ── Save scenario ────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (persisted.scenarios.length >= MAX_SAVED) return;
    setSaveStatus("saving");
    const newScenario: ScenarioPlannerSnapshot["scenarios"][number] = {
      id: nanoid(),
      label: scenarioName.trim() || `Scenario ${persisted.scenarios.length + 1}`,
      savedAt: new Date().toISOString(),
      inputs: result.inputs,
      summary: {
        projectedSuperAtRetirement:
          result.retirement.projectedSuperAtRetirement,
        gapToTarget: result.retirement.gapToTarget,
        isOnTrack: result.retirement.isOnTrack,
        drawdownYears: result.retirement.drawdownYears,
        taxSavingOnExtraContribs:
          result.superContributions.taxSavingOnExtraContribs,
        taxOnInvestmentIncome: result.investmentTax.taxOnInvestmentIncome,
      },
    };
    const updated = [...persisted.scenarios, newScenario];
    setPersisted({ scenarios: updated });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, [persisted.scenarios, scenarioName, result, setPersisted]);

  // ── Load a saved scenario into the form ──────────────────────────────────────
  const handleLoad = useCallback(
    (idx: number) => {
      const s = persisted.scenarios[idx];
      if (!s) return;
      const inp = s.inputs;
      setCurrentAge(inp.currentAge);
      setRetirementAge(inp.retirementAge);
      setAnnualSalary(inp.annualSalary);
      setEmployerSgPct(inp.employerSgRate * 100);
      setCurrentSuperBalance(inp.currentSuperBalance);
      setExtraConcessionalContribs(inp.extraConcessionalContribs);
      setNonConcessionalContribs(inp.nonConcessionalContribs);
      setUnusedCarryForwardCap(inp.unusedCarryForwardCap);
      setExpectedReturnPct(inp.expectedReturnPct);
      setInflationRatePct(inp.inflationRatePct);
      setDesiredRetirementIncome(inp.desiredRetirementIncome);
      setAnnualInterestIncome(inp.annualInterestIncome);
      setAnnualUnfrankedDividends(inp.annualUnfrankedDividends);
      setAnnualFrankedDividends(inp.annualFrankedDividends);
      setFrankingPct(inp.frankingPct);
      setAnnualCapitalGain(inp.annualCapitalGain);
      setCapitalGainDiscountEligible(inp.capitalGainDiscountEligible);
      setScenarioName(s.label);
      setActiveTab("results");
    },
    [persisted.scenarios],
  );

  // ── Delete a saved scenario ──────────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      setPersisted({
        scenarios: persisted.scenarios.filter((s) => s.id !== id),
      });
    },
    [persisted.scenarios, setPersisted],
  );

  // ── Compute saved-scenario results for compare ───────────────────────────────
  const savedResults = useMemo(
    () =>
      persisted.scenarios.map((s) => ({
        label: s.label,
        result: computeScenario(s.inputs),
      })),
    [persisted.scenarios],
  );

  const canCompare = savedResults.length >= 2;
  const compareA = savedResults[compareIdxA];
  const compareB = savedResults[compareIdxB];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-700 via-violet-800 to-violet-900 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-4xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300 mb-2">
            Scenario Planner
          </p>
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">
            Model your retirement, super &amp; investment tax
          </h1>
          <p className="text-sm md:text-base text-violet-100 max-w-xl mx-auto">
            Chain three calculators into one projection. Save up to{" "}
            {MAX_SAVED} scenarios and compare them side-by-side. General
            information only — not personal advice.
          </p>
        </div>
      </div>

      <div className="container-custom max-w-4xl py-6 md:py-10">
        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
          {(
            [
              { key: "inputs", label: "Inputs" },
              { key: "results", label: "Results" },
              {
                key: "compare",
                label: `Compare${persisted.scenarios.length >= 2 ? ` (${persisted.scenarios.length})` : ""}`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-sm font-semibold rounded-lg py-2 transition-all ${
                activeTab === tab.key
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══ INPUTS TAB ════════════════════════════════════════════════════ */}
        {activeTab === "inputs" && (
          <div className="space-y-6">
            {/* Core inputs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8">
              <h2 className="text-sm font-bold text-slate-900 mb-4">
                Your Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Current age"
                  value={currentAge}
                  onChange={(v) => setCurrentAge(Math.max(18, Math.min(75, v)))}
                  min={18}
                  max={75}
                />
                <InputField
                  label="Retirement age"
                  value={retirementAge}
                  onChange={(v) =>
                    setRetirementAge(
                      Math.max(currentAge + 1, Math.min(85, v)),
                    )
                  }
                  min={currentAge + 1}
                  max={85}
                />
                <InputField
                  label="Annual salary (pre-tax)"
                  value={annualSalary}
                  onChange={(v) => setAnnualSalary(Math.max(0, v))}
                  prefix="$"
                  step={1000}
                />
                <InputField
                  label="Current super balance"
                  value={currentSuperBalance}
                  onChange={(v) => setCurrentSuperBalance(Math.max(0, v))}
                  prefix="$"
                  step={5000}
                />
                <InputField
                  label="Employer SG rate"
                  hint="11.5% default (FY2026)"
                  value={employerSgPct}
                  onChange={(v) =>
                    setEmployerSgPct(Math.max(0, Math.min(25, v)))
                  }
                  suffix="%"
                  step={0.5}
                />
                <InputField
                  label="Desired retirement income"
                  hint="today's dollars, p.a."
                  value={desiredRetirementIncome}
                  onChange={(v) => setDesiredRetirementIncome(Math.max(0, v))}
                  prefix="$"
                  step={1000}
                />
                <InputField
                  label="Extra concessional contributions"
                  hint="salary sacrifice / personal deductible p.a."
                  value={extraConcessionalContribs}
                  onChange={(v) =>
                    setExtraConcessionalContribs(Math.max(0, v))
                  }
                  prefix="$"
                  step={500}
                />
                <InputField
                  label="Non-concessional contributions"
                  hint="after-tax money into super p.a."
                  value={nonConcessionalContribs}
                  onChange={(v) => setNonConcessionalContribs(Math.max(0, v))}
                  prefix="$"
                  step={1000}
                />
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-violet-600 font-semibold mt-4 hover:underline"
              >
                {showAdvanced ? "Hide" : "Show"} investment assumptions &amp;
                income inputs
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <InputField
                    label="Expected return p.a."
                    value={expectedReturnPct}
                    onChange={(v) =>
                      setExpectedReturnPct(Math.max(0, Math.min(15, v)))
                    }
                    suffix="%"
                    step={0.5}
                  />
                  <InputField
                    label="Inflation rate p.a."
                    value={inflationRatePct}
                    onChange={(v) =>
                      setInflationRatePct(Math.max(0, Math.min(10, v)))
                    }
                    suffix="%"
                    step={0.5}
                  />
                  <InputField
                    label="Unused carry-forward cap"
                    hint="last 5 yrs, balance < $500k"
                    value={unusedCarryForwardCap}
                    onChange={(v) => setUnusedCarryForwardCap(Math.max(0, v))}
                    prefix="$"
                    step={1000}
                  />
                  <div />
                  {/* Investment income */}
                  <InputField
                    label="Annual interest income"
                    value={annualInterestIncome}
                    onChange={(v) => setAnnualInterestIncome(Math.max(0, v))}
                    prefix="$"
                    step={500}
                  />
                  <InputField
                    label="Annual unfranked dividends"
                    value={annualUnfrankedDividends}
                    onChange={(v) =>
                      setAnnualUnfrankedDividends(Math.max(0, v))
                    }
                    prefix="$"
                    step={500}
                  />
                  <InputField
                    label="Annual franked dividends"
                    hint="cash amount before gross-up"
                    value={annualFrankedDividends}
                    onChange={(v) => setAnnualFrankedDividends(Math.max(0, v))}
                    prefix="$"
                    step={500}
                  />
                  <InputField
                    label="Franking percentage"
                    value={frankingPct}
                    onChange={(v) =>
                      setFrankingPct(Math.max(0, Math.min(100, v)))
                    }
                    suffix="%"
                    step={5}
                  />
                  <InputField
                    label="Annual gross capital gain"
                    hint="proceeds minus cost base"
                    value={annualCapitalGain}
                    onChange={(v) => setAnnualCapitalGain(Math.max(0, v))}
                    prefix="$"
                    step={1000}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      CGT 50% discount eligible?
                    </label>
                    <div className="flex gap-3">
                      {[
                        { val: false, label: "No" },
                        { val: true, label: "Yes (held > 12 months)" },
                      ].map(({ val, label }) => (
                        <button
                          key={String(val)}
                          onClick={() => setCapitalGainDiscountEligible(val)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            capitalGainDiscountEligible === val
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calculate CTA */}
            <button
              onClick={() => setActiveTab("results")}
              className="w-full px-6 py-3.5 bg-violet-600 text-white text-base font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl"
            >
              View Projection →
            </button>
          </div>
        )}

        {/* ══ RESULTS TAB ═══════════════════════════════════════════════════ */}
        {activeTab === "results" && (
          <div className="space-y-6">
            <ResultsPanel result={result} />

            {/* ── Save ──────────────────────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-3">
                Save this scenario
              </p>
              {persisted.scenarios.length >= MAX_SAVED ? (
                <p className="text-xs text-slate-500">
                  You have {MAX_SAVED} saved scenarios (the maximum). Delete one
                  to save a new one.
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="Scenario name"
                    maxLength={60}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === "saving"}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                      saveStatus === "saved"
                        ? "bg-emerald-600 text-white"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {saveStatus === "saving"
                      ? "Saving…"
                      : saveStatus === "saved"
                        ? "Saved!"
                        : "Save"}
                  </button>
                </div>
              )}
            </div>

            {/* ── Saved scenarios list ──────────────────────────────────────── */}
            {persisted.scenarios.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-3">
                  Saved Scenarios
                </p>
                <div className="space-y-2">
                  {persisted.scenarios.map((s, idx) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {s.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(s.summary.projectedSuperAtRetirement)}{" "}
                          projected ·{" "}
                          {s.summary.isOnTrack ? (
                            <span className="text-emerald-600 font-semibold">
                              On track
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold">
                              {formatCurrency(
                                Math.abs(s.summary.gapToTarget),
                              )}{" "}
                              gap
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleLoad(idx)}
                          className="text-xs font-semibold px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {persisted.scenarios.length >= 2 && (
                  <button
                    onClick={() => setActiveTab("compare")}
                    className="mt-3 w-full text-sm font-bold py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Compare saved scenarios →
                  </button>
                )}
              </div>
            )}

            {/* ── Back to inputs ─────────────────────────────────────────────── */}
            <button
              onClick={() => setActiveTab("inputs")}
              className="text-sm text-slate-500 hover:text-slate-700 font-semibold"
            >
              ← Edit inputs
            </button>
          </div>
        )}

        {/* ══ COMPARE TAB ═══════════════════════════════════════════════════ */}
        {activeTab === "compare" && (
          <div className="space-y-5">
            {!canCompare ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-600 mb-2">
                  Save at least 2 scenarios to compare them.
                </p>
                <button
                  onClick={() => setActiveTab("results")}
                  className="text-sm font-bold text-violet-600 hover:underline"
                >
                  Go to Results →
                </button>
              </div>
            ) : (
              <>
                {/* Scenario pickers */}
                <div className="grid grid-cols-2 gap-4">
                  {(
                    [
                      {
                        label: "Scenario A",
                        idx: compareIdxA,
                        setIdx: setCompareIdxA,
                        exclude: compareIdxB,
                      },
                      {
                        label: "Scenario B",
                        idx: compareIdxB,
                        setIdx: setCompareIdxB,
                        exclude: compareIdxA,
                      },
                    ] as const
                  ).map(({ label, idx, setIdx, exclude }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold text-slate-600 mb-1">
                        {label}
                      </p>
                      <select
                        value={idx}
                        onChange={(e) => setIdx(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      >
                        {persisted.scenarios.map((s, i) => (
                          <option
                            key={s.id}
                            value={i}
                            disabled={i === exclude}
                          >
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Compare table */}
                {compareA && compareB && (
                  <ComparePanel a={compareA} b={compareB} />
                )}
              </>
            )}
          </div>
        )}

        {/* ── General advice warning ─────────────────────────────────────────── */}
        <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
          <p className="text-[0.65rem] text-slate-400 mt-2 leading-relaxed">
            Projections use FY2026 tax rates and the nominal rates you enter.
            Actual outcomes depend on investment returns, future tax-law changes,
            and your personal circumstances. Contribution caps quoted are for
            FY2026 — verify with the ATO before acting. This tool does not model
            the Age Pension, LITO, HELP/HECS repayments, or capital losses.
          </p>
        </div>

        {/* ── Cross-links ────────────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/retirement-calculator"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Retirement Calculator →
          </Link>
          <Link
            href="/super-contributions-calculator"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Super Contributions Calculator →
          </Link>
          <Link
            href="/investment-income-tax-calculator"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Investment Income Tax Calculator →
          </Link>
          <Link
            href="/find-advisor"
            className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200"
          >
            Find an Adviser →
          </Link>
        </div>
      </div>
    </div>
  );
}
