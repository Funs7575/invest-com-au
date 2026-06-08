"use client";

import { useState, useCallback } from "react";

interface ResultRow {
  brokerName: string;
  totalCost: number;
  brokerage: number;
  fxCost: number;
  pctOfTrade: number;
}

interface Props {
  calculatorId: string;
  tradeAmount: number;
  market: "asx" | "us";
  results: ResultRow[];
}

export default function CalculatorExplainButton({ calculatorId, tradeAmount, market, results }: Props) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const buildContext = useCallback((): string => {
    if (results.length === 0) return "";
    const cheapest = results[0];
    const mostExpensive = results[results.length - 1];
    const lines: string[] = [
      `Trade amount: $${tradeAmount.toLocaleString("en-AU")} on ${market === "asx" ? "ASX" : "US"} market.`,
      `Cheapest broker: ${cheapest.brokerName} at $${cheapest.totalCost.toFixed(2)} total (${cheapest.pctOfTrade.toFixed(2)}% of trade).`,
    ];
    if (results.length >= 2 && mostExpensive.brokerName !== cheapest.brokerName) {
      lines.push(
        `Most expensive: ${mostExpensive.brokerName} at $${mostExpensive.totalCost.toFixed(2)} (${mostExpensive.pctOfTrade.toFixed(2)}% of trade).`,
      );
      lines.push(
        `Switching saves $${(mostExpensive.totalCost - cheapest.totalCost).toFixed(2)} per trade.`,
      );
    }
    if (market === "us" && cheapest.fxCost > 0) {
      lines.push(
        `FX cost included in cheapest: $${cheapest.fxCost.toFixed(2)} (brokerage $${cheapest.brokerage.toFixed(2)} + FX margin $${cheapest.fxCost.toFixed(2)}).`,
      );
    }
    const sample = results.slice(0, 5).map(
      (r) =>
        `${r.brokerName}: $${r.totalCost.toFixed(2)}${market === "us" ? ` (FX $${r.fxCost.toFixed(2)})` : ""}`,
    );
    lines.push("Top brokers: " + sample.join(", ") + ".");
    return lines.join(" ");
  }, [results, tradeAmount, market]);

  const handleExplain = useCallback(async () => {
    if (open && explanation) {
      setOpen(false);
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    const context = buildContext();
    if (!context) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/calculator/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calculatorId, context }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not load explanation. Try again shortly.");
        setOpen(true);
        return;
      }

      const data = (await res.json()) as { explanation?: string };
      setExplanation(data.explanation ?? "");
      setOpen(true);
    } catch {
      setError("Could not load explanation. Try again shortly.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [open, explanation, buildContext, calculatorId]);

  if (results.length === 0) return null;

  return (
    <div className="mt-3 md:mt-4">
      <button
        onClick={handleExplain}
        disabled={loading}
        aria-busy={loading}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <svg aria-hidden="true" className="w-3.5 h-3.5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Explaining…
          </>
        ) : open ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Hide explanation
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Explain these numbers
          </>
        )}
      </button>

      {open && (
        <div className="mt-2 p-3 md:p-4 bg-blue-50/60 border border-blue-100 rounded-xl text-xs md:text-sm text-slate-700 leading-relaxed motion-safe:animate-[fadeIn_0.25s_ease-out]">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <p className="whitespace-pre-line">{explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
