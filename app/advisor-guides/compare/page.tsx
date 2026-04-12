import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Accountant vs Financial Planner: Which Do You Need? (${CURRENT_YEAR})`,
  description: "Not sure whether you need an SMSF accountant or a financial planner? We break down the differences in qualifications, costs, and when to use each.",
  openGraph: {
    title: "SMSF Accountant vs Financial Planner",
    description: "Clear breakdown of when you need an SMSF accountant vs a financial planner, how much each costs, and when you might need both.",
    images: [{ url: "/api/og?title=SMSF+Accountant+vs+Financial+Planner&subtitle=Which+do+you+need%3F&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/advisor-guides/compare" },
};

const ROWS = [
  { label: "Primary role", smsf: "SMSF administration, compliance, and tax", fp: "Holistic financial strategy and advice" },
  { label: "Qualifications", smsf: "CPA/CA + SMSF Specialist Advisor (SSA)", fp: "Certified Financial Planner (CFP) + AFSL" },
  { label: "Typical cost", smsf: "$1,500–$4,000/year", fp: "SOA $2,500–$5,500, ongoing $2k–$8k/yr" },
  { label: "When you need them", smsf: "You already have or are setting up an SMSF", fp: "You need advice on whether to start an SMSF, how to invest, or retirement planning" },
  { label: "Investment advice", smsf: "Generally no (unless also AFSL-authorised)", fp: "Yes — this is their core service" },
  { label: "Tax returns", smsf: "Yes — SMSF annual return and compliance", fp: "No — they refer to accountants for tax returns" },
  { label: "Insurance advice", smsf: "No", fp: "Yes — life, TPD, income protection" },
  { label: "Retirement planning", smsf: "Pension phase calculations only", fp: "Full retirement modelling and strategy" },
  { label: "Regulated by", smsf: "Tax Practitioners Board (TPB)", fp: "ASIC via AFSL" },
];

export default function AdvisorComparisonPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "SMSF Accountant vs Financial Planner" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Do I need both an SMSF accountant and a financial planner?", acceptedAnswer: { "@type": "Answer", text: "Often yes. The SMSF accountant handles compliance and tax, while the financial planner advises on investment strategy, asset allocation, and whether an SMSF is right for you in the first place. They serve complementary roles." } },
      { "@type": "Question", name: "Can a financial planner do my SMSF tax return?", acceptedAnswer: { "@type": "Answer", text: "No. SMSF tax returns must be prepared by a registered tax agent (via the Tax Practitioners Board). Financial planners are regulated by ASIC and typically don't prepare tax returns." } },
      { "@type": "Question", name: "Which should I engage first?", acceptedAnswer: { "@type": "Answer", text: "If you're deciding whether to start an SMSF, engage a financial planner first — they can advise on whether an SMSF is appropriate for your situation. If you already have an SMSF and need compliance help, engage an SMSF accountant first." } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <article className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Comparison</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            SMSF Accountant vs Financial Planner
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed">
            Two different professionals, two different roles. Here&apos;s when you need each — and when you need both.
          </p>

          {/* Comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            {/* Header */}
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="building" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">SMSF Accountant</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <Icon name="trending-up" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">Financial Planner</span>
                </div>
              </div>
            </div>
            {/* Rows */}
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">{row.label}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.smsf}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.fp}</span>
                </div>
              </div>
            ))}
          </div>

          {/* When you need both */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
              <Icon name="users" size={20} className="text-amber-600" />
              When You Need Both
            </h2>
            <p className="text-xs md:text-sm text-amber-800 leading-relaxed mb-3">
              Most SMSF trustees benefit from having both professionals. The financial planner designs the investment strategy and advises on whether an SMSF makes sense. The SMSF accountant handles the ongoing compliance, tax returns, and audit coordination. They work together but serve different functions.
            </p>
            <p className="text-xs md:text-sm text-amber-800 leading-relaxed">
              <strong>Common setup:</strong> Financial planner provides a Statement of Advice ($3,300 one-off), then the SMSF accountant handles annual compliance ($1,800–$3,500/year).
            </p>
          </div>

          {/* Quick decision tree */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Quick Decision Guide</h2>
            <div className="space-y-2.5">
              {[
                { q: "I'm thinking about starting an SMSF", a: "Start with a Financial Planner", link: "/advisors?type=financial_planner" },
                { q: "I already have an SMSF and need compliance help", a: "You need an SMSF Accountant", link: "/advisors?type=smsf_accountant" },
                { q: "I want investment advice for my SMSF", a: "Financial Planner (must hold AFSL)", link: "/advisors?type=financial_planner" },
                { q: "I need my SMSF tax return lodged", a: "SMSF Accountant (must be TPB-registered)", link: "/advisors?type=smsf_accountant" },
                { q: "I'm not sure if I need an SMSF at all", a: "Start with a Financial Planner", link: "/advisors?type=financial_planner" },
              ].map((item, i) => (
                <Link key={i} href={item.link} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group">
                  <span className="text-slate-400 text-xs font-bold mt-0.5 shrink-0">Q:</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs md:text-sm text-slate-700">{item.q}</div>
                    <div className="text-xs md:text-sm font-bold text-slate-900 mt-0.5 group-hover:text-blue-700">{item.a} →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {[
                { q: "Do I need both an SMSF accountant and a financial planner?", a: "Often yes. The accountant handles compliance and tax. The planner advises on strategy and whether an SMSF is right for you. They're complementary." },
                { q: "Can a financial planner do my SMSF tax return?", a: "No. SMSF tax returns must be prepared by a registered tax agent (TPB). Financial planners are regulated by ASIC and don't prepare tax returns." },
                { q: "Which should I engage first?", a: "If deciding whether to start an SMSF, engage a financial planner first. If you already have one and need compliance help, start with an SMSF accountant." },
              ].map((faq, i) => (
                <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                  <summary className="px-3.5 py-3 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                  </summary>
                  <p className="px-3.5 pb-3 text-xs md:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <AdvisorPrompt type="smsf_accountant" heading="Find an SMSF Accountant" description="Browse verified SMSF specialists in your area." />
            <AdvisorPrompt type="financial_planner" heading="Find a Financial Planner" description="Browse verified financial planners near you." />
          </div>

          {/* Related guides */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/advisor-guides/how-to-choose-smsf-accountant" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">SMSF Accountant Guide</Link>
              <Link href="/advisor-guides/how-to-choose-financial-planner" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Financial Planner Guide</Link>
              <Link href="/find-advisor" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">Find My Advisor Quiz</Link>
            </div>
          </div>

          <div className="mt-6 text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
            This guide is for informational purposes only and does not constitute financial advice. Always verify credentials on the ASIC Financial Advisers Register or Tax Practitioners Board before engaging any professional.
          </div>
        </div>
      </article>
    </>
  );
}
