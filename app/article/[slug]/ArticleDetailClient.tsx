"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";

export default function ArticleDetailClient({
  broker,
  slug,
}: {
  broker: Broker;
  slug: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
      {/* Broker Icon */}
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: `${broker.color}20`, color: broker.color }}
      >
        {broker.icon || broker.name.charAt(0)}
      </div>

      {/* Broker Info */}
      <div className="flex-1 min-w-0">
        <a
          href={`/broker/${broker.slug}`}
          className="font-bold text-sm hover:text-green-700 transition-colors"
        >
          {broker.name}
        </a>
        {broker.tagline && (
          <p className="text-xs text-slate-500 line-clamp-1">{broker.tagline}</p>
        )}
      </div>

      {/* CTA Button */}
      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() =>
          trackClick(
            broker.slug,
            broker.name,
            "article-related-broker",
            `/article/${slug}`,
            broker.layer
          )
        }
        className="shrink-0 px-4 py-2 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 transition-colors"
      >
        {getBenefitCta(broker, "review")}
      </a>
    </div>
  );
}
