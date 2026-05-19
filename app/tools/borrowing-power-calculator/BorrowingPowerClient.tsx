"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

// ─── Australian lending maths (FY2025-26) ────────────────────────────────────

/** FY2025-26 marginal tax rates excl. Medicare. */
function incomeTax(gross: number): number {
  if (gross <= 18_200) return 0;
  if (gross <= 45_000) return (gross - 18_200) * 0.19;
  if (gross <= 135_000) return 5_092 + (gross - 45_000) * 0.325;
  if (gross <= 190_000) return 29_467 + (gross - 135_000) * 0.37;
  return 51_667 + (gross - 190_000) * 0.45;
}

function netMonthly(grossAnnual: number): number {
  const medicare = grossAnnual * 0.02;
  return (grossAnnual - incomeTax(grossAnnual) - medicare) / 12;
}

/** Household Expenditure Measure (HEM) monthly approximation. */
function hemMonthly(dependents: number, isCouple: boolean): number {
  const base = isCouple ? 3_000 : 2_000;
  return base + dependents * 500;
}

/** Monthly repayment for principal P, annual rate r, n months. */
function monthlyRepayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

/** Maximum principal given a max monthly repayment at assessment rate. */
function maxPrincipal(maxMonthlyRepayment: number, annualRate: number, months: number): number {
  if (maxMonthlyRepayment <= 0) return 0;
  if (annualRate === 0) return maxMonthlyRepayment * months;
  const r = annualRate / 12;
  return maxMonthlyRepayment * ((1 - Math.pow(1 + r, -months)) / r);
}

interface LenderScenario {
  label: string;
  badge: string;
  badgeColor: string;
  description: string;
  /** Annual assessment rate used to work backwards to max principal. */
  assessmentRate: number;
  /** Advertised rate used for repayment illustration. */
  advertisedRate: number;
  /** HEM multiplier vs base HEM. */
  hemMultiplier: number;
  /** Credit card factor: portion of limit treated as monthly commitment. */
  ccFactor: number;
}

const SCENARIOS: LenderScenario[] = [
  {
    label: "Conservative bank",
    badge: "Major ADI",
    badgeColor: "bg-slate-100 text-slate-700",
    description: "Full HEM, 3.8% of CC limit as monthly cost, 3% APRA buffer",
    assessmentRate: 0.092,
    advertisedRate: 0.062,
    hemMultiplier: 1.0,
    ccFactor: 0.038,
  },
  {
    label: "Standard bank",
    badge: "Mid-tier bank",
    badgeColor: "bg-blue-100 text-blue-700",
    description: "Standard HEM, 3% of CC limit, 3% APRA buffer",
    assessmentRate: 0.092,
    advertisedRate: 0.060,
    hemMultiplier: 0.92,
    ccFactor: 0.030,
  },
  {
    label: "Specialist lender",
    badge: "Non-bank",
    badgeColor: "bg-emerald-100 text-emerald-700",
    description: "Reduced HEM for documented low spenders, actual CC repayments, 2.5% buffer",
    assessmentRate: 0.085,
    advertisedRate: 0.063,
    hemMultiplier: 0.82,
    ccFactor: 0.02,
  },
];

const LOAN_TERMS = [25, 30] as const;

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

function fmtPct(r: number) {
  return (r * 100).toFixed(2) + "% p.a.";
}

