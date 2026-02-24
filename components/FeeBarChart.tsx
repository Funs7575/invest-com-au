"use client";

import type { Broker } from "@/lib/types";

export default function FeeBarChart({
  brokers,
  tradeAmount = 10000,
}: {
  brokers: Broker[];
  tradeAmount?: number;
}) {
  const BIG4_RATE = 0.7;
  const big4Cost = tradeAmount * (BIG4_RATE / 100);

  const items = [
    { name: "CommSec (Big 4)", cost: big4Cost, color: "#ef4444" },
    ...brokers
      .filter((b) => b.fx_rate != null && b.fx_rate > 0)
      .sort((a, b) => (b.fx_rate ?? 0) - (a.fx_rate ?? 0))
      .map((b) => ({
        name: b.name,
        cost: tradeAmount * ((b.fx_rate ?? 0) / 100),
        color: b.color,
      })),
  ];

  const maxCost = Math.max(...items.map((i) => i.cost));

  return (
    <div className="my-8 border border-slate-200 rounded-xl p-6 bg-white">
      <h4 className="font-extrabold text-sm mb-1 text-brand">
        FX Cost on a ${tradeAmount.toLocaleString("en-AU")} Trade
      </h4>
      <p className="text-xs text-slate-500 mb-4">
        Currency conversion cost comparison across brokers
      </p>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = maxCost > 0 ? (item.cost / maxCost) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-32 sm:w-44 text-xs font-semibold text-slate-600 text-right shrink-0 truncate">
                {item.name}
              </div>
              <div className="flex-1 relative h-8">
                <div
                  className="h-full rounded-lg flex items-center transition-all duration-700"
                  style={{
                    width: `${Math.max(pct, 4)}%`,
                    backgroundColor: item.color,
                    opacity: item.name.includes("Big 4") ? 1 : 0.8,
                  }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-xs font-bold"
                  style={{
                    left: `${Math.max(pct, 4) + 1}%`,
                    color: "#334155",
                  }}
                >
                  ${item.cost.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[0.69rem] text-slate-400 mt-3 text-center">
        Based on a ${tradeAmount.toLocaleString("en-AU")} AUD &rarr; USD conversion. Big 4 rate: 0.70%.
      </p>
    </div>
  );
}
