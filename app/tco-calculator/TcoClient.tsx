"use client";

import { useSearchParams } from "next/navigation";
import type { Broker } from "@/lib/types";
import TotalCostCalculator from "@/app/calculators/_components/TotalCostCalculator";
import Link from "next/link";

export default function TcoClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Yearly TCO Calculator</span>
        </nav>

        {/* Page heading */}
        <div className="mb-5 md:mb-8">
          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Yearly TCO Calculator
          </h1>
          <p className="text-sm md:text-base text-slate-500 max-w-2xl">
            See your true annual cost across every Australian broker — brokerage plus FX fees combined.
            Enter your trading habits below to compare platforms side by side.
          </p>
        </div>

        {/* Calculator */}
        <TotalCostCalculator brokers={brokers} searchParams={searchParams} />

        {/* How it works */}
        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-3">How the TCO Calculator Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs md:text-sm text-slate-600">
              <div>
                <p className="font-semibold text-slate-800 mb-1">1. Brokerage fees</p>
                <p>Each ASX or US trade incurs a flat or percentage brokerage fee. We multiply this by your monthly trade count × 12 months.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">2. FX conversion costs</p>
                <p>US share purchases require AUD → USD conversion. Brokers charge 0–0.7% FX margin per transaction — this adds up quickly for active traders.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">3. Total cost of ownership</p>
                <p>We sum all costs for a full year. The "cheapest" label shows which platform minimises your total spend based on your trading pattern.</p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="space-y-4">
            <h2 className="text-sm md:text-base font-bold text-slate-900">Frequently Asked Questions</h2>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "What does TCO mean for share trading?",
                  a: "Total Cost of Ownership (TCO) is the sum of every fee you pay to a broker in a year — brokerage commissions on ASX trades, commissions on US/international trades, and FX conversion margins. Many investors only compare brokerage fees and overlook FX costs, which can easily exceed brokerage for investors buying US-listed shares.",
                },
                {
                  q: "Why does FX cost matter so much?",
                  a: "Australian brokers charge an FX margin of 0%–0.7% on each currency conversion. On a $5,000 US trade at 0.6% FX margin, that's $30 per trade — more than the brokerage commission on most platforms. Active US share investors can pay hundreds of dollars per year in FX fees alone.",
                },
                {
                  q: "Which broker is cheapest for regular ASX investors?",
                  a: "For pure ASX trading (no US shares), the cheapest platform depends on your trade size and frequency. Flat-fee brokers like Moomoo, Superhero and SelfWealth are often cheapest for smaller trade sizes. For very large trades, percentage-based caps can be competitive. Use this calculator to compare based on your actual trading habits.",
                },
                {
                  q: "Which broker is cheapest for US shares?",
                  a: "For US share trading, the total cost depends on both the US brokerage and the FX rate. Stake offers $0 US brokerage but charges 0.5–0.7% FX. Interactive Brokers charges small commissions but has very low FX rates (~0.002%). For active US traders, the FX rate often matters more than brokerage.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{q}</p>
                  <p className="text-xs text-slate-500">{a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Related links */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-[0.69rem] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related Tools</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/calculators?calc=trade-cost" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Trade Cost Calculator →
              </Link>
              <Link href="/calculators?calc=fx" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                FX Cost Calculator →
              </Link>
              <Link href="/compare" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Compare Platforms →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
