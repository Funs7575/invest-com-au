"use client";

import { useState, useMemo, useEffect } from "react";
import HubLeadForm from "@/components/leads/HubLeadForm";
import { formatAUD } from "@/lib/currency";
import { useCalculatorState } from "@/hooks/use-calculator-state";

const TAX_RATES = [
  { label: "0% — under threshold", rate: 0 },
  { label: "19%", rate: 0.19 },
  { label: "30%", rate: 0.30 },
  { label: "37%", rate: 0.37 },
  { label: "45%", rate: 0.45 },
];

export default function NegativeGearingCalculatorClient() {
  const [propertyValue, setPropertyValue] = useState<number>(850_000);
  const [rentalIncome, setRentalIncome] = useState<number>(28_000);
  const [interest, setInterest] = useState<number>(35_000);
  const [otherCosts, setOtherCosts] = useState<number>(7_000);
  const [marginalRate, setMarginalRate] = useState<number>(0.37);
  const [growthRate, setGrowthRate] = useState<number>(4);

  const {
    value: persistedInputs,
    setValue: setPersistedInputs,
    isHydrated: persistHydrated,
  } = useCalculatorState<{
    property_value: number;
    rental_income: number;
    interest: number;
    other_costs: number;
    marginal_rate: number;
    growth_rate: number;
  }>("negative_gearing_calculator", {
    property_value: 850_000,
    rental_income: 28_000,
    interest: 35_000,
    other_costs: 7_000,
    marginal_rate: 0.37,
    growth_rate: 4,
  });

  useEffect(() => {
    if (!persistHydrated) return;
    if (typeof persistedInputs.property_value === "number") setPropertyValue(persistedInputs.property_value);
    if (typeof persistedInputs.rental_income === "number") setRentalIncome(persistedInputs.rental_income);
    if (typeof persistedInputs.interest === "number") setInterest(persistedInputs.interest);
    if (typeof persistedInputs.other_costs === "number") setOtherCosts(persistedInputs.other_costs);
    if (typeof persistedInputs.marginal_rate === "number") setMarginalRate(persistedInputs.marginal_rate);
    if (typeof persistedInputs.growth_rate === "number") setGrowthRate(persistedInputs.growth_rate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, [persistHydrated]);

  useEffect(() => {
    setPersistedInputs({
      property_value: propertyValue,
      rental_income: rentalIncome,
      interest,
      other_costs: otherCosts,
      marginal_rate: marginalRate,
      growth_rate: growthRate,
    });
  }, [propertyValue, rentalIncome, interest, otherCosts, marginalRate, growthRate, setPersistedInputs]);

  const calc = useMemo(() => {
    const totalCosts = interest + otherCosts;
    const annualLoss = totalCosts - rentalIncome;
    const taxBenefit = annualLoss > 0 ? annualLoss * marginalRate : 0;
    const annualNetCost = annualLoss - taxBenefit;
    const tenYearOutOfPocket = annualNetCost * 10;
    const futureValue = propertyValue * Math.pow(1 + growthRate / 100, 10);
    const capitalGrowth = futureValue - propertyValue;
    const totalReturn = capitalGrowth - tenYearOutOfPocket;
    return { annualLoss, taxBenefit, annualNetCost, tenYearOutOfPocket, futureValue, capitalGrowth, totalReturn };
  }, [propertyValue, rentalIncome, interest, otherCosts, marginalRate, growthRate]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 mb-3">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Property value (AUD)</span>
              <input type="number" min={0} step={50_000} value={propertyValue} onChange={(e) => setPropertyValue(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Annual rental income</span>
              <input type="number" min={0} step={500} value={rentalIncome} onChange={(e) => setRentalIncome(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Annual mortgage interest</span>
              <input type="number" min={0} step={500} value={interest} onChange={(e) => setInterest(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Other annual costs (rates, insurance, maintenance)</span>
              <input type="number" min={0} step={500} value={otherCosts} onChange={(e) => setOtherCosts(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Your marginal tax rate</span>
              <select value={marginalRate} onChange={(e) => setMarginalRate(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                {TAX_RATES.map((r) => <option key={r.label} value={r.rate}>{r.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                <span>Expected annual capital growth</span>
                <span className="text-amber-600 normal-case font-extrabold text-sm">{growthRate}%</span>
              </span>
              <input type="range" min={0} max={10} step={0.5} value={growthRate} onChange={(e) => setGrowthRate(Number(e.target.value))} className="w-full accent-amber-500" />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
          <h3 className="text-lg font-extrabold mb-4">Annual outcome</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Annual loss</p>
              <p className="text-xl font-extrabold mt-1">{formatAUD(Math.max(0, calc.annualLoss))}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">Annual tax benefit</p>
              <p className="text-xl font-extrabold mt-1 text-emerald-400">{formatAUD(calc.taxBenefit)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Net annual cost</p>
              <p className="text-xl font-extrabold mt-1" style={{ color: "#EAB308" }}>{formatAUD(Math.max(0, calc.annualNetCost))}</p>
            </div>
          </div>

          <h3 className="text-lg font-extrabold mt-6 mb-4 pt-5 border-t border-white/10">10-year projection</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Capital growth</p>
              <p className="text-xl font-extrabold mt-1 text-emerald-400">{formatAUD(calc.capitalGrowth)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total out-of-pocket</p>
              <p className="text-xl font-extrabold mt-1 text-red-400">{formatAUD(Math.max(0, calc.tenYearOutOfPocket))}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Estimated total return</p>
              <p className="text-xl font-extrabold mt-1" style={{ color: "#EAB308" }}>{formatAUD(calc.totalReturn)}</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Estimate only. The 10-year projection assumes constant interest rates, costs, and tax bracket — none of which hold across a real holding period. Excludes CGT on sale, vacancy, rate rises and depreciation. Capital-growth assumptions are notoriously optimistic; model conservatively and stress-test against the next rate cycle.
        </p>
      </div>

      <HubLeadForm
        heading="Speak to a tax agent about your investment property"
        subheading="Tax structuring, depreciation schedules, and a stress-test against the next rate cycle — before you sign a contract."
        intent={{ need: "tax", context: ["tax_optimization"] }}
        source="negative_gearing_calculator"
        ctaLabel="Find a tax agent"
      />
    </div>
  );
}
