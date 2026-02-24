import type { Broker } from "@/lib/types";

export default function PromoBadge({ broker }: { broker: Broker }) {
  if (!broker.deal || !broker.deal_text) return null;

  const expiryFormatted = broker.deal_expiry
    ? new Date(broker.deal_expiry).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <span className="relative group/promo inline-flex ml-1.5">
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[0.69rem] font-semibold text-amber-700 cursor-help whitespace-nowrap">
        Promo
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover/promo:opacity-100 transition-opacity z-10 max-w-[220px] whitespace-normal text-center leading-tight">
        {broker.deal_text}
        {expiryFormatted && (
          <span className="block text-[0.69rem] text-slate-300 mt-0.5">
            Expires {expiryFormatted}
          </span>
        )}
      </span>
    </span>
  );
}
