import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import TcoClient from "./TcoClient";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: `Yearly TCO Calculator — Total Broker Cost Comparison (${CURRENT_YEAR})`,
  description:
    "Calculate your true annual cost at every Australian broker: brokerage fees + FX margins combined. Enter your trading habits to find the cheapest platform for your style.",
  alternates: { canonical: "/tco-calculator" },
  openGraph: {
    title: `Yearly TCO Calculator — Total Broker Cost | ${SITE_NAME}`,
    description:
      "Free total cost of ownership calculator for Australian investors. Compare brokerage + FX fees across all major platforms for your exact trading pattern.",
    images: [
      {
        url: "/api/og?title=Yearly+TCO+Calculator&subtitle=Total+Broker+Cost+Comparison&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Yearly TCO Calculator — ${SITE_NAME}`,
  description:
    "Calculate the total annual cost (brokerage + FX fees) at every major Australian investing platform based on your trading habits.",
  url: "https://invest.com.au/tco-calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
    { "@type": "ListItem", position: 2, name: "Calculators", item: "https://invest.com.au/calculators" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Yearly TCO Calculator",
      item: "https://invest.com.au/tco-calculator",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does TCO mean for share trading?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Total Cost of Ownership (TCO) is the sum of every fee you pay to a broker in a year — brokerage commissions on ASX trades, commissions on US/international trades, and FX conversion margins.",
      },
    },
    {
      "@type": "Question",
      name: "Why does FX cost matter so much?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Australian brokers charge an FX margin of 0%–0.7% on each currency conversion. On a $5,000 US trade at 0.6% FX margin, that's $30 per trade — more than the brokerage commission on most platforms.",
      },
    },
    {
      "@type": "Question",
      name: "Which Australian broker is cheapest overall?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends entirely on your trading pattern. Use this calculator to enter your monthly ASX and US trade counts and average trade size — the results will rank every broker by true yearly cost for your specific situation.",
      },
    },
  ],
};

function TcoLoading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-4xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-8 w-72 bg-slate-200 rounded mb-2" />
        <div className="h-4 w-96 bg-slate-100 rounded mb-8" />
        <div className="rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-lg" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function TcoCalculatorPage() {
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense fallback={<TcoLoading />}>
        <TcoClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
