import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import FrankingCalculatorClient from "./FrankingCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Franking Credits Calculator: Your After-Tax Dividend Income | Invest.com.au",
  description:
    "Enter your dividend, franking percentage and tax rate. See the franking credit, grossed-up dividend, tax payable and net after-tax income — including SMSF pension-phase outcomes.",
  alternates: { canonical: `${SITE_URL}/dividends/calculator` },
  openGraph: {
    title: "Franking Credits Calculator: Your After-Tax Dividend Income",
    description: "Free calculator covering personal marginal rates and SMSF accumulation/pension.",
    url: `${SITE_URL}/dividends/calculator`,
    type: "website",
  },
};

export default function FrankingCalculatorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Dividends", url: absoluteUrl("/dividends") },
    { name: "Calculator", url: absoluteUrl("/dividends/calculator") },
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
              <Link href="/dividends" className="hover:text-white">Dividends</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Calculator</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Franking Credits Calculator</h1>
            <p className="text-slate-300">Enter your numbers, pick your tax rate, see the after-tax outcome.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <FrankingCalculatorClient />
          </div>
        </section>
      </div>
    </>
  );
}
