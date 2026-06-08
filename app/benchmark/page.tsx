import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";

export const revalidate = 3600;
import BenchmarkClient from "./BenchmarkClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const metadata = {
  title: "Platform Fee Benchmarking Dashboard — Percentile Rankings",
  description:
    "See where your platform ranks on every fee dimension: ASX brokerage, US fees, FX rates, platform quality, and more. Visual radar chart with percentile rankings.",
  openGraph: {
    title: "Fee Benchmarking Dashboard",
    description:
      "Visual radar chart showing your platform's percentile ranking across 6 key dimensions vs every Australian platform.",
    images: [
      {
        url: "/api/og?title=Fee+Benchmarking+Dashboard&subtitle=Percentile+Rankings+Across+Every+Dimension&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/benchmark" },
};

const BENCHMARK_FAQS = [
  {
    q: "What does the Fee Benchmarking Dashboard compare?",
    a: "The Fee Benchmarking Dashboard ranks every active Australian investing platform across six dimensions: (1) ASX brokerage — cost per trade for ASX-listed securities; (2) US stock fees — cost per trade for NYSE/NASDAQ securities; (3) FX rate — the currency conversion spread charged on international trades; (4) Platform rating — Invest.com.au's composite editorial score; (5) Features score — breadth of available tools (CHESS sponsorship, fractional shares, managed funds access, SMSF support); (6) Cost stability — whether the platform has increased fees in the past 12 months. Each dimension is shown as a percentile rank across all compared platforms.",
  },
  {
    q: "What does a percentile ranking mean for a broker's fees?",
    a: "A percentile ranking tells you how a platform compares to the full universe of Australian investing platforms. A platform at the 80th percentile for ASX brokerage is cheaper than 80% of all platforms we track — the higher the percentile, the more competitive the fee. A platform at the 20th percentile is more expensive than 80% of the market. The radar chart visualises all six dimensions at once, so you can see at a glance whether a platform trades off low ASX fees for a high FX spread or a limited feature set.",
  },
  {
    q: "How are the benchmark scores calculated?",
    a: "Fee figures are sourced from each platform's public PDS, FSG, or product disclosure materials and verified directly against the platform's current fee schedule. Where fee structures are tiered (e.g. fee drops after $10,000 in trades per month), the benchmark uses the standard retail tier (first-time user, no volume discount). Ratings and feature scores are set by Invest.com.au's editorial team using a documented scoring rubric and are reviewed quarterly. Invest.com.au is editorially independent — fees and ratings are not influenced by commercial relationships.",
  },
  {
    q: "How often is the benchmarking data updated?",
    a: "Fee data is updated within 24 hours of any platform announcing a pricing change. The page itself refreshes via ISR every hour, so you are always seeing data that is at most one hour old in production. If you believe a fee is incorrect, contact us — we verify and update typically within one business day.",
  },
];

const benchmarkFaqLd = faqJsonLd(BENCHMARK_FAQS);

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Broker Fee Benchmarking Dashboard",
    description:
      "Compare your platform's percentile ranking across ASX fees, US fees, FX rates, platform rating, features, and cost stability.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/benchmark"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    provider: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: absoluteUrl("/"),
    },
  };
}

export default async function BenchmarkPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Fee Benchmarking Dashboard" },
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
      {benchmarkFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(benchmarkFaqLd) }}
        />
      )}
      <Suspense fallback={<BenchmarkLoading />}>
        <BenchmarkClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {BENCHMARK_FAQS.map((faq) => (
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

function BenchmarkLoading() {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="text-center mb-10">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mx-auto mb-4" />
          <div className="h-5 w-96 bg-slate-100 rounded animate-pulse mx-auto" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <div className="h-80 bg-slate-100 rounded-xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
