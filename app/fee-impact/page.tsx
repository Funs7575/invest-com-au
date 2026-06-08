import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import FeeImpactClient from "./FeeImpactClient";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LeadMagnet from "@/components/LeadMagnet";
import { absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const FEE_IMPACT_FAQS = [
  {
    q: "What fees do Australian share brokers charge?",
    a: "Australian brokers typically charge: brokerage (a per-trade commission on ASX and US share orders), foreign exchange fees (for converting AUD to USD on US share trades), and sometimes inactivity fees (charged if you don't trade for a set period). Some platforms also charge monthly platform or account-keeping fees. The total annual cost depends heavily on how often you trade, the average trade size, and whether you invest in Australian or international shares.",
  },
  {
    q: "How much does it cost to buy Australian shares (ASX)?",
    a: "ASX brokerage fees range from as low as $0 (some US-style apps for Australian stocks) to $29.95 per trade for standard online brokers. Most major Australian brokers (CommSec, Westpac, NAB Trade) charge $19.95–$29.95 for trades up to $25,000. Low-cost brokers (SelfWealth, Stake, Superhero) charge $9.50–$15 flat. For very small trades ($500 or less), some brokers charge a percentage (typically 0.12–0.5%) rather than a flat fee.",
  },
  {
    q: "Are there fees to buy US shares from Australia?",
    a: "Yes. Most Australian brokers charge a foreign exchange (FX) fee of 0.5–0.7% when converting AUD to USD to buy US shares. Some brokers (IBKR, Stake) charge lower FX fees. US brokerage itself is often $0–$3 USD per trade. The FX fee on a $10,000 order at 0.6% costs $60, compared to the same order at 0.1% costing $10. Over many years, FX fees can be a significant drag on US-focused portfolios.",
  },
  {
    q: "Do Australian brokers charge inactivity fees?",
    a: "Several Australian brokers charge inactivity fees if you don't make a minimum number of trades in a given period. For example, some platforms charge $15–$20 per quarter if fewer than one trade is placed that quarter. Others have no inactivity fees at all. If you are a buy-and-hold investor who rarely trades, choosing a broker with no inactivity fee can save $60–$80 per year.",
  },
];

export const revalidate = 1800;

/* ──────────────────────────────────────────────
   Dynamic metadata based on searchParams
   ────────────────────────────────────────────── */

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const hasParams = params.asx || params.us || params.size;

  let subtitle = "";
  if (params.asx && Number(params.asx) > 0) {
    subtitle += `${params.asx} ASX`;
  }
  if (params.us && Number(params.us) > 0) {
    subtitle += `${subtitle ? " + " : ""}${params.us} US`;
  }
  if (subtitle) {
    subtitle = ` — ${subtitle} trades/mo`;
  }
  if (params.size && Number(params.size) > 0) {
    subtitle += ` @ $${Number(params.size).toLocaleString("en-AU")}`;
  }

  const title = hasParams
    ? `Fee Impact Calculator${subtitle}`
    : "Personal Fee Impact Calculator — See Your Annual Broker Costs";

  const description = hasParams
    ? `See your total annual platform fees for${subtitle.replace(" — ", " ")} across every Australian platform.`
    : "Enter your trading habits to see exactly what you pay in broker fees each year — brokerage, FX fees, and inactivity charges across every Australian platform.";

  return {
    title,
    description,
    openGraph: {
      title: hasParams
        ? `Fee Impact Calculator${subtitle}`
        : "Personal Fee Impact Calculator",
      description: hasParams
        ? `See your total annual platform fees for${subtitle.replace(" — ", " ")} across every Australian platform.`
        : "Calculate your total annual platform fees and see how much you could save by switching.",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent("Fee Impact Calculator")}&subtitle=${encodeURIComponent(subtitle ? subtitle.replace(" — ", "") : "See your annual platform costs")}&type=default`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: "/fee-impact" },
  };
}

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Personal Fee Impact Calculator",
    description:
      "Calculate your total annual platform fees across every Australian platform based on your real trading habits.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/fee-impact"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    },
    provider: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: absoluteUrl("/"),
    },
  };
}

export default async function FeeImpactPage() {
  const faqLd = faqJsonLd(FEE_IMPACT_FAQS);
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, inactivity_fee, chess_sponsored, smsf_support, is_crypto, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <Suspense fallback={<FeeImpactLoading />}>
        <FeeImpactClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom max-w-4xl pb-6 md:pb-12">
        <section className="mb-8">
          <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {FEE_IMPACT_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
        <AdvisorPrompt context="tax" heading="Fees eating into your returns?" description="A tax agent can help you deduct investment-related expenses and minimise your capital gains tax." />
        <div className="mt-6">
          <LeadMagnet />
        </div>
      </div>
    </>
  );
}

function FeeImpactLoading() {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="h-10 w-80 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-6 w-96 bg-slate-100 rounded animate-pulse mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-8">
            <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
