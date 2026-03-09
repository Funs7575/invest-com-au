"use client";

import Link from "next/link";
import CountUp from "@/components/CountUp";
import Sparkline from "@/components/Sparkline";

interface CardData {
  label: string;
  value: number;
  href: string;
  color: string;
  icon: string;
  sparkline?: number[];
  trend?: number;
  prefix?: string;
  decimals?: number;
}

interface Props {
  loading: boolean;
  cards: CardData[];
  colorMap: Record<string, string>;
  sparklineColors: Record<string, string>;
}

export default function AdminKpiCards({ loading, cards, colorMap, sparklineColors }: Props) {
  return (
    <div id="admin-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {loading
        ? Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-6 bg-slate-200 rounded mb-3" />
              <div className="h-8 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))
        : cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all group ${colorMap[card.color]?.split(" ")[2] || "border-slate-200"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{card.icon}</span>
                {card.sparkline && card.sparkline.length > 1 && (
                  <Sparkline
                    data={card.sparkline}
                    width={60}
                    height={20}
                    color={sparklineColors[card.color] || "#3b82f6"}
                  />
                )}
              </div>
              <div className={`text-2xl font-bold ${colorMap[card.color]?.split(" ")[1] || "text-slate-900"}`}>
                <CountUp
                  end={card.value}
                  prefix={card.prefix || ""}
                  decimals={card.decimals || 0}
                  duration={1200}
                />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-slate-500">{card.label}</span>
                {card.trend !== undefined && card.trend !== 0 && (
                  <span className={`text-[0.65rem] font-semibold ${card.trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {card.trend > 0 ? "+" : ""}{card.trend}%
                  </span>
                )}
              </div>
            </Link>
          ))}
    </div>
  );
}
