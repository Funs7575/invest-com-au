import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import FirbFeeEstimatorClient from "./FirbFeeEstimatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `FIRB Application Fee Estimator (${CURRENT_YEAR}) — Foreign Investment Australia`,
  description:
    "Estimate the Australian FIRB application fee for residential, commercial, agricultural, business, or critical-infrastructure acquisitions. Based on the Treasury fee schedule.",
  alternates: { canonical: "/firb-fee-estimator" },
  openGraph: {
    title: `FIRB Application Fee Estimator (${CURRENT_YEAR})`,
    description:
      "Indicative Australian FIRB application fee based on asset class, transaction value, and investor type.",
    url: absoluteUrl("/firb-fee-estimator"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `FIRB Fee Estimator — ${SITE_NAME}`,
  description:
    "Free Australian FIRB application fee estimator based on the published Treasury fee schedule.",
  url: absoluteUrl("/firb-fee-estimator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  { name: "FIRB Fee Estimator", url: absoluteUrl("/firb-fee-estimator") },
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

export default function FirbFeeEstimatorPage() {
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
        <FirbFeeEstimatorClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
