import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import FrankingClient from "./FrankingClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Franking Credits Calculator — Dividend Tax for Australian Investors",
  description:
    "Calculate franking credits, grossed-up dividends and after-tax income on ASX shares. See your refund or top-up tax at your marginal rate.",
  alternates: { canonical: "/franking-credits-calculator" },
  openGraph: {
    title: "Franking Credits Calculator — Australian Dividends",
    description:
      "Free franking credits calculator — work out your grossed-up dividend, tax offset and cash refund from Australian share dividends.",
    url: absoluteUrl("/franking-credits-calculator"),
    images: [
      {
        url: "/api/og?title=Franking+Credits+Calculator&subtitle=Australian+Dividend+Tax&type=default",
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
  name: `Franking Credits Calculator — ${SITE_NAME}`,
  description:
    "Free franking credits calculator for Australian investors. Calculates grossed-up dividends, franking credit offset and after-tax income at your marginal rate.",
  url: absoluteUrl("/franking-credits-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "Franking Credits Calculator", url: absoluteUrl("/franking-credits-calculator") },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are franking credits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Franking credits represent the corporate tax an Australian company has already paid on its profits before distributing them as dividends. Shareholders receive a credit for that tax, which can offset their own tax liability or be refunded in cash.",
      },
    },
    {
      "@type": "Question",
      name: "How do franking credits work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You gross up the franked dividend to its pre-tax equivalent and include that grossed-up amount in taxable income, then claim the franking credit as a tax offset. Below the 30% company rate you get a refund; above it you pay top-up tax.",
      },
    },
    {
      "@type": "Question",
      name: "Are franking credits refundable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Australia refunds excess franking credits in cash — if your credits exceed your tax liability, the ATO pays you the difference. This is especially valuable for retirees and SMSFs in pension phase with a 0% tax rate.",
      },
    },
    {
      "@type": "Question",
      name: "Who receives franking credits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Australian tax residents holding ASX shares that pay franked dividends. You must satisfy the 45-day holding rule for ordinary shares. Foreign investors generally cannot claim franking credits.",
      },
    },
    {
      "@type": "Question",
      name: "How do I calculate a grossed-up dividend?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For a fully franked dividend, multiply the cash amount by 1.4286 (1 / (1 - 0.30)). A $70 fully franked dividend grosses up to $100, with a $30 franking credit. For partial franking, apply the franking percentage to the credit.",
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

export default function FrankingCreditsCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense fallback={<Loading />}>
        <FrankingClient />
      </Suspense>
    </>
  );
}
