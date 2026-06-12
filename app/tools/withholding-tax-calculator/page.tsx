import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import InvestOpportunitiesCallout from "@/components/invest/InvestOpportunitiesCallout";
import WithholdingTaxClient from "./WithholdingTaxClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Australian Withholding Tax Calculator (${CURRENT_YEAR}) — DTA Rates by Country`,
  description:
    "Australian withholding tax for non-residents — dividends, interest, and royalties. DTA-reduced rates for 19 countries from our foreign-investment database.",
  alternates: { canonical: "/tools/withholding-tax-calculator" },
  openGraph: {
    title: `Australian Withholding Tax Calculator (${CURRENT_YEAR})`,
    description:
      "DTA-reduced withholding rates on Australian dividends, interest, and royalties by country.",
    url: absoluteUrl("/tools/withholding-tax-calculator"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Withholding Tax Calculator")}&sub=${encodeURIComponent("Dividends · Interest · DTA Rates · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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

const WHT_FAQS = [
  {
    q: "What is Australian withholding tax?",
    a: "Australian withholding tax (WHT) is a tax deducted at source on certain income paid to non-residents, including dividends, interest, and royalties. The standard rates are 30% on unfranked dividends, 10% on interest, and 30% on royalties — but these are reduced for residents of countries that have a Double Tax Agreement (DTA) with Australia.",
  },
  {
    q: "How does a Double Tax Agreement reduce withholding tax?",
    a: "A DTA is a bilateral treaty between Australia and another country that allocates taxing rights and caps withholding tax rates. For example, under the Australia–UK DTA, the withholding tax on unfranked dividends paid to a UK resident company holding ≥10% of the Australian company is reduced from 30% to 5%. The Australian payer deducts the DTA rate rather than the standard rate — you don't need to lodge a refund claim if the correct rate is applied at source.",
  },
  {
    q: "Does withholding tax apply to Australian capital gains?",
    a: "Australian Capital Gains Tax (CGT) generally does not apply to non-residents on gains from shares in Australian companies listed on the ASX — those are 'portfolio interests'. Non-residents can, however, be subject to Australian CGT on direct interests in Australian real property or on shares in companies whose assets are principally Australian real property (known as Taxable Australian Real Property, or TARP). Withholding tax on TARP disposals is a separate regime called FRCGW (foreign resident capital gains withholding).",
  },
  {
    q: "How do I reclaim excess withholding tax?",
    a: "If too much WHT was deducted (e.g., the payer applied the domestic rate instead of the lower DTA rate), you can lodge an Australian tax return to claim a refund, or in some cases submit a WHT refund application directly to the ATO without lodging a full return. You will need documentation of the income received and the WHT deducted, and proof of your country of tax residence.",
  },
];

const whtFaqLd = faqJsonLd(WHT_FAQS);

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
      {whtFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(whtFaqLd) }}
        />
      )}
      <Suspense fallback={<Loading />}>
        <WithholdingTaxClient />
      </Suspense>
      <div className="container-custom max-w-3xl pb-8 space-y-8">
        <InvestOpportunitiesCallout
          tone="blue"
          icon="globe"
          heading="Worked out your withholding rate? Now find the investments."
          blurb="Browse ASX-listed securities and FIRB-eligible opportunities suited to foreign and non-resident investors — or compare brokers that accept non-residents."
          href="/invest?kind=listed_security&firb=eligible"
          ctaLabel="Browse listed opportunities"
          secondary={{ label: "Compare non-resident brokers", href: "/compare" }}
        />
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {WHT_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
