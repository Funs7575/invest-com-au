import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import CurrencyConverterClient from "./CurrencyConverterClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "AUD Currency Converter — Australian Dollar to USD, GBP, EUR + 12 more",
  description:
    "Convert Australian dollars to and from 15 currencies. Includes a reference table of key Australian thresholds (FIRB, visa minimums, super caps) in the target currency.",
  alternates: { canonical: absoluteUrl("/tools/currency-converter") },
  openGraph: {
    title: "AUD Currency Converter",
    description:
      "Convert AUD to USD, GBP, EUR, JPY, SGD, NZD and more. Plus Australian FIRB threshold and super cap reference table.",
    url: absoluteUrl("/tools/currency-converter"),
    images: [{ url: `/api/og?title=${encodeURIComponent("AUD Currency Converter")}&sub=${encodeURIComponent("Live Rates · USD · GBP · EUR · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: absoluteUrl("/tools") },
  { name: "AUD Currency Converter" },
]);

const FX_FAQS = [
  {
    q: "Are the exchange rates live?",
    a: "The rates shown are indicative mid-market rates sourced from open exchange-rate data. They are updated daily and represent the midpoint between buy and sell prices. The rate you receive when converting money through a bank or foreign-exchange provider will differ — typically by 1–3% or more — due to the spread and any transaction fees the provider charges.",
  },
  {
    q: "What is the FIRB threshold for foreign investment in Australia?",
    a: "The Foreign Investment Review Board (FIRB) requires foreign persons to apply for approval before acquiring an interest in Australian residential real estate (generally any purchase). For commercial land and agribusiness, a monetary threshold applies — typically A$275 million for investors from countries with free trade agreements, A$55 million for agribusiness, and lower thresholds for sensitive sectors. The converter reference table shows key thresholds in your target currency so you can quickly gauge how much you need.",
  },
  {
    q: "What is the superannuation concessional contributions cap?",
    a: "The concessional (before-tax) contributions cap is A$30,000 per financial year in 2025–26. Contributions above this cap are included in your assessable income and taxed at your marginal rate plus an excess concessional contributions charge. The reference table converts this cap into your chosen currency so you can plan contributions if you are earning or saving in a foreign currency.",
  },
  {
    q: "Why do bank exchange rates differ from mid-market rates?",
    a: "Banks and foreign-exchange providers make money on currency conversion by quoting a rate that is less favourable than the mid-market (interbank) rate. The difference — called the spread — plus any flat fee is their margin. On large transactions this can be several percent. Specialist FX providers and fintech platforms typically offer tighter spreads than the big four banks, though all carry some margin over the mid-market rate shown here.",
  },
];

const fxFaqLd = faqJsonLd(FX_FAQS);

export default function CurrencyConverterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {fxFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(fxFaqLd) }}
        />
      )}
      <CurrencyConverterClient />
      <div className="container-custom max-w-3xl pb-10">
        <div className="mt-8">
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FX_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
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
      </div>
    </>
  );
}
