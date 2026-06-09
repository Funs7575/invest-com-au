import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import SmsfCheckerClient from "./SmsfCheckerClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `SMSF Eligibility Checker (${CURRENT_YEAR}) — Collectibles, Property & Crypto in Super`,
  description:
    "Check whether an asset can be held inside your SMSF. Covers SISA collectables rules, related-party acquisitions, in-house assets, and LRBA constraints.",
  alternates: { canonical: "/tools/smsf-checker" },
  openGraph: {
    title: `SMSF Eligibility Checker (${CURRENT_YEAR})`,
    description:
      "Step-by-step checker for whether residential property, shares, collectables, crypto or business real property can sit inside an SMSF.",
    url: absoluteUrl("/tools/smsf-checker"),
    images: [{ url: `/api/og?title=${encodeURIComponent("SMSF Suitability Checker")}&sub=${encodeURIComponent("Is an SMSF Right for Me · Costs · Benefits · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can I keep my Rolex in my SMSF and wear it on weekends?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Collectables held in an SMSF — including watches, jewellery, artwork, and wine — must not be stored in the home of a related party and must not be used by a related party. Wearing a Rolex owned by your SMSF would breach the sole-purpose test (s62 SISA) and the ATO's collectable rules. The item must be stored with an independent custodian and insured in the fund's name.",
      },
    },
    {
      "@type": "Question",
      name: "Can I sell my own house to my SMSF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Generally no. An SMSF cannot acquire residential property from a related party — this is prohibited under s66 of the SISA, even at market value. The exception is business real property (commercial premises used wholly and exclusively in a business), which can be transferred from a related party at market value.",
      },
    },
    {
      "@type": "Question",
      name: "Can my SMSF hold cryptocurrency?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, provided the investment is allowed under the fund's investment strategy, the crypto is kept separate from the members' personal assets, and ownership is documented on the blockchain or via a custody arrangement in the fund's name. The ATO treats crypto as property; the sole-purpose test and arm's-length rules still apply.",
      },
    },
    {
      "@type": "Question",
      name: "What is the sole-purpose test?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The sole-purpose test (SISA s62) requires that your SMSF is maintained solely for the purpose of providing retirement benefits to members, or death benefits to their dependants. Any investment that incidentally benefits a member or related party before retirement — such as personal use of a collectable or a below-market loan to a family member — will fail this test and can result in the fund being made non-complying, losing its 15% tax rate.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if my SMSF breaches a compliance rule?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The ATO can make the fund non-complying, which means the fund's assets are taxed at the top marginal rate (45%) rather than the concessional 15%. Trustees may also face civil penalties of up to $18,780 per breach, disqualification as a trustee, and in serious cases criminal prosecution. Seek advice from a licensed SMSF auditor or specialist tax adviser before making any unusual investment.",
      },
    },
  ],
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
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
