import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
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

export default function NegativeGearingCalculatorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Negative Gearing", url: absoluteUrl("/negative-gearing") },
    { name: "Calculator", url: absoluteUrl("/negative-gearing/calculator") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
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
