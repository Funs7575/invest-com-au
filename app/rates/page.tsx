import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import RateBoardClient from "./RateBoardClient";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const RATES_FAQS = [
  {
    q: "What is the best savings account interest rate in Australia right now?",
    a: "High-interest savings accounts in Australia currently offer 5.00–5.50% p.a. on introductory or bonus rates (conditions usually apply: deposit $1,000+/month, make no withdrawals, or hold a linked transaction account). The best ongoing rates without conditions are typically 4.50–5.00%. Online-only banks (ING, UBank, Macquarie, ME Bank) consistently offer higher rates than the big four. Our comparison table above is updated daily with verified rates — always check the eligibility conditions, not just the headline rate.",
  },
  {
    q: "What is the difference between a savings account and a term deposit?",
    a: "A savings account earns variable interest on your balance — you can deposit and withdraw anytime. Rates change with the RBA cash rate and bank competition. A term deposit locks your money for a fixed period (typically 1–60 months) at a guaranteed rate — ideal if you won't need the funds during that time and want certainty. Early withdrawal from a term deposit typically incurs a penalty (reduced interest). Both are government-guaranteed up to $250,000 per ADI under the Financial Claims Scheme. Choose savings for flexibility; term deposits for rate certainty.",
  },
  {
    q: "How often do Australian banks change their interest rates?",
    a: "Banks can and do change savings and term deposit rates at any time, but changes often follow RBA cash rate decisions (typically 8 times per year). When the RBA raises or cuts the cash rate, banks typically pass through changes to term deposits quickly but may be slower with savings accounts. Our comparison is updated daily to reflect current rates. For term deposits, the rate you lock in is guaranteed for the term regardless of subsequent rate changes — a key advantage when rates are falling.",
  },
  {
    q: "Are Australian savings accounts and term deposits safe?",
    a: "Yes. All savings accounts and term deposits held with an Authorised Deposit-taking Institution (ADI — banks, credit unions, building societies regulated by APRA) are protected by the Australian Government's Financial Claims Scheme (FCS) up to $250,000 per account holder per ADI. This guarantee is unconditional and does not require any action from account holders — the Government steps in if an ADI fails. To maximise coverage for large deposits, split across multiple ADIs.",
  },
];

const ratesFaqLd = faqJsonLd(RATES_FAQS);

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
      {ratesFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ratesFaqLd) }} />
      )}
      <Suspense fallback={<RatesLoading />}>
        <RateBoardClient
          savingsAccounts={savingsAccounts}
          termDeposits={termDeposits}
        />
      </Suspense>
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 container-custom">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {RATES_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
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
