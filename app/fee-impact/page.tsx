import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import FeeImpactClient from "./FeeImpactClient";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LeadMagnet from "@/components/LeadMagnet";
import { absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

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

const feeImpactFaqLd = faqJsonLd([
  {
    q: "How much do investment fees affect long-term returns?",
    a: "Fees compound just like returns — a seemingly small difference matters enormously over decades. At 7% annual return, $100,000 grows to $761,000 over 30 years at 0% fees. At 1% annual fees, it grows to $574,000 — a $187,000 difference. At 2% fees, the result is only $432,000. This is why moving from a 1.5% managed fund to a 0.2% ETF often adds hundreds of thousands of dollars to a retirement balance, even with identical underlying asset exposure.",
  },
  {
    q: "What is the difference between management fees and brokerage?",
    a: "Management fees (MER — Management Expense Ratio) are ongoing charges deducted from the fund's assets, expressed as a percentage per year. They cover fund management, administration, and costs. ETFs typically charge 0.04%–0.67% p.a. Brokerage is the transaction fee paid each time you buy or sell — it is a one-off cost at the point of trade, not ongoing. Both reduce your returns, but management fees compound and are the primary drag for buy-and-hold investors.",
  },
  {
    q: "Which Australian broker has the lowest annual fees for buy-and-hold investors?",
    a: "For investors who make 1–2 trades per month and hold long term, total annual cost depends on brokerage per trade and inactivity fees. Pearler ($6.50/trade, no inactivity fee, CHESS-sponsored) and SelfWealth ($9.50/trade, no inactivity fee, CHESS-sponsored) are consistently competitive. Moomoo ($3/trade) is cheapest by transaction but uses a custodian structure. For US shares held long term, Interactive Brokers has the lowest FX and custody fees, typically under 0.1% total for large accounts.",
  },
  {
    q: "Do ETF management fees compound negatively?",
    a: "Yes. An ETF charging 0.67% p.a. silently deducts this from its net asset value daily. You never see a fee deducted from your account — but the ETF's price grows more slowly than the underlying index by approximately the MER. Over 20 years, a 0.5% MER difference relative to a 0.07% ETF costs roughly 9% of final portfolio value. The fee calculator shows this compounding effect in dollar terms for your specific balance and time horizon.",
  },
]);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(feeImpactFaqLd) }}
      />
      <Suspense fallback={<FeeImpactLoading />}>
        <FeeImpactClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom max-w-4xl pb-6 md:pb-12">
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
