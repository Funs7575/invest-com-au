"use client";

/**
 * DASP Calculator Client Component.
 *
 * Interactive form that drives computeDasp() from lib/calculators/dasp.ts.
 * Factual tax arithmetic only — headline withholding estimate, not personal
 * tax advice. DASP_WARNING + GENERAL_ADVICE_WARNING surfaced prominently.
 *
 * Inputs:
 *   - Taxed element (most accumulation-fund balances)
 *   - Untaxed element (some public-sector/defined-benefit funds — optional)
 *   - Tax-free component (non-concessional contributions — optional)
 *   - Working Holiday Maker toggle (subclass 417/462)
 *
 * Outputs (live-calculated):
 *   - Gross balance
 *   - Tax withheld (breakdown by component)
 *   - Net payment
 *   - Effective rate
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  computeDasp,
  DASP_TAXED_ELEMENT_RATE,
  DASP_UNTAXED_ELEMENT_RATE,
  DASP_WHM_RATE,
} from "@/lib/calculators/dasp";
import {
  DASP_WARNING,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

interface NumericInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

function NumericInput({ label, id, value, onChange, hint }: NumericInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-bold text-slate-700 mb-1"
      >
        {label}
      </label>
      {hint && (
        <p className="text-[0.65rem] text-slate-400 mb-1.5 leading-snug">
          {hint}
        </p>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
          $
        </span>
        <input
          id={id}
          type="number"
          min="0"
          step="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-white"
        />
      </div>
    </div>
  );
}

export default function DaspCalculatorClient() {
  const [taxed, setTaxed] = useState("50000");
  const [untaxed, setUntaxed] = useState("");
  const [taxFree, setTaxFree] = useState("");
  const [isWhm, setIsWhm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const result = useMemo(() => {
    return computeDasp({
      taxedElement: parseFloat(taxed) || 0,
      untaxedElement: parseFloat(untaxed) || 0,
      taxFreeComponent: parseFloat(taxFree) || 0,
      isWorkingHolidayMaker: isWhm,
    });
  }, [taxed, untaxed, taxFree, isWhm]);

  const hasBalance = result.grossBalance > 0;

  return (
    <div className="container-custom max-w-3xl py-10 md:py-14">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          ATO rates · Updated 2026
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
          DASP Calculator
          <span className="block text-amber-600">
            Departing Australia Superannuation Payment
          </span>
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Estimate the withholding tax deducted from your super when you leave
          Australia. Shows the taxed, untaxed, and tax-free components plus the
          net cash you receive. Factual arithmetic only — not personal tax advice.
        </p>
      </div>

      {/* DASP Warning */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <p className="text-xs font-extrabold text-red-700 mb-1">
          High withholding rates — read before you proceed
        </p>
        <p className="text-xs text-red-700 leading-relaxed">{DASP_WARNING}</p>
      </div>

      <div className="grid md:grid-cols-[1fr_1fr] gap-8 items-start">
        {/* ── Inputs ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900">
              Your super balance
            </h2>

            <NumericInput
              label="Taxed element ($)"
              id="taxed"
              value={taxed}
              onChange={setTaxed}
              hint="For most accumulation funds (employer SG + salary sacrifice + fund earnings), this is your entire account balance."
            />

            {/* WHM toggle */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWhm}
                  onChange={(e) => setIsWhm(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Working Holiday Maker (subclass 417 or 462)
                  </span>
                  <span className="text-[0.65rem] text-slate-400 leading-snug">
                    WHM DASP withholding is {(DASP_WHM_RATE * 100).toFixed(0)}% on the
                    entire taxable component — significantly higher than the standard{" "}
                    {(DASP_TAXED_ELEMENT_RATE * 100).toFixed(0)}%.
                  </span>
                </div>
              </label>
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700"
            >
              {showAdvanced ? "Hide" : "Show"} advanced components (untaxed /
              tax-free)
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <NumericInput
                  label="Untaxed element ($)"
                  id="untaxed"
                  value={untaxed}
                  onChange={setUntaxed}
                  hint={`Applies to some public-sector or defined-benefit funds. Standard rate: ${(DASP_UNTAXED_ELEMENT_RATE * 100).toFixed(0)}% (or ${(DASP_WHM_RATE * 100).toFixed(0)}% for WHM). If unsure, leave blank.`}
                />
                <NumericInput
                  label="Tax-free component ($)"
                  id="taxFree"
                  value={taxFree}
                  onChange={setTaxFree}
                  hint="Non-concessional (after-tax) contributions. Taxed at 0% — this amount passes through untouched."
                />
              </div>
            )}
          </div>

          {/* Rate reference */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[0.65rem] font-extrabold text-slate-500 uppercase tracking-wide mb-2">
              ATO DASP withholding rates (on or after 1 July 2017){/* // dated-ok — fixed legislative DASP rate-change date, never changes */}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left pb-1 font-semibold text-slate-500">Component</th>
                  <th className="text-right pb-1 font-semibold text-slate-500">Standard</th>
                  <th className="text-right pb-1 font-semibold text-amber-600">WHM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 text-slate-700">Tax-free component</td>
                  <td className="py-1.5 text-right text-slate-700">0%</td>
                  <td className="py-1.5 text-right text-amber-700">0%</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-700">Taxed element</td>
                  <td className="py-1.5 text-right text-slate-700">{(DASP_TAXED_ELEMENT_RATE * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-right font-bold text-amber-700">{(DASP_WHM_RATE * 100).toFixed(0)}%</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-slate-700">Untaxed element</td>
                  <td className="py-1.5 text-right text-slate-700">{(DASP_UNTAXED_ELEMENT_RATE * 100).toFixed(0)}%</td>
                  <td className="py-1.5 text-right font-bold text-amber-700">{(DASP_WHM_RATE * 100).toFixed(0)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Results ───────────────────────────────────────────────── */}
        <div>
          <div
            className={`bg-white border rounded-2xl p-5 transition-all ${
              hasBalance ? "border-amber-200 shadow-md shadow-amber-500/5" : "border-slate-200"
            }`}
          >
            <h2 className="text-sm font-extrabold text-slate-900 mb-4">
              Estimated result
            </h2>

            {!hasBalance ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Enter your super balance above to see the estimate.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Net payment — the headline number */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mb-2">
                  <p className="text-[0.65rem] font-bold text-amber-600 uppercase tracking-wide mb-1">
                    Estimated net DASP payment
                  </p>
                  <p className="text-3xl font-extrabold text-amber-700">
                    {fmt(result.netPayment)}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    after {pct(result.effectiveRate)} effective withholding
                  </p>
                </div>

                {/* Breakdown table */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Gross super balance</span>
                    <span className="font-semibold text-slate-900">{fmt(result.grossBalance)}</span>
                  </div>
                  {result.taxFreeComponent > 0 && (
                    <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Tax-free component (0% WHT)</span>
                      <span className="font-semibold text-green-700">{fmt(result.taxFreeComponent)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Taxable component</span>
                    <span className="font-semibold text-slate-900">{fmt(result.taxableComponent)}</span>
                  </div>
                  {result.taxOnTaxedElement > 0 && (
                    <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">
                        Tax on taxed element ({isWhm ? (DASP_WHM_RATE * 100).toFixed(0) : (DASP_TAXED_ELEMENT_RATE * 100).toFixed(0)}%)
                      </span>
                      <span className="font-semibold text-red-600">−{fmt(result.taxOnTaxedElement)}</span>
                    </div>
                  )}
                  {result.taxOnUntaxedElement > 0 && (
                    <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">
                        Tax on untaxed element ({isWhm ? (DASP_WHM_RATE * 100).toFixed(0) : (DASP_UNTAXED_ELEMENT_RATE * 100).toFixed(0)}%)
                      </span>
                      <span className="font-semibold text-red-600">−{fmt(result.taxOnUntaxedElement)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="font-bold text-slate-700">Total DASP withholding tax</span>
                    <span className="font-extrabold text-red-600">−{fmt(result.totalTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 mt-1">
                    <span className="font-extrabold text-slate-900">Net payment to you</span>
                    <span className="font-extrabold text-amber-700">{fmt(result.netPayment)}</span>
                  </div>
                </div>

                {/* WHM callout */}
                {result.isWorkingHolidayMaker && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-red-700 font-semibold">
                      WHM rate applied — 65% on the entire taxable component.
                      The government cannot reduce this rate; it is fixed by statute.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Next steps */}
          {hasBalance && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-slate-700">Next steps</p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>
                  <span className="text-slate-400 mr-1">→</span>
                  Check your fund for the component breakdown (contact your
                  super fund if unsure)
                </li>
                <li>
                  <span className="text-slate-400 mr-1">→</span>
                  Apply via the{" "}
                  <a
                    href="https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/leaving-australia-super/dasp-online-application"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:underline font-semibold"
                  >
                    ATO DASP portal
                  </a>{" "}
                  after your visa has ceased and you have departed Australia
                </li>
                <li>
                  <span className="text-slate-400 mr-1">→</span>
                  Most funds process claims in 28 days once the ATO has
                  validated your visa status
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-500 leading-relaxed">
          {GENERAL_ADVICE_WARNING}
        </p>
        <p className="text-xs text-slate-400 leading-relaxed mt-2">
          This calculator is an estimate based on ATO published rates (current
          for DASP payments on or after 1 July 2017){/* // dated-ok — fixed legislative DASP rate-change date, never changes */}. It does not model
          low-income offsets, proportioning rules, or fund-specific fees.
          Actual withholding may differ. Verify with your super fund and the
          ATO before relying on this figure.
        </p>
      </div>

      {/* Related tools */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/tools/withholding-tax-calculator"
          className="text-xs font-semibold text-amber-600 hover:text-amber-700"
        >
          Withholding Tax Calculator →
        </Link>
        <Link
          href="/foreign-investment/super"
          className="text-xs font-semibold text-amber-600 hover:text-amber-700"
        >
          Super & DASP guide →
        </Link>
        <Link
          href="/advisors/international-tax-specialists"
          className="text-xs font-semibold text-amber-600 hover:text-amber-700"
        >
          Find a tax specialist →
        </Link>
      </div>
    </div>
  );
}
