import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import SellChecklistClient from "./SellChecklistClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Business Sale Checklist: 12-Month Exit Readiness | Invest.com.au",
  description:
    "Interactive 12-month business sale checklist. From clean financials to data room — every preparation step grouped by timing.",
  alternates: { canonical: `${SITE_URL}/sell-business/checklist` },
  openGraph: {
    title: "Business Sale Checklist: 12-Month Exit Readiness",
    description: "Interactive checklist — what to do 12, 6, 3 months out and at sale.",
    url: `${SITE_URL}/sell-business/checklist`,
    type: "website",
  },
};

export default function SellChecklistPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
    { name: "Checklist", url: absoluteUrl("/sell-business/checklist") },
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
              <span className="text-white font-medium">Checklist</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">12-Month Exit Readiness Checklist</h1>
            <p className="text-slate-300">Most well-run business sales start preparation 12 months before listing — not 12 weeks. Here&rsquo;s the full sequence.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <SellChecklistClient />
          </div>
        </section>
      </div>
    </>
  );
}
