import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import UsShareCostsClient from "./UsShareCostsClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "US Share Costs Calculator — True Cost of International Trading",
  description:
    "See the real cost of buying US shares from Australia — FX margin plus brokerage combined. Compare every major Australian platform and find the cheapest.",
  alternates: { canonical: "/us-share-costs-calculator" },
  openGraph: {
    title: "US Share Costs Calculator — FX + Brokerage Combined",
    description:
      "Free calculator showing the true landed cost of US trades from Australia, including FX conversion margins most comparison sites hide.",
    url: absoluteUrl("/us-share-costs-calculator"),
    images: [
      {
        url: "/api/og?title=US+Share+Costs+Calculator&subtitle=FX+%2B+Brokerage+Combined&type=default",
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
  name: `US Share Costs Calculator — ${SITE_NAME}`,
  description:
    "Free US share trading cost calculator for Australian investors. Shows FX margin plus brokerage combined across every major platform.",
  url: absoluteUrl("/us-share-costs-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "US Share Costs Calculator", url: absoluteUrl("/us-share-costs-calculator") },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why is FX the biggest fee on a US trade?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FX is charged as a percentage of the full trade value, while brokerage is usually a small fixed amount. A 0.6% FX margin on a $10,000 trade is $60 — dwarfing the $0–$5 brokerage on most platforms.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get cheaper US shares from Australia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use a broker with near-interbank FX such as Interactive Brokers, Stake Black or Webull. Batch conversions into larger chunks. Hold USD in a multi-currency wallet. Or buy ASX-listed global ETFs to sidestep FX entirely.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need a US account to buy US shares?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Most Australian brokers now offer direct US share trading — CommSec, Stake, Superhero, moomoo, Webull and Interactive Brokers all give access to NYSE and NASDAQ. Tax reporting stays in Australia.",
      },
    },
    {
      "@type": "Question",
      name: "Multi-currency wallet or convert each trade?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "If you trade US shares more than a few times a year, a multi-currency wallet almost always wins — you pay FX once then reuse the balance without double-converting.",
      },
    },
    {
      "@type": "Question",
      name: "ASX-listed ETFs vs direct US stocks — what's cheaper?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For passive long-term investors, ASX-listed US ETFs (IVV, NDQ, VTS) are often cheaper because FX is handled at wholesale rates inside the fund. For stock pickers, direct US trading through a low-FX broker is usually better.",
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

export default async function UsShareCostsCalculatorPage() {
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
        <UsShareCostsClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
