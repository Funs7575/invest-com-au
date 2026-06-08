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

const TAX_OPTIMIZER_FAQS = [
  {
    q: "What does the Tax Optimization Engine do?",
    a: "The Tax Optimization Engine helps Australian investors minimise their capital gains tax (CGT) liability by modelling the best order in which to sell holdings. Enter your holdings with their purchase dates and prices, then the tool identifies: which positions qualify for the 50% CGT discount (held >12 months), which positions can be used to offset gains via tax-loss harvesting, your estimated tax saving vs selling all at once, and your franking credit position. It's a free general information tool, not personal tax advice.",
  },
  {
    q: "Does the Tax Optimizer give personal tax advice?",
    a: "No. The Tax Optimization Engine provides general information only — it does not constitute personal tax advice and is not a substitute for advice from a registered tax agent or financial adviser. It uses ATO published tax rates for illustrative purposes. Your actual tax liability will depend on your individual circumstances, income level, other deductions, and timing of sales. Always consult a registered tax agent before making tax-motivated decisions.",
  },
  {
    q: "What is the CGT discount and how does the optimizer use it?",
    a: "The CGT discount is an Australian tax concession that reduces your taxable capital gain by 50% if you've held an asset for more than 12 months before selling (for individuals and trusts). The optimizer flags all positions held >12 months as 'discount eligible' and applies the 50% reduction when calculating estimated tax. Positions held <12 months are taxed at your full marginal rate. The optimizer ranks your holdings to prioritise discount-eligible disposals and offset short-term gains with losses.",
  },
  {
    q: "What data does the Tax Optimizer need?",
    a: "For each holding you enter: (1) the ASX ticker or asset name, (2) purchase date (to determine CGT discount eligibility), (3) purchase price per unit, (4) current price per unit (or today's close), and (5) number of units held. The tool also asks for your estimated marginal tax rate (to compute tax savings). All data is processed locally in your browser — nothing is stored server-side.",
  },
];

const taxFaqLd = faqJsonLd(TAX_OPTIMIZER_FAQS);

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
      {taxFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(taxFaqLd) }} />
      )}
      <Suspense fallback={<LoadingFallback />}>
        <TaxOptimizerClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      {/* FAQ accordion — GEO pivot */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {TAX_OPTIMIZER_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
