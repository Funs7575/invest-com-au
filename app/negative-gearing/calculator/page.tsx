import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
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
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: `${SITE_URL}/` },
  { name: "Negative Gearing", url: absoluteUrl("/negative-gearing") },
  { name: "Calculator", url: absoluteUrl("/negative-gearing/calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "What is negative gearing in Australia?",
    a: "When your rental income is less than your deductible expenses (interest, depreciation, rates, maintenance, property management fees), the resulting loss is deductible against your other income, reducing your total taxable income. The ATO allows this offset because the loss is real income-producing expenditure.",
  },
  {
    q: "What expenses can I deduct on a negatively geared property?",
    a: "Deductible expenses include: loan interest (the largest component), council rates, water charges, property management fees, repairs and maintenance, building depreciation (capital works at 2.5% p.a.), plant and equipment depreciation, insurance, advertising for tenants, body corporate fees, and travel to inspect the property (abolished post-2017 for residential unless the investor carries on a business of property investing).",
  },
  {
    q: "How much tax benefit does negative gearing actually provide?",
    a: "The tax benefit equals the annual net rental loss × your marginal tax rate. A $15,000 loss for an investor in the 39% bracket (including Medicare levy) saves $5,850 in tax — but you still absorb $9,150 of real cash loss. The benefit rises with your marginal rate; investors in lower brackets benefit less.",
  },
  {
    q: "Is negative gearing a good investment strategy?",
    a: "Only if expected capital growth exceeds the cumulative out-of-pocket cash losses. A negatively geared property must appreciate at a rate that compensates for the annual shortfall. The strategy also carries risk: rising rates or vacancy periods increase losses; capital growth is not guaranteed.",
  },
  {
    q: "What happens when I sell a negatively geared property?",
    a: "Any capital gain is added to your assessable income in the year of sale. If held >12 months, individuals and trusts qualify for the 50% CGT discount, halving the taxable gain. If the property was your home for part of the ownership, a partial main-residence exemption may apply.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Negative Gearing Calculator",
  path: "/negative-gearing/calculator",
  selectors: ["h1"],
});

export default function NegativeGearingCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
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
      </div>
    </>
  );
}
