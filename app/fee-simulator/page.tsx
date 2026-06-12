import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import FeeSimulatorClient from "./FeeSimulatorClient";

const FEE_SIMULATOR_FAQS = [
  {
    q: "What does the fee simulator show?",
    a: "The fee simulator calculates your estimated total annual broker cost based on how many ASX and US share trades you make per month and the average trade size. It pulls live fee data from every active Australian platform and shows you how much each would cost for your specific trading pattern — including brokerage, FX conversion fees on US share orders, and inactivity charges.",
  },
  {
    q: "Why do annual fees matter more than per-trade fees?",
    a: "Per-trade fees can look small in isolation — $10 vs $20 per trade — but the difference compounds significantly over time. If you make 10 trades per year at $10,000 each, the difference between a $10 and $20 broker is $100 per year, or $1,600+ over 10 years assuming you invest that saving (at 7% p.a.). For frequent traders the gap widens further. Annual total cost is the most useful comparison metric.",
  },
  {
    q: "Which Australian brokers charge inactivity fees?",
    a: "Several Australian brokers charge inactivity fees if you place fewer than a set number of trades in a quarter — typically $15–$20 per quarter. This adds up to $60–$80 per year for buy-and-hold investors who rarely trade. Low-cost platforms like SelfWealth, Superhero, and Pearler have no inactivity fees, making them better suited for passive investors. The simulator includes inactivity fees in the annual cost calculation.",
  },
  {
    q: "How does the FX fee affect my US share returns?",
    a: "Most Australian brokers charge a foreign exchange (FX) fee of 0.5–0.7% when converting AUD to USD for US share purchases. On a $50,000 US share position, a 0.6% FX fee costs $300 on each full rebalancing. For investors who dollar-cost-average monthly into US shares (e.g. $1,000/month), the cumulative FX drag over 10 years can exceed $5,000. Choosing a low-FX broker (IBKR at ~0.002%) dramatically reduces this cost.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Interactive Fee Simulator — Compare Broker Costs in Real Time (${CURRENT_YEAR})`,
  description:
    "Drag sliders to instantly compare annual brokerage costs across every Australian platform. See how trades, trade size, and US allocation affect your fees.",
  alternates: { canonical: "/fee-simulator" },
  openGraph: {
    title: "Interactive Fee Simulator — Compare Broker Costs in Real Time",
    description:
      "Drag sliders to instantly compare annual brokerage costs across every Australian platform.",
    images: [
      {
        url: "/api/og?title=Fee+Simulator&subtitle=Compare+Broker+Costs+in+Real+Time&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default async function FeeSimulatorPage() {
  const faqLd = faqJsonLd(FEE_SIMULATOR_FAQS);
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, color, icon, logo_url, platform_type, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, inactivity_fee, rating, affiliate_url, chess_sponsored, pros, deal, deal_text, cta_text, benefit_cta"
    )
    .eq("status", "active")
    .in("platform_type", ["share_broker", "cfd_forex"])
    .order("rating", { ascending: false });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Interactive Fee Simulator — ${SITE_NAME}`,
    description:
      "Compare annual brokerage costs across Australian investment platforms in real time.",
    url: "https://invest.com.au/fee-simulator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <FeeSimulatorClient
        brokers={(brokers || []) as import("@/lib/types").Broker[]}
      />
      <div className="container-custom max-w-4xl pb-10">
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {FEE_SIMULATOR_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
