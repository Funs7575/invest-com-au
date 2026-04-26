"use client";

import { useState, useMemo } from "react";
import HubLeadForm from "@/components/leads/HubLeadForm";

type Industry = "retail" | "hospitality" | "professional" | "tech" | "manufacturing" | "trades" | "healthcare" | "other";

const INDUSTRIES: Array<{ id: Industry; label: string; ebitdaMin: number; ebitdaMax: number; revMin: number; revMax: number }> = [
  { id: "retail",        label: "Retail",                ebitdaMin: 1.5, ebitdaMax: 3,   revMin: 0.2, revMax: 0.6 },
  { id: "hospitality",   label: "Hospitality",           ebitdaMin: 1.5, ebitdaMax: 3,   revMin: 0.2, revMax: 0.6 },
  { id: "professional",  label: "Professional Services", ebitdaMin: 2.5, ebitdaMax: 4,   revMin: 0.4, revMax: 1.2 },
  { id: "tech",          label: "Technology / SaaS",     ebitdaMin: 4,   ebitdaMax: 8,   revMin: 1.5, revMax: 5   },
  { id: "manufacturing", label: "Manufacturing",         ebitdaMin: 3,   ebitdaMax: 5,   revMin: 0.4, revMax: 1.0 },
  { id: "trades",        label: "Trades",                ebitdaMin: 2,   ebitdaMax: 3.5, revMin: 0.3, revMax: 0.7 },
  { id: "healthcare",    label: "Healthcare",            ebitdaMin: 4,   ebitdaMax: 6,   revMin: 0.6, revMax: 1.5 },
  { id: "other",         label: "Other",                 ebitdaMin: 2,   ebitdaMax: 4,   revMin: 0.3, revMax: 0.8 },
];

type Method = "ebitda" | "revenue" | "asset";

function formatAUD(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function ValuationClient() {
  const [industry, setIndustry] = useState<Industry>("professional");
  const [revenue, setRevenue] = useState<number>(1_500_000);
  const [ebitda, setEbitda] = useState<number>(300_000);
  const [netAssets, setNetAssets] = useState<number>(150_000);
  const [years, setYears] = useState<string>("4-7");
  const [method, setMethod] = useState<Method>("ebitda");

  const ind = useMemo(() => INDUSTRIES.find((i) => i.id === industry) || INDUSTRIES[2]!, [industry]);

  const valuations = useMemo(() => {
    const ebitdaLow = Math.max(0, ebitda * ind.ebitdaMin);
    const ebitdaHigh = Math.max(0, ebitda * ind.ebitdaMax);
    const ebitdaMid = (ebitdaLow + ebitdaHigh) / 2;
    const revLow = Math.max(0, revenue * ind.revMin);
    const revHigh = Math.max(0, revenue * ind.revMax);
    const revMid = (revLow + revHigh) / 2;
    const goodwillFactor = years === "15+" ? 1.5 : years === "8-15" ? 1.2 : years === "4-7" ? 1.0 : 0.8;
    const assetMid = Math.max(0, netAssets * (1 + 0.5 * goodwillFactor));
    return {
      ebitda: { low: ebitdaLow, mid: ebitdaMid, high: ebitdaHigh },
      revenue: { low: revLow, mid: revMid, high: revHigh },
      asset: { low: netAssets, mid: assetMid, high: netAssets * (1 + goodwillFactor) },
    };
  }, [ebitda, revenue, netAssets, years, ind]);

  const active = valuations[method];

  const recommendation = useMemo(() => {
    if (industry === "tech") return "EBITDA multiple — or revenue if EBITDA is negative or unrepresentative of the underlying value.";
    if (industry === "retail" || industry === "hospitality") return "EBITDA multiple — buyers anchor heavily on profit in these industries.";
    if (industry === "trades") return "EBITDA multiple, with the floor set by the asset-based number.";
    if (industry === "manufacturing" || industry === "healthcare") return "EBITDA multiple — supplemented by an asset-based check for capital-heavy businesses.";
    return "EBITDA multiple is the right starting point. Compare against asset-based for a floor.";
  }, [industry]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold">1</span>
            <h2 className="text-base font-extrabold text-slate-900">Industry &amp; financials</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Industry</span>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Years in business</span>
              <select
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="1-3">1–3</option>
                <option value="4-7">4–7</option>
                <option value="8-15">8–15</option>
                <option value="15+">15+</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Annual revenue (AUD)</span>
              <input type="number" min={0} step={50_000} value={revenue} onChange={(e) => setRevenue(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
            <label className="block">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Annual EBITDA (AUD)</span>
              <input type="number" min={0} step={10_000} value={ebitda} onChange={(e) => setEbitda(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              <span className="text-[11px] text-slate-500 mt-1 block">Normalise — adjust for owner&rsquo;s salary at market rate, related-party rent, one-offs.</span>
            </label>
            <label className="block md:col-span-2">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Net tangible assets (AUD)</span>
              <input type="number" min={0} step={10_000} value={netAssets} onChange={(e) => setNetAssets(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </label>
          </div>
        </div>

        {/* Step 2 — method tabs */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold">2</span>
            <h2 className="text-base font-extrabold text-slate-900">Method</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ebitda" as Method, label: "EBITDA Multiple" },
              { id: "revenue" as Method, label: "Revenue Multiple" },
              { id: "asset" as Method, label: "Asset-based" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  method === m.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3 — results */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold">3</span>
            <h2 className="text-base font-extrabold text-slate-900">Indicative range</h2>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Low</p>
                <p className="text-xl md:text-2xl font-extrabold mt-1">{formatAUD(active.low)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Midpoint</p>
                <p className="text-2xl md:text-3xl font-extrabold mt-1" style={{ color: "#EAB308" }}>{formatAUD(active.mid)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">High</p>
                <p className="text-xl md:text-2xl font-extrabold mt-1">{formatAUD(active.high)}</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mt-4 text-center">{recommendation}</p>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-3">
            Estimate only. A business broker can run market comparables on recent transactions in your industry — usually the most useful single number in a sale process.
          </p>
        </div>
      </div>

      <HubLeadForm
        heading="Get a free broker assessment"
        subheading="A specialist business broker will run market comparables and provide a written valuation range — typically within one business day."
        intent={{ need: "planning", context: ["estate_planning"] }}
        source="sell_business_valuation"
        ctaLabel="Get a free assessment"
        extraFields={[{ name: "industry", label: "Industry" }]}
      />
    </div>
  );
}
