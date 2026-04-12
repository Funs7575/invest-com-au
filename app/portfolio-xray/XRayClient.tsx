"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import { getAffiliateLink, AFFILIATE_REL, trackClick } from "@/lib/tracking";
import { TICKER_MAP } from "@/lib/ticker-sectors";
import type { Broker } from "@/lib/types";

interface Holding {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
}

function parseFee(feeStr: string | null | undefined): number {
  if (!feeStr) return 0;
  const pct = feeStr.match(/([\d.]+)%/);
  if (pct) return parseFloat(pct[1]) / 100;
  const flat = feeStr.match(/\$([\d.]+)/);
  if (flat) return parseFloat(flat[1]);
  return 0;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function XRayClient({ brokers }: { brokers: Broker[] }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [currentBroker, setCurrentBroker] = useState("");
  const [analysed, setAnalysed] = useState(false);

  const addHolding = () => {
    const t = ticker.trim().toUpperCase();
    const n = name.trim() || t;
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(price) || 0;
    if (!t || q <= 0 || p <= 0) return;
    setHoldings([...holdings, { id: uid(), ticker: t, name: n, quantity: q, price: p, value: q * p }]);
    setTicker(""); setName(""); setQuantity(""); setPrice("");
  };

  const removeHolding = (id: string) => setHoldings(holdings.filter(h => h.id !== id));
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  const analysis = useMemo(() => {
    if (holdings.length === 0) return null;
    const sectors: Record<string, number> = {};
    const countries: Record<string, number> = {};
    let divYield = 0;

    holdings.forEach(h => {
      const info = TICKER_MAP[h.ticker];
      const sec = info?.sector || "Other";
      const cty = info?.country || "AU";
      sectors[sec] = (sectors[sec] || 0) + h.value;
      countries[cty] = (countries[cty] || 0) + h.value;
      divYield += (info?.dividend_yield_est || 0) * h.value;
    });

    const totalVal = totalValue || 1;
    divYield = divYield / totalVal;

    // Concentration risk
    const maxHolding = Math.max(...holdings.map(h => h.value / totalVal * 100));
    const maxSector = Math.max(...Object.values(sectors).map(v => v / totalVal * 100));
    const concentrationRisk = maxHolding > 30 ? "High" : maxHolding > 20 ? "Moderate" : "Low";

    // Diversification score (0-100)
    const sectorCount = Object.keys(sectors).length;
    const countryCount = Object.keys(countries).length;
    let score = 30;
    score += Math.min(sectorCount * 8, 30);
    score += Math.min(countryCount * 10, 20);
    score += maxHolding < 15 ? 10 : maxHolding < 25 ? 5 : 0;
    score += maxSector < 30 ? 10 : maxSector < 50 ? 5 : 0;
    score = Math.min(100, Math.max(0, score));

    // Fee drag
    const curr = brokers.find(b => b.slug === currentBroker);
    const cheapest = brokers[0];
    const tradesEst = holdings.length * 4; // assume 4 trades/year per holding
    const avgSize = totalVal / holdings.length;
    const currFee = curr ? tradesEst * parseFee(curr.asx_fee) : 0;
    const cheapFee = cheapest ? tradesEst * parseFee(cheapest.asx_fee) : 0;
    const feeSavings = Math.max(0, currFee - cheapFee);

    return {
      sectors: Object.entries(sectors).map(([name, val]) => ({ name, value: val, pct: val / totalVal * 100 })).sort((a, b) => b.value - a.value),
      countries: Object.entries(countries).map(([name, val]) => ({ name, value: val, pct: val / totalVal * 100 })).sort((a, b) => b.value - a.value),
      divYield: divYield * 100,
      concentrationRisk,
      maxHoldingPct: maxHolding,
      maxSectorPct: maxSector,
      diversificationScore: Math.round(score),
      feeDrag: Math.round(currFee),
      feeSavings: Math.round(feeSavings),
      cheapestBroker: cheapest,
    };
  }, [holdings, totalValue, currentBroker, brokers]);

  const scoreColor = (s: number) => s >= 70 ? "text-emerald-600" : s >= 40 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 70 ? "bg-emerald-500" : s >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="min-h-screen bg-slate-50 py-5 md:py-12">
      <div className="mx-auto max-w-4xl px-4">
        {/* Breadcrumbs */}
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Portfolio X-Ray</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 md:p-8 text-white mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Icon name="pie-chart" size={24} className="text-white" />
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">Portfolio X-Ray</h1>
          <p className="text-sm text-indigo-100">Add your holdings below and get instant analysis: diversification, sector breakdown, concentration risk, fee drag, and personalised recommendations.</p>
        </div>

        {/* Add Holdings */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Your Holdings</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ticker (e.g. BHP)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" placeholder="Quantity" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="Price ($)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <button onClick={addHolding} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors">Add</button>
          </div>

          {holdings.length > 0 && (
            <div className="space-y-1 mb-3">
              {holdings.map(h => (
                <div key={h.id} className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-lg text-sm">
                  <span className="font-bold text-slate-900">{h.ticker}</span>
                  <span className="text-slate-500">{h.name}</span>
                  <span className="text-slate-500">{h.quantity} x ${h.price.toFixed(2)}</span>
                  <span className="font-bold text-slate-900">${h.value.toLocaleString()}</span>
                  <button onClick={() => removeHolding(h.id)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={14} /></button>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Total</span><span>${totalValue.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Broker selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700">Your current broker:</label>
            <select value={currentBroker} onChange={e => setCurrentBroker(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg">
              <option value="">Select...</option>
              {brokers.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
          </div>

          {holdings.length >= 1 && (
            <button onClick={() => setAnalysed(true)} className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all">
              Analyse My Portfolio →
            </button>
          )}
        </div>

        {/* Analysis Results */}
        {analysed && analysis && (
          <div className="space-y-4">
            {/* Diversification Score */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 text-center">
              <p className="text-xs text-slate-500 mb-1">Diversification Score</p>
              <p className={`text-5xl font-extrabold ${scoreColor(analysis.diversificationScore)}`}>{analysis.diversificationScore}</p>
              <div className="w-48 h-2 bg-slate-100 rounded-full mx-auto mt-2 overflow-hidden">
                <div className={`h-full ${scoreBg(analysis.diversificationScore)} rounded-full transition-all`} style={{ width: `${analysis.diversificationScore}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">{analysis.diversificationScore >= 70 ? "Well diversified" : analysis.diversificationScore >= 40 ? "Could improve" : "Needs attention"}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sector Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Sector Breakdown</h3>
                <div className="space-y-2">
                  {analysis.sectors.map(s => (
                    <div key={s.name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-700">{s.name}</span>
                        <span className="font-bold text-slate-900">{s.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Split */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Geographic Split</h3>
                <div className="space-y-2">
                  {analysis.countries.map(c => (
                    <div key={c.name}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-700">{c.name === "AU" ? "Australia" : c.name === "US" ? "United States" : c.name}</span>
                        <span className="font-bold text-slate-900">{c.pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk + Yield + Fees */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl p-4 border ${analysis.concentrationRisk === "High" ? "bg-red-50 border-red-200" : analysis.concentrationRisk === "Moderate" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                <p className="text-xs text-slate-500">Concentration Risk</p>
                <p className="text-lg font-extrabold">{analysis.concentrationRisk}</p>
                <p className="text-[0.65rem] text-slate-500">Largest holding: {analysis.maxHoldingPct.toFixed(0)}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Est. Dividend Yield</p>
                <p className="text-lg font-extrabold text-slate-900">{analysis.divYield.toFixed(1)}%</p>
                <p className="text-[0.65rem] text-slate-500">${Math.round(totalValue * analysis.divYield / 100).toLocaleString()}/yr</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Annual Fee Drag</p>
                <p className="text-lg font-extrabold text-slate-900">${analysis.feeDrag.toLocaleString()}</p>
                {analysis.feeSavings > 0 && <p className="text-[0.65rem] text-emerald-600 font-bold">Save ${analysis.feeSavings.toLocaleString()} switching</p>}
              </div>
            </div>

            {/* Recommendations */}
            {analysis.feeSavings > 0 && analysis.cheapestBroker && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 md:p-5">
                <div className="flex items-center gap-3">
                  <BrokerLogo broker={analysis.cheapestBroker} size="xs" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-900">Save ${analysis.feeSavings.toLocaleString()}/year by switching to {analysis.cheapestBroker.name}</p>
                    <p className="text-xs text-emerald-700">Based on your portfolio of {holdings.length} holdings</p>
                  </div>
                  <a href={getAffiliateLink(analysis.cheapestBroker)} target="_blank" rel={AFFILIATE_REL} onClick={() => trackClick(analysis.cheapestBroker!.slug, analysis.cheapestBroker!.name, "xray", "/portfolio-xray", "tool")} className="shrink-0 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">
                    Open Account →
                  </a>
                </div>
              </div>
            )}

            {/* Advisor CTA */}
            {totalValue > 100000 && (
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
                <p className="text-sm font-bold text-violet-900">Portfolio over $100k? Consider professional advice</p>
                <p className="text-xs text-violet-600 mb-2">A financial planner can optimise your structure, tax position, and asset allocation.</p>
                <Link href="/find-advisor" className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700">Find an Advisor →</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
