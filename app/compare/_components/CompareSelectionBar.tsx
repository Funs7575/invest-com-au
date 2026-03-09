"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { renderStars } from "@/lib/tracking";
import BrokerLogo from "@/components/BrokerLogo";
import Icon from "@/components/Icon";

interface Props {
  brokers: Broker[];
  selected: Set<string>;
  showMobileCompare: boolean;
  onToggleMobileCompare: () => void;
  onToggleSelected: (slug: string) => void;
}

export default function CompareSelectionBar({
  brokers,
  selected,
  showMobileCompare,
  onToggleMobileCompare,
  onToggleSelected,
}: Props) {
  if (selected.size < 2) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white py-2.5 md:py-3 shadow-lg bounce-in-up" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
      <div className="container-custom flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-1.5 shrink-0 md:hidden">
            {Array.from(selected).slice(0, 4).map(slug => {
              const br = brokers.find(b => b.slug === slug);
              if (!br) return null;
              return (
                <BrokerLogo key={slug} broker={br} size="xs" className="border-2 border-slate-900 rounded-full" />
              );
            })}
          </div>
          <span className="text-xs md:text-sm font-semibold truncate">
            {selected.size}/4 selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile: Quick Compare inline */}
          <button
            onClick={onToggleMobileCompare}
            className="md:hidden shrink-0 px-3 py-2 min-h-[44px] inline-flex items-center bg-slate-700 text-white font-bold text-xs rounded-lg"
          >
            {showMobileCompare ? "Close" : "Quick Compare"}
          </button>
          <Link
            href={`/versus?vs=${Array.from(selected).join(',')}`}
            className="shrink-0 px-4 py-2 min-h-[44px] inline-flex items-center md:px-5 md:py-2 bg-white text-slate-700 font-bold text-xs md:text-sm rounded-lg hover:bg-slate-50 transition-colors"
          >
            Full Compare →
          </Link>
        </div>
      </div>

      {/* Mobile swipe comparison panel */}
      {showMobileCompare && (
        <div className="md:hidden mt-2 pb-1">
          <div className="container-custom">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 flex gap-2 snap-x snap-mandatory">
              {Array.from(selected).map(slug => {
                const br = brokers.find(b => b.slug === slug);
                if (!br) return null;
                return (
                  <div key={slug} className="snap-center shrink-0 w-[70vw] bg-white rounded-xl p-3 text-slate-900">
                    <div className="flex items-center gap-2 mb-2">
                      <BrokerLogo broker={br} size="xs" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate">{br.name}</div>
                        <div className="text-amber-500 text-xs">{renderStars(br.rating || 0)} {br.rating}</div>
                      </div>
                      <button onClick={() => onToggleSelected(br.slug)} className="ml-auto text-slate-400 hover:text-red-500 shrink-0">
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.62rem]">
                      <div><span className="text-slate-400">ASX Fee</span><div className="font-bold text-slate-800">{br.asx_fee || "N/A"}</div></div>
                      <div><span className="text-slate-400">US Fee</span><div className="font-bold text-slate-800">{br.us_fee || "N/A"}</div></div>
                      <div><span className="text-slate-400">FX Rate</span><div className="font-bold text-slate-800">{br.fx_rate != null ? `${br.fx_rate}%` : "N/A"}</div></div>
                      <div><span className="text-slate-400">CHESS</span><div className="font-bold text-slate-800">{br.chess_sponsored ? "Yes" : "No"}</div></div>
                    </div>
                    <Link href={`/broker/${br.slug}`} className="block mt-2 text-center text-[0.62rem] font-semibold text-violet-600 hover:text-violet-800">
                      Full Review →
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="text-[0.56rem] text-slate-400 text-center mt-1.5">Swipe to compare</p>
          </div>
        </div>
      )}
    </div>
  );
}
