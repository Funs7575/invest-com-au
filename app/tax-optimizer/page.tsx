import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import TaxOptimizerClient from "./TaxOptimizerClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata = {
  title: "Tax Optimization Engine — Minimise Your Investment Tax",
  description:
    "Free CGT calculator and tax optimisation tool for Australian investors. Find tax-loss harvesting opportunities, check CGT discount eligibility, estimate franking credits, and identify your top tax-saving moves.",
  openGraph: {
    title: "Tax Optimization Engine — Minimise Your Investment Tax",
    description:
      "Calculate capital gains tax, find tax-loss harvesting opportunities, check CGT discount eligibility, and estimate franking credit offsets.",
    images: [
      {
        url: "/api/og?title=Tax+Optimization+Engine&subtitle=Minimise+Your+Investment+Tax&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/tax-optimizer" },
};

const taxOptFaqLd = faqJsonLd([
  {
    q: "What is tax-loss harvesting in Australia?",
    a: "Tax-loss harvesting is selling an investment at a loss to offset capital gains you've realised elsewhere, reducing your CGT liability. The loss is applied against gains in the same financial year. If losses exceed gains, the net loss carries forward to future years — it cannot be used to offset other income. The strategy is most effective when you have substantial realised gains in the same year and can immediately replace the sold investment with a similar (but not identical) one to maintain market exposure.",
  },
  {
    q: "What is the CGT discount in Australia?",
    a: "Australian individuals and most trusts receive a 50% CGT discount on assets held for more than 12 months before selling. This means only half the capital gain is included in taxable income. A $20,000 gain on shares held 18 months adds $10,000 to taxable income, not $20,000. Superannuation funds receive a 33.33% discount. Companies receive no CGT discount. Foreign residents do not receive the discount on taxable Australian property sold after 8 May 2012.",
  },
  {
    q: "What are franking credits and how do they reduce my tax?",
    a: "Franking credits (imputation credits) represent company tax already paid at 30% on dividends. A fully franked $0.70 dividend from a 30% tax-rate company carries a $0.30 franking credit ($1.00 gross). You include the gross dividend in your taxable income but claim the credit against your tax liability. If your marginal rate is 32.5% on the gross $1.00, your tax is $0.325 minus $0.30 credit = net tax of $0.025. If your total credits exceed your tax, the excess is refunded.",
  },
  {
    q: "Should I sell shares before or after 30 June?",
    a: "Timing a sale relative to 30 June can make a significant difference. If you've held shares for just under 12 months, waiting until after 12 months halves the CGT. If you have accumulated capital losses, selling a gain-making investment in the same financial year allows the losses to offset it. If you've had a high-income year, deferring a capital gain to the next year (at a lower marginal rate) can reduce tax. Always consult your tax adviser before timing decisions — individual circumstances vary materially.",
  },
  {
    q: "What investment expenses are tax deductible in Australia?",
    a: "You can generally deduct expenses incurred in earning assessable investment income: interest on loans to buy income-producing investments (negative gearing), broker fees and ongoing platform fees (but not the initial purchase brokerage), investment advice fees where the advice relates to existing income-producing investments, subscriptions to investment research services, and a portion of home internet/phone costs if used for investment management. Setup costs for an investment property (stamp duty, conveyancing) are not immediately deductible — they form part of the cost base.",
  },
]);

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tax Optimization Engine",
    description:
      "Calculate CGT, find tax-loss harvesting opportunities, check CGT discount eligibility, and estimate franking credits for Australian investors.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/tax-optimizer"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-96 rounded bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default async function TaxOptimizerPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, icon, affiliate_url, rating, platform_type, status")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax Optimization Engine" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(taxOptFaqLd) }}
      />
      <Suspense fallback={<LoadingFallback />}>
        <TaxOptimizerClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
