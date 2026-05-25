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

const CHECKLIST_FAQS = faqJsonLd([
  {
    q: "What should I do 12 months before selling my business?",
    a: "Twelve months out you should clean up your financial records, remove personal expenses from the P&L, resolve any outstanding legal disputes, and start documenting key processes so the business can run without you. Buyers will scrutinise three years of financials, so the earlier you normalise your accounts the better the story you can tell.",
  },
  {
    q: "What financial records do buyers require when buying a business?",
    a: "Buyers typically require three years of profit and loss statements (or management accounts), BAS lodgements, a current balance sheet, ATO tax portal access for the same period, and a schedule of add-backs explaining any non-recurring or personal expenses. Many buyers also want payroll records and a list of major contracts.",
  },
  {
    q: "What is included in a business data room?",
    a: "A data room for a business sale typically includes financial statements, tax returns, lease and property documents, key contracts and supplier agreements, employee records, IP registrations, any litigation history, and operational SOPs. Having a well-organised data room signals a professional seller and speeds up due diligence significantly.",
  },
  {
    q: "How do I prepare my business accounts for sale?",
    a: "Work with your accountant to produce clean, accruals-based financials for the last three years. Separate any personal or non-business expenses, normalise owner's salary to a market wage, and document one-off items. If your books are on a cash basis, consider preparing an accruals restatement — buyers and their lenders usually require it.",
  },
  {
    q: "What is the difference between selling shares vs assets in a business?",
    a: "An asset sale transfers individual assets (plant, goodwill, customer lists) to the buyer, leaving the company shell with the seller. A share sale transfers ownership of the whole company, including all liabilities. Sellers generally prefer share sales for CGT reasons (particularly the 50% discount and the small business 15-year exemption). Buyers often prefer asset sales to avoid inheriting hidden liabilities. The structure is usually negotiated and has significant tax implications for both parties.",
  },
]);

export default function SellChecklistPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Sell a Business", url: absoluteUrl("/sell-business") },
    { name: "Checklist", url: absoluteUrl("/sell-business/checklist") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(CHECKLIST_FAQS) }} />
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
