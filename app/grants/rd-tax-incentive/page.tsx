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
    "The R&D Tax Incentive returns up to 43.5% on eligible R&D spend as cash. FY2025 registration deadline 30 April 2026 — calculator, eligibility and how to claim.",
  alternates: { canonical: `${SITE_URL}/grants/rd-tax-incentive` },
  openGraph: {
    title: `R&D Tax Incentive Australia ${CURRENT_YEAR}: Complete Guide`,
    description:
      "Up to 43.5% refundable cash offset on eligible R&D. Calculator, deadline, eligibility checklist and lead capture.",
    url: `${SITE_URL}/grants/rd-tax-incentive`,
    type: "website",
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

const rdTaxFaqLd = faqJsonLd([
  {
    q: "What is the R&D Tax Incentive and what does it pay?",
    a: "The R&D Tax Incentive is an Australian federal program providing a tax offset for eligible R&D expenditure. Companies with aggregated turnover under $20M receive a 43.5% refundable tax offset — meaning if your company has no tax liability, you receive cash back. Larger companies receive a 38.5% non-refundable offset (credit against tax payable, no cash refund). The offset effectively means that for every $1 of eligible R&D spend, you receive 43.5 or 38.5 cents back. Registration with AusIndustry is mandatory before lodging your tax return.",
  },
  {
    q: "What is an eligible R&D activity?",
    a: "Eligible R&D activities must involve an experimental activity conducted for the purpose of generating new knowledge, with a technical hypothesis and genuine uncertainty about whether the experiment will work. Routine software development, standard quality control, market research, and pre-feasibility studies are NOT eligible. Core R&D activities require that the outcome was unknown beforehand and could not be established by applying known techniques. Supporting activities (production runs, patents filing, mathematical analysis) are eligible only if directly supporting a core R&D activity.",
  },
  {
    q: "How do I register for the R&D Tax Incentive?",
    a: "Registration is done via AusIndustry's portal (business.gov.au) within 10 months after the end of the income year (so by 30 April for a 30 June year-end company). Late registration is not accepted. You need to: create an AusBusiness account, complete the R&D registration form describing each R&D activity and estimated expenditure, and submit before the deadline. Your tax agent then claims the offset in your company tax return using the AusIndustry registration number.",
  },
  {
    q: "Can a startup or pre-revenue company claim the R&D Tax Incentive?",
    a: "Yes — this is one of the incentive's most valuable aspects. Pre-revenue companies with turnover under $20M receive a refundable offset, meaning they receive cash back from the ATO regardless of profitability. A startup that spends $500,000 on eligible R&D can receive $217,500 in cash (43.5%). The main requirement is that the entity is an incorporated company — sole traders, partnerships, and trusts cannot claim. Many early-stage tech companies use R&D refunds as a primary source of working capital.",
  },
  {
    q: "Can SaaS and software companies claim the R&D Tax Incentive?",
    a: "Yes, but the bar has tightened since 2021 ATO guidance. Software R&D claims are eligible when they involve genuine technical innovation with uncertainty — not just applying known programming techniques. Building a new algorithm, machine learning model, or genuinely novel technical architecture qualifies. Routine software development (CRUD apps, standard integrations, UI improvements) does not. Many SaaS companies over-claim and face ATO reviews; working with an R&D specialist consultant is strongly recommended to document technical uncertainty correctly.",
  },
]);

export default function RdTaxIncentivePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Grants", url: absoluteUrl("/grants") },
    { name: "R&D Tax Incentive", url: absoluteUrl("/grants/rd-tax-incentive") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(rdTaxFaqLd) }} />

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
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
              <strong>FY2025 registration deadline: 30 April 2026.</strong> Companies that performed R&amp;D in the year ended 30 June 2025 must register their activities with AusIndustry before this date or lose the claim entirely.
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
      </div>
    </>
  );
}
