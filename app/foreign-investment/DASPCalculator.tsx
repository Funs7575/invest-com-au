"use client";

import { useState } from "react";

type VisaType = "standard" | "whm";

const RATES = {
  standard: { taxed: 35, untaxed: 65, taxFree: 0 },
  whm: { taxed: 65, untaxed: 65, taxFree: 0 },
};

export default function DASPCalculator() {
  const [visaType, setVisaType] = useState<VisaType>("standard");
  const [totalBalance, setTotalBalance] = useState<string>("");
  const [taxFreePercent, setTaxFreePercent] = useState<string>("0");

  const balance = parseFloat(totalBalance.replace(/,/g, "")) || 0;
  const taxFreeShare = Math.min(100, Math.max(0, parseFloat(taxFreePercent) || 0)) / 100;
  const rates = RATES[visaType];

  const taxFreeAmount = balance * taxFreeShare;
  const taxedAmount = balance * (1 - taxFreeShare);

  const whtOnTaxFree = 0;
  const whtOnTaxed = taxedAmount * (rates.taxed / 100);
  const totalWHT = whtOnTaxFree + whtOnTaxed;
  const netReceived = balance - totalWHT;
  const effectiveRate = balance > 0 ? (totalWHT / balance) * 100 : 0;

  const fmt = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Interactive tool</p>
      <h3 className="text-lg font-extrabold text-slate-900 mb-1">DASP withdrawal calculator</h3>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        Estimate how much you&apos;ll receive when you claim your superannuation through the
        Departing Australia Superannuation Payment (DASP) scheme.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        {/* Visa type */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Visa type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["standard", "whm"] as VisaType[]).map((v) => (
              <button
                key={v}
                onClick={() => setVisaType(v)}
                className={`rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all text-left ${
                  visaType === v
                    ? "border-amber-500 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {v === "standard" ? (
                  <>
                    <div className="font-extrabold mb-0.5">Standard temp visa</div>
                    <div className="text-[0.65rem] opacity-80">457, 482, 485, student, etc.</div>
                    <div className="text-[0.65rem] font-bold text-red-600 mt-1">35% WHT on taxed element</div>
                  </>
                ) : (
                  <>
                    <div className="font-extrabold mb-0.5">Working Holiday Maker</div>
                    <div className="text-[0.65rem] opacity-80">Subclass 417 or 462</div>
                    <div className="text-[0.65rem] font-bold text-red-700 mt-1">65% WHT on all elements</div>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Super balance */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Super balance (AUD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={totalBalance}
                onChange={(e) => setTotalBalance(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="10,000"
                className="w-full pl-7 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tax-free component (%)
              <span className="font-normal text-slate-400 ml-1">— after-tax contributions only</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={taxFreePercent}
                onChange={(e) => setTaxFreePercent(e.target.value)}
                placeholder="0"
                className="w-full pr-8 pl-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
            <p className="text-[0.6rem] text-slate-400 mt-1">Most super is 0% tax-free. Only non-concessional (after-tax) contributions are tax-free.</p>
          </div>
        </div>
      </div>

      {/* Result */}
      {balance > 0 ? (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Super balance</p>
              <p className="text-base font-black text-slate-900">{fmt(balance)}</p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">WHT deducted</p>
              <p className="text-base font-black text-red-700">−{fmt(totalWHT)}</p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">You receive</p>
              <p className="text-base font-black text-green-700">{fmt(netReceived)}</p>
            </div>
            <div className="text-center">
              <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Effective rate</p>
              <p className="text-base font-black text-slate-700">{effectiveRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Breakdown bar */}
          {balance > 0 && (
            <div className="mb-3">
              <div className="flex rounded-full overflow-hidden h-3">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(netReceived / balance) * 100}%` }}
                />
                <div
                  className="bg-red-400 transition-all"
                  style={{ width: `${(totalWHT / balance) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[0.6rem] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />You receive ({(100 - effectiveRate).toFixed(0)}%)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Tax withheld ({effectiveRate.toFixed(0)}%)</span>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
            {visaType === "whm"
              ? `Working Holiday Makers pay 65% DASP withholding on all components. On a ${fmt(balance)} balance, ${fmt(totalWHT)} is withheld and you receive ${fmt(netReceived)}.`
              : taxFreeAmount > 0
              ? `Standard temp visa: ${fmt(taxFreeAmount)} (tax-free component) returned at 100%, ${fmt(taxedAmount)} (taxed element) at 35% WHT. Total received: ${fmt(netReceived)}.`
              : `Standard temp visa: 35% withheld on the taxed element (most employer SG contributions). You receive ${fmt(netReceived)} from ${fmt(balance)}.`}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-6 text-center">
          <p className="text-sm text-slate-400">Enter your super balance above to see your estimated DASP payout</p>
        </div>
      )}

      <p className="mt-3 text-[0.65rem] text-slate-400 leading-relaxed">
        Estimates only. Most super balances are 100% taxed element (concessional contributions and earnings). Tax-free component only arises from non-concessional (after-tax) contributions. Consult your super fund and a registered tax agent for exact figures.
      </p>
    </div>
  );
}
