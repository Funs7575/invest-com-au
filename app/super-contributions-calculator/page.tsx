import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import SuperContributionsClient from "./SuperContributionsClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Contributions Calculator — Concessional Caps & Tax Savings (${CURRENT_YEAR})`,
  description:
    "Calculate how much you can contribute to super in FY2026. See your concessional cap usage, tax savings from salary sacrifice, and whether carry-forward rules apply.",
  alternates: { canonical: "/super-contributions-calculator" },
  openGraph: {
    title: "Super Contributions Calculator — Concessional Caps & Tax Savings",
    description:
      "Enter your income and employer contributions to see your remaining concessional cap, tax savings, and Division 293 liability for FY2026.",
    images: [
      {
        url: "/api/og?title=Super+Contributions+Calculator&subtitle=Caps+%26+Tax+Savings+FY2026&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Super Contributions Calculator — ${SITE_NAME}`,
  description:
    "Calculate your FY2026 concessional and non-concessional super contribution caps, tax savings from salary sacrifice, and Division 293 liability.",
  url: "https://invest.com.au/super-contributions-calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Super Contributions Calculator",
      item: "https://invest.com.au/super-contributions-calculator",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the concessional super contribution cap for FY2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The concessional (before-tax) contribution cap is $30,000 for FY2026. This includes employer super guarantee (SG) contributions and any salary sacrifice or personal deductible contributions you make.",
      },
    },
    {
      "@type": "Question",
      name: "What is the non-concessional super contribution cap?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The non-concessional (after-tax) contribution cap is $120,000 per year for FY2026. If eligible, you can use the bring-forward rule to contribute up to $360,000 over three years.",
      },
    },
    {
      "@type": "Question",
      name: "What is Division 293 tax?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Division 293 is an additional 15% tax on concessional super contributions for individuals with income (including super contributions) exceeding $250,000. This brings the total super tax rate to 30% for high earners, rather than the standard 15%.",
      },
    },
    {
      "@type": "Question",
      name: "Can I carry forward unused super contribution caps?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, if your total super balance is below $500,000 on 30 June of the previous financial year, you can carry forward unused concessional cap amounts from the preceding five financial years and use them in a single year.",
      },
    },
  ],
};

export default function SuperContributionsCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <SuperContributionsClient />
    </>
  );
}
