"use client";

/**
 * Interactive island for the fee-drag hub: balance + two fee sliders,
 * live outcome table. All math from lib/fee-drag — no network.
 */

import { useState } from "react";
import {
  feeDragOutcomes,
  formatMoney,
  DEFAULT_GROSS_RETURN_PCT,
} from "@/lib/fee-drag";

export default function FeeDragExplorer() {
  const [balance, setBalance] = useState(100_000);
  const [lowFee, setLowFee] = useState(0.6);
  const [highFee, setHighFee] = useState(1.4);

  const lo = Math.min(lowFee, highFee);
  const hi = Math.max(lowFee, highFee);
  const outcomes = feeDragOutcomes(balance, lo, hi);
  const drag30 = outcomes[outcomes.length - 1]!;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label htmlFor="fd-balance" className="block text-xs font-semibold text-slate-600 mb-1">
            Starting balance: <span className="text-slate-900 tabular-nums">{formatMoney(balance)}</span>
          </label>
          <input
            id="fd-balance"
            type="range"
            min={10000}
            max={1000000}
            step={10000}
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>
        <div>
          <label htmlFor="fd-low" className="block text-xs font-semibold text-slate-600 mb-1">
            Fee option A: <span className="text-slate-900 tabular-nums">{lowFee.toFixed(1)}%</span>
          </label>
          <input
            id="fd-low"
            type="range"
            min={0.1}
            max={2.5}
            step={0.1}
            value={lowFee}
            onChange={(e) => setLowFee(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <div>
          <label htmlFor="fd-high" className="block text-xs font-semibold text-slate-600 mb-1">
            Fee option B: <span className="text-slate-900 tabular-nums">{highFee.toFixed(1)}%</span>
          </label>
          <input
            id="fd-high"
            type="range"
            min={0.1}
            max={2.5}
            step={0.1}
            value={highFee}
            onChange={(e) => setHighFee(Number(e.target.value))}
            className="w-full accent-red-400"
          />
        </div>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4 text-center" aria-live="polite">
        <p className="text-xs font-semibold text-slate-600">
          Cost of {hi.toFixed(1)}% vs {lo.toFixed(1)}% over 30 years
        </p>
        <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{formatMoney(drag30.drag)}</p>
        <p className="text-[0.7rem] text-slate-500 mt-0.5">
          {drag30.dragPct.toFixed(0)}% of the lower-fee outcome · at {DEFAULT_GROSS_RETURN_PCT}% gross return
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[420px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-600">
              <th scope="col" className="py-2 text-left">Horizon</th>
              <th scope="col" className="py-2 text-right">At {lo.toFixed(1)}%</th>
              <th scope="col" className="py-2 text-right">At {hi.toFixed(1)}%</th>
              <th scope="col" className="py-2 text-right">Drag</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((o) => (
              <tr key={o.years} className="border-b border-slate-100 last:border-0">
                <td className="py-2 font-semibold text-slate-800">{o.years} yrs</td>
                <td className="py-2 text-right tabular-nums text-slate-700">{formatMoney(o.endAtLowFee)}</td>
                <td className="py-2 text-right tabular-nums text-slate-700">{formatMoney(o.endAtHighFee)}</td>
                <td className="py-2 text-right tabular-nums font-bold text-amber-700">{formatMoney(o.drag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[0.7rem] leading-relaxed text-slate-500">
        Illustrative only: single balance, no contributions, constant {DEFAULT_GROSS_RETURN_PCT}%
        gross return, nominal dollars. General information, not financial advice.
      </p>
    </div>
  );
}
