import { Suspense } from "react";
import { UPDATED_LABEL } from "@/lib/seo";
import SuperCompareClient from "./SuperCompareClient";
import CompareNav from "../CompareNav";
import ComplianceFooter from "@/components/ComplianceFooter";

export const metadata = {
  title: "Compare Super Funds — Fees & Performance (2026)",
  description: `Compare fees, performance & features across Australia's biggest super funds — industry vs retail, balanced options, insurance & more. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Compare Super Funds — Fees & Performance (2026)",
    description:
      "Side-by-side comparison of fees, performance, and features for Australia's top super funds.",
    images: [
      {
        url: "/api/og?title=Compare+Super+Funds&subtitle=Fees+%26+Performance+2026&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare/super" },
};

export const revalidate = 3600;

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
    { "@type": "ListItem", position: 2, name: "Compare", item: "https://invest.com.au/compare" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Super Funds",
      item: "https://invest.com.au/compare/super",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the cheapest super fund in Australia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UniSuper and Vanguard Super are among the lowest-fee options with balanced fees around 0.56–0.58%. Use our comparison table to sort by fee.",
      },
    },
    {
      "@type": "Question",
      name: "Industry fund vs retail fund — what's the difference?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Industry funds are run to benefit members (profits stay in the fund), while retail funds are operated by banks or financial institutions for profit. Industry funds have historically delivered higher net returns on average.",
      },
    },
    {
      "@type": "Question",
      name: "Should I consolidate my super accounts?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Consolidating multiple super accounts can save you from paying duplicate fees and insurance premiums. A financial planner can help determine if consolidation is right for your situation.",
      },
    },
  ],
};

export default function SuperComparePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense><CompareNav /></Suspense>
      <SuperCompareClient />
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
