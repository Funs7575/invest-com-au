import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import RdTaxCalculator from "@/components/RdTaxCalculator";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `R&D Tax Incentive Australia ${CURRENT_YEAR}: Complete Guide & Calculator | Invest.com.au`,
  description:
    "R&D Tax Incentive: up to 43.5% cash offset on eligible spend. FY2025 deadline 30 April 2026 — calculator, eligibility checklist and how to claim.",  // dated-ok
  alternates: { canonical: `${SITE_URL}/grants/rd-tax-incentive` },
  openGraph: {
    title: `R&D Tax Incentive Australia ${CURRENT_YEAR}: Complete Guide`,
    description:
      "Up to 43.5% refundable cash offset on eligible R&D. Calculator, deadline, eligibility checklist and lead capture.",
    url: `${SITE_URL}/grants/rd-tax-incentive`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("R&D Tax Incentive Australia")}&sub=${encodeURIComponent("43.5% Cash Offset · Eligibility · Calculator · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const ELIGIBLE = [
  "Novel algorithm or AI/ML development",
  "Technical uncertainty in software outcome",
  "Custom data pipeline or integration R&D",
  "Experimental trading or backtesting systems",
  "New financial-modelling methodologies",
];

const NOT_ELIGIBLE = [
  "Routine UI / page development",
  "Standard API integrations",
  "Content writing or SEO",
  "Regulatory compliance testing",
];

const RD_FAQS = [
  {
    q: "What is the R&D Tax Incentive (RDTI)?",
    a: "The R&D Tax Incentive is an Australian government program that provides a tax offset — effectively a refund — for eligible R&D expenditure. Companies with annual turnover under $20 million receive a refundable 43.5% offset (you get cash back even if you're in a tax loss). Larger companies receive a non-refundable 38.5% offset. It's one of the most valuable innovation incentives available to Australian businesses.",
  },
  {
    q: "When is the RDTI registration deadline?",
    a: "You must register your R&D activities with AusIndustry within 10 months of the end of the income year. For a 30 June year-end (FY2025), the deadline is 30 April 2026. Registration is done through the customer portal on business.gov.au. Late registration is only permitted in narrow circumstances — missing the deadline means losing the claim for that year.",  // dated-ok
  },
  {
    q: "What counts as eligible R&D expenditure?",
    a: "Eligible expenditure includes salaries and wages for staff directly conducting R&D activities, contractor costs, and overheads incurred in the conduct of eligible activities. The activities must involve experimental work aimed at generating new knowledge (core R&D activities) or activities that support those core experiments (supporting R&D activities). Software development qualifies when there is genuine technical uncertainty — that is, you are attempting something that a competent professional cannot determine in advance will work.",
  },
  {
    q: "How is the RDTI different from a government grant?",
    a: "A grant is money paid to you to fund specific activities, usually with milestone conditions and reporting requirements. The RDTI is a tax offset: you conduct your own R&D with your own money, then claim back a proportion of your expenditure through the tax system. Unlike most grants, there's no competitive application — every eligible company that meets the criteria can claim. You do not have to wait to hear if you've been approved before starting work.",
  },
];

const rdFaqLd = faqJsonLd(RD_FAQS);

export default function RdTaxIncentivePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Grants", url: absoluteUrl("/grants") },
    { name: "R&D Tax Incentive", url: absoluteUrl("/grants/rd-tax-incentive") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {rdFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(rdFaqLd) }} />
      )}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/grants" className="hover:text-white">Grants</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">R&amp;D Tax Incentive</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              R&amp;D Tax Incentive Australia: Complete Guide {CURRENT_YEAR}
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              The single largest non-dilutive funding source in Australia. Up to 43.5% of eligible R&amp;D spend returned as a refundable cash offset for companies under $20M turnover.
            </p>
          </div>
        </section>

        {/* Urgent banner */}
        <section className="py-4 bg-amber-50 border-b border-amber-200">
          <div className="container-custom max-w-5xl flex items-start gap-3">
            <Icon name="alert-triangle" size={20} className="text-amber-700 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>FY2025 registration deadline: 30 April 2026.</strong> Companies that performed R&amp;D in the year ended 30 June 2025 must register their activities with AusIndustry before this date or lose the claim entirely.  {/* // dated-ok */}
            </p>
          </div>
        </section>

        {/* What qualifies */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">What qualifies as eligible R&amp;D</h2>
            <p className="text-sm text-slate-600 mb-6">The program funds the experimental work behind your product — not the product launch or commercial milestones.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-extrabold text-emerald-900 mb-3 flex items-center gap-2">
                  <Icon name="check-circle" size={18} className="text-emerald-700" />
                  Likely eligible
                </h3>
                <ul className="space-y-2">
                  {ELIGIBLE.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-sm text-slate-800">
                      <span className="mt-0.5">✅</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3 flex items-center gap-2">
                  <Icon name="x-circle" size={18} className="text-red-700" />
                  Not eligible
                </h3>
                <ul className="space-y-2">
                  {NOT_ELIGIBLE.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-sm text-slate-800">
                      <span className="mt-0.5">❌</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How the claim works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: "1", title: "Register with AusIndustry", body: "Submit the income-year R&D activities through the customer portal. Deadline: 10 months after year-end." },
                { step: "2", title: "Lodge tax schedule", body: "Submit the R&D Tax Incentive schedule with your company tax return through the ATO." },
                { step: "3", title: "Receive your refund", body: "Cash offset arrives as part of your tax assessment. Refundable for under $20M turnover — paid even when in tax loss." },
              ].map((s) => (
                <div key={s.step} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold mb-3">{s.step}</div>
                  <h3 className="font-extrabold text-slate-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Estimate your refund</h2>
            <p className="text-sm text-slate-600 mb-6">A 60-second estimate. The real number depends on AusIndustry assessment and allowable-expenditure rules.</p>
            <RdTaxCalculator />
          </div>
        </section>

        {/* Article + cross-link */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Icon name="book-open" size={26} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">Read the full deep-dive</h3>
                <p className="text-sm text-slate-600">How-to: claim mechanics, common mistakes that kill claims, and contemporaneous record-keeping.</p>
              </div>
              <Link
                href="/article/rd-tax-incentive-australia-guide"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-3 rounded-lg shrink-0"
              >
                Read article <Icon name="arrow-right" size={14} />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/grants" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All grants →</Link>
              <Link href="/grants/emdg" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">EMDG export grant →</Link>
              <Link href="/grants/industry-growth-program" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Industry Growth Program →</Link>
            </div>
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {RD_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
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
