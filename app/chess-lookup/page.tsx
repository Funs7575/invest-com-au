import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import ChessLookupClient from "./ChessLookupClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "CHESS Sponsorship Lookup — Is Your Australian Broker CHESS Sponsored?",
  description:
    "Check if any Australian broker is CHESS sponsored. Understand CHESS vs custodial ownership and why it matters for the safety of your ASX shares.",
  alternates: { canonical: "/chess-lookup" },
  openGraph: {
    title: "CHESS Sponsorship Lookup — Australian Brokers",
    description:
      "Find out if your Australian broker is CHESS sponsored. Direct share ownership vs custodial models explained with live lookup data.",
    url: absoluteUrl("/chess-lookup"),
    images: [
      {
        url: "/api/og?title=CHESS+Sponsorship+Lookup&subtitle=Australian+Brokers&type=default",
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
  name: `CHESS Sponsorship Lookup — ${SITE_NAME}`,
  description:
    "Free CHESS sponsorship lookup tool for Australian investors. Check the sponsorship status of every major broker and compare CHESS vs custodial models.",
  url: absoluteUrl("/chess-lookup"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "CHESS Sponsorship Lookup", url: absoluteUrl("/chess-lookup") },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does CHESS mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CHESS stands for Clearing House Electronic Subregister System. It is the ASX's centralised registry recording legal ownership of Australian listed shares. A CHESS-sponsored investor has a unique HIN identifying them directly on the ASX register.",
      },
    },
    {
      "@type": "Question",
      name: "Is a custodial broker bad?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not bad, just different. Custodial brokers are ASIC-regulated and segregate client assets. Custodial models enable lower fees, fractional shares and easier international trading. The trade-off is that you rely on the broker's custodian rather than the ASX register for proof of ownership.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get a HIN?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Open an account with any CHESS-sponsored broker such as CommSec, CMC Invest, nabtrade, Selfwealth or Pearler. After your first trade the broker issues a unique HIN and you'll receive a CHESS holding statement confirming it.",
      },
    },
    {
      "@type": "Question",
      name: "Can I transfer shares between brokers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. CHESS-sponsored investors can transfer their HIN between brokers using a Broker-to-Broker transfer form, usually within 5 business days at no cost. Custodial clients typically have to sell and rebuy, which can trigger capital gains tax.",
      },
    },
    {
      "@type": "Question",
      name: "What if my broker goes bust?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CHESS-sponsored shares remain safely on the ASX register under your HIN — you just nominate a new sponsoring broker and continue. Custodial clients rely on ASIC and the custodian to reconcile holdings, which is still generally safe but slower and less transparent.",
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

export default async function ChessLookupPage() {
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
        <ChessLookupClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
