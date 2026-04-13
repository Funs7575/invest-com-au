import { Suspense } from "react";
import { UPDATED_LABEL } from "@/lib/seo";
import ETFCompareClient from "./ETFCompareClient";
import CompareNav from "../CompareNav";
import ComplianceFooter from "@/components/ComplianceFooter";

export const metadata = {
  title: "Compare Australian ETFs — Fees, Returns & Holdings (2026)",
  description: `Compare management fees, categories and providers for Australia's most popular ETFs including VAS, VGS, IVV, A200, NDQ and more. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Compare Australian ETFs — Fees, Returns & Holdings (2026)",
    description: "Side-by-side comparison of fees, categories and providers for popular Australian ETFs.",
    images: [{ url: "/api/og?title=Compare+Australian+ETFs&subtitle=Fees,+Returns+%26+Holdings&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare/etfs" },
};

export const revalidate = 3600;

export default function ETFComparePage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
      { "@type": "ListItem", position: 2, name: "Compare Platforms", item: "https://invest.com.au/compare" },
      { "@type": "ListItem", position: 3, name: "Compare ETFs", item: "https://invest.com.au/compare/etfs" },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Suspense><CompareNav /></Suspense>
      <ETFCompareClient />
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
