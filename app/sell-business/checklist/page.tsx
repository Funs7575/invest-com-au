import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
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

const CHECKLIST_FAQS = [
  {
    q: "Why do I need 12 months to prepare a business for sale?",
    a: "Buyers pay a premium for businesses that look and operate as if the owner's involvement is optional. Three years of clean, accrual-basis financials, documented processes, a management team that can run without the founder, and a diverse customer base — none of these can be manufactured in 90 days. The 12-month window is also the window buyers and accountants inspect: a business that appears well-run for just one year raises questions. Preparation that starts 12–24 months before listing typically adds 0.5–1.5x EBITDA to the sale price.",
  },
  {
    q: "What goes in a business data room?",
    a: "A data room is a secure, organised document repository that buyers and their advisors access during due diligence. Key documents include: three years of financials (P&L, balance sheet, tax returns), management accounts, customer contracts (with NDA redactions where appropriate), supplier agreements, IP ownership documentation, employee contracts and org chart, lease agreements, business registration and licences, and any material litigation history. Most brokers use a cloud data room (Ansarada, Intralinks, or a shared Drive) — having it pre-populated before going to market signals professionalism and shortens the due-diligence period.",
  },
  {
    q: "What is vendor finance and should I offer it?",
    a: "Vendor finance (also called seller finance) is where the seller accepts a portion of the sale price as a deferred payment, essentially lending money to the buyer. It's common in SME transactions where buyers can't get full bank funding — especially in service businesses with few hard assets. The upside: it can increase the pool of buyers and sometimes lift the headline price. The downside: you remain exposed to the buyer's success (or failure) post-settlement. Vendor finance usually covers 10–30% of the price, secured by a charge over the business assets or shares.",
  },
  {
    q: "What is a restraint of trade clause in a business sale?",
    a: "A restraint of trade (non-compete) clause prevents the seller from starting or joining a competing business within a defined geography and time period after settlement. For SME sales in Australia, 2–3 years and a 50km radius are common terms. Courts will only enforce restraints that are reasonable — overly broad clauses are unenforceable. From a buyer's perspective, the restraint protects goodwill: the business is often largely the seller's relationships. From the seller's perspective, it restricts what you can do next — negotiate the scope carefully before signing.",
  },
];

const checklistFaqLd = faqJsonLd(CHECKLIST_FAQS);

export default function SellChecklistPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
    { name: "Checklist", url: absoluteUrl("/sell-business/checklist") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {checklistFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(checklistFaqLd) }} />
      )}
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
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {CHECKLIST_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
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
