import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import BenchmarkClient from "./BenchmarkClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const metadata = {
  title: "Broker Fee Benchmarking Dashboard — Percentile Rankings",
  description:
    "See where your broker ranks on every fee dimension: ASX brokerage, US fees, FX rates, platform quality, and more. Visual radar chart with percentile rankings.",
  openGraph: {
    title: `Fee Benchmarking Dashboard — ${SITE_NAME}`,
    description:
      "Visual radar chart showing your broker's percentile ranking across 6 key dimensions vs every Australian broker.",
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
      "Compare your broker's percentile ranking across ASX fees, US fees, FX rates, platform rating, features, and cost stability.",
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
      <Suspense fallback={<BenchmarkLoading />}>
        <BenchmarkClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}

function BenchmarkLoading() {
  return (
    <div className="py-12">
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
