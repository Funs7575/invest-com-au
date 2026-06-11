import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, type FaqItem } from "@/lib/schema-markup";
import CGTCalculatorClient from "./CGTCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `CGT Calculator (${CURRENT_YEAR}) — Capital Gains Tax Estimator Australia`,
  description:
    "Calculate capital gains tax on shares, property or crypto — 50% CGT discount for 12+ month holdings, FY2025-26 marginal rates and net profit after tax.",
  alternates: { canonical: `${SITE_URL}/tools/cgt-calculator` },
  openGraph: {
    title: `CGT Calculator (${CURRENT_YEAR}) — Capital Gains Tax Australia`,
    description:
      "Enter your purchase price, sale price, and holding period. The calculator applies the 50% CGT discount and your marginal tax rate to estimate CGT owed.",
    url: `${SITE_URL}/tools/cgt-calculator`,
    images: [{ url: `/api/og?title=${encodeURIComponent("CGT Calculator Australia")}&sub=${encodeURIComponent("Capital Gains Tax · 50% Discount · Cost Base · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "CGT Calculator", url: "/tools/cgt-calculator" },
]);

const calcLd = calculatorJsonLd({
  name: "Capital Gains Tax Calculator",
  description:
    "Estimate CGT on shares, property, cryptocurrency, or other assets. Includes 50% discount for assets held over 12 months, purchase and sale costs, and FY2025-26 marginal tax rates.",
  path: "/tools/cgt-calculator",
});

const FAQS: FaqItem[] = [
  {
    q: "How is capital gains tax calculated in Australia?",
    a: "Your capital gain equals the proceeds (sale price minus sale costs) minus the cost base (purchase price plus purchase costs). If you held the asset for more than 12 months, you can apply a 50% discount to the gain before adding it to your taxable income for the year. The gain is then taxed at your marginal income tax rate — not a separate CGT rate.",
  },
  {
    q: "What is the 50% CGT discount?",
    a: "Australian resident individuals and trusts can apply a 50% discount to capital gains on assets held for more than 12 months. This effectively halves the tax owed — for example, a $30,000 gain after a 12-month hold is only taxed as a $15,000 gain. Companies and superannuation funds cannot access the 50% discount (super funds get a one-third discount).",
  },
  {
    q: "What's included in the cost base?",
    a: "The cost base includes the original purchase price plus incidental costs: stamp duty, legal fees, and brokerage on purchase. For property, you may also include capital improvement costs (not repairs). For investment properties, you must reduce the cost base by depreciation deductions you've already claimed.",
  },
  {
    q: "Can I offset a capital loss against a capital gain?",
    a: "Yes. Capital losses must first be offset against capital gains in the same year before the 50% discount is applied. Remaining losses carry forward indefinitely and can offset future gains. Capital losses cannot be offset against ordinary income such as salary.",
  },
  {
    q: "Do I pay CGT on crypto in Australia?",
    a: "Yes. The ATO treats cryptocurrency as a capital asset, not currency. Every disposal — selling, swapping, spending, or gifting — is a CGT event. The 50% discount applies if you held the crypto for more than 12 months. The ATO can access exchange data, so all crypto gains should be reported.",
  },
  {
    q: "When is my main residence CGT-free?",
    a: "Your main residence is fully CGT-exempt if you owned and lived in it the entire time, and the land is under 2 hectares. A partial exemption applies if you rented part of it or used it for income. The 6-year rule allows you to treat a former main residence as your main residence for up to 6 years while it is rented, preserving the exemption if you have no other main residence.",
  },
];

const faqLd = faqJsonLd(FAQS);

export default function CGTCalculatorPage() {
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

      <div className="container-custom max-w-2xl py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6 flex gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>›</span>
          <Link href="/tools" className="hover:text-slate-600">Tools</Link>
          <span>›</span>
          <span className="text-slate-600">CGT Calculator</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Calculator · FY2025-26</p>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            Capital Gains Tax Calculator
          </h1>
          <p className="text-slate-500 text-base">
            Estimate CGT on shares, property, crypto, or other assets. Enter your purchase and sale details
            to see the 50% CGT discount impact and your tax owed.
          </p>
        </header>

        <Suspense>
          <CGTCalculatorClient />
        </Suspense>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
