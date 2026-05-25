import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import LumpSumCalculatorClient from "./LumpSumCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Lump-Sum Compound Growth Calculator Australia | Invest.com.au",
  description:
    "Project a lump sum's growth over 1–30 years. Three-scenario comparison, monthly contribution and tax-on-returns option. SMSF, marginal and tax-free outcomes.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/calculator` },
  openGraph: {
    title: "Lump-Sum Compound Growth Calculator Australia",
    description: "Project a lump sum's growth with monthly top-ups, return assumptions and tax outcomes.",
    url: `${SITE_URL}/lump-sum-investing/calculator`,
    type: "website",
  },
};

export default function LumpSumCalculatorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
    { name: "Calculator", url: absoluteUrl("/lump-sum-investing/calculator") },
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
              <Link href="/lump-sum-investing" className="hover:text-white">Lump-Sum Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Calculator</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Lump-Sum Compound Growth Calculator</h1>
            <p className="text-slate-300">Project the growth of a lump sum over 1–30 years, with monthly top-ups and tax outcomes.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <LumpSumCalculatorClient />
          </div>
        </section>
      </div>
    </>
  );
}
