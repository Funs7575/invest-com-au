import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import ValuationClient from "./ValuationClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Business Valuation Calculator Australia: Estimate Sale Value | Invest.com.au",
  description:
    "Free business valuation calculator using EBITDA, revenue and asset-based methods. Get an indicative range across all three methods in 60 seconds.",
  alternates: { canonical: `${SITE_URL}/sell-business/valuation` },
  openGraph: {
    title: "Business Valuation Calculator Australia",
    description: "EBITDA, revenue and asset-based valuation — across the three methods.",
    url: `${SITE_URL}/sell-business/valuation`,
    type: "website",
  },
};

export default function ValuationPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
    { name: "Valuation", url: absoluteUrl("/sell-business/valuation") },
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
              <Link href="/sell-business" className="hover:text-white">Sell a Business</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Valuation</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Business Valuation Calculator Australia</h1>
            <p className="text-slate-300">A 60-second indicative range across three methods. The market-clearing valuation is usually the lowest of the three plus negotiation.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <ValuationClient />
          </div>
        </section>
      </div>
    </>
  );
}
