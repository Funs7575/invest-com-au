"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export default function CTAStack({
  broker,
  context,
  showSources = false,
}: {
  broker: Broker;
  context: "review" | "compare" | "calculator" | "versus" | "quiz";
  showSources?: boolean;
}) {
  return (
    <div className="bg-amber-400 text-slate-900 rounded-xl p-8 text-center">
      {/* Primary CTA */}
      <h2 className="text-2xl font-extrabold mb-2">Ready to try {broker.name}?</h2>
      <p className="text-slate-700 mb-4">
        {broker.deal_text || ((broker.asx_fee_value ?? 999) <= 5
          ? `Start trading from just ${broker.asx_fee} per trade.`
          : 'Open an account and start trading in minutes.')}
      </p>
      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() => trackClick(broker.slug, broker.name, 'cta-stack-primary', window.location.pathname, context)}
        className="inline-block px-8 py-3.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 hover:shadow-lg transition-all active:scale-[0.98] text-lg mb-3"
      >
        {getBenefitCta(broker, context)}
      </a>

      {/* Secondary — cross-links */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-sm">
        <Link href="/compare" className="text-slate-700 hover:text-slate-900 transition-colors">
          Compare Brokers
        </Link>
        <span className="text-slate-500">·</span>
        <Link href="/calculators" className="text-slate-700 hover:text-slate-900 transition-colors">
          Fee Calculator
        </Link>
        <span className="text-slate-500">·</span>
        <Link href="/quiz" className="text-slate-700 hover:text-slate-900 transition-colors">
          Broker Quiz
        </Link>
      </div>

      {/* Trust — methodology, disclosure, sources */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-slate-600">
        <Link href="/methodology" className="hover:text-slate-900 transition-colors">
          How we score
        </Link>
        <span className="text-slate-500">·</span>
        <span>{ADVERTISER_DISCLOSURE_SHORT}</span>
        {showSources && (
          <>
            <span className="text-slate-500">·</span>
            <Link href="/how-we-verify" className="hover:text-slate-900 transition-colors">
              Sources
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
