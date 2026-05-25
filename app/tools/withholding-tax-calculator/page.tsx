import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import WithholdingTaxClient from "./WithholdingTaxClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Australian Withholding Tax Calculator (${CURRENT_YEAR}) — DTA Rates by Country`,
  description:
    "Calculate the Australian withholding tax on dividends, interest, and royalties for non-residents. Includes DTA-reduced rates for 19 countries with live data from our foreign-investment rates database.",
  alternates: { canonical: "/tools/withholding-tax-calculator" },
  openGraph: {
    title: `Australian Withholding Tax Calculator (${CURRENT_YEAR})`,
    description:
      "DTA-reduced withholding rates on Australian dividends, interest, and royalties by country.",
    url: absoluteUrl("/tools/withholding-tax-calculator"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Withholding Tax Calculator — ${SITE_NAME}`,
  description:
    "Free DTA withholding-rate lookup for non-resident investors in Australian shares, bonds, and royalty streams.",
  url: absoluteUrl("/tools/withholding-tax-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Withholding Tax Calculator",
    url: absoluteUrl("/tools/withholding-tax-calculator"),
  },
]);

const faqLd = faqJsonLd([
  {
    q: "What is withholding tax in Australia?",
    a: "Australian withholding taxes are amounts deducted from payments made to non-residents before they leave Australia. The main types are: dividend withholding tax (WHT), interest WHT, royalty WHT, and managed investment trust distributions. The payer (company, bank, trust) deducts the tax and remits it to the ATO; the recipient receives the net amount.",
  },
  {
    q: "What is the standard withholding tax rate for Australian dividends?",
    a: "The default withholding tax rate is 30%, reduced to 15% for residents of countries with which Australia has a double taxation agreement (DTA), and 0% on the fully franked component of any dividend regardless of residency.",
  },
  {
    q: "How does Australia's withholding tax on interest work?",
    a: "Interest paid to a non-resident is subject to a 10% withholding tax (the Interest Withholding Tax or IWT). This applies to interest on loans, deposits, and bonds. Some DTA countries may have a lower rate; the US and UK treaty rates are 10% standard, with 0% available on certain government bond interest under treaty Article 11.",
  },
  {
    q: "Are managed fund distributions subject to withholding tax?",
    a: "Yes. Australian managed investment trusts (MITs) apply withholding tax on distributions to non-residents: 15% for eligible residents of countries with exchange-of-information agreements (the MIT cap rate), and 30% for others. AMIT structures (Attribution MITs) use similar rules. The 15% MIT rate is different from the general dividend WHT rate.",
  },
  {
    q: "Can I reclaim Australian withholding tax?",
    a: "Withholding tax is generally a final tax — you cannot reclaim it unless you lodge an Australian tax return demonstrating that the actual tax liability is less than the amount withheld (rare for passive income). Your home country may allow a foreign tax credit for the Australian WHT paid, reducing your domestic tax on the same income.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Australian Withholding Tax Calculator",
  path: "/tools/withholding-tax-calculator",
  selectors: ["h1"],
});

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-6 w-64 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-80 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function WithholdingTaxCalculatorPage() {
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
        <WithholdingTaxClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
