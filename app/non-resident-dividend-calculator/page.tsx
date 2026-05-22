import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import NonResidentDividendClient from "./NonResidentDividendClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Non-Resident Australian Dividend Calculator (${CURRENT_YEAR}) — Withholding Tax & Franking`,
  description:
    "Calculate the final cash you receive on an Australian fully/partially/unfranked dividend as a non-resident. Includes Double Tax Agreement rates for major jurisdictions.",
  alternates: { canonical: "/non-resident-dividend-calculator" },
  openGraph: {
    title: `Non-Resident Dividend Calculator (${CURRENT_YEAR})`,
    description:
      "Australian dividend withholding tax and DTA-reduced rates for non-resident investors in ASX shares.",
    url: absoluteUrl("/non-resident-dividend-calculator"),
  },
};

const softwareLd = calculatorJsonLd({
  name: "Non-Resident Dividend Calculator",
  description:
    "Calculate withholding tax and final cash dividends for non-residents receiving Australian share distributions.",
  path: "/non-resident-dividend-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  {
    name: "Non-Resident Dividend Calculator",
    url: absoluteUrl("/non-resident-dividend-calculator"),
  },
]);

const faqLd = faqJsonLd([
  {
    q: "What is the withholding tax rate on Australian dividends for non-residents?",
    a: "The default rate is 30% on the unfranked component of a dividend paid to a non-resident. This rate is reduced to 15% for shareholders resident in a country that has a Double Tax Agreement (DTA) with Australia — including the US, UK, Canada, New Zealand, Japan, Singapore, Germany, France, Netherlands, Switzerland, Ireland, Sweden, Denmark, Finland, and Norway, among others. The fully franked component of a dividend is exempt from withholding tax entirely.",
  },
  {
    q: "How do franking credits affect dividend withholding tax?",
    a: "Australian companies pay 30% (or 25% for base-rate entities) corporate tax on profits, and attach franking credits to dividends paid from those taxed profits. For non-resident shareholders, the franked portion of a dividend is exempt from dividend withholding tax under the Conduit Foreign Income rules. Withholding tax applies only to the unfranked component at the relevant DTA rate (or 30% default). A fully-franked dividend therefore carries zero withholding tax for the non-resident, regardless of treaty status.",
  },
  {
    q: "Which countries have a 15% withholding tax treaty with Australia?",
    a: "The following countries have a DTA with Australia that reduces the standard 30% dividend withholding to 15% on the unfranked component: United States, United Kingdom, Canada, New Zealand, Japan, Singapore, Germany, France, Netherlands, Switzerland, Ireland, Sweden, Denmark, Finland, Norway, and many others. Japan has an even lower 10% rate in some cases. The full list is in Schedule 1 of the ITAA 1936. Rates apply to the unfranked portion only; the franked component remains exempt.",
  },
  {
    q: "Do I need to lodge an Australian tax return as a non-resident with only dividend income?",
    a: "Generally no. If Australian dividend withholding tax is your only Australian tax obligation and you have no other Australian-source income, the withholding is your final tax and no return is required. However, if you also receive Australian interest, royalties, or other Australian-source income not subject to a final withholding tax, you may need to lodge an Australian non-resident return. Seek advice from an Australian tax agent if you are unsure.",
  },
  {
    q: "How is dividend withholding tax collected?",
    a: "Dividend withholding tax is collected at source. The Australian company calculates the withholding amount, deducts it from the dividend before payment, and remits it directly to the ATO. The non-resident shareholder receives the net dividend automatically — no action is required. The company must also file a withholding tax statement with the ATO. Non-resident shareholders do not need to lodge a separate return or make a separate payment for dividend withholding tax.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Non-Resident Dividend Withholding Tax Calculator",
  path: "/non-resident-dividend-calculator",
  selectors: ["h1"],
});

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

export default function NonResidentDividendCalculatorPage() {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />
      <Suspense fallback={<Loading />}>
        <NonResidentDividendClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
