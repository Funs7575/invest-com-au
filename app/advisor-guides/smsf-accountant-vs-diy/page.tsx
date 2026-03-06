import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const metadata: Metadata = {
  title: `Do I Need an SMSF Accountant or Can I DIY? (${CURRENT_YEAR})`,
  description: "Honest breakdown of when you need an SMSF accountant vs managing your own super fund. Costs, risks, time commitment, and when DIY makes sense.",
  openGraph: {
    title: "SMSF Accountant vs DIY — Invest.com.au",
    description: "When you need an SMSF accountant vs managing your own super fund. Costs, risks, and time commitment compared.",
    images: [{ url: "/api/og?title=SMSF+Accountant+vs+DIY&subtitle=When+to+hire+vs+manage+yourself&type=default", width: 1200, height: 630 }],
  },
  alternates: { canonical: "/advisor-guides/smsf-accountant-vs-diy" },
};

const ROWS = [
  { label: "Annual cost", pro: "$1,500–$4,000/year", diy: "$0–$500 (software only)" },
  { label: "Time commitment", pro: "2–4 hours/year (reviewing reports)", diy: "20–40+ hours/year" },
  { label: "ATO compliance risk", pro: "Low — accountant responsible for lodgements", diy: "Higher — you bear full responsibility" },
  { label: "Audit coordination", pro: "Handled by accountant", diy: "You find and manage your own auditor" },
  { label: "Investment flexibility", pro: "Advice available on structures", diy: "Full control, no guardrails" },
  { label: "Pension phase transitions", pro: "Calculated and documented correctly", diy: "Complex — mistakes can trigger tax" },
  { label: "Regulatory changes", pro: "Accountant monitors and adapts", diy: "You must stay across super law changes" },
  { label: "Suitable when", pro: "Balance $200k+, multiple members, property, pension phase", diy: "Single member, simple portfolio, under $200k" },
];

export default function SmsfVsDiyPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "SMSF Accountant vs DIY" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How much does an SMSF accountant cost?", acceptedAnswer: { "@type": "Answer", text: "Typically $1,500–$4,000 per year depending on complexity. This covers annual financial statements, tax return, and audit coordination. Funds with property, multiple members, or pension phase members cost more." } },
      { "@type": "Question", name: "Can I manage my own SMSF without an accountant?", acceptedAnswer: { "@type": "Answer", text: "Legally yes — there's no requirement to use an accountant. However, you still need an independent auditor (legally required), must lodge your own annual return with the ATO, and bear full responsibility for compliance. Software like Class or BGL can help, but the time commitment is significant." } },
      { "@type": "Question", name: "When should I definitely hire an SMSF accountant?", acceptedAnswer: { "@type": "Answer", text: "When your SMSF holds property, has multiple members with different strategies, is transitioning to pension phase, has a balance above $500k, or when you simply don't have 20-40 hours per year to dedicate to administration." } },
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
            <span className="text-slate-700">SMSF Accountant vs DIY</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            Do I Need an SMSF Accountant or Can I DIY?
          </h1>
          <p className="text-sm md:text-lg text-slate-500 mb-6 md:mb-10 leading-relaxed">
            Managing your own SMSF is technically possible — but is it worth it? Here&apos;s an honest comparison of the costs, time, and risks.
          </p>

          {/* Quick answer */}
          <div className="bg-slate-900 text-white rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2">
              <Icon name="zap" size={20} className="text-amber-400" />
              Quick Answer
            </h2>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              If your SMSF has a balance under $200k, a single member, and only holds listed shares or ETFs — DIY with software is viable.
              For anything more complex (property, multiple members, pension phase, balance above $500k), the cost of an accountant ($1,500–$4,000/year)
              is almost always worth it for the compliance protection and time savings.
            </p>
          </div>

          {/* Comparison table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 md:mb-10">
            <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
              <div className="p-2.5 md:p-4" />
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon name="briefcase" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">SMSF Accountant</span>
                </div>
              </div>
              <div className="p-2.5 md:p-4 text-center border-l border-slate-200">
                <div className="flex items-center justify-center gap-1.5">
                  <Icon name="user" size={14} className="text-slate-600" />
                  <span className="text-xs md:text-sm font-bold text-slate-900">DIY</span>
                </div>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 border-b border-slate-100 last:border-b-0 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                <div className="p-2.5 md:p-4 flex items-start">
                  <span className="text-[0.62rem] md:text-xs font-bold text-slate-700">{row.label}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.pro}</span>
                </div>
                <div className="p-2.5 md:p-4 border-l border-slate-100">
                  <span className="text-[0.62rem] md:text-xs text-slate-600">{row.diy}</span>
                </div>
              </div>
            ))}
          </div>

          {/* The real cost of DIY */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-6 mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-amber-900 mb-2">The Hidden Cost of DIY</h2>
            <p className="text-xs md:text-sm text-amber-800 leading-relaxed mb-3">
              The $1,500–$4,000 you save on an accountant needs to be weighed against: 20-40 hours of your time per year
              (worth $2,000-$8,000 at typical professional rates), the risk of ATO penalties for late or incorrect lodgements
              ($850+ per offence), and the cost of mistakes in pension phase calculations that can trigger unexpected tax bills.
            </p>
            <p className="text-xs md:text-sm text-amber-800 leading-relaxed">
              <strong>The maths:</strong> If your time is worth $50/hour and you spend 30 hours on SMSF admin, that&apos;s $1,500 in opportunity cost
              — before you factor in compliance risk. For most people, the accountant pays for itself.
            </p>
          </div>

          {/* When DIY makes sense */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">When DIY Actually Makes Sense</h2>
            <div className="space-y-2">
              {[
                "Your SMSF holds only listed shares, ETFs, or managed funds",
                "Single member fund with straightforward accumulation",
                "Balance under $200k (accountant fees become a larger % of returns)",
                "You have accounting or finance knowledge and enjoy the admin",
                "You use dedicated SMSF software (Class Super, BGL, Simple Fund)",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700">
                  <span className="text-emerald-600 font-bold mt-0.5 shrink-0">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="mb-6 md:mb-10">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">FAQs</h2>
            <div className="space-y-2">
              {[
                { q: "How much does an SMSF accountant cost?", a: "Typically $1,500–$4,000/year. Funds with property, multiple members, or pension phase members cost more." },
                { q: "Can I manage my SMSF without an accountant?", a: "Legally yes. But you still need an independent auditor, must lodge annual returns, and bear full compliance responsibility." },
                { q: "When should I definitely hire an accountant?", a: "When your SMSF holds property, has multiple members, is in pension phase, has a balance above $500k, or when you don't have 20-40 hours/year for admin." },
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

          <AdvisorPrompt type="smsf_accountant" heading="Find an SMSF Accountant" description="Browse verified SMSF specialists near you." />

          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              <Link href="/advisor-guides/how-to-choose-smsf-accountant" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-600">How to Choose an SMSF Accountant</Link>
              <Link href="/advisor-guides/compare" className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-600">SMSF Accountant vs Financial Planner</Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
