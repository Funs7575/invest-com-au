import type { Broker } from "@/lib/types";

const TIER_CONFIG = {
  featured_partner: {
    label: "Featured Partner",
    disclosure: "Sponsored",
    bgClass: "bg-blue-50 border-blue-200",
    textClass: "text-blue-700",
    disclosureClass: "text-blue-500",
  },
  editors_pick: {
    label: "Editor\u2019s Pick",
    disclosure: "Promoted",
    bgClass: "bg-green-50 border-green-200",
    textClass: "text-green-700",
    disclosureClass: "text-green-500",
  },
  deal_of_month: {
    label: "Deal of the Month",
    disclosure: "Sponsored",
    bgClass: "bg-amber-50 border-amber-200",
    textClass: "text-amber-700",
    disclosureClass: "text-amber-500",
  },
} as const;

export default function SponsorBadge({ broker }: { broker: Broker }) {
  if (!broker.sponsorship_tier) return null;
  const config = TIER_CONFIG[broker.sponsorship_tier];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-[0.6rem] font-bold ${config.bgClass} ${config.textClass}`}
    >
      {config.label}
      <span className={`${config.disclosureClass} font-medium`}>
        &middot; {config.disclosure}
      </span>
    </span>
  );
}

export { TIER_CONFIG };
