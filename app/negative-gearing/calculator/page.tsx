import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import NegativeGearingCalculatorClient from "./NegativeGearingCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Negative Gearing Calculator: Property Investment Cash Flow & Tax | Invest.com.au",
  description:
    "Free negative-gearing calculator. Enter your rent, costs and tax rate. See annual loss, tax benefit, net out-of-pocket and 10-year capital-growth projection.",
  alternates: { canonical: `${SITE_URL}/negative-gearing/calculator` },
  openGraph: {
    title: "Negative Gearing Calculator",
    description: "Cash flow, tax benefit and 10-year projection.",
    url: `${SITE_URL}/negative-gearing/calculator`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Negative Gearing Calculator")}&sub=${encodeURIComponent("Annual Tax Saving · Cash Flow · Break-Even · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const NG_FAQS = [
  {
    q: "What is negative gearing?",
    a: "Negative gearing occurs when the income from an investment property (or other income-producing asset) is less than the expenses of holding it — including loan interest, maintenance, rates, insurance, and depreciation. The annual net loss is deductible against your other income, reducing your tax bill. The underlying assumption is that the capital gain on disposal will more than offset the accumulated losses over time.",
  },
  {
    q: "How much tax benefit does negative gearing provide?",
    a: "The tax benefit equals your net property loss multiplied by your marginal income tax rate (including Medicare levy). For example, if your property runs at a $12,000 annual loss and your marginal rate is 37%, your tax saving is $4,440 per year. This doesn't mean you're ahead — you've still spent $12,000 net — but the government is effectively funding $4,440 of that cost. The calculator shows this figure explicitly.",
  },
  {
    q: "Is negative gearing only for residential property?",
    a: "No. Negative gearing applies to any income-producing investment where expenses exceed income — shares, commercial property, managed funds, and even business assets. It's most commonly discussed in the context of residential investment property because of Australia's high property prices and the prevalence of interest-only loans. The same tax mechanics apply to a leveraged share portfolio with margin loan interest exceeding dividend income.",
  },
  {
    q: "What is the difference between negative and positive gearing?",
    a: "Positively geared properties generate rental income that exceeds all holding costs — you make money each year and pay tax on the surplus. Negatively geared properties run at an annual loss that you claim as a tax deduction. Neutral gearing is where income exactly covers costs (rare in practice). Positive gearing is more common in high-yield markets (regional, lower-value properties); negative gearing is more common in capital-city markets where prices are high relative to rents.",
  },
];

const ngFaqLd = faqJsonLd(NG_FAQS);

export default function NegativeGearingCalculatorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Negative Gearing", url: absoluteUrl("/negative-gearing") },
    { name: "Calculator", url: absoluteUrl("/negative-gearing/calculator") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {ngFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ngFaqLd) }} />
      )}
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/negative-gearing" className="hover:text-white">Negative Gearing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Calculator</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Negative Gearing Calculator</h1>
            <p className="text-slate-300">Enter your numbers, see the cash flow, the tax shield and the 10-year capital-growth projection.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <NegativeGearingCalculatorClient />
          </div>
        </section>
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {NG_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
