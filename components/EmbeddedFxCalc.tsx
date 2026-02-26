"use client";

import { useState, useEffect, useRef } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, formatPercent, AFFILIATE_REL } from "@/lib/tracking";
import Icon from "@/components/Icon";

function AnimatedNumber({ value, prefix = "$" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const ref = useRef(value);

  useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 400;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    ref.current = end;
  }, [value]);

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-AU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}

const BIG4_FX_RATE = 0.7;

export default function EmbeddedFxCalc({ brokers }: { brokers: Broker[] }) {
  const [amount, setAmount] = useState(10000);

  const fxBrokers = brokers
    .filter((b) => b.fx_rate != null && b.fx_rate > 0)
    .sort((a, b) => (a.fx_rate ?? 999) - (b.fx_rate ?? 999));

  const big4Cost = amount * (BIG4_FX_RATE / 100);
  const cheapest = fxBrokers[0];
  const cheapestCost = cheapest ? amount * ((cheapest.fx_rate ?? 0) / 100) : 0;
  const savings = big4Cost - cheapestCost;

  return (
    <div className="my-10 border-2 border-slate-700/30 rounded-2xl overflow-hidden bg-gradient-to-b from-slate-50/50 to-white">
      {/* Header */}
      <div className="bg-brand text-white px-6 py-4">
        <div className="flex items-center gap-2">
          <Icon name="globe" size={20} className="text-slate-200 shrink-0" />
          <h3 className="font-extrabold text-base">
            FX Cost Calculator — How Much Are You Really Paying?
          </h3>
        </div>
        <p className="text-sm text-slate-300 mt-1">
          Drag the slider to see what your broker charges vs. the Big 4 banks.
        </p>
      </div>

      <div className="p-6">
        {/* Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm font-semibold text-slate-700">
              Trade Amount
            </label>
            <span className="text-2xl font-extrabold text-brand">
              ${amount.toLocaleString("en-AU")}
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={50000}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-slate-700"
            style={{
              background: `linear-gradient(to right, #15803d ${
                ((amount - 1000) / 49000) * 100
              }%, #e2e8f0 ${((amount - 1000) / 49000) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>$1,000</span>
            <span>$25,000</span>
            <span>$50,000</span>
          </div>
        </div>

        {/* Savings Hero */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6 text-center">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            You could save
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-emerald-700">
            <AnimatedNumber value={savings} />
          </div>
          <div className="text-sm text-emerald-600 mt-1">
            per trade vs. Big 4 banks (0.70% FX)
            {cheapest && (
              <span>
                {" "}
                by switching to{" "}
                <strong>{cheapest.name}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="space-y-2.5 mb-6">
          {/* Big 4 Bank bar */}
          <div className="flex items-center gap-3">
            <div className="w-28 text-xs font-semibold text-slate-600 text-right shrink-0">
              Big 4 Bank
            </div>
            <div className="flex-1 relative">
              <div
                className="h-8 rounded-lg bg-red-400 transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: "100%" }}
              >
                <span className="text-xs font-bold text-white">
                  ${big4Cost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          {/* Broker bars */}
          {fxBrokers.slice(0, 5).map((b) => {
            const cost = amount * ((b.fx_rate ?? 0) / 100);
            const pct = big4Cost > 0 ? (cost / big4Cost) * 100 : 0;
            return (
              <div key={b.slug} className="flex items-center gap-3">
                <div className="w-28 text-xs font-semibold text-slate-600 text-right shrink-0 truncate">
                  {b.name}
                </div>
                <div className="flex-1 relative">
                  <div
                    className="h-8 rounded-lg transition-all duration-500 flex items-center pr-2"
                    style={{
                      width: `${Math.max(pct, 3)}%`,
                      backgroundColor:
                        pct < 15
                          ? "#10b981"
                          : pct < 50
                          ? "#f59e0b"
                          : "#ef4444",
                    }}
                  >
                    {pct > 12 && (
                      <span className="text-xs font-bold text-white ml-auto">
                        ${cost.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {pct <= 12 && (
                    <span className="absolute left-[calc(3%+8px)] top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700">
                      ${cost.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        {cheapest && (
          <a
            href={getAffiliateLink(cheapest)}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() =>
              trackClick(
                cheapest.slug,
                cheapest.name,
                "fx-calc-embedded",
                "/article/best-intl-brokers",
                "calculator"
              )
            }
            className="block w-full text-center px-6 py-3 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 hover:scale-[1.02] transition-all"
          >
            Open {cheapest.name} Account — {formatPercent(cheapest.fx_rate ?? 0)}{" "}
            FX &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
