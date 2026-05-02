import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import SmsfCheckerClient from "./SmsfCheckerClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `SMSF Eligibility Checker (${CURRENT_YEAR}) — Collectibles, Property & Crypto in Super`,
  description:
    "Check whether an asset class can be held inside your self-managed super fund. Covers SISA s62A collectables rules, related-party acquisitions, in-house assets, LRBA constraints, and storage / insurance requirements.",
  alternates: { canonical: "/tools/smsf-checker" },
  openGraph: {
    title: `SMSF Eligibility Checker (${CURRENT_YEAR})`,
    description:
      "Step-by-step checker for whether residential property, shares, collectables, crypto or business real property can sit inside an SMSF.",
    url: absoluteUrl("/tools/smsf-checker"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `SMSF Eligibility Checker — ${SITE_NAME}`,
  description:
    "Interactive screening tool covering the main SISA constraints on SMSF investments — collectables, related-party acquisitions, LRBAs and personal-use rules.",
  url: absoluteUrl("/tools/smsf-checker"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "SMSF Eligibility Checker",
    url: absoluteUrl("/tools/smsf-checker"),
  },
]);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function SmsfCheckerPage() {
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
        <SmsfCheckerClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
