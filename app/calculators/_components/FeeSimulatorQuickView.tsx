"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import {
  getParam, useUrlSync, CalcSection, InputField, ResultBox, ShareResultsButton,
} from "./CalcShared";
import type { Broker } from "@/lib/types";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function parseFee(feeStr: string | null | undefined): { flat: number; pct: number } {
  if (!feeStr) return { flat: 0, pct: 0 };
  const s = feeStr.replace(/,/g, "");
  const pctMatch = s.match(/([\d.]+)%/);
  if (pctMatch) return { flat: 0, pct: parseFloat(pctMatch[1]) / 100 };
  const flatMatch = s.match(/\$([\d.]+)/);
  if (flatMatch) return { flat: parseFloat(flatMatch[1]), pct: 0 };
  return { flat: 0, pct: 0 };
}

function calcAnnualCost(broker: Broker, trades: number, avgSize: number, usAlloc: number): number {
  const { flat: asxFlat, pct: asxPct } = parseFee(broker.asx_fee);
  const { flat: usFlat, pct: usPct } = parseFee(broker.us_fee);
  const fxRate = broker.fx_rate ? broker.fx_rate / 100 : 0.007;
  const asxTrades = Math.round(trades * (1 - usAlloc / 100));
  const usTrades = Math.round(trades * (usAlloc / 100));
  const asxCost = asxTrades * Math.max(asxFlat, asxPct * avgSize);
  const usCost = usTrades * Math.max(usFlat, usPct * avgSize);
  const fxCost = usTrades * avgSize * fxRate;
  return asxCost + usCost + fxCost;
}

export default function FeeSimulatorQuickView({ brokers, searchParams }: Props) {
  const [trades, setTrades] = useState(() => getParam(searchParams, "fs_t") || "24");
  const [size, setSize] = useState(() => getParam(searchParams, "fs_s") || "5000");
  const [us, setUs] = useState(() => getParam(searchParams, "fs_u") || "0");

  useUrlSync({ calc: "fee-simulator", fs_t: trades, fs_s: size, fs_u: us });

  const ranked = useMemo(() => {
    const t = parseFloat(trades) || 0;
    const s = parseFloat(size) || 0;
    const u = Math.min(100, Math.max(0, parseFloat(us) || 0));
    if (t <= 0 || s <= 0 || brokers.length === 0) return [];
    return brokers
      .filter((b) => b.status !== "hidden" && b.asx_fee)
      .map((b) => ({ broker: b, cost: calcAnnualCost(b, t, s, u) }))
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 5);
  }, [brokers, trades, size, us]);

  const mostExpensive = ranked.length > 0 ? ranked[ranked.length - 1].cost : 0;
  const maxBar = mostExpensive > 0 ? mostExpensive : 1;
  const showResults = ranked.length > 0;

  return (
    <CalcSection
      id="fee-simulator"
      iconName="sliders"
      title="Fee Simulator"
      desc="Top 5 cheapest brokers for your trading profile"
    >
      <p className="text-sm text-slate-600 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
        See your fee profile across the top 5 brokers. Open the full tool for real-time slider exploration of all platforms.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Trades Per Year" value={trades} onChange={setTrades} placeholder="24" />
        <InputField label="Avg Trade Size" value={size} onChange={setSize} prefix="$" placeholder="5000" />
        <InputField label="US Allocation" value={us} onChange={setUs} suffix="%" placeholder="0" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 mb-4">
            <ResultBox label="Cheapest Annual Cost" value={fmt(ranked[0].cost)} positive />
            <ResultBox
              label="Max Savings vs Top 5 Worst"
              value={fmt(mostExpensive - ranked[0].cost)}
              positive
            />
          </div>

          <div className="space-y-2.5">
            <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Top 5 brokers by annual cost
            </p>
            {ranked.map((r, i) => {
              const savings = mostExpensive - r.cost;
              const width = (r.cost / maxBar) * 100;
              return (
                <div key={r.broker.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">
                      {i + 1}. {r.broker.name}
                    </span>
                    <span className="font-bold text-slate-900">
                      {fmt(r.cost)}
                      {savings > 0 && i === 0 && (
                        <span className="text-emerald-600 font-semibold ml-2">save {fmt(savings)}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-6 bg-slate-100 rounded-md overflow-hidden">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${
                        i === 0 ? "bg-emerald-500" : i === 1 ? "bg-emerald-400" : i === 2 ? "bg-teal-400" : i === 3 ? "bg-cyan-400" : "bg-sky-400"
                      }`}
                      style={{ width: `${Math.max(width, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter your trading profile to see the top 5 cheapest brokers.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <Link
          href="/fee-simulator"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <Icon name="sliders" size={14} />
          Open full Fee Simulator →
        </Link>
        <ShareResultsButton />
      </div>
    </CalcSection>
  );
}
