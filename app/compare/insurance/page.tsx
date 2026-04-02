import { Suspense } from "react";
import { UPDATED_LABEL } from "@/lib/seo";
import InsuranceCompareClient from "./InsuranceCompareClient";
import CompareNav from "../CompareNav";

export const metadata = {
  title: "Compare Insurance in Australia — Life, Income, Home (2026)",
  description: `Compare life insurance, income protection, home & contents, and health insurance from Australia's leading insurers. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Compare Insurance in Australia — Life, Income, Home (2026)",
    description:
      "Side-by-side comparison of life, income protection, home & contents, and health insurance across Australia's top insurers.",
    images: [
      {
        url: "/api/og?title=Compare+Insurance&subtitle=Life,+Income,+Home+%26+Health+2026&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare/insurance" },
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
      name: "Insurance",
      item: "https://invest.com.au/compare/insurance",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What types of insurance do I need in Australia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The types of insurance you need depend on your circumstances. Most Australians benefit from life insurance and income protection (especially if you have dependants or a mortgage). Home & contents insurance is essential for homeowners and renters. Private health insurance can reduce your tax if you earn above the Medicare Levy Surcharge threshold.",
      },
    },
    {
      "@type": "Question",
      name: "Is life insurance through super cheaper?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Life insurance through super is often cheaper because premiums are paid from your super balance (pre-tax dollars). However, cover through super may offer lower benefit amounts and fewer features than a standalone policy. An insurance broker can help you compare both options.",
      },
    },
    {
      "@type": "Question",
      name: "How much income protection insurance do I need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Income protection typically covers up to 75% of your pre-tax income. Consider your monthly expenses, mortgage repayments, and how long you could manage without income when choosing a benefit period and waiting period.",
      },
    },
  ],
};

export default function InsuranceComparePage() {
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
      <InsuranceCompareClient />
    </>
  );
}
