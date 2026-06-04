"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { incomeTax } from "@/lib/tax/brackets";

// ─── Maths ────────────────────────────────────────────────────────────────────

function monthlyRepayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

function netMonthly(grossAnnual: number): number {
  return (grossAnnual - incomeTax(grossAnnual) - grossAnnual * 0.02) / 12;
}

// Standard housing stress threshold per RBA / AHURI research
const HOUSING_STRESS = 0.3;
const SEVERE_STRESS = 0.4;
const RATE_OFFSETS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5] as const;

type StressStatus = "green" | "amber" | "red";

function stressStatus(pctOfGross: number): StressStatus {
  if (pctOfGross < HOUSING_STRESS) return "green";
  if (pctOfGross < SEVERE_STRESS) return "amber";
  return "red";
}

const STATUS_STYLES: Record<StressStatus, { bg: string; badge: string; label: string }> = {
  green: { bg: "bg-white border-gray-200", badge: "bg-emerald-100 text-emerald-700", label: "Comfortable" },
  amber: { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Housing stress" },
  red: { bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", label: "Severe stress" },
};

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MortgageStressTestClient() {
  const [loanAmount, setLoanAmount] = useState(600_000);
  const [currentRate, setCurrentRate] = useState(6.2);
  const [remainingYears, setRemainingYears] = useState(25);
  const [grossIncome, setGrossIncome] = useState(100_000);
  const [partnerIncome, setPartnerIncome] = useState(0);

  const grossHousehold = grossIncome + partnerIncome;
  const netHouseholdMonthly = netMonthly(grossIncome) + (partnerIncome > 0 ? netMonthly(partnerIncome) : 0);
  const months = remainingYears * 12;
  const baseRate = currentRate / 100;

  const { scenarios, breakevenRate } = useMemo(() => {
    const computed = RATE_OFFSETS.map((offset) => {
      const rate = baseRate + offset / 100;
      const monthly = loanAmount > 0 && months > 0 ? monthlyRepayment(loanAmount, rate, months) : 0;
      const annual = monthly * 12;
      const pctOfGross = grossHousehold > 0 ? annual / grossHousehold : 0;
      const pctOfNet = netHouseholdMonthly > 0 ? monthly / netHouseholdMonthly : 0;
      const buffer = netHouseholdMonthly - monthly;
      return {
        offset,
        rate,
        monthly,
        pctOfGross,
        pctOfNet,
        buffer,
        status: stressStatus(pctOfGross),
        isApra: offset === 3,
      };
    });

    // Binary search for the rate at which repayments hit 30% of gross income
    let bkr: number | null = null;
    if (grossHousehold > 0 && loanAmount > 0 && months > 0) {
      const targetMonthly = (grossHousehold * HOUSING_STRESS) / 12;
      let lo = 0,
        hi = 0.3;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        monthlyRepayment(loanAmount, mid, months) < targetMonthly ? (lo = mid) : (hi = mid);
      }
      const rate = ((lo + hi) / 2) * 100;
      if (rate > currentRate + 0.01) bkr = rate;
    }

    return { scenarios: computed, breakevenRate: bkr };
  }, [loanAmount, baseRate, months, grossHousehold, netHouseholdMonthly, currentRate]);

  const current = scenarios[0];
  const apra = scenarios[6]; // offset = 3

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mortgage Stress Test Calculator</h1>
      <p className="text-gray-600 mb-8 text-sm">
        See how your repayments change as rates rise — and when you hit housing stress (30% of gross
        income). APRA requires lenders to assess borrowers at their rate plus a 3% buffer.
      </p>

      {/* Inputs */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-lg">Your mortgage details</h2>

        <NumberField
          id="mst-loan"
          label="Remaining loan balance"
          prefix="$"
          value={loanAmount}
          onChange={setLoanAmount}
          step={10_000}
          max={5_000_000}
        />

        <NumberField
          id="mst-rate"
          label="Current interest rate"
          suffix="% p.a."
          value={currentRate}
          onChange={setCurrentRate}
          step={0.05}
          max={25}
          decimals={2}
        />

        <div>
          <label htmlFor="mst-term" className="block text-sm font-medium text-gray-700 mb-1">
            Remaining loan term
          </label>
          <div className="flex items-center gap-3">
            <input
              id="mst-term"
              type="range"
              min={1}
              max={30}
              step={1}
              value={remainingYears}
              onChange={(e) => setRemainingYears(Number(e.target.value))}
              className="flex-1 accent-emerald-600"
            />
            <span className="w-20 text-right text-sm font-medium text-gray-900">{remainingYears} years</span>
          </div>
        </div>

        <NumberField
          id="mst-income"
          label="Your gross annual income"
          prefix="$"
          value={grossIncome}
          onChange={setGrossIncome}
          step={5_000}
          max={2_000_000}
        />

        <NumberField
          id="mst-income2"
          label="Partner gross annual income (0 if single)"
          prefix="$"
          value={partnerIncome}
          onChange={setPartnerIncome}
          step={5_000}
          max={2_000_000}
          hint="Combined income used for housing-stress percentage"
        />
      </section>

      {/* Summary */}
      {current && apra && (
        <section className="grid grid-cols-2 gap-4 mb-6">
          <SummaryCard
            label="Current repayment"
            value={fmt(current.monthly)}
            sub={`${(current.pctOfGross * 100).toFixed(1)}% of gross income`}
            status={current.status}
          />
          <SummaryCard
            label="APRA rate (+3%)"
            value={fmt(apra.monthly)}
            sub={`${(apra.pctOfGross * 100).toFixed(1)}% of gross income`}
            status={apra.status}
            highlight
          />
        </section>
      )}

      {/* Breakeven callout */}
      {breakevenRate !== null ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-sm">
          <span className="font-medium text-gray-800">Housing-stress breakeven: </span>
          <span className="font-bold text-gray-900">{breakevenRate.toFixed(2)}% p.a.</span>
          <span className="text-gray-500">
            {" "}
            — rates would need to rise by {(breakevenRate - currentRate).toFixed(2)}pp before your repayments hit 30%
            of gross income.
          </span>
        </div>
      ) : current && current.pctOfGross >= HOUSING_STRESS ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          ⚠️ Your repayments already exceed 30% of gross income at the current rate — you are in housing
          stress now.
        </div>
      ) : null}

      {/* Rate scenarios */}
      <section className="mb-6">
        <h2 className="font-semibold text-gray-800 text-lg mb-3">Rate scenarios</h2>
        <div className="space-y-2">
          {scenarios.map((s) => {
            const style = STATUS_STYLES[s.status];
            return (
              <div
                key={s.offset}
                className={`border rounded-xl p-4 ${style.bg} ${s.isApra ? "ring-2 ring-blue-300" : ""}`}
              >
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">
                      {s.offset === 0 ? "Current" : `+${s.offset}%`} —{" "}
                      {(s.rate * 100).toFixed(2)}% p.a.
                    </span>
                    {s.isApra && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                        APRA buffer
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                      {style.label}
                    </span>
                  </div>
                  <span className="font-bold text-gray-900">
                    {fmt(s.monthly)}
                    <span className="text-xs font-normal text-gray-500">/mo</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Stat
                    label="% gross income"
                    value={`${(s.pctOfGross * 100).toFixed(1)}%`}
                    warn={s.status !== "green"}
                  />
                  <Stat label="% net income" value={`${(s.pctOfNet * 100).toFixed(1)}%`} />
                  <Stat label="Monthly buffer" value={fmt(s.buffer)} warn={s.buffer < 0} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <p className="font-medium mb-1">⚠️ Estimates only</p>
        <p>
          Housing stress (30% of gross) is a commonly used benchmark from RBA and AHURI research. This
          calculator covers P&amp;I repayments only — rates, insurance, strata, and maintenance are
          excluded. Tax uses FY2025-26 marginal rates + Medicare levy. Speak with a mortgage broker for a
          full affordability assessment.
        </p>
      </div>

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/tools/borrowing-power-calculator"
          className="flex flex-col items-start bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 mb-1">Related calculator</span>
          <span className="font-semibold text-gray-900 text-sm">Borrowing Power Calculator →</span>
          <span className="text-xs text-gray-500 mt-0.5">How much can you borrow across 3 lender types?</span>
        </Link>
        <Link
          href="/find/mortgage-broker"
          className="flex flex-col items-start bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-400 transition-colors"
        >
          <span className="text-xs font-medium text-emerald-700 mb-1">Talk to a professional</span>
          <span className="font-semibold text-gray-900 text-sm">Find a mortgage broker →</span>
          <span className="text-xs text-gray-500 mt-0.5">Free service, compare 30+ lenders</span>
        </Link>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumberField({
  id,
  label,
  prefix,
  suffix,
  value,
  onChange,
  step,
  max,
  decimals = 0,
  hint,
}: {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  max: number;
  decimals?: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-gray-400 text-sm pointer-events-none">{prefix}</span>
        )}
        <input
          id={id}
          type="number"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(decimals > 0 ? v : Math.max(0, Math.round(v)));
          }}
          className={`w-full border border-gray-300 rounded-lg ${prefix ? "pl-7" : "px-4"} ${suffix ? "pr-20" : "pr-4"} py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500`}
        />
        {suffix && (
          <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  status,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  status: StressStatus;
  highlight?: boolean;
}) {
  const style = STATUS_STYLES[status];
  return (
    <div className={`border rounded-xl p-4 ${style.bg} ${highlight ? "ring-2 ring-blue-300" : ""}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}<span className="text-sm font-normal text-gray-500">/mo</span></p>
      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
        {sub}
      </span>
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
