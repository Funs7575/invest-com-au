"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import TradeCostCalculator from "@/app/calculators/_components/TradeCostCalculator";

export default function TradeCostClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Trade Cost Calculator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="dollar-sign" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">Trade Cost Calculator</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              How much does a trade really cost?
            </h1>
            <p className="text-sm md:text-base text-blue-100 max-w-2xl">
              Brokerage is only half the story. Enter your trade size below and we&apos;ll show the total cost
              across every Australian broker — including FX margins, hidden spreads and minimum fees most comparison
              sites leave out.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        {/* Calculator */}
        <TradeCostCalculator brokers={brokers} searchParams={searchParams} />

        {/* SEO content */}
        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Why trade costs vary so much between Australian brokers</h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Every time you buy or sell shares in Australia, you pay a brokerage commission to the platform facilitating the trade.
                But the headline brokerage figure — say, $5 or $9.50 — rarely reflects the true cost of the transaction. Depending on
                the broker and the market, you may also pay an FX conversion margin, a percentage-based fee above a threshold, a
                minimum trade fee, exchange pass-through fees, or a custody charge. For international shares, the FX margin alone can
                exceed the brokerage by a factor of three or four.
              </p>
              <p>
                <strong className="text-slate-900">Hidden fees to watch for:</strong> FX conversion margins typically range from 0%
                (Interactive Brokers) up to 0.7% (Stake, CommSec) per trade — that&apos;s $35 on a $5,000 US trade. Percentage-based
                brokerage often kicks in on trades above $10,000 or $25,000, instantly doubling your cost at the breakpoint. Custodial
                brokers may also charge corporate action fees, inactivity fees, or withdrawal fees that don&apos;t appear in headline
                rate cards.
              </p>
              <p>
                <strong className="text-slate-900">How to compare brokerage properly:</strong> Don&apos;t just look at the per-trade
                rate. Multiply your typical trade size by the percentage fee (if any), add any fixed minimum, and add the FX margin
                for non-AUD trades. Then compare across at least three brokers. Our calculator does this automatically using live fee
                data from every major Australian platform, so you can see the true per-trade cost ranked from cheapest to most expensive.
              </p>
              <p>
                <strong className="text-slate-900">What to look for beyond cost:</strong> A slightly more expensive broker may be
                worth it if it offers CHESS sponsorship, better market access, research tools, or superior execution quality. For most
                retail investors, however, cost is the single biggest driver of long-term returns — a 0.5% difference on every trade
                compounds into thousands of dollars over a decade.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "What's actually included in a broker's brokerage fee?",
                  a: "Brokerage typically covers order routing, execution, and settlement of your trade. It does NOT usually include FX conversion (for international trades), exchange fees passed through, corporate action fees, or inactivity charges. Always read the full fee schedule — the headline rate is often just the starting point.",
                },
                {
                  q: "Why are ASX trade fees different from US trade fees?",
                  a: "ASX trades settle in AUD on the local market, so there's no currency conversion. US trades require converting AUD to USD, which adds an FX margin (usually 0.3%–0.7%). US brokerage is also often lower in headline terms ($0–$5) because brokers make their money on the FX spread instead.",
                },
                {
                  q: "How does the FX rate impact total trade cost?",
                  a: "For US and international trades, FX is often the single largest cost component. At 0.6% margin on a $10,000 trade, you pay $60 in FX fees alone — more than brokerage on almost every platform. Brokers like Interactive Brokers charge near-interbank FX rates (0.002%), while others can charge 35× that.",
                },
                {
                  q: "Why do brokers charge such different amounts for the same trade?",
                  a: "Different business models. Discount brokers like Stake and Superhero rely on scale and low overheads. Full-service platforms like CommSec bundle in research, support, and integrated banking. Interactive Brokers targets professional traders with ultra-low costs but a steeper learning curve. Your trading volume, needs, and preferences determine which model is cheapest for you.",
                },
                {
                  q: "Are there any genuinely free Australian brokers?",
                  a: "Some brokers advertise $0 brokerage on ASX or US trades (Stake, Moomoo at times, Webull), but they recover costs through FX margins, payment-for-order-flow, interest on cash balances, or premium subscriptions. No broker operates at a loss — always check where the cost is hidden before assuming 'free' means free.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-4 md:p-5">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{q}</p>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related tools */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-[0.69rem] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related Calculators</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/tco-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Yearly TCO Calculator →
              </Link>
              <Link href="/us-share-costs-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                US Share Costs →
              </Link>
              <Link href="/compare" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Compare Brokers →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
