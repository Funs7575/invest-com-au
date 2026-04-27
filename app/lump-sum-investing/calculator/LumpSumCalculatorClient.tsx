"use client";

import { useState, useMemo } from "react";
import HubLeadForm from "@/components/leads/HubLeadForm";
import { formatAUD } from "@/lib/currency";

const TAX_OPTIONS = [
  { id: "none",   label: "No tax (super pension)",  rate: 0 },
  { id: "smsf",   label: "SMSF accumulation (15%)", rate: 0.15 },
  { id: "32.5",   label: "32.5% marginal",          rate: 0.325 },
  { id: "37",     label: "37% marginal",            rate: 0.37 },
  { id: "45",     label: "45% marginal",            rate: 0.45 },
];

function project(initial: number, monthly: number, annualRate: number, years: number, taxRate: number) {
  const months = years * 12;
  const grossMonthlyRate = annualRate / 100 / 12;
  // Apply tax to the gross return at end of each year — simplification but reasonable for a UI calc.
  let bal = initial;
  let contributed = initial;
  for (let m = 1; m <= months; m++) {
    const grossInterest = bal * grossMonthlyRate;
    const netInterest = grossInterest * (1 - taxRate);
    bal = bal + netInterest + monthly;
    contributed += monthly;
  }
  // Subtract final-month contribution since it earns no return
  return {
    final: bal,
    contributed,
    growth: bal - contributed,
  };
}

export default function LumpSumCalculatorClient() {
  const [lumpSum, setLumpSum] = useState<number>(100_000);
  const [monthly, setMonthly] = useState<number>(0);
  const [returnRate, setReturnRate] = useState<number>(7);
  const [years, setYears] = useState<number>(15);
  const [taxId, setTaxId] = useState<string>("32.5");

  const tax = useMemo(() => TAX_OPTIONS.find((t) => t.id === taxId) || TAX_OPTIONS[2]!, [taxId]);

  const main = useMemo(() => project(lumpSum, monthly, returnRate, years, tax.rate), [lumpSum, monthly, returnRate, years, tax]);
  const conservative = useMemo(() => project(lumpSum, monthly, Math.max(0, returnRate - 3), years, tax.rate), [lumpSum, monthly, returnRate, years, tax]);
  const optimistic = useMemo(() => project(lumpSum, monthly, returnRate + 3, years, tax.rate), [lumpSum, monthly, returnRate, years, tax]);

  const maxFinal = Math.max(main.final, conservative.final, optimistic.final);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Lump sum (AUD)</span>
            <input type="number" min={0} step={5_000} value={lumpSum} onChange={(e) => setLumpSum(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Monthly contribution (AUD)</span>
            <input type="number" min={0} step={100} value={monthly} onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
              <span>Expected annual return</span>
              <span className="text-amber-600 normal-case font-extrabold text-sm">{returnRate}%</span>
            </span>
            <input type="range" min={3} max={12} step={0.5} value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))} className="w-full accent-amber-500" />
          </label>
          <label className="block">
            <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
              <span>Investment timeframe</span>
              <span className="text-amber-600 normal-case font-extrabold text-sm">{years} years</span>
            </span>
            <input type="range" min={1} max={30} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-amber-500" />
          </label>
          <label className="block md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Tax on returns</span>
            <select value={taxId} onChange={(e) => setTaxId(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
              {TAX_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
          <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Final balance after {years} years</p>
          <p className="text-4xl md:text-5xl font-extrabold mt-1" style={{ color: "#EAB308" }}>{formatAUD(main.final)}</p>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total contributed</p>
              <p className="text-lg font-extrabold mt-1">{formatAUD(main.contributed)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total growth</p>
              <p className="text-lg font-extrabold mt-1 text-emerald-400">{formatAUD(main.growth)}</p>
            </div>
          </div>
        </div>

        {/* Three-scenario comparison */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 mb-3">Sensitivity — three return scenarios</h3>
          <div className="space-y-2">
            {[
              { label: `Conservative (${Math.max(0, returnRate - 3)}%)`, value: conservative.final, color: "bg-slate-400" },
              { label: `Base case (${returnRate}%)`, value: main.final, color: "bg-amber-500" },
              { label: `Optimistic (${returnRate + 3}%)`, value: optimistic.final, color: "bg-emerald-500" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>{s.label}</span>
                  <span>{formatAUD(s.value)}</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} transition-all`} style={{ width: `${maxFinal > 0 ? (s.value / maxFinal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Estimate only. Real-world returns are volatile and not constant. Inflation is not modelled — use a real return (after expected inflation) for purchasing-power outputs.
        </p>
      </div>

      <HubLeadForm
        heading="Find a financial planner to maximise your lump sum"
        subheading="Wrapper choice (super, SMSF, personal, family trust) often matters more than the underlying investment selection."
        intent={{ need: "planning", context: ["retirement"] }}
        source="lump_sum_calculator"
        ctaLabel="Find a financial planner"
      />
    </div>
  );
}
