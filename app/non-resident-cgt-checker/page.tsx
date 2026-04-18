import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import NonResidentCgtClient from "./NonResidentCgtClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Non-Resident CGT Checker (${CURRENT_YEAR}) — Section 855-10 Eligibility`,
  description:
    "Interactive check: does the Australian CGT exemption for non-residents apply to your asset? Covers listed shares, direct mining, real property, and the Taxable Australian Property tests.",
  alternates: { canonical: "/non-resident-cgt-checker" },
  openGraph: {
    title: `Non-Resident CGT Checker (${CURRENT_YEAR})`,
    description:
      "Check if Section 855-10 CGT exemption applies to your Australian investment.",
    url: absoluteUrl("/non-resident-cgt-checker"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Non-Resident CGT Checker — ${SITE_NAME}`,
  description:
    "Interactive decision tool for Section 855-10 portfolio CGT exemption eligibility for non-resident Australian investors.",
  url: absoluteUrl("/non-resident-cgt-checker"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  {
    name: "Non-Resident CGT Checker",
    url: absoluteUrl("/non-resident-cgt-checker"),
  },
]);

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

export default function NonResidentCgtCheckerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Suspense fallback={<Loading />}>
        <NonResidentCgtClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
