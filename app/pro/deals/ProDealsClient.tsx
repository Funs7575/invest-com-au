"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProDeal, Broker } from "@/lib/types";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { trackEvent } from "@/lib/tracking";
import { createClient } from "@/lib/supabase/client";

export default function ProDealsClient({
  deals,
  brokers,
}: {
  deals: ProDeal[];
  brokers: Broker[];
}) {
  const { user, isPro, loading } = useSubscription();
  const router = useRouter();
  const [revealedDeals, setRevealedDeals] = useState<Set<number>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<number>>(new Set());

  const brokerMap = new Map(brokers.map((b) => [b.slug, b]));

  // Redirect non-Pro users
  if (!loading && (!user || !isPro)) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold mb-3">Exclusive Pro Deals</h1>
          <p className="text-slate-600 mb-6">
            These broker deals are exclusively available to Investor Pro members.
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl p-8">
            <p className="text-lg font-bold text-slate-900 mb-2">
              Upgrade to Pro to unlock exclusive broker deals
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Special sign-up bonuses, reduced fees, and premium perks from our partner brokers.
            </p>
            <Link
              href="/pro"
              className="inline-block px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Upgrade to Pro →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-3xl mx-auto">
          <div className="text-center py-16 text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  const revealDeal = async (deal: ProDeal) => {
    setRevealedDeals((prev) => new Set(prev).add(deal.id));

    trackEvent("pro_deal_revealed", { deal_id: deal.id, broker_slug: deal.broker_slug }, "/pro/deals");

    // Track redemption in DB
    try {
      const supabase = createClient();
      await supabase.from("pro_deal_redemptions").insert({
        user_id: user!.id,
        deal_id: deal.id,
      });
    } catch {
      // Ignore duplicate key errors
    }
  };

  return (
    <div className="py-12">
      <div className="container-custom max-w-3xl mx-auto">
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/pro" className="hover:text-brand">Pro</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">Exclusive Deals</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          Exclusive Pro Deals
        </h1>
        <p className="text-slate-600 mb-8">
          Special broker offers only available to Investor Pro members.
          {deals.length > 0 && ` ${deals.length} active deal${deals.length !== 1 ? "s" : ""} available.`}
        </p>

        {deals.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">No active deals right now</p>
            <p className="text-sm">New Pro deals are added regularly. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deals.map((deal) => {
              const broker = brokerMap.get(deal.broker_slug);
              const isRevealed = revealedDeals.has(deal.id);
              const termsExpanded = expandedTerms.has(deal.id);

              return (
                <div
                  key={deal.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-all ${
                    deal.featured ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Broker icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                        style={{
                          background: broker ? `${broker.color}15` : "#f1f5f9",
                          color: broker?.color || "#64748b",
                        }}
                      >
                        {broker?.icon || broker?.name?.charAt(0) || "?"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {deal.featured && (
                            <span className="text-[0.69rem] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">
                              FEATURED
                            </span>
                          )}
                          {deal.deal_value && (
                            <span className="text-[0.69rem] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">
                              {deal.deal_value}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {broker?.name || deal.broker_slug}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{deal.title}</h3>
                        {deal.description && (
                          <p className="text-xs text-slate-600 mt-1">{deal.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Redemption section */}
                    <div className="mt-4">
                      {isRevealed ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          {deal.redemption_code && (
                            <div className="mb-2">
                              <span className="text-xs text-slate-500 block mb-1">Redemption Code:</span>
                              <code className="text-sm font-mono font-bold bg-white px-3 py-1.5 rounded border border-green-200 text-green-800 inline-block">
                                {deal.redemption_code}
                              </code>
                            </div>
                          )}
                          {deal.redemption_instructions && (
                            <p className="text-xs text-green-700 mb-2">{deal.redemption_instructions}</p>
                          )}
                          {deal.redemption_url && (
                            <a
                              href={deal.redemption_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              Claim Deal →
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => revealDeal(deal)}
                          className="w-full px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          Reveal Deal
                        </button>
                      )}
                    </div>

                    {/* Terms */}
                    {deal.terms && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedTerms((prev) => {
                            const next = new Set(prev);
                            termsExpanded ? next.delete(deal.id) : next.add(deal.id);
                            return next;
                          })}
                          className="text-[0.69rem] text-slate-400 hover:text-slate-600"
                        >
                          {termsExpanded ? "Hide terms" : "View terms & conditions"}
                        </button>
                        {termsExpanded && (
                          <p className="text-[0.69rem] text-slate-400 mt-1 leading-relaxed">{deal.terms}</p>
                        )}
                      </div>
                    )}

                    {/* Expiry */}
                    {deal.end_date && (
                      <p className="text-[0.69rem] text-slate-400 mt-2">
                        Expires {new Date(deal.end_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