export default function BorrowingPowerClient() {
  const [income1, setIncome1] = useState(100_000);
  const [income2, setIncome2] = useState(0);
  const [deposit, setDeposit] = useState(100_000);
  const [ccLimit, setCcLimit] = useState(10_000);
  const [monthlyDebt, setMonthlyDebt] = useState(0);
  const [dependents, setDependents] = useState(0);
  const [loanTermYears, setLoanTermYears] = useState<25 | 30>(30);

  const isCouple = income2 > 0;
  const loanMonths = loanTermYears * 12;

  const results = useMemo(() => {
    const totalNetMonthly = netMonthly(income1) + (isCouple ? netMonthly(income2) : 0);

    return SCENARIOS.map((s) => {
      const hem = hemMonthly(dependents, isCouple) * s.hemMultiplier;
      const ccCommitment = ccLimit * s.ccFactor;
      const maxRepayment = totalNetMonthly - hem - ccCommitment - monthlyDebt;

      const borrowingLimit = Math.max(0, maxPrincipal(maxRepayment, s.assessmentRate, loanMonths));
      const purchasePrice = borrowingLimit + deposit;
      const lvr = purchasePrice > 0 ? (borrowingLimit / purchasePrice) * 100 : 0;
      const needsLmi = lvr > 80;
      const actualRepayment = borrowingLimit > 0
        ? monthlyRepayment(borrowingLimit, s.advertisedRate, loanMonths)
        : 0;

      return { ...s, borrowingLimit, purchasePrice, lvr, needsLmi, actualRepayment, maxRepayment: Math.max(0, maxRepayment) };
    });
  }, [income1, income2, deposit, ccLimit, monthlyDebt, dependents, loanMonths, isCouple]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Borrowing Power Calculator</h1>
      <p className="text-gray-600 mb-8 text-sm">
        Estimates how much you can borrow across three lender types. Uses APRA-mandated assessment
        rates + Household Expenditure Measure (HEM). Results are indicative only.
      </p>

      {/* Inputs */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-lg">Your financial details</h2>

        <InputField
          id="bp-income1"
          label="Your gross annual income"
          prefix="$"
          value={income1}
          onChange={setIncome1}
          step={5000}
          max={2_000_000}
        />

        <InputField
          id="bp-income2"
          label="Partner gross annual income (leave 0 if single)"
          prefix="$"
          value={income2}
          onChange={setIncome2}
          step={5000}
          max={2_000_000}
          hint="Set above 0 to calculate as a couple"
        />

        <InputField
          id="bp-deposit"
          label="Deposit saved"
          prefix="$"
          value={deposit}
          onChange={setDeposit}
          step={5000}
          max={5_000_000}
          hint="Affects LVR and LMI requirement"
        />

        <InputField
          id="bp-cc"
          label="Total credit card limits (all cards)"
          prefix="$"
          value={ccLimit}
          onChange={setCcLimit}
          step={1000}
          max={500_000}
          hint="Lenders count a % of limits regardless of actual balance"
        />

        <InputField
          id="bp-debt"
          label="Other monthly debt repayments"
          prefix="$"
          value={monthlyDebt}
          onChange={setMonthlyDebt}
          step={100}
          max={20_000}
          hint="HECS, car loan, personal loans (monthly)"
        />

        <div>
          <label htmlFor="bp-dependents" className="block text-sm font-medium text-gray-700 mb-1">
            Number of dependents
          </label>
          <input
            id="bp-dependents"
            type="number"
            min={0}
            max={10}
            step={1}
            value={dependents}
            onChange={(e) => setDependents(Math.max(0, Number(e.target.value)))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Loan term</span>
          <div className="flex gap-4">
            {LOAN_TERMS.map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bp-term"
                  checked={loanTermYears === t}
                  onChange={() => setLoanTermYears(t)}
                  className="accent-emerald-600"
                />
                <span className="text-sm text-gray-700">{t} years</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="space-y-4 mb-6">
        <h2 className="font-semibold text-gray-800 text-lg">Estimated borrowing power</h2>
        {results.map((r) => (
          <div key={r.label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-gray-900">{r.label}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${r.badgeColor}`}>{r.badge}</span>
              </div>
              <span className="text-xl font-bold text-emerald-700">{fmt(r.borrowingLimit)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">{r.description}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Purchase price" value={fmt(r.purchasePrice)} />
              <Stat label="Monthly repayment" value={`${fmt(r.actualRepayment)}/mo`} />
              <Stat label="LVR" value={`${r.lvr.toFixed(1)}%`} />
              <Stat
                label="LMI"
                value={r.needsLmi ? "Required (>80% LVR)" : "Not required"}
                warn={r.needsLmi}
              />
              <Stat label="Advertised rate" value={fmtPct(r.advertisedRate)} />
              <Stat label="Assessment rate" value={fmtPct(r.assessmentRate)} />
            </div>
            {r.borrowingLimit === 0 && (
              <p className="text-xs text-amber-700 mt-2">
                ⚠️ Insufficient surplus income after expenses and debt — reduce debts or increase deposit.
              </p>
            )}
          </div>
        ))}
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <p className="font-medium mb-1">⚠️ These are estimates only</p>
        <p>Actual borrowing power varies by lender. Figures assume HEM living expenses — if you have higher
        expenses or other commitments not listed, your limit will be lower. Talk to a mortgage broker for
        a lender-specific pre-approval.</p>
      </div>

      {/* CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/find/mortgage-broker"
          className="flex flex-col items-start bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 mb-1">Get pre-approval</span>
          <span className="font-semibold text-gray-900 text-sm">Find a mortgage broker →</span>
          <span className="text-xs text-gray-500 mt-0.5">Free service, compare 30+ lenders</span>
        </Link>
        <Link
          href="/first-home-buyer"
          className="flex flex-col items-start bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 mb-1">First home buyer hub</span>
          <span className="font-semibold text-gray-900 text-sm">FHSS, grants, stamp duty →</span>
          <span className="text-xs text-gray-500 mt-0.5">Everything in one place</span>
        </Link>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </main>
  );
}

function InputField({
  id,
  label,
  prefix,
  value,
  onChange,
  step,
  max,
  hint,
}: {
  id: string;
  label: string;
  prefix?: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  max: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>
        )}
        <input
          id={id}
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className={`w-full border border-gray-300 rounded-lg ${prefix ? "pl-7" : "px-4"} pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
        />
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <span className="text-xs text-gray-500 block">{label}</span>
      <span className={`text-sm font-medium ${warn ? "text-amber-700" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}
