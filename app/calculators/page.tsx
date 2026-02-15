"use client";

import { useState } from "react";

export default function CalculatorsPage() {
  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-4">Investment Calculators</h1>
        <p className="text-lg text-slate-600 mb-10">
          Free tools to help you understand costs and plan your investments.
        </p>

        <div className="space-y-12">
          <FrankingCalculator />
          <SwitchingCostCalculator />
          <FxFeeCalculator />
          <CgtCalculator />
        </div>
      </div>
    </div>
  );
}

function FrankingCalculator() {
  const [dividend, setDividend] = useState("");
  const [franking, setFranking] = useState("100");
  const taxRate = 0.30;

  const div = parseFloat(dividend) || 0;
  const frankPct = parseFloat(franking) / 100;
  const frankingCredit = (div * frankPct * taxRate) / (1 - taxRate);
  const grossIncome = div + frankingCredit;

  return (
    <CalcSection title="Franking Credit Calculator" desc="Calculate the value of franking credits on your dividends.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cash Dividend ($)</label>
          <input type="number" value={dividend} onChange={e => setDividend(e.target.value)} placeholder="1000" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Franking (%)</label>
          <input type="number" value={franking} onChange={e => setFranking(e.target.value)} placeholder="100" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
      </div>
      {div > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <ResultBox label="Franking Credit" value={`$${frankingCredit.toFixed(2)}`} />
          <ResultBox label="Gross Income" value={`$${grossIncome.toFixed(2)}`} />
        </div>
      )}
    </CalcSection>
  );
}

function SwitchingCostCalculator() {
  const [holdings, setHoldings] = useState("");
  const [oldFee, setOldFee] = useState("");
  const [newFee, setNewFee] = useState("");
  const [tradesPerYear, setTradesPerYear] = useState("24");

  const h = parseFloat(holdings) || 0;
  const of_ = parseFloat(oldFee) || 0;
  const nf = parseFloat(newFee) || 0;
  const tpy = parseFloat(tradesPerYear) || 0;
  const annualSavings = (of_ - nf) * tpy;

  return (
    <CalcSection title="Switching Cost Calculator" desc="See how much you'd save by switching brokers.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio Value ($)</label>
          <input type="number" value={holdings} onChange={e => setHoldings(e.target.value)} placeholder="50000" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Old Brokerage Fee ($)</label>
          <input type="number" value={oldFee} onChange={e => setOldFee(e.target.value)} placeholder="19.95" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">New Brokerage Fee ($)</label>
          <input type="number" value={newFee} onChange={e => setNewFee(e.target.value)} placeholder="5" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Trades Per Year</label>
          <input type="number" value={tradesPerYear} onChange={e => setTradesPerYear(e.target.value)} placeholder="24" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
      </div>
      {h > 0 && (
        <div className="mt-4">
          <ResultBox label="Annual Savings" value={`$${annualSavings.toFixed(2)}`} highlight={annualSavings > 0} />
        </div>
      )}
    </CalcSection>
  );
}

function FxFeeCalculator() {
  const [amount, setAmount] = useState("");
  const [fxRate, setFxRate] = useState("0.60");

  const a = parseFloat(amount) || 0;
  const rate = parseFloat(fxRate) || 0;
  const fxCost = a * (rate / 100);

  return (
    <CalcSection title="FX Fee Calculator" desc="Calculate the currency conversion cost on international trades.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Trade Amount (AUD)</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">FX Rate (%)</label>
          <input type="number" value={fxRate} onChange={e => setFxRate(e.target.value)} placeholder="0.60" step="0.01" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
      </div>
      {a > 0 && (
        <div className="mt-4">
          <ResultBox label="FX Cost" value={`$${fxCost.toFixed(2)}`} />
        </div>
      )}
    </CalcSection>
  );
}

function CgtCalculator() {
  const [buyPrice, setBuyPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [held12Months, setHeld12Months] = useState(true);
  const [taxRate, setTaxRate] = useState("32.5");

  const buy = parseFloat(buyPrice) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const tr = parseFloat(taxRate) / 100;
  const gain = sell - buy;
  const taxableGain = held12Months && gain > 0 ? gain * 0.5 : gain;
  const taxOwed = taxableGain > 0 ? taxableGain * tr : 0;

  return (
    <CalcSection title="Capital Gains Tax (CGT) Estimator" desc="Estimate your CGT on share sales. Not financial advice.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Buy Price ($)</label>
          <input type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="5000" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sell Price ($)</label>
          <input type="number" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="8000" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Marginal Tax Rate (%)</label>
          <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="32.5" className="w-full border border-slate-300 rounded-lg px-4 py-2" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={held12Months} onChange={e => setHeld12Months(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
            <span className="text-sm font-medium text-slate-700">Held 12+ months (50% discount)</span>
          </label>
        </div>
      </div>
      {buy > 0 && sell > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <ResultBox label="Capital Gain" value={`$${gain.toFixed(2)}`} />
          <ResultBox label="Taxable Gain" value={`$${taxableGain.toFixed(2)}`} />
          <ResultBox label="Estimated Tax" value={`$${taxOwed.toFixed(2)}`} />
        </div>
      )}
    </CalcSection>
  );
}

function CalcSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="border border-slate-200 rounded-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-slate-600 mb-6">{desc}</p>
      {children}
    </section>
  );
}

function ResultBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? 'bg-green-50 border border-green-200' : 'bg-slate-50'}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-green-700' : ''}`}>{value}</div>
    </div>
  );
}
