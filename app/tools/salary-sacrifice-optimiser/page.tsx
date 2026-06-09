import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, type FaqItem } from "@/lib/schema-markup";
import SalarySacrificeOptimiserClient from "./SalarySacrificeOptimiserClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Salary Sacrifice Optimiser (${CURRENT_YEAR}) — Calculate Your Super Tax Saving`,
  description:
    "Calculate the benefit of salary sacrificing into super — income tax saving, contributions tax, Division 293 impact and net annual advantage. FY2025-26.",
  alternates: { canonical: `${SITE_URL}/tools/salary-sacrifice-optimiser` },
  openGraph: {
    title: `Salary Sacrifice Optimiser (${CURRENT_YEAR})`,
    description:
      "How much will salary sacrifice actually save you? Enter your salary and sacrifice amount for a before/after comparison using FY2025-26 tax rates.",
    url: `${SITE_URL}/tools/salary-sacrifice-optimiser`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Salary Sacrifice Optimiser")}&sub=${encodeURIComponent("Super · Novated Lease · Tax Savings · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "Salary Sacrifice Optimiser", url: "/tools/salary-sacrifice-optimiser" },
]);

const calcLd = calculatorJsonLd({
  name: "Salary Sacrifice Optimiser",
  description:
    "Calculate the tax benefit of salary sacrificing into superannuation. Shows income tax saving, contributions tax (15% or 30% for Division 293), and net annual advantage using FY2025-26 Australian tax rates.",
  path: "/tools/salary-sacrifice-optimiser",
});

const FAQS: FaqItem[] = [
  {
    q: "How does salary sacrifice into super reduce my tax?",
    a: "Salary sacrifice redirects part of your pre-tax salary into super before income tax is applied. That amount is taxed at 15% inside super rather than at your marginal rate (19%, 32.5%, 37%, or 45% + Medicare). The difference is your tax saving. For example, at a 37% marginal rate, a $10,000 sacrifice saves $2,200 per year in income tax (37% less 15% = 22% saving).",
  },
  {
    q: "What is the concessional contributions cap?",
    a: "The concessional (before-tax) cap is $30,000 per financial year in FY2025-26. It includes your employer's Superannuation Guarantee (11.5% in FY2025-26) and any salary sacrifice amounts. Excess concessional contributions are included in your taxable income and taxed at your marginal rate, with an interest charge from the ATO.",
  },
  {
    q: "What is Division 293 tax?",
    a: "Division 293 is an extra 15% tax on concessional contributions for people with income above $250,000 (income plus concessional contributions combined). It brings the effective tax rate on super contributions to 30%. Salary sacrifice is still worthwhile at the 45% or 47% marginal rates — you save 15-17 cents per dollar — but the advantage is smaller than for middle-income earners.",
  },
  {
    q: "Does salary sacrifice reduce my take-home pay by the full sacrifice amount?",
    a: "No. Your take-home pay falls by less than the sacrifice amount because you save income tax on the sacrifice. For example, at a 32.5% marginal rate, sacrificing $10,000 only costs you $6,750 in take-home pay — the remaining $3,250 was income tax you would have paid anyway. The employer then pays the 15% contributions tax from the super fund, so the fund receives $8,500 net.",
  },
  {
    q: "Can I use carry-forward unused cap to sacrifice more than $30,000?",
    a: "Yes, if your total super balance was under $500,000 at 30 June last year, you can carry forward up to 5 years of unused concessional cap. This allows a one-off sacrifice larger than $30,000 in a single year. The calculator shows the standard $30,000 annual cap; a financial adviser can model your carry-forward entitlement.",
  },
];

const faqLd = faqJsonLd(FAQS);

export default function SalarySacrificeOptimiserPage() {
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
        <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-6 flex gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>›</span>
          <Link href="/tools" className="hover:text-slate-600">Tools</Link>
          <span>›</span>
          <span className="text-slate-600">Salary Sacrifice Optimiser</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Calculator · FY2025-26</p>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            Salary Sacrifice Optimiser
          </h1>
          <p className="text-slate-500 text-base">
            See exactly how much you save (and keep) when you redirect pre-tax salary into super.
            Uses FY2025-26 tax rates including Division 293 for high earners.
          </p>
        </header>

        <Suspense>
          <SalarySacrificeOptimiserClient />
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
