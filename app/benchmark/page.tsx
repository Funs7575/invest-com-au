import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";

export const revalidate = 3600; // 1 hour
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

const BENCHMARK_FAQ = faqJsonLd([
  {
    q: "What does this fee benchmarking tool measure?",
    a: "The tool ranks each Australian investing platform across six key dimensions: ASX brokerage fees, US share fees, foreign exchange (FX) rates, platform quality rating, available features, and cost stability over time. Each platform receives a percentile score so you can see how it compares to the full market.",
  },
  {
    q: "How are platform fees ranked and compared?",
    a: "Each fee dimension is scored as a percentile relative to all active platforms in the Invest.com.au database. A platform at the 90th percentile has cheaper fees than 90% of other platforms on that dimension. The radar chart shows all six dimensions at a glance.",
  },
  {
    q: "What is a good brokerage fee for Australian investors?",
    a: "For ASX trades, competitive brokers charge between $2 and $10 per trade. For US shares, fees below $2 USD per trade are considered low-cost. Use the benchmarking tool to see exactly where your current platform sits relative to all alternatives.",
  },
  {
    q: "Why do FX fees matter for international share investing?",
    a: "When you buy US or international shares, your broker converts AUD to the foreign currency. FX margins typically range from 0.25% to 1.5% per conversion. On a $10,000 trade, a 1% FX margin costs $100 — often more than the brokerage fee itself.",
  },
  {
    q: "How often is the fee benchmarking data updated?",
    a: "Platform fee data is updated whenever brokers announce fee changes, typically within 48 hours of an official announcement. The newsletter subscribers receive a weekly digest of all fee changes detected that week.",
  },
]);

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
      {BENCHMARK_FAQ && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(BENCHMARK_FAQ) }}
        />
      )}
      <Suspense fallback={<BenchmarkLoading />}>
        <BenchmarkClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
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
