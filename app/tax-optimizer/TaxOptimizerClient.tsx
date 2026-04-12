"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";

interface TaxHolding {
  id: string;
  ticker: string;
  buyDate: string;
  buyPrice: number;
  currentPrice: number;
  quantity: number;
}

const TAX_BRACKETS = [
  { label: "$0 – $18,200 (0%)", rate: 0, max: 18200 },
  { label: "$18,201 – $45,000 (19%)", rate: 0.19, max: 45000 },
  { label: "$45,001 – $120,000 (32.5%)", rate: 0.325, max: 120000 },
  { label: "$120,001 – $180,000 (37%)", rate: 0.37, max: 180000 },
  { label: "$180,001+ (45%)", rate: 0.45, max: Infinity },
];

// Common ASX dividend-paying stocks with franking
const FRANKED_STOCKS = new Set(["CBA", "NAB", "WBC", "ANZ", "BHP", "RIO", "FMG", "MQG", "WES", "WOW", "TLS", "AMP", "SUN", "IAG", "QBE", "COL", "JBH", "HVN", "ALL"]);
const FRANKING_RATE = 0.30; // 30% company tax rate

function uid() { return Math.random().toString(36).slice(2, 10); }
function daysBetween(a: string, b: Date) { return Math.floor((b.getTime() - new Date(a).getTime()) / 86400000); }

