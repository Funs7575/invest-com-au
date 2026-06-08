import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import FrankingCalculatorClient from "./FrankingCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Franking Credits Calculator: Your After-Tax Dividend Income | Invest.com.au",
  description:
    "Free calculator: enter dividend, franking % and tax rate. See franking credit, grossed-up dividend, tax payable, and net after-tax income. Includes SMSF pension-phase.",
  alternates: { canonical: `${SITE_URL}/dividends/calculator` },
  openGraph: {
    title: "Franking Credits Calculator: Your After-Tax Dividend Income",
    description: "Free calculator covering personal marginal rates and SMSF accumulation/pension.",
    url: `${SITE_URL}/dividends/calculator`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Dividend Calculator")}&sub=${encodeURIComponent("Franking Credits · After-Tax Returns · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const FRANKING_FAQS = [
  {
    q: "What is a franking credit?",
    a: "A franking credit (also called an imputation credit) represents the Australian company tax already paid on a dividend before it reaches your hands. When a company pays a fully franked dividend, it attaches credits equal to 30% of the grossed-up amount (the corporate tax rate). You include both the cash dividend and the franking credits in your assessable income, then claim the credits dollar-for-dollar against your tax liability. This prevents the same income from being taxed twice.",
  },
  {
    q: "Can I get a refund of franking credits?",
    a: "Yes — if your franking credits exceed your total tax liability for the year, the ATO refunds the difference in cash. This is particularly valuable for low-income earners and retirees. For example, if you owe $500 in tax but have $1,200 in franking credits, you receive a $700 refund. SMSF funds in pension phase pay 0% tax, so all franking credits become a direct cash refund.",
  },
  {
    q: "How do franking credits work for an SMSF?",
    a: "An SMSF in pension phase pays no tax on fund income, so its effective tax rate is 0%. Every dollar of franking credits attached to dividends is refundable. For an SMSF in accumulation phase (which pays 15% on earnings), the 30% corporate tax already paid exceeds the fund's 15% rate — meaning 15% of the grossed-up dividend comes back as a cash refund. This makes fully-franked Australian shares particularly attractive inside SMSFs.",
  },
  {
    q: "What is the grossed-up dividend?",
    a: "The grossed-up dividend is the cash dividend plus the attached franking credit — in other words, the pre-tax company profit that the dividend represents. For a fully franked dividend of $700, the grossed-up amount is $1,000 (the company earned $1,000, paid $300 in 30% tax, then paid the remaining $700 to you as a dividend). You declare the full $1,000 as income and claim the $300 credit. If your marginal rate is 30%, your liability is exactly $300 — zero additional tax to pay.",
  },
];

const frankingFaqLd = faqJsonLd(FRANKING_FAQS);

export default function FrankingCalculatorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Dividends", url: absoluteUrl("/dividends") },
    { name: "Calculator", url: absoluteUrl("/dividends/calculator") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {frankingFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(frankingFaqLd) }} />
      )}
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
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {FRANKING_FAQS.map((faq) => (
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
