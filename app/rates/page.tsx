import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import RateBoardClient from "./RateBoardClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = {
  title: "Australian Savings & Term Deposit Rates — Live Comparison (2026)",
  description:
    "Compare the latest savings account and term deposit rates from every Australian provider. Sortable tables updated daily with verified rates.",
  openGraph: {
    title: "Savings & Term Deposit Rates",
    description:
      "Every Australian savings account and term deposit rate, compared side-by-side. Updated daily.",
    images: [
      {
        url: "/api/og?title=Savings+%26+Term+Deposit+Rates&subtitle=Live+Comparison+—+Updated+Daily&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/rates" },
};

function datasetJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Australian Savings & Term Deposit Rates",
    description:
      "Live comparison dataset of savings account and term deposit interest rates from Australian financial institutions. Updated daily.",
    url: absoluteUrl("/rates"),
    temporalCoverage: "2026",
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
    creator: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: absoluteUrl("/"),
    },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/html",
      contentUrl: absoluteUrl("/rates"),
    },
  };
}

export default async function RatesPage() {
  const supabase = await createClient();

  const { data: providers } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, platform_type, asx_fee, rating, affiliate_url, color, icon, logo_url, min_deposit"
    )
    .in("platform_type", ["savings_account", "term_deposit"])
    .eq("status", "active")
    .order("name");

  const all = (providers as Pick<
    Broker,
    | "id"
    | "slug"
    | "name"
    | "platform_type"
    | "asx_fee"
    | "rating"
    | "affiliate_url"
    | "color"
    | "icon"
    | "logo_url"
    | "min_deposit"
  >[]) || [];

  const savingsAccounts = all.filter(
    (b) => b.platform_type === "savings_account"
  );
  const termDeposits = all.filter(
    (b) => b.platform_type === "term_deposit"
  );

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Rates" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Suspense fallback={<RatesLoading />}>
        <RateBoardClient
          savingsAccounts={savingsAccounts}
          termDeposits={termDeposits}
        />
      </Suspense>
    </>
  );
}

function RatesLoading() {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="text-center mb-10">
          <div className="h-8 w-72 bg-slate-200 rounded animate-pulse mx-auto mb-4" />
          <div className="h-5 w-96 bg-slate-100 rounded animate-pulse mx-auto" />
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse mb-6" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-slate-50 rounded-lg animate-pulse mb-2"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