export default function TaxOptimizerClient({ brokers: _brokers }: { brokers: Broker[] }) {
  const [bracket, setBracket] = useState(2); // default 32.5%
  const [holdings, setHoldings] = useState<TaxHolding[]>([]);
  const [ticker, setTicker] = useState("");
  const [buyDate, setBuyDate] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [analysed, setAnalysed] = useState(false);

  const addHolding = () => {
    const t = ticker.trim().toUpperCase();
    const q = parseFloat(quantity) || 0;
    const bp = parseFloat(buyPrice) || 0;
    const cp = parseFloat(currentPrice) || 0;
    if (!t || !buyDate || q <= 0 || bp <= 0 || cp <= 0) return;
    setHoldings([...holdings, { id: uid(), ticker: t, buyDate, buyPrice: bp, currentPrice: cp, quantity: q }]);
    setTicker(""); setBuyDate(""); setBuyPrice(""); setCurrentPrice(""); setQuantity("");
  };

  const removeHolding = (id: string) => setHoldings(holdings.filter(h => h.id !== id));
  const taxRate = TAX_BRACKETS[bracket].rate;
  const now = new Date();

  const analysis = useMemo(() => {
    if (holdings.length === 0) return null;

    const results = holdings.map(h => {
      const gain = (h.currentPrice - h.buyPrice) * h.quantity;
      const daysHeld = daysBetween(h.buyDate, now);
      const cgtEligible = daysHeld >= 365;
      const daysUntilDiscount = cgtEligible ? 0 : Math.max(0, 365 - daysHeld);
      const taxableGain = cgtEligible && gain > 0 ? gain * 0.5 : gain;
      const estimatedTax = Math.max(0, taxableGain * taxRate);
      const isFranked = FRANKED_STOCKS.has(h.ticker);

      // Franking credit estimate (rough: assume $1/share annual div for franked stocks)
      const estAnnualDiv = isFranked ? h.quantity * 1.0 : 0;
      const frankingCredit = estAnnualDiv * (FRANKING_RATE / (1 - FRANKING_RATE));

      return {
        ...h,
        gain,
        daysHeld,
        cgtEligible,
        daysUntilDiscount,
        taxableGain,
        estimatedTax,
        isLoss: gain < 0,
        isFranked,
        frankingCredit: Math.round(frankingCredit),
      };
    });

    const totalGains = results.filter(r => r.gain > 0).reduce((s, r) => s + r.gain, 0);
    const totalLosses = Math.abs(results.filter(r => r.gain < 0).reduce((s, r) => s + r.gain, 0));
    const netGain = totalGains - totalLosses;
    const totalFrankingCredits = results.reduce((s, r) => s + r.frankingCredit, 0);

    // Tax-loss harvest candidates: holdings at a loss
    const harvestCandidates = results.filter(r => r.isLoss).sort((a, b) => a.gain - b.gain);
    const potentialHarvestSavings = harvestCandidates.reduce((s, r) => s + Math.abs(r.gain), 0) * taxRate;

    // Holdings approaching CGT discount
    const approachingDiscount = results.filter(r => !r.cgtEligible && r.gain > 0 && r.daysUntilDiscount <= 90).sort((a, b) => a.daysUntilDiscount - b.daysUntilDiscount);

    // Top moves
    const moves: { action: string; savings: number; detail: string }[] = [];
    harvestCandidates.forEach(h => {
      const saving = Math.abs(h.gain) * taxRate;
      if (saving > 10) moves.push({ action: `Sell ${h.ticker} to harvest loss`, savings: Math.round(saving), detail: `Offset $${Math.abs(Math.round(h.gain)).toLocaleString()} loss against gains, saving ~$${Math.round(saving).toLocaleString()} in tax` });
    });
    approachingDiscount.forEach(h => {
      const saving = h.gain * 0.5 * taxRate;
      if (saving > 10) moves.push({ action: `Hold ${h.ticker} for ${h.daysUntilDiscount} more days`, savings: Math.round(saving), detail: `Qualify for 50% CGT discount, saving ~$${Math.round(saving).toLocaleString()} on $${Math.round(h.gain).toLocaleString()} gain` });
    });
    moves.sort((a, b) => b.savings - a.savings);

    return { results, totalGains, totalLosses, netGain, totalFrankingCredits, harvestCandidates, approachingDiscount, potentialHarvestSavings: Math.round(potentialHarvestSavings), moves: moves.slice(0, 5) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings, bracket]);

  return (
    <div className="min-h-screen bg-slate-50 py-5 md:py-12">
      <div className="mx-auto max-w-4xl px-4">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Tax Optimization Engine</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-cyan-600 to-teal-700 rounded-2xl p-5 md:p-8 text-white mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Icon name="calculator" size={24} className="text-white" />
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">Tax Optimization Engine</h1>
          <p className="text-sm text-cyan-100">Add your holdings to find tax-loss harvesting opportunities, check CGT discount eligibility, estimate franking credits, and identify your top tax-saving moves.</p>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
          <strong>Disclaimer:</strong> This tool provides general information only and is not tax advice. Tax laws are complex and your individual circumstances matter. Always consult a qualified tax professional before making tax-related decisions.
        </div>

        {/* Input Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Tax Bracket & Holdings</h2>

          <div className="mb-4">
            <label className="text-xs font-bold text-slate-700 block mb-1">Your marginal tax rate</label>
            <select value={bracket} onChange={e => setBracket(Number(e.target.value))} className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-full max-w-sm">
              {TAX_BRACKETS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
            <input value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ticker" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={buyDate} onChange={e => setBuyDate(e.target.value)} type="date" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={buyPrice} onChange={e => setBuyPrice(e.target.value)} type="number" placeholder="Buy price ($)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} type="number" placeholder="Current ($)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" placeholder="Qty" className="px-3 py-2 text-sm border border-slate-200 rounded-lg" />
            <button onClick={addHolding} className="px-4 py-2 bg-cyan-600 text-white text-sm font-bold rounded-lg hover:bg-cyan-700">Add</button>
          </div>

          {holdings.length > 0 && (
            <div className="space-y-1 mb-3">
              {holdings.map(h => (
                <div key={h.id} className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-lg text-xs">
                  <span className="font-bold w-12">{h.ticker}</span>
                  <span className="text-slate-500">{new Date(h.buyDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" })}</span>
                  <span className="text-slate-500">{h.quantity} x ${h.buyPrice.toFixed(2)}</span>
                  <span className="text-slate-500">Now ${h.currentPrice.toFixed(2)}</span>
                  <span className={`font-bold ${(h.currentPrice - h.buyPrice) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {(h.currentPrice - h.buyPrice) >= 0 ? "+" : ""}${((h.currentPrice - h.buyPrice) * h.quantity).toFixed(0)}
                  </span>
                  <button onClick={() => removeHolding(h.id)} className="text-slate-400 hover:text-red-500"><Icon name="x" size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {holdings.length >= 1 && (
            <button onClick={() => setAnalysed(true)} className="w-full py-3 bg-cyan-600 text-white font-bold text-sm rounded-xl hover:bg-cyan-700">Analyse Tax Position →</button>
          )}
        </div>

        {/* Analysis */}
        {analysed && analysis && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Gains</p>
                <p className="text-lg font-extrabold text-emerald-600">${Math.round(analysis.totalGains).toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Total Losses</p>
                <p className="text-lg font-extrabold text-red-600">-${Math.round(analysis.totalLosses).toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Net Position</p>
                <p className={`text-lg font-extrabold ${analysis.netGain >= 0 ? "text-slate-900" : "text-red-600"}`}>${Math.round(analysis.netGain).toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Est. Franking Credits</p>
                <p className="text-lg font-extrabold text-blue-600">${analysis.totalFrankingCredits.toLocaleString()}</p>
              </div>
            </div>

            {/* Per-Holding Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">CGT Breakdown by Holding</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="text-left py-2">Ticker</th>
                      <th className="text-right py-2">Gain/Loss</th>
                      <th className="text-right py-2">Days Held</th>
                      <th className="text-center py-2">CGT Discount</th>
                      <th className="text-right py-2">Taxable</th>
                      <th className="text-right py-2">Est. Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.results.map(r => (
                      <tr key={r.id}>
                        <td className="py-2 font-bold text-slate-900">{r.ticker}</td>
                        <td className={`py-2 text-right font-bold ${r.gain >= 0 ? "text-emerald-600" : "text-red-600"}`}>${Math.round(r.gain).toLocaleString()}</td>
                        <td className="py-2 text-right text-slate-500">{r.daysHeld}d</td>
                        <td className="py-2 text-center">
                          {r.cgtEligible ? <span className="text-emerald-600 font-bold">50% off</span> : r.daysUntilDiscount <= 90 ? <span className="text-amber-600">{r.daysUntilDiscount}d away</span> : <span className="text-slate-400">No</span>}
                        </td>
                        <td className="py-2 text-right text-slate-900">${Math.round(r.taxableGain).toLocaleString()}</td>
                        <td className="py-2 text-right font-bold text-slate-900">${Math.round(r.estimatedTax).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Moves */}
            {analysis.moves.length > 0 && (
              <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-4 md:p-6">
                <h3 className="text-sm font-bold text-cyan-900 mb-3">Top Tax-Saving Moves</h3>
                <div className="space-y-2">
                  {analysis.moves.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/60 rounded-lg p-3">
                      <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{m.action}</p>
                        <p className="text-xs text-slate-600">{m.detail}</p>
                      </div>
                      <span className="text-sm font-extrabold text-emerald-600">Save ~${m.savings.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tax-Loss Harvest Warning */}
            {analysis.harvestCandidates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Wash Sale Warning:</strong> If you sell a holding for a tax loss and repurchase the same or substantially similar asset within 30 days, the ATO may deny the loss deduction under the wash sale provisions.
              </div>
            )}

            {/* Advisor CTA */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
              <p className="text-sm font-bold text-violet-900">Want personalised tax advice?</p>
              <p className="text-xs text-violet-600 mb-2">A tax agent specialising in investments can review your full position and identify savings specific to your situation.</p>
              <Link href="/find-advisor?type=tax-agent" className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700">Find a Tax Agent →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
