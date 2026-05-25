import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
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
    q: "What is the First Home Super Saver Scheme?",
    a: "The FHSS scheme allows eligible Australians to save for a first home deposit inside superannuation. Voluntary contributions (concessional up to $15k/yr, non-concessional) made since 1 July 2017 can later be withdrawn for a home purchase, taking advantage of the lower tax rate inside super (15% vs marginal rate on concessional contributions).",
  },
  {
    q: "How much can I save under the FHSS scheme?",
    a: "From 1 July 2022, the maximum releasable amount is $50,000 of voluntary contributions (plus earnings). You can contribute up to $15,000 per year into the scheme (from 2024-25; was $15,000 before). You must apply to the ATO for a FHSS determination before signing a sale contract.",
  },
  {
    q: "Who is eligible for the FHSS?",
    a: "You must be 18+ at the time of release, never previously owned property in Australia (or qualify for the hardship exemption), have not previously requested an FHSS release, and intend to live in the property for at least 6 months within the first 12 months of owning it.",
  },
  {
    q: "How is the FHSS withdrawal taxed?",
    a: "The FHSS release amount is included in your assessable income in the year of withdrawal, but you receive a 30% tax offset on the taxable component. Concessional contributions and their earnings are taxed at marginal rate minus 30% offset; non-concessional contributions are tax-free on withdrawal.",
  },
  {
    q: "Can I use the FHSS with the First Home Guarantee?",
    a: "Yes. The FHSS scheme and the First Home Guarantee (5% deposit, no LMI) can be used together. The FHSS gives you tax-effective savings; the Guarantee removes the LMI requirement at the low deposit level. Both require the buyer to be a first home buyer and to occupy the property.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "FHSS Calculator — First Home Super Saver Deposit Estimator",
  path: "/tools/fhss-calculator",
  selectors: ["h1"],
});

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />
      <Suspense>
        <FHSSCalculatorClient />
      </Suspense>
    </>
  );
}
