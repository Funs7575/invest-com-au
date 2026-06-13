"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import type { PricingPositionResponse } from "@/app/api/advisor-auth/pricing-position/route";

/** Whole-dollar AUD from cents — local copy; the fee-benchmark lib is server-only. */
function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

/**
 * "Where you price" card for the advisor portal analytics tab.
 *
 * Shows where the advisor's typical marketplace quote sits relative to
 * peer quotes in their main category — information about market pricing,
 * never an instruction to change fees. Renders nothing judgemental:
 * no "too high/too low", no targets.
 */
export default function PricingPositionCard() {
  const [position, setPosition] = useState<PricingPositionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/advisor-auth/pricing-position");
        if (!r.ok) throw new Error("fetch failed");
        const data = (await r.json()) as PricingPositionResponse;
        if (!cancelled) {
          setPosition(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-bold text-slate-900">Where You Price</h3>
        {position?.status === "ok" && (
          <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            vs {position.peerCount} peer quotes
          </span>
        )}
      </div>
      <p className="text-[0.6rem] text-slate-500 mb-3">
        Your typical marketplace quote vs anonymised peer quotes in your main category, last 12
        months. Market information only — not guidance on what to charge.
      </p>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin shrink-0"
          />
          Loading pricing position...
        </div>
      )}

      {error && (
        <p className="text-xs text-slate-500 py-2">Pricing position unavailable — check back soon.</p>
      )}

      {!loading && !error && position?.status === "no_bids" && (
        <p className="text-xs text-slate-600 py-2 leading-relaxed">
          Submit quotes on marketplace requests to unlock your pricing position. Once you have quoted
          and {`there are enough peer quotes in your category, you'll`} see where your pricing sits.
        </p>
      )}

      {!loading && !error && position?.status === "insufficient_peers" && (
        <p className="text-xs text-slate-600 py-2 leading-relaxed">
          Your main category is <strong>{position.label}</strong>, but there{" "}
          {position.peerCount === 1 ? "is only 1 peer quote" : `are only ${position.peerCount} peer quotes`}{" "}
          in the last 12 months — the benchmark unlocks at {position.minSample}. {`We'll`} show your
          position as soon as enough peer quotes accumulate.
        </p>
      )}

      {!loading && !error && position?.status === "ok" && (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-xl font-bold text-slate-900">{dollars(position.typicalCents)}</p>
            <p className="text-xs text-slate-600">
              your typical {position.label} quote ({position.ownBidCount}{" "}
              {position.ownBidCount === 1 ? "quote" : "quotes"})
            </p>
          </div>

          {/* Position bar — neutral, no good/bad colouring */}
          <div className="mt-3" aria-hidden="true">
            <div className="relative h-2 rounded-full bg-slate-100">
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-700 shadow"
                style={{ left: `${Math.min(98, Math.max(2, position.percentile))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[0.6rem] text-slate-500">
              <span>Lower priced</span>
              <span>Higher priced</span>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-700 leading-relaxed">
            Your typical quote is higher than about <strong>{position.percentile}%</strong> of peer{" "}
            {position.label} quotes nationally. Peer median is {dollars(position.peerMedianCents)},
            with the middle 50% of quotes between {dollars(position.peerP25Cents)} and{" "}
            {dollars(position.peerP75Cents)}.
          </p>

          <p className="mt-2 text-[0.6rem] text-slate-500 leading-relaxed flex items-start gap-1.5">
            <Icon name="info" size={11} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Based on accepted and live quotes on public marketplace requests. Scope and service
              differ between practices — pricing decisions are entirely yours.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
