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

function calcAnnualCost(broker: Broker, trades: number, avgSize: number): number {
  const { flat, pct } = parseFee(broker.asx_fee);
  return trades * Math.max(flat, pct * avgSize);
}

export default function QuickAuditQuickView({ brokers, searchParams }: Props) {
  const activeBrokers = useMemo(
    () => brokers.filter((b) => b.status !== "hidden" && b.asx_fee),
    [brokers]
  );

  const [brokerSlug, setBrokerSlug] = useState(
    () => getParam(searchParams, "qa_b") || activeBrokers[0]?.slug || ""
  );
  const [trades, setTrades] = useState(() => getParam(searchParams, "qa_t") || "24");
  const [size, setSize] = useState(() => getParam(searchParams, "qa_s") || "5000");

  useUrlSync({ calc: "quick-audit", qa_b: brokerSlug, qa_t: trades, qa_s: size });

  const result = useMemo(() => {
    const t = parseFloat(trades) || 0;
    const s = parseFloat(size) || 0;
    const current = activeBrokers.find((b) => b.slug === brokerSlug);
    if (!current || t <= 0 || s <= 0) return null;

    const currentCost = calcAnnualCost(current, t, s);
    const ranked = activeBrokers
      .map((b) => ({ broker: b, cost: calcAnnualCost(b, t, s) }))
      .sort((a, b) => a.cost - b.cost);
    const cheapest = ranked[0];
    const savings = currentCost - cheapest.cost;

    return { current, currentCost, cheapest: cheapest.broker, cheapestCost: cheapest.cost, savings };
  }, [activeBrokers, brokerSlug, trades, size]);

  return (
    <CalcSection
      id="quick-audit"
      iconName="search"
      title="Quick Audit"
      desc="Instant fee snapshot vs the cheapest broker"
    >
      <p className="text-sm text-slate-600 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
        Get a 30-second snapshot of your annual fees. Open the full audit for the complete savings report.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="block text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 md:mb-1.5">
            Current Broker
          </label>
          <select
            value={brokerSlug}
            onChange={(e) => setBrokerSlug(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 md:py-2.5 text-sm shadow-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700 transition-all font-medium"
          >
            {activeBrokers.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <InputField label="Trades Per Year" value={trades} onChange={setTrades} placeholder="24" />
        <InputField label="Avg Trade Size" value={size} onChange={setSize} prefix="$" placeholder="5000" />
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <ResultBox
              label={`You're paying at ${result.current.name}`}
              value={`${fmt(result.currentCost)}/yr`}
              negative={result.savings > 0}
            />
            <ResultBox
              label={`Cheapest: ${result.cheapest.name}`}
              value={`${fmt(result.cheapestCost)}/yr`}
            />
            <ResultBox
              label="Annual Savings"
              value={fmt(Math.max(0, result.savings))}
              positive={result.savings > 0}
            />
          </div>

          {result.savings > 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              Switching from <strong>{result.current.name}</strong> to <strong>{result.cheapest.name}</strong> could save you <strong>{fmt(result.savings)}</strong> per year.
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
              You&apos;re already on the cheapest broker for this trading profile.
            </div>
          )}
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Select your broker and enter your trading profile.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <Link
          href="/quick-audit"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <Icon name="search" size={14} />
          Open full Quick Audit (with PDF report) →
        </Link>
        <ShareResultsButton />
      </div>
    </CalcSection>
  );
}
