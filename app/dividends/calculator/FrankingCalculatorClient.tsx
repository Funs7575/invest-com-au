"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { formatAUD } from "@/lib/currency";

const TAX_RATES: Array<{ id: string; label: string; rate: number; isSmsf?: boolean; pension?: boolean }> = [
  { id: "0",        label: "0% — under threshold",   rate: 0 },
  { id: "19",       label: "19% — $18,201–$45,000",  rate: 0.19 },
  { id: "30",       label: "30% — $45,001–$135,000", rate: 0.30 },
  { id: "37",       label: "37% — $135,001–$190,000", rate: 0.37 },
  { id: "45",       label: "45% — over $190,000",    rate: 0.45 },
  { id: "smsf-15",  label: "SMSF accumulation (15%)",rate: 0.15, isSmsf: true },
  { id: "smsf-0",   label: "SMSF pension phase (0%)",rate: 0, isSmsf: true, pension: true },
];

const CORPORATE_RATE = 0.30;

export default function FrankingCalculatorClient() {
  const [dividend, setDividend] = useState<number>(1_000);
  const [frankingPct, setFrankingPct] = useState<number>(100);
  const [taxRateId, setTaxRateId] = useState<string>("30");

  const calc = useMemo(() => {
    const tr = TAX_RATES.find((r) => r.id === taxRateId) || TAX_RATES[2]!;
    const frankedPortion = dividend * (frankingPct / 100);
    const frankingCredit = frankedPortion * (CORPORATE_RATE / (1 - CORPORATE_RATE));
    const grossedUp = dividend + frankingCredit;
    const taxOnGrossedUp = grossedUp * tr.rate;
    const refundOrTax = taxOnGrossedUp - frankingCredit; // negative = refund
    const netIncome = dividend - refundOrTax;
    return {
      tr,
      frankingCredit,
      grossedUp,
      taxOnGrossedUp,
      refundOrTax,
      netIncome,
    };
  }, [dividend, frankingPct, taxRateId]);

  const isRefund = calc.refundOrTax < 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Dividend amount (AUD)</span>
            <input
              type="number"
              min={0}
              step={50}
              value={dividend}
              onChange={(e) => setDividend(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Your tax rate</span>
            <select
              value={taxRateId}
              onChange={(e) => setTaxRateId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {TAX_RATES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
              <span>Franking percentage</span>
              <span className="text-amber-600 normal-case font-extrabold text-sm">{frankingPct}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={frankingPct}
              onChange={(e) => setFrankingPct(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Franking credit</p>
              <p className="text-lg md:text-xl font-extrabold mt-1">{formatAUD(calc.frankingCredit, 2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Grossed-up dividend</p>
              <p className="text-lg md:text-xl font-extrabold mt-1">{formatAUD(calc.grossedUp, 2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Tax on grossed-up</p>
              <p className="text-lg md:text-xl font-extrabold mt-1">{formatAUD(calc.taxOnGrossedUp, 2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: isRefund ? "#34D399" : "#F87171" }}>
                {isRefund ? "Refund" : "Net tax"}
              </p>
              <p className="text-lg md:text-xl font-extrabold mt-1" style={{ color: isRefund ? "#34D399" : "#F87171" }}>
                {formatAUD(Math.abs(calc.refundOrTax), 2)}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Net after-tax income from this dividend</p>
            <p className="text-3xl md:text-4xl font-extrabold mt-1" style={{ color: "#EAB308" }}>{formatAUD(calc.netIncome, 2)}</p>
          </div>
        </div>

        {/* Dynamic explainer */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          {calc.tr.pension ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-emerald-700">SMSF pension phase:</strong> you receive <strong>{formatAUD(calc.frankingCredit, 2)}</strong> as a cash refund from the ATO — even though the fund pays no tax. This is one of the most powerful SMSF tax benefits available to Australian retail investors. <Link href="/smsf" className="text-amber-700 hover:underline font-bold">Explore SMSF →</Link>
            </p>
          ) : calc.tr.isSmsf ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>SMSF accumulation:</strong> the franking credit reduces the fund&rsquo;s tax bill, with any surplus refunded as cash. Concessional 15% rate is well below the 30% corporate rate, so most fully-franked dividends generate a refund.
            </p>
          ) : isRefund ? (
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Refund position:</strong> your marginal rate is below the 30% corporate rate, so you receive the difference back as a cash refund or offset against other tax.
            </p>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Net tax position:</strong> your marginal rate exceeds the 30% corporate rate, so you owe the difference. Franking still meaningfully reduces your dividend tax versus an equivalent unfranked payment.
            </p>
          )}
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Estimate only. Assumes 30% corporate tax rate and the 45-day holding rule is satisfied. General information — not tax advice.
        </p>
      </div>

      <div className="rounded-2xl bg-amber-500 text-slate-900 p-6 text-center">
        <h3 className="text-lg font-extrabold mb-2">Optimise your dividend income with a financial planner</h3>
        <p className="text-sm mb-4">Wrapper choice (SMSF, super, personal, trust) often matters more than ticker selection.</p>
        <Link href="/advisors/financial-planners" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm px-5 py-2.5 rounded-lg">
          Find a financial planner <Icon name="arrow-right" size={14} />
        </Link>
      </div>
    </div>
  );
}
