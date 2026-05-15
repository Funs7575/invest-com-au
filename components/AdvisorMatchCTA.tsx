import Link from "next/link";
import Icon from "@/components/Icon";

interface AdvisorMatchCTAProps {
  /** The wizard need key to pre-fill (e.g. "mortgage", "tax", "planning") */
  needKey: string;
  /** Headline shown above the CTA */
  headline: string;
  /** Supporting description */
  description: string;
}

const NEED_KEY_TO_ICON: Record<string, string> = {
  mortgage: "landmark",
  buyers: "search",
  planning: "trending-up",
  insurance: "shield",
  smsf: "building",
  tax: "calculator",
  wealth: "briefcase",
  estate: "file-text",
  property: "home",
  realestate: "map-pin",
  crypto: "bitcoin",
  agedcare: "heart",
  debt: "credit-card",
};

export default function AdvisorMatchCTA({ needKey, headline, description }: AdvisorMatchCTAProps) {
  const icon = NEED_KEY_TO_ICON[needKey] || "users";

  return (
    <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name={icon} size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-bold text-slate-900 mb-0.5">{headline}</h3>
          <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">{description}</p>
          <Link
            href={`/find-advisor?need=${needKey}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
          >
            Get Matched Free <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
