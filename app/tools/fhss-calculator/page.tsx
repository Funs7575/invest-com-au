import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import FHSSCalculatorClient from "./FHSSCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `FHSS Calculator (${CURRENT_YEAR}) — First Home Super Saver Deposit Estimator`,
  description:
    "Calculate how much deposit you can save via the First Home Super Saver Scheme and how much tax you save vs saving outside super. Covers all income brackets and concessional + non-concessional contributions.",
  alternates: { canonical: `${SITE_URL}/tools/fhss-calculator` },
  openGraph: {
    title: `FHSS Deposit Calculator (${CURRENT_YEAR})`,
    description:
      "Estimate your FHSS releasable amount and tax saving across all income brackets.",
    url: `${SITE_URL}/tools/fhss-calculator`,
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "FHSS Calculator", url: "/tools/fhss-calculator" },
]);

const calcLd = calculatorJsonLd({
  name: "First Home Super Saver (FHSS) Calculator",
  description:
    "Estimate how much deposit you can save via the FHSS scheme and how much tax you'd save compared to saving outside super.",
  path: "/tools/fhss-calculator",
});

const faqLd = faqJsonLd([
  {
    q: "What is the First Home Super Saver Scheme (FHSS)?",
    a: "The FHSS scheme lets first home buyers save for a deposit inside their superannuation fund, taking advantage of the lower 15% contributions tax. You can contribute up to $15,000 per year (max $50,000 total) and withdraw those savings as your home deposit.",
  },
  {
    q: "How much can I release from FHSS?",
    a: "You can release a maximum of $50,000 in total across all years of contributions (plus associated earnings). Up to $15,000 per financial year counts toward the limit.",
  },
]);

export default function FHSSCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense>
        <FHSSCalculatorClient />
      </Suspense>
    </>
  );
}
