import Link from "next/link";
import type { Metadata } from "next";
import { getAllCostScenarios } from "@/lib/cost-scenarios";
import { absoluteUrl, breadcrumbJsonLd, REVIEW_AUTHOR } from "@/lib/seo";
import Icon from "@/components/Icon";
import FeeImpactVisualiser from "@/components/FeeImpactVisualiser";
import { faqJsonLd } from "@/lib/schema-markup";

const COSTS_FAQS = [
  {
    q: "What is a typical brokerage fee in Australia?",
    a: "Brokerage fees vary by platform and trade size. Online brokers typically charge $0–$30 per trade for ASX shares — some (Stake, Selfwealth at $9.50, Pearler) charge a flat fee regardless of trade size. US share trading often has zero brokerage but includes a FX spread of 0.5–0.8% on the AUD/USD conversion, which can exceed the headline brokerage cost for smaller trades. Full-service brokers charge 0.5–1% per trade (minimum $100). Our fee calculators above show the total annual cost for specific trading scenarios.",
  },
  {
    q: "How much does a trading platform really cost per year?",
    a: "Total annual platform cost depends on your trading frequency and portfolio size. A buy-and-hold investor with $10,000 in an ASX ETF might pay $0 (no ongoing fees on many platforms). An active trader doing 20 ASX trades/month could pay $2,400–$4,800 per year in brokerage. FX spread costs can dwarf headline brokerage for investors trading US shares — 0.6% on $50,000 invested is $300 per conversion. Inactivity fees, account keeping fees, and data fees are additional charges some platforms levy. The scenarios above calculate all-in costs for realistic trading patterns.",
  },
  {
    q: "Does brokerage fee affect investment returns?",
    a: "Yes, significantly over time. A 0.5% annual fee difference on a $100,000 portfolio compounds to $28,000 less wealth over 30 years (assuming 8% pre-fee returns). For short-term traders paying $20 brokerage on $500 trades, that's 4% paid before the trade is even profitable. The fee impact visualiser below shows long-run drag — the higher the fee rate and longer the time horizon, the bigger the gap. This is why low-cost index ETFs and low-brokerage platforms dominate evidence-based investing.",
  },
  {
    q: "What is the cheapest way to invest in Australian shares?",
    a: "For buy-and-hold investors: index ETFs (e.g. VAS, A200) via a low-cost platform (Pearler, Stake, Selfwealth) with $0–$9.50 brokerage per trade and 0.05–0.07% annual ETF management fees. This structure can cost under $50/year on a $50,000 portfolio. For active traders: interactive platforms like IBKR offer $1–$3 brokerage but have monthly minimums. For US shares: Stake's no-brokerage offer plus a 0.5% FX conversion fee is often the lowest all-in cost for standard trade sizes. Always check total cost including FX spreads, not just headline brokerage.",
  },
];

const costsFaqLd = faqJsonLd(COSTS_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Platform Cost Calculator — Real Fee Comparisons by Scenario",
  description:
    "See exactly what Australian brokers cost for your trading style. Brokerage, FX fees, and inactivity charges calculated for real scenarios.",
  alternates: { canonical: "/costs" },
  openGraph: {
    title: "Platform Cost Calculator — Real Fee Comparisons",
    description: "See what platforms actually cost for your trading style.",
    url: absoluteUrl("/costs"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Platform Cost Calculator Australia")}&sub=${encodeURIComponent("Brokerage · FX Fees · Real Scenarios · Compare")}`, width: 1200, height: 630 }],
  },
};

const scenarioIcons: Record<string, string> = {
  "10-trades-month": "trending-up",
  "us-shares-5000": "globe",
  "beginner-500": "target",
  "monthly-dca-1000": "calendar",
  "us-shares-monthly": "dollar-sign",
};

export default function CostsHub() {
  const scenarios = getAllCostScenarios();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Cost Comparisons" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {costsFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(costsFaqLd) }} />
      )}

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Cost Comparisons</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold mb-3">
            What Do Platforms Really Cost?
          </h1>
          <p className="text-sm md:text-base text-slate-600 mb-4 md:mb-8 max-w-2xl">
            Stop guessing. We calculate the real annual cost of every Australian platform
            for specific trading scenarios — using verified fees, not marketing claims.
            Pick the scenario closest to your investing style.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-12">
            {scenarios.map((s, idx) => (
              <Link
                key={s.slug}
                href={`/costs/${s.slug}`}
                className={`group block p-5 border border-slate-200 rounded-xl hover:border-slate-700 hover:shadow-md transition-all${
                  scenarios.length % 2 !== 0 && idx === scenarios.length - 1
                    ? " md:col-span-2 md:max-w-md md:mx-auto"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    name={scenarioIcons[s.slug] || "calculator"}
                    size={24}
                    className="text-slate-700 shrink-0 mt-0.5"
                  />
                  <div>
                    <h2 className="text-lg font-bold group-hover:text-slate-900 transition-colors">
                      {s.h1}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {s.inputs.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Want a personalised calculation?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Enter your exact trading habits and portfolio size for a custom fee breakdown.
            </p>
            <Link
              href="/fee-impact"
              className="inline-block px-6 py-3 bg-amber-500 text-slate-900 font-semibold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Personal Fee Calculator →
            </Link>
          </div>

          {/* Fee-impact visualiser — shows long-run drag of higher-cost platforms */}
          <div className="mt-8">
            <FeeImpactVisualiser />
          </div>

          {/* FAQ */}
          <div className="mt-10 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            {COSTS_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-8 text-xs text-slate-500 text-center">
            <p>
              All costs calculated using verified platform fees by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>
              .{" "}
              <Link href="/methodology" className="underline hover:text-slate-900">
                Our methodology
              </Link>{" "}
              &middot;{" "}
              <Link href="/how-we-earn" className="underline hover:text-slate-900">
                How we earn money
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
