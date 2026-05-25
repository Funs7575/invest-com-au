/**
 * /tools/dasp-calculator
 *
 * DASP (Departing Australia Superannuation Payment) Calculator page.
 *
 * Displays the interactive DaspCalculatorClient with full JSON-LD markup
 * (SoftwareApplication + FAQPage + BreadcrumbList) and compliance footers.
 *
 * AFSL safety: factual withholding estimate only. DASP_WARNING +
 * GENERAL_ADVICE_WARNING surfaced inside the client component. No
 * personal advice, no product recommendations.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { DASP_WARNING, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { faqJsonLd, type FaqItem } from "@/lib/schema-markup";
import DaspCalculatorClient from "./DaspCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `DASP Calculator — Departing Australia Superannuation Payment (${CURRENT_YEAR})`,
  description:
    "Calculate the tax withheld on your Departing Australia Superannuation Payment (DASP). Shows 35% standard rate vs 65% Working Holiday Maker rate, plus component breakdown (taxed, untaxed, tax-free). ATO rates.",
  alternates: { canonical: absoluteUrl("/tools/dasp-calculator") },
  openGraph: {
    title: `DASP Calculator — Departing Australia Super Tax (${CURRENT_YEAR})`,
    description:
      "Estimate net DASP payment after ATO withholding. 35% standard / 65% WHM. Free and instant.",
    url: absoluteUrl("/tools/dasp-calculator"),
  },
  twitter: { card: "summary_large_image" },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `DASP Calculator — ${SITE_NAME}`,
  description:
    "Estimate the Australian withholding tax on a Departing Australia Superannuation Payment (DASP) for temporary visa holders and Working Holiday Makers.",
  url: absoluteUrl("/tools/dasp-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  { name: "DASP Calculator", url: absoluteUrl("/tools/dasp-calculator") },
]);

const FAQS: FaqItem[] = [
  {
    q: "What is DASP?",
    a: "DASP stands for Departing Australia Superannuation Payment. It allows temporary visa holders who have permanently left Australia to claim their accumulated superannuation. You apply through the ATO's DASP portal after your visa has ceased.",
  },
  {
    q: "What is the DASP withholding rate?",
    a: "For most temporary visa holders, the DASP withholding rate is 35% on the taxed element and 45% on the untaxed element. The tax-free component is taxed at 0%. Working Holiday Makers (subclass 417 and 462) face a higher rate of 65% on the entire taxable component (both taxed and untaxed elements).",
  },
  {
    q: "How does the WHM DASP rate differ?",
    a: "Working Holiday Makers (visa subclass 417 or 462) pay a flat 65% DASP withholding rate on their entire taxable component — compared to the 35%/45% split for standard temporary residents. This rate applies if you held a WHM visa at any time, even if your final visa is a different subclass.",
  },
  {
    q: "What is the tax-free component of super?",
    a: "The tax-free component is the portion of your super made from non-concessional (after-tax) contributions. This component is not taxed on DASP withdrawal — you receive it in full. Most accumulation fund balances consist primarily of the taxed element (employer SG contributions + concessional contributions + fund earnings).",
  },
  {
    q: "When can I apply for DASP?",
    a: "You can apply for DASP via the ATO's online portal once: (1) your visa has ceased (either expired or cancelled), and (2) you have departed Australia. Most funds process claims within 28 days once the ATO has confirmed your visa status. You cannot apply while still holding an active temporary visa in Australia.",
  },
  {
    q: "Does the calculator account for my exact super fund balance breakdown?",
    a: "The calculator uses the component amounts you enter. If you are unsure of your taxed/untaxed/tax-free split, contact your super fund — they are required to provide this information. For most retail accumulation funds, the entire balance is in the taxed element.",
  },
];

const faqLd = faqJsonLd(FAQS);

function Loading() {
  return (
    <div className="py-12 animate-pulse container-custom max-w-3xl">
      <div className="h-6 w-64 bg-slate-100 rounded mb-4" />
      <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
      <div className="h-80 bg-slate-100 rounded-xl" />
    </div>
  );
}

export default function DaspCalculatorPage() {
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
        <DaspCalculatorClient />
      </Suspense>

      {/* FAQ section (for SEO + accessibility — answers the structured-data above) */}
      <section className="py-10 bg-slate-50 border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-base font-extrabold text-slate-900 mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <p className="text-sm font-bold text-slate-900 mb-1.5">
                  {faq.q}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
