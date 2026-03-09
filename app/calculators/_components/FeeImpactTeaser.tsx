"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import Icon from "@/components/Icon";
import { getParam, useUrlSync, ShareResultsButton, CalcSection, InputField } from "./CalcShared";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

export default function FeeImpactTeaser({ brokers, searchParams }: Props) {
  const [trades, setTrades] = useState(() => getParam(searchParams, "fi_tpm") || "4");
  const tpm = parseFloat(trades) || 0;

  useUrlSync({ calc: "fee-impact", fi_tpm: trades });

  const topThree = useMemo(() => {
    return brokers
      .map((b) => {
        const fee = b.asx_fee_value ?? null;
        if (fee === null || fee >= 999) return null;
        return { broker: b, annual: tpm * 12 * fee };
      })
      .filter(Boolean)
      .sort((a, b) => a!.annual - b!.annual)
      .slice(0, 3) as { broker: Broker; annual: number }[];
  }, [brokers, tpm]);

  return (
    <CalcSection
      id="fee-impact"
      iconName="calculator"
      title="Personal Fee Impact Calculator"
      desc="See your total annual platform fees based on your real trading habits — brokerage, FX, and inactivity charges."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-5">
          <InputField label="ASX Trades per Month" value={trades} onChange={setTrades} placeholder="4" />

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">PRO</span>
              <span className="font-bold text-amber-900">Full Calculator</span>
            </div>
            <p className="text-amber-800 text-xs leading-relaxed mb-3">
              The full version includes US trades, FX fees, inactivity charges, and ranks every platform — not just the top 3.
            </p>
            <Link
              href="/fee-impact"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors"
            >
              Open Full Calculator →
            </Link>
          </div>
        </div>

        <div className="lg:col-span-8">
          {topThree.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Top 3 Cheapest (ASX Only)</h3>
              {topThree.map((r, i) => (
                <div
                  key={r.broker.slug}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
                    i === 0 ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                  }`}
                >
                  <span className="text-xs font-bold text-slate-400 w-5">#{i + 1}</span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                  >
                    {r.broker.icon || r.broker.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-slate-900">{r.broker.name}</div>
                    <div className="text-xs text-slate-500">{r.broker.asx_fee || "N/A"}/trade</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-slate-900">{formatCurrency(r.annual)}</div>
                    <div className="text-xs text-slate-500">/year</div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-2">
                This preview only shows ASX brokerage. <Link href="/fee-impact" className="text-slate-700 hover:underline font-medium">Open the full calculator</Link> to include US trades, FX fees, and inactivity charges.
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center flex flex-col items-center justify-center h-full">
              <Icon name="calculator" size={32} className="text-slate-300 mx-auto mb-3 md:mb-4 md:!w-12 md:!h-12" />
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">Enter Your Trades</h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-xs">Type your monthly ASX trades to see cheapest options.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
