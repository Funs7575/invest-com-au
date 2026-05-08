"use client";

import { useState, useMemo } from "react";
import CalculatorShell from "@/components/CalculatorShell";
import HubLeadForm from "@/components/leads/HubLeadForm";
import { formatAUD } from "@/lib/currency";

const SMALL_CO_OFFSET = 0.435;   // refundable, < $20M turnover
const LARGE_CO_OFFSET = 0.385;   // non-refundable, > $20M turnover (simplified)

const ELIGIBLE_ACTIVITIES: Array<{ id: string; label: string; eligible: boolean }> = [
  { id: "novel-algo",    label: "Novel algorithm or AI/ML model development",          eligible: true },
  { id: "uncertain",     label: "Technical uncertainty in the software outcome",       eligible: true },
  { id: "data-pipeline", label: "Custom data pipeline or integration R&D",             eligible: true },
  { id: "experimental",  label: "Experimental trading or backtesting systems",         eligible: true },
  { id: "modelling",     label: "New financial-modelling methodologies",               eligible: true },
  { id: "ui",            label: "Routine UI / page development",                       eligible: false },
  { id: "api",           label: "Standard API integrations",                           eligible: false },
  { id: "content",       label: "Content writing or SEO",                              eligible: false },
  { id: "compliance",    label: "Regulatory compliance testing",                       eligible: false },
];

export default function RdTaxCalculator() {
  const [turnover, setTurnover] = useState<number>(2_000_000);
  const [devSpend, setDevSpend] = useState<number>(500_000);
  const [eligiblePct, setEligiblePct] = useState<number>(40);
  const [activities, setActivities] = useState<Set<string>>(new Set(["novel-algo", "uncertain", "data-pipeline"]));

  const calc = useMemo(() => {
    const eligibleSpend = devSpend * (eligiblePct / 100);
    const isSmallCo = turnover < 20_000_000;
    const offsetRate = isSmallCo ? SMALL_CO_OFFSET : LARGE_CO_OFFSET;
    const refund = eligibleSpend * offsetRate;
    return {
      eligibleSpend,
      refund,
      isSmallCo,
      offsetRate,
    };
  }, [turnover, devSpend, eligiblePct]);

  function toggleActivity(id: string) {
    setActivities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <CalculatorShell
      title="R&D Tax Incentive Calculator"
      iconName="calculator"
      disclaimer="Estimate only. Actual refund depends on AusIndustry assessment, allowable expenditure rules, related-party adjustments and your final tax position. General information — not tax advice."
      leadForm={
        <HubLeadForm
          heading="Get a free assessment from a registered R&D tax advisor"
          subheading="A specialist will review your activities, validate the eligible percentage, and structure your records before lodgement."
          intent={{ need: "tax", context: ["tax_optimization"] }}
          source="rd_calculator"
          ctaLabel="Get my free assessment"
          extraFields={[{ name: "company", label: "Company name" }]}
        />
      }
    >
      <div className="space-y-7">
        {/* Step 1 — financials */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold">1</span>
            <h4 className="text-base font-extrabold text-slate-900">Your numbers</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Annual turnover (AUD)</span>
              <input
                type="number"
                value={turnover}
                min={0}
                step={50_000}
                onChange={(e) => setTurnover(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Under $20M unlocks the refundable 43.5% offset.</span>
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Total dev / R&amp;D spend (AUD)</span>
              <input
                type="number"
                value={devSpend}
                min={0}
                step={10_000}
                onChange={(e) => setDevSpend(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          </div>
          <div className="mt-4">
            <label className="block">
              <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                <span>Eligible R&amp;D portion</span>
                <span className="text-amber-600 normal-case font-extrabold text-sm">{eligiblePct}%</span>
              </span>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={eligiblePct}
                onChange={(e) => setEligiblePct(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">A registered R&amp;D advisor typically lands a fintech or deep-tech company between 30% and 70%.</span>
            </label>
          </div>
        </div>

        {/* Step 2 — activities */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold">2</span>
            <h4 className="text-base font-extrabold text-slate-900">Tick the activities you actually do</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ELIGIBLE_ACTIVITIES.map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => toggleActivity(a.id)}
                className={`flex items-start gap-2.5 text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  activities.has(a.id)
                    ? a.eligible
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {a.eligible ? "✅" : "❌"}
                </span>
                <span className="text-sm text-slate-800 leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — results */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold">3</span>
            <h4 className="text-base font-extrabold text-slate-900">Your estimated refund</h4>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 md:p-8">
            <p className="text-xs uppercase tracking-wider text-amber-400 font-extrabold mb-2">
              Estimated refundable cash offset
            </p>
            <p className="text-4xl md:text-5xl font-extrabold leading-none" style={{ color: "#EAB308" }}>
              {formatAUD(calc.refund)}
            </p>
            <p className="text-sm text-slate-300 mt-3">
              On {formatAUD(calc.eligibleSpend)} of eligible R&amp;D at {(calc.offsetRate * 100).toFixed(1)}%
              {calc.isSmallCo ? " (refundable, paid as cash even when in tax loss)" : " (non-refundable offset)"}.
            </p>

            <div className="mt-5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-100">
              <strong className="text-amber-300">FY2025 deadline:</strong> registration with AusIndustry must be lodged by 30 April 2026. {/* dated-ok — historical ATO regulatory deadline for FY2025 */}
            </div>
          </div>
        </div>

      </div>
    </CalculatorShell>
  );
}
