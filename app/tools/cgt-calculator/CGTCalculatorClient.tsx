"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

// ─── FY2025-26 tax rates ──────────────────────────────────────────────────────

function incomeTax(gross: number): number {
  if (gross <= 18_200) return 0;
  if (gross <= 45_000) return (gross - 18_200) * 0.19;
  if (gross <= 135_000) return 5_092 + (gross - 45_000) * 0.325;
  if (gross <= 190_000) return 29_467 + (gross - 135_000) * 0.37;
  return 51_667 + (gross - 190_000) * 0.45;
}

function medicare(gross: number): number {
  if (gross <= 26_000) return 0;
  if (gross <= 32_500) return (gross - 26_000) * 0.1;
  return gross * 0.02;
}

const INCOME_PRESETS = [
  { label: "Under $45k", value: 40_000 },
  { label: "$45k–$135k", value: 90_000 },
  { label: "$135k–$190k", value: 160_000 },
  { label: "Over $190k", value: 220_000 },
];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CGTCalculatorClient() {
  const [purchasePrice, setPurchasePrice] = useState("50000");
  const [salePrice, setSalePrice] = useState("80000");
  const [purchaseCosts, setPurchaseCosts] = useState("1000");
  const [saleCosts, setSaleCosts] = useState("500");
  const [heldOver12Months, setHeldOver12Months] = useState(true);
  const [annualIncome, setAnnualIncome] = useState(90_000);
  const [assetType, setAssetType] = useState<"shares" | "property" | "crypto" | "other">("shares");

  const r = useMemo(() => {
    const purchase = parseFloat(purchasePrice.replace(/,/g, "")) || 0;
    const sale = parseFloat(salePrice.replace(/,/g, "")) || 0;
    const pCosts = parseFloat(purchaseCosts.replace(/,/g, "")) || 0;
    const sCosts = parseFloat(saleCosts.replace(/,/g, "")) || 0;

    const costBase = purchase + pCosts;
    const proceeds = sale - sCosts;
    const grossGain = proceeds - costBase;
    const isLoss = grossGain < 0;

    const discountApplies = heldOver12Months && !isLoss;
    const discountedGain = discountApplies ? grossGain * 0.5 : grossGain;
    const taxableGain = Math.max(0, discountedGain);

    const taxWithoutGain = incomeTax(annualIncome) + medicare(annualIncome);
    const taxWithGain = incomeTax(annualIncome + taxableGain) + medicare(annualIncome + taxableGain);
    const cgtOwed = Math.max(0, taxWithGain - taxWithoutGain);

    const effectiveRate = taxableGain > 0 ? cgtOwed / grossGain : 0;
    const netProfit = grossGain - cgtOwed;

    return {
      costBase, proceeds, grossGain, isLoss,
      discountApplies, discountedGain, taxableGain,
      cgtOwed, effectiveRate, netProfit,
    };
  }, [purchasePrice, salePrice, purchaseCosts, saleCosts, heldOver12Months, annualIncome]);

  const showResults = r.proceeds > 0 && r.costBase > 0;

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900">Asset details</h2>

        {/* Asset type */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Asset type</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(["shares", "property", "crypto", "other"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAssetType(t)}
                className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                  assetType === t
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Purchase price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min={0} step={1000}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sale price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min={0} step={1000}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Purchase costs
              <span className="text-slate-400 font-normal ml-1">(stamp duty, brokerage)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min={0} step={100}
                value={purchaseCosts}
                onChange={(e) => setPurchaseCosts(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Sale costs
              <span className="text-slate-400 font-normal ml-1">(agent fees, brokerage)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number" min={0} step={100}
                value={saleCosts}
                onChange={(e) => setSaleCosts(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Holding period */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={heldOver12Months}
            onChange={(e) => setHeldOver12Months(e.target.checked)}
            className="w-4 h-4 accent-emerald-600"
          />
          <span className="text-sm text-slate-700">
            Held more than 12 months (eligible for 50% CGT discount)
          </span>
        </label>

        {/* Income */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Your other annual income (for marginal rate)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {INCOME_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setAnnualIncome(p.value)}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  annualIncome === p.value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          {r.isLoss ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
              <strong>Capital loss:</strong> This asset returned a loss of {fmt(-r.grossGain)}. Capital losses can
              be carried forward indefinitely and offset against future capital gains (not ordinary income).
            </div>
          ) : (
            <>
              {/* Key numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{fmt(r.grossGain)}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">Gross capital gain</div>
                </div>
                {r.discountApplies && (
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="text-2xl font-extrabold text-emerald-700">{fmt(r.taxableGain)}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-0.5">After 50% CGT discount</div>
                  </div>
                )}
                <div className="bg-rose-50 rounded-xl p-4">
                  <div className="text-2xl font-extrabold text-rose-700">{fmt(r.cgtOwed)}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-0.5">
                    CGT owed (effective {(r.effectiveRate * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2.5 text-sm">
                <h3 className="font-bold text-slate-900">Calculation breakdown</h3>
                <Row label="Cost base (purchase + costs)" value={fmt(r.costBase)} />
                <Row label="Proceeds (sale − costs)" value={fmt(r.proceeds)} />
                <Row label="Gross capital gain" value={fmt(r.grossGain)} bold />
                {r.discountApplies && (
                  <Row label="50% CGT discount (held >12 months)" value={`−${fmt(r.grossGain * 0.5)}`} green />
                )}
                <Row label="Taxable gain" value={fmt(r.taxableGain)} bold />
                <Row label="CGT owed at marginal rate" value={fmt(r.cgtOwed)} />
                <div className="border-t border-slate-100 pt-2.5">
                  <Row label="Net profit after CGT" value={fmt(r.netProfit)} bold green />
                </div>
              </div>

              {/* Comparison: with vs without discount */}
              {r.grossGain > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm">
                  <h3 className="font-bold text-slate-900 mb-3">Discount impact</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Tax WITHOUT 12-month hold</div>
                      <div className="text-lg font-extrabold text-slate-900">
                        {fmt(
                          Math.max(
                            0,
                            incomeTax(annualIncome + r.grossGain) +
                              medicare(annualIncome + r.grossGain) -
                              incomeTax(annualIncome) -
                              medicare(annualIncome)
                          )
                        )}
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Tax WITH 12-month hold</div>
                      <div className="text-lg font-extrabold text-emerald-700">{fmt(r.cgtOwed)}</div>
                    </div>
                  </div>
                  {!heldOver12Months && r.grossGain > 0 && (
                    <p className="text-xs text-amber-700 mt-2 bg-amber-50 rounded-lg p-2">
                      Holding until 12 months would save{" "}
                      {fmt(
                        Math.max(
                          0,
                          incomeTax(annualIncome + r.grossGain) +
                            medicare(annualIncome + r.grossGain) -
                            incomeTax(annualIncome) -
                            medicare(annualIncome)
                        ) - r.cgtOwed
                      )}{" "}
                      in CGT on this asset.
                    </p>
                  )}
                </div>
              )}

              {assetType === "property" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <strong>Property note:</strong> Main residence may be fully or partially exempt (6-year rule for former
                  main residence rented out). Depreciation deductions claimed may reduce your cost base. A tax agent
                  can work out the exact CGT position for investment properties.
                </div>
              )}

              {assetType === "crypto" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <strong>Crypto note:</strong> The ATO treats cryptocurrency as property, not currency. CGT applies on
                  every disposal (sale, swap, or spending). Cost base tracking methods include FIFO, LIFO, or
                  specific identification — confirm with a crypto-specialist tax agent.
                </div>
              )}
            </>
          )}

          {/* CTA */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-sm font-semibold text-emerald-900 mb-1">
              Minimise CGT with professional advice
            </p>
            <p className="text-xs text-emerald-700 mb-3">
              Tax loss harvesting, asset location, main residence exemptions, and the 6-year rule can all
              reduce your CGT bill significantly.
            </p>
            <Link
              href="/advisors/tax-agents"
              className="inline-block bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Find a Tax Agent
            </Link>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </div>
  );
}

function Row({
  label,
  value,
  green,
  bold,
}: {
  label: string;
  value: string;
  green?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={[bold ? "font-bold" : "font-semibold", green ? "text-emerald-700" : "text-slate-900"].join(" ")}>
        {value}
      </span>
    </div>
  );
}
