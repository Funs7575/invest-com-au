import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import TradeCostClient from "./TradeCostClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trade Cost Calculator — Compare Brokerage Across Every Australian Platform",
  description:
    "Calculate the real per-trade cost across every Australian broker — brokerage, FX margins, minimum fees and hidden spreads all in one live comparison.",
  alternates: { canonical: "/trade-cost-calculator" },
  openGraph: {
    title: "Trade Cost Calculator — Compare Every Australian Broker",
    description:
      "See the true cost of a single trade across every major Australian investing platform. Live brokerage + FX + minimum fee comparison.",
    url: absoluteUrl("/trade-cost-calculator"),
    images: [
      {
        url: "/api/og?title=Trade+Cost+Calculator&subtitle=Compare+Every+Australian+Broker&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Trade Cost Calculator — ${SITE_NAME}`,
  description:
    "Free trade cost calculator for Australian investors. Compares brokerage, FX margin and minimum fees across every major platform for ASX and US shares.",
  url: absoluteUrl("/trade-cost-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "Trade Cost Calculator", url: absoluteUrl("/trade-cost-calculator") },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What's actually included in a broker's brokerage fee?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Brokerage typically covers order routing, execution and settlement. It doesn't usually include FX conversion, exchange pass-through fees, corporate action fees or inactivity charges. Always read the full fee schedule.",
      },
    },
    {
      "@type": "Question",
      name: "Why are ASX fees different from US fees?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ASX trades settle in AUD so there's no currency conversion. US trades require an AUD to USD conversion, which adds an FX margin of 0.3% to 0.7%. US brokerage is often lower in headline terms because brokers earn on FX instead.",
      },
    },
    {
      "@type": "Question",
      name: "How does FX impact total trade cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For US and international trades, FX is usually the single biggest cost. At 0.6% on a $10,000 trade that's $60 — more than brokerage on most platforms. Interactive Brokers charges near-interbank rates; most Australian brokers charge 30–300× that.",
      },
    },
    {
      "@type": "Question",
      name: "Why do brokers charge such different amounts for the same trade?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Different business models. Discount brokers rely on scale and low overheads; full-service platforms bundle research and banking; professional brokers offer ultra-low costs but steeper learning curves. Your trading volume and needs determine which is cheapest for you.",
      },
    },
    {
      "@type": "Question",
      name: "Are there any genuinely free Australian brokers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Some brokers advertise $0 brokerage but recover costs via FX margins, interest on cash, payment for order flow or premium subscriptions. No broker operates at a loss — always check where the cost is hidden.",
      },
    },
  ],
};

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default async function TradeCostCalculatorPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status"
    )
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense fallback={<Loading />}>
        <TradeCostClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
