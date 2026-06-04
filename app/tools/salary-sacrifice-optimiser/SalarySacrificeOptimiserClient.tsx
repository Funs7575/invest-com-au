"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { incomeTax, marginalRate as marginalRateOf } from "@/lib/tax/brackets";

// ─── FY2025-26 tax constants ──────────────────────────────────────────────────

const SG_RATE = 0.115;
const CONCESSIONAL_CAP = 30_000;
const DIV293_THRESHOLD = 250_000;

function medicare(gross: number): number {
  if (gross <= 26_000) return 0;
  if (gross <= 32_500) return (gross - 26_000) * 0.1;
  return gross * 0.02;
}

function totalTax(gross: number): number {
  return incomeTax(gross) + medicare(gross);
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalarySacrificeOptimiserClient() {
  const [grossSalary, setGrossSalary] = useState("100000");
  const [sacrificeAmount, setSacrificeAmount] = useState("10000");
  const [includeEmployerSg, setIncludeEmployerSg] = useState(true);

  const r = useMemo(() => {
    const gross = parseFloat(grossSalary.replace(/,/g, "")) || 0;
    const rawSacrifice = parseFloat(sacrificeAmount.replace(/,/g, "")) || 0;
    const employerSg = includeEmployerSg ? Math.round(gross * SG_RATE) : 0;

    // Cap enforcement
    const maxSacrifice = Math.max(0, CONCESSIONAL_CAP - employerSg);
    const sacrifice = Math.min(rawSacrifice, maxSacrifice);
    const capExceeded = rawSacrifice > maxSacrifice;
    const totalConcessional = employerSg + sacrifice;
    const capRoom = Math.max(0, CONCESSIONAL_CAP - totalConcessional);

    const taxableBefore = gross;
    const taxableAfter = gross - sacrifice;

    const taxBefore = totalTax(taxableBefore);
    const taxAfter = totalTax(taxableAfter);

    const takehomeBefore = gross - taxBefore;
    const takehomeAfter = taxableAfter - taxAfter;

    const incomeTaxSaving = taxBefore - taxAfter;
    const superTaxRate = gross + sacrifice > DIV293_THRESHOLD ? 0.30 : 0.15;
    const superTax = sacrifice * superTaxRate;
    const netGain = incomeTaxSaving - superTax; // pure dollar benefit

    const margRate = marginalRateOf(gross);
    const div293 = gross + sacrifice > DIV293_THRESHOLD;

    return {
      gross, sacrifice, rawSacrifice, employerSg, capExceeded,
      totalConcessional, capRoom, taxBefore, taxAfter,
      takehomeBefore, takehomeAfter,
      takehomeDelta: takehomeAfter - takehomeBefore, // negative = less take-home
      incomeTaxSaving, superTax, superTaxRate, netGain,
      margRate, div293,
    };
  }, [grossSalary, sacrificeAmount, includeEmployerSg]);

  const showResults = r.gross > 0 && r.rawSacrifice > 0;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900">Your details (FY2025-26)</h2>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Gross annual salary
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
            <input
              type="number"
              min={0}
              step={5000}
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="100000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Annual salary sacrifice (pre-tax)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">$</span>
            <input
              type="number"
              min={0}
              step={500}
              value={sacrificeAmount}
              onChange={(e) => setSacrificeAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="10000"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeEmployerSg}
            onChange={(e) => setIncludeEmployerSg(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-emerald-600 shrink-0"
          />
          <span className="text-sm text-slate-700">
            Count employer SG ({(SG_RATE * 100).toFixed(1)}% = {fmt(r.employerSg)}/yr) toward the{" "}
            {fmt(CONCESSIONAL_CAP)} concessional cap
          </span>
        </label>
      </div>

      {/* Cap warning */}
      {r.capExceeded && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Concessional cap capped at {fmt(CONCESSIONAL_CAP)}.</strong> Your requested sacrifice of{" "}
          {fmt(r.rawSacrifice)} plus employer SG of {fmt(r.employerSg)} would exceed the limit. Results use the
          maximum effective sacrifice of {fmt(r.sacrifice)}.
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          {/* Headline cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="text-2xl font-extrabold text-emerald-700">{fmt(r.incomeTaxSaving)}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Income tax saving / yr</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-2xl font-extrabold text-slate-700">{fmt(r.superTax)}</div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">
                Super contributions tax ({(r.superTaxRate * 100).toFixed(0)}%)
              </div>
            </div>
            <div className={`rounded-xl p-4 ${r.netGain >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
              <div className={`text-2xl font-extrabold ${r.netGain >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {fmt(r.netGain)}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-0.5">Net annual tax advantage</div>
            </div>
          </div>

          {/* Before vs after */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-4 py-3 border-b border-slate-100">
              <div>Item</div>
              <div className="text-right">Before sacrifice</div>
              <div className="text-right">After sacrifice</div>
            </div>
            {([
              ["Taxable income", r.gross, r.gross - r.sacrifice],
              ["Income tax + Medicare", r.taxBefore, r.taxAfter],
              ["Take-home pay", r.takehomeBefore, r.takehomeAfter],
              ["Super (employer SG)", r.employerSg, r.employerSg],
              ["Super (sacrifice, gross)", 0, r.sacrifice],
            ] as [string, number, number][]).map(([label, before, after]) => (
              <div
                key={label}
                className="grid grid-cols-3 text-sm border-b border-slate-50 last:border-0 px-4 py-3"
              >
                <div className="text-slate-600">{label}</div>
                <div className="text-right font-semibold text-slate-900">{fmt(before)}</div>
                <div className={`text-right font-semibold ${after !== before ? "text-emerald-700" : "text-slate-900"}`}>
                  {fmt(after)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 text-sm">
            <h3 className="font-bold text-slate-900 mb-1">How the saving works</h3>
            <Row label="You sacrifice (gross, pre-tax)" value={fmt(r.sacrifice)} />
            <Row label="Your take-home decreases by" value={fmt(-r.takehomeDelta)} dim />
            <Row label="Income tax you save" value={fmt(r.incomeTaxSaving)} green />
            <Row label={`Super contributions tax (${(r.superTaxRate * 100).toFixed(0)}%)`} value={`−${fmt(r.superTax)}`} dim />
            <div className="border-t border-slate-100 pt-2.5">
              <Row label="Net annual advantage" value={fmt(r.netGain)} bold green={r.netGain >= 0} />
            </div>
            <div className="pt-1 space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Your marginal rate</span>
                <span className="font-medium">{(r.margRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Concessional cap remaining</span>
                <span className={`font-medium ${r.capRoom === 0 ? "text-amber-600" : ""}`}>
                  {r.capRoom === 0 ? "Cap reached" : fmt(r.capRoom)}
                </span>
              </div>
            </div>
          </div>

          {r.div293 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>Division 293 applies.</strong> Your income + sacrifice exceeds {fmt(DIV293_THRESHOLD)}, so your
              super contributions are taxed at 30% (not 15%). Salary sacrifice still saves you{" "}
              {fmt(r.netGain)} per year, but the advantage per dollar is smaller.
            </div>
          )}

          {/* CTA */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-emerald-900 mb-1">
              Maximise your concessional contributions strategy
            </p>
            <p className="text-xs text-emerald-700 mb-3">
              A financial adviser can combine salary sacrifice with carry-forward unused cap, personal deductible
              contributions, and spouse contributions for your situation.
            </p>
            <Link
              href="/advisors/financial-planners"
              className="inline-block bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Find a Financial Adviser
            </Link>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </div>
  );
}

function Row({
  label,
  value,
  dim,
  green,
  bold,
}: {
  label: string;
  value: string;
  dim?: boolean;
  green?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={dim ? "text-slate-400" : "text-slate-600"}>{label}</span>
      <span
        className={[
          bold ? "font-bold" : "font-semibold",
          green ? "text-emerald-700" : dim ? "text-slate-400" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
