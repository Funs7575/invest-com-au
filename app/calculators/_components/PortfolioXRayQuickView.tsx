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

function initialSP(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

export default function PortfolioXRayQuickView({ brokers }: Props) {
  const [holdings, setHoldings] = useState(() => getParam(initialSP(), "pxr_h") || "8");
  const [value, setValue] = useState(() => getParam(initialSP(), "pxr_v") || "50000");
  const [sectors, setSectors] = useState(() => getParam(initialSP(), "pxr_s") || "4");

  useUrlSync({ calc: "portfolio-xray", pxr_h: holdings, pxr_v: value, pxr_s: sectors });

  const defaultBroker = useMemo(() => {
    return brokers.find((b) => b.editors_pick) || brokers[0];
  }, [brokers]);

  const result = useMemo(() => {
    const h = Math.max(1, parseInt(holdings) || 0);
    const v = parseFloat(value) || 0;
    const s = Math.min(10, Math.max(1, parseInt(sectors) || 0));

    const avgHoldingValue = v / h;
    const avgHoldingPct = h > 0 ? (100 / h) : 0;
    const concentrationRisk = avgHoldingPct > 20;

    // Simple diversification score: combines holdings count and sector spread
    const holdingsScore = Math.min(h / 15, 1); // 15+ holdings = max
    const sectorScore = s / 10;
    const score = (holdingsScore * 0.5 + sectorScore * 0.5) * 100;

    let rating: "Low" | "Moderate" | "High";
    if (score < 35) rating = "Low";
    else if (score < 65) rating = "Moderate";
    else rating = "High";

    // Estimated annual fee drag at default broker — assume ~6 trades/year at avg size
    let feeDrag = 0;
    if (defaultBroker && v > 0) {
      const { flat, pct } = parseFee(defaultBroker.asx_fee);
      const tradesPerYear = Math.min(h * 2, 24);
      const perTrade = Math.max(flat, pct * avgHoldingValue);
      feeDrag = perTrade * tradesPerYear;
    }
    const feeDragPct = v > 0 ? (feeDrag / v) * 100 : 0;

    return { rating, concentrationRisk, avgHoldingValue, avgHoldingPct, feeDrag, feeDragPct, score };
  }, [holdings, value, sectors, defaultBroker]);

  const showResults = (parseFloat(value) || 0) > 0 && (parseInt(holdings) || 0) > 0;

  return (
    <CalcSection
      id="portfolio-xray"
      iconName="pie-chart"
      title="Portfolio X-Ray"
      desc="Quick portfolio diversification check"
    >
      <p className="text-sm text-slate-600 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
        Get a snapshot of your portfolio in 30 seconds. For full analysis (sectors, geography, fee drag), open the full tool.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <InputField label="Number of Holdings" value={holdings} onChange={setHoldings} placeholder="8" />
        <InputField label="Total Portfolio Value" value={value} onChange={setValue} prefix="$" placeholder="50000" />
        <InputField label="Unique Sectors (1-10)" value={sectors} onChange={setSectors} placeholder="4" />
      </div>

      {showResults ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <ResultBox
              label="Diversification"
              value={result.rating}
              positive={result.rating === "High"}
              negative={result.rating === "Low"}
            />
            <ResultBox
              label="Avg Holding Size"
              value={`${result.avgHoldingPct.toFixed(1)}%`}
              negative={result.concentrationRisk}
            />
            <ResultBox
              label="Est. Annual Fee Drag"
              value={`${fmt(result.feeDrag)} (${result.feeDragPct.toFixed(2)}%)`}
            />
          </div>

          {result.concentrationRisk && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-3">
              <strong>Concentration risk:</strong> your average holding exceeds 20% of the portfolio. Consider spreading across more positions.
            </div>
          )}

          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-semibold">Diversification score</span>
              <span className="text-slate-700 font-bold">{Math.round(result.score)}/100</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  result.rating === "High" ? "bg-emerald-500" : result.rating === "Moderate" ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, result.score))}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Enter your portfolio details to get a snapshot.</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <Link
          href="/portfolio-xray"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800"
        >
          <Icon name="pie-chart" size={14} />
          Open full Portfolio X-Ray tool →
        </Link>
        <ShareResultsButton />
      </div>
    </CalcSection>
  );
}
