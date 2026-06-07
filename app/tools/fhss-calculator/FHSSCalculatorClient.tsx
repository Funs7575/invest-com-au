"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { marginalRate } from "@/lib/tax/brackets";

// ─── FHSS maths ──────────────────────────────────────────────────────────────

const MAX_PER_YEAR = 15_000;
const MAX_TOTAL = 50_000;

function medicareLevy(income: number): number {
  if (income <= 26_000) return 0;
  return 0.02;
}

interface FHSSResult {
  totalContributions: number;
  totalReleasable: number;
  /** Assessable portion (85% of concessional) at marginal rate – 30% offset */
  taxOnWithdrawal: number;
  taxSavingVsAfterTax: number;
  yearsToMaximum: number;
  effectiveTaxRate: number;
}

function calcFHSS(
  annualConcessional: number,
  annualNonConcessional: number,
  years: number,
  annualIncome: number,
): FHSSResult {
  const concCapped = Math.min(annualConcessional, MAX_PER_YEAR);
  const nonConcCapped = Math.min(
    annualNonConcessional,
    Math.max(0, MAX_PER_YEAR - concCapped),
  );
  const annualTotal = concCapped + nonConcCapped;

  // FHSS release is capped at $50k lifetime across all years
  const totalConcessional = Math.min(concCapped * years, MAX_TOTAL);
  const totalNonConcessional = Math.min(
    nonConcCapped * years,
    Math.max(0, MAX_TOTAL - totalConcessional),
  );
  const totalReleasable = Math.min(
    totalConcessional + totalNonConcessional,
    MAX_TOTAL,
  );
  const totalContributions = annualTotal * years;

  const margRate = marginalRate(annualIncome) + medicareLevy(annualIncome);
  const TAX_OFFSET = 0.3;

  // Tax on withdrawal: 85% of concessional portion is assessable income
  // at (marginal rate - 30% offset)
  const assessable = totalConcessional * 0.85;
  const effectiveWithdrawalRate = Math.max(0, margRate - TAX_OFFSET);
  const taxOnWithdrawal = assessable * effectiveWithdrawalRate;

  // Tax saving vs saving the same amount after-tax each year
  // Outside super: pay marginal tax first, then save remainder
  const afterTaxEquivalent = annualTotal * (1 - margRate) * years;
  // Inside super via FHSS: pay 15% on concessional now
  const netFHSS = totalReleasable - taxOnWithdrawal;
  const taxSavingVsAfterTax = netFHSS - afterTaxEquivalent;

  const yearsToMaximum = annualTotal > 0 ? MAX_TOTAL / annualTotal : 0;

  return {
    totalContributions,
    totalReleasable,
    taxOnWithdrawal,
    taxSavingVsAfterTax,
    yearsToMaximum,
    effectiveTaxRate: margRate,
  };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Component ───────────────────────────────────────────────────────────────

// ATO resident rates 2024-25 (Stage 3)
const INCOME_OPTIONS = [
  { label: "Under $18,200", value: 18_200, rate: "0%" },
  { label: "$18,200 – $45,000", value: 40_000, rate: "16%" },
  { label: "$45,001 – $135,000", value: 90_000, rate: "30%" },
  { label: "$135,001 – $190,000", value: 160_000, rate: "37%" },
  { label: "Over $190,000", value: 200_000, rate: "45%" },
];

export default function FHSSCalculatorClient() {
  const [annualConc, setAnnualConc] = useState(10_000);
  const [annualNonConc, setAnnualNonConc] = useState(0);
  const [years, setYears] = useState(3);
  const [incomeIndex, setIncomeIndex] = useState(2);

  const income = INCOME_OPTIONS[incomeIndex]?.value ?? 90_000;
  const result = useMemo(
    () => calcFHSS(annualConc, annualNonConc, years, income),
    [annualConc, annualNonConc, years, income],
  );

  const cappedAnnual = Math.min(annualConc + annualNonConc, MAX_PER_YEAR);
  const yearsToMax = cappedAnnual > 0 ? Math.ceil(MAX_TOTAL / cappedAnnual) : 0;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:underline">Home</Link>
        {" / "}
        <Link href="/tools" className="hover:underline">Tools</Link>
        {" / "}
        <span className="text-slate-700">FHSS Calculator</span>
      </nav>

      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        First Home Super Saver (FHSS) Calculator
      </h1>
      <p className="text-slate-600 mb-8">
        Estimate how much deposit you could save via the FHSS scheme and how much tax you&apos;d save compared to saving outside super.
      </p>

      {/* Inputs */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6 space-y-6">
        <h2 className="font-semibold text-slate-800 text-lg">Your contributions</h2>

        {/* Annual concessional */}
        <div>
          <label htmlFor="fhss-conc" className="block text-sm font-medium text-slate-700 mb-1">
            Annual concessional contributions (salary sacrifice / personal deductible)
            <span className="ml-2 text-slate-400 font-normal">max $15,000/yr</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              id="fhss-conc"
              type="range"
              min={0}
              max={15_000}
              step={500}
              value={annualConc}
              onChange={(e) => setAnnualConc(Number(e.target.value))}
              className="flex-1 accent-violet-600"
            />
            <span className="w-28 text-right font-semibold text-violet-700">
              {fmt(annualConc)}/yr
            </span>
          </div>
        </div>

        {/* Annual non-concessional */}
        <div>
          <label htmlFor="fhss-non-conc" className="block text-sm font-medium text-slate-700 mb-1">
            Annual non-concessional contributions (after-tax personal)
            <span className="ml-2 text-slate-400 font-normal">up to $15,000 – concessional/yr</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              id="fhss-non-conc"
              type="range"
              min={0}
              max={Math.max(0, MAX_PER_YEAR - annualConc)}
              step={500}
              value={Math.min(annualNonConc, Math.max(0, MAX_PER_YEAR - annualConc))}
              onChange={(e) => setAnnualNonConc(Number(e.target.value))}
              className="flex-1 accent-violet-600"
            />
            <span className="w-28 text-right font-semibold text-violet-700">
              {fmt(Math.min(annualNonConc, Math.max(0, MAX_PER_YEAR - annualConc)))}/yr
            </span>
          </div>
        </div>

        {/* Years */}
        <div>
          <label htmlFor="fhss-years" className="block text-sm font-medium text-slate-700 mb-1">
            Years saving
          </label>
          <div className="flex items-center gap-4">
            <input
              id="fhss-years"
              type="range"
              min={1}
              max={10}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="flex-1 accent-violet-600"
            />
            <span className="w-28 text-right font-semibold text-violet-700">
              {years} {years === 1 ? "year" : "years"}
            </span>
          </div>
        </div>

        {/* Income bracket */}
        <div>
          <p className="block text-sm font-medium text-slate-700 mb-2">
            Annual income (determines marginal tax rate)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INCOME_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setIncomeIndex(i)}
                className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  incomeIndex === i
                    ? "border-violet-600 bg-violet-50 text-violet-800 font-semibold"
                    : "border-slate-200 text-slate-600 hover:border-violet-300"
                }`}
              >
                {opt.label}{" "}
                <span className="text-slate-400">({opt.rate})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-violet-900 text-lg mb-5">
          Your FHSS estimate
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <ResultCard
            label="FHSS amount releasable"
            value={fmt(result.totalReleasable)}
            highlight
          />
          <ResultCard
            label="Tax on withdrawal (est.)"
            value={fmt(result.taxOnWithdrawal)}
          />
          <ResultCard
            label="Net deposit after tax"
            value={fmt(result.totalReleasable - result.taxOnWithdrawal)}
            highlight
          />
          <ResultCard
            label="Tax saving vs outside super"
            value={
              result.taxSavingVsAfterTax >= 0
                ? `+${fmt(result.taxSavingVsAfterTax)}`
                : fmt(result.taxSavingVsAfterTax)
            }
            positive={result.taxSavingVsAfterTax > 0}
          />
        </div>

        {result.totalReleasable < MAX_TOTAL && cappedAnnual > 0 && (
          <p className="text-sm text-violet-700">
            At {fmt(cappedAnnual)}/year you&apos;d reach the ${(MAX_TOTAL / 1000).toFixed(0)}k maximum in{" "}
            <strong>{yearsToMax} {yearsToMax === 1 ? "year" : "years"}</strong>.
          </p>
        )}
        {result.totalReleasable >= MAX_TOTAL && (
          <p className="text-sm font-semibold text-violet-700">
            ✓ You&apos;ve reached the $50,000 FHSS maximum.
          </p>
        )}
      </section>

      {/* How it works */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">How the FHSS scheme works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
          <li>Make voluntary super contributions (salary sacrifice or personal deductible) up to $15,000/year.</li>
          <li>Contributions are taxed at 15% (vs your marginal rate of up to 47%).</li>
          <li>When ready to buy, request a FHSS determination from the ATO.</li>
          <li>The ATO releases your savings directly to you (allow 20+ business days).</li>
          <li>85% of concessional amounts are assessable income in the year received, minus a 30% tax offset.</li>
          <li>Use the funds as your home deposit — must be used within 12 months of release.</li>
        </ol>
        <p className="mt-3 text-sm text-slate-500">
          {/* // dated-ok — FHSS scheme start date; static legislative fact, never changes */}
          Maximum release: $50,000 from contributions made on or after 1 July 2017 + associated earnings.
          Non-concessional contributions can be released without tax on the principal (only earnings taxed).
        </p>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
        <h2 className="font-semibold text-slate-800 mb-2">Ready to start your FHSS strategy?</h2>
        <p className="text-sm text-slate-600 mb-4">
          Timing matters — contributions must be made before 30 June to count for that financial year.
          A mortgage broker or financial adviser can help you structure salary sacrifice and coordinate the FHSS release with your settlement date.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/find/mortgage-broker"
            className="inline-block bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
          >
            Find a Mortgage Broker
          </Link>
          <Link
            href="/first-home-buyer"
            className="inline-block border border-violet-600 text-violet-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-50 transition-colors"
          >
            First Home Buyer Hub →
          </Link>
        </div>
      </section>

      {/* Related tools */}
      <section className="mb-8">
        <h2 className="font-semibold text-slate-800 mb-3">Related tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Mortgage Calculator", href: "/mortgage-calculator" },
            { label: "Savings Calculator", href: "/savings-calculator" },
            { label: "Stamp Duty Calculator", href: "/tools/stamp-duty-calculator" },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="block border border-slate-200 rounded-lg p-3 text-sm text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              {t.label} →
            </Link>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </main>
  );
}

function ResultCard({
  label,
  value,
  highlight = false,
  positive,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
        {label}
      </p>
      <p
        className={`text-xl font-extrabold ${
          positive === true
            ? "text-emerald-700"
            : positive === false
              ? "text-red-600"
              : highlight
                ? "text-violet-900"
                : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
