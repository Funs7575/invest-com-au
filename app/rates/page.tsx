import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import RateBoardClient from "./RateBoardClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

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

const RATES_FAQ = faqJsonLd([
  {
    q: "What is the best savings account interest rate in Australia?",
    a: "The best savings account rate in Australia varies by provider and changes frequently. Rates above 5% p.a. have been available from online banks and neo-banks in 2026, but introductory or conditional bonus rates may apply. Use this comparison table — updated daily — to find the current highest rate and check any conditions such as minimum monthly deposits or no-withdrawal requirements.",
  },
  {
    q: "How do I compare term deposit rates?",
    a: "To compare term deposits, look at the annual interest rate (p.a.), the term length (e.g. 3, 6, or 12 months), interest payment frequency (monthly vs. at maturity), and minimum deposit requirements. Our sortable table lets you filter by term length and sort by rate so you can identify the best option for your timeframe.",
  },
  {
    q: "Is my money in a savings account government-guaranteed?",
    a: "Yes. Under the Australian Government Financial Claims Scheme (FCS), deposits held with authorised deposit-taking institutions (ADIs) — including banks, building societies, and credit unions — are protected up to AUD $250,000 per account holder per institution. This covers savings accounts and term deposits.",
  },
  {
    q: "What is the difference between a savings account and a term deposit?",
    a: "A savings account is flexible — you can deposit and (usually) withdraw funds at any time, though some accounts restrict withdrawals to earn a bonus rate. A term deposit locks your money away for a fixed period (e.g. 3–24 months) in exchange for a fixed interest rate. Term deposits typically suit investors who don't need immediate access to their funds and want rate certainty.",
  },
  {
    q: "Are online savings accounts better than bank branch accounts?",
    a: "Online-only savings accounts frequently offer higher interest rates than traditional branch-based accounts because providers have lower overhead costs. The trade-off is that you manage everything digitally with no in-person support. Both types are equally covered by the government's $250,000 FCS guarantee, provided the institution is an authorised ADI.",
  },
]);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(RATES_FAQ) }}
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
