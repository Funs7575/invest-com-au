"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { STATE_SURCHARGES, getFirbFee } from "@/lib/firb-data";

const STATE_CODES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;
type StateCode = typeof STATE_CODES[number];

// Very rough stamp duty estimate for illustration (not legal advice)
function estimateStampDuty(price: number, state: StateCode): number {
  if (state === "NSW") {
    if (price <= 16_000) return Math.max(price * 0.0125, 20);
    if (price <= 35_000) return 200 + (price - 16_000) * 0.015;
    if (price <= 100_000) return 485 + (price - 35_000) * 0.0175;
    if (price <= 300_000) return 1_622 + (price - 100_000) * 0.035;
    if (price <= 1_000_000) return 8_622 + (price - 300_000) * 0.045;
    return 40_122 + (price - 1_000_000) * 0.055;
  }
  if (state === "VIC") {
    if (price <= 25_000) return price * 0.014;
    if (price <= 130_000) return 350 + (price - 25_000) * 0.024;
    if (price <= 440_000) return 2_870 + (price - 130_000) * 0.06;
    if (price <= 550_000) return 21_470 + (price - 440_000) * 0.06;
    return 28_070 + (price - 550_000) * 0.065;
  }
  if (state === "QLD") {
    if (price <= 5_000) return 0;
    if (price <= 75_000) return (price - 5_000) * 0.015;
    if (price <= 540_000) return 1_050 + (price - 75_000) * 0.035;
    if (price <= 1_000_000) return 17_325 + (price - 540_000) * 0.045;
    return 38_025 + (price - 1_000_000) * 0.0575;
  }
  // Generic 3.5% estimate for other states
  return price * 0.035;
}

interface Props {
  defaultPrice: number;
  defaultState: string;
}

export default function FirbCostCalculatorInline({ defaultPrice, defaultState }: Props) {
  const [price, setPrice] = useState(defaultPrice);
  const [state, setState] = useState<StateCode>(
    STATE_CODES.includes(defaultState as StateCode) ? (defaultState as StateCode) : "NSW"
  );
  const [expanded, setExpanded] = useState(false);

  const calc = useMemo(() => {
    const surchargeRow = STATE_SURCHARGES.find(s => s.stateCode === state);
    const surchargePercent = surchargeRow?.surchargePercent ?? 7;
    const baseStampDuty = estimateStampDuty(price, state);
    const foreignSurcharge = price * (surchargePercent / 100);
    const firbFee = getFirbFee(price);
    const total = baseStampDuty + foreignSurcharge + firbFee;
    return { baseStampDuty, foreignSurcharge, firbFee, total, surchargePercent };
  }, [price, state]);

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(2)}M`
      : `$${Math.round(n).toLocaleString("en-AU")}`;

  if (!expanded) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none mt-0.5 shrink-0">🌏</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-900 mb-1">Foreign buyer? Calculate your full upfront cost</p>
            <p className="text-xs text-blue-700 mb-3">
              Includes FIRB application fee + foreign buyer stamp duty surcharge ({calc.surchargePercent}% in {state}) + standard stamp duty.
              Total estimated: <span className="font-bold text-blue-900">{fmt(calc.total)}</span>
            </p>
            <button
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Show full cost breakdown →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">🌏</span>
          <h3 className="text-sm font-bold text-blue-900">Foreign Buyer Cost Calculator</h3>
        </div>
        <button onClick={() => setExpanded(false)} className="text-[0.65rem] text-blue-600 hover:text-blue-800 font-semibold">Collapse</button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">Property Price (AUD)</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(Math.max(0, Number(e.target.value)))}
            step={50000}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-blue-900 mb-1">State</label>
          <select
            value={state}
            onChange={e => setState(e.target.value as StateCode)}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
          >
            {STATE_CODES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-lg border border-blue-200 overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-blue-100 flex justify-between items-center">
          <span className="text-xs text-slate-600">Standard stamp duty (est.)</span>
          <span className="text-xs font-bold text-slate-900">{fmt(calc.baseStampDuty)}</span>
        </div>
        <div className="px-4 py-3 border-b border-blue-100 flex justify-between items-center bg-blue-50/50">
          <span className="text-xs text-blue-700">Foreign buyer surcharge ({calc.surchargePercent}% in {state})</span>
          <span className="text-xs font-bold text-blue-800">{fmt(calc.foreignSurcharge)}</span>
        </div>
        <div className="px-4 py-3 border-b border-blue-100 flex justify-between items-center">
          <span className="text-xs text-slate-600">FIRB application fee</span>
          <span className="text-xs font-bold text-slate-900">{fmt(calc.firbFee)}</span>
        </div>
        <div className="px-4 py-3 flex justify-between items-center bg-blue-600">
          <span className="text-xs font-bold text-white">Total upfront (est.)</span>
          <span className="text-base font-extrabold text-white">{fmt(calc.total)}</span>
        </div>
      </div>

      <p className="text-[0.6rem] text-blue-700/70 mb-3">
        Estimates only. Stamp duty calculated using simplified rates — get a conveyancer to confirm exact figures. FIRB fees current as at Jan 2026.
        Temporary residents and Australian expats may have different thresholds.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href="/property/foreign-investment"
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          FIRB application guide →
        </Link>
        <Link
          href="/advisors?type=buyers_agent&specialty=International+Clients"
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-blue-700 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors"
        >
          Find a FIRB-specialist buyer&apos;s agent
        </Link>
      </div>
    </div>
  );
}
