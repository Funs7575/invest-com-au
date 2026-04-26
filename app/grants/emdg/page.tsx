import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import Icon from "@/components/Icon";
import HubLeadForm from "@/components/leads/HubLeadForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `EMDG Grant ${CURRENT_YEAR}: Up to $80,000 for Export Marketing | Invest.com.au`,
  description:
    "The Export Market Development Grant reimburses up to 50% of overseas marketing spend, up to $80K/year. Tier breakdown, eligible costs and how to stack with R&D.",
  alternates: { canonical: `${SITE_URL}/grants/emdg` },
  openGraph: {
    title: `EMDG Grant ${CURRENT_YEAR}: Up to $80,000 for Export Marketing`,
    description: "The Export Market Development Grant — three tiers, what's covered, and how to apply.",
    url: `${SITE_URL}/grants/emdg`,
    type: "website",
  },
};

export default function EmdgPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Grants", url: absoluteUrl("/grants") },
    { name: "EMDG", url: absoluteUrl("/grants/emdg") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/grants" className="hover:text-white">Grants</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">EMDG</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              EMDG Grant {CURRENT_YEAR}: Export Market Development Grant Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Reimburse up to 50% of eligible overseas marketing expenses — up to $80,000 per year. Trade shows, overseas reps, foreign-market research and inbound buyer visits.
            </p>
          </div>
        </section>

        {/* What's covered / not */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="font-extrabold text-emerald-900 mb-3 flex items-center gap-2">
                  <Icon name="check-circle" size={18} className="text-emerald-700" /> What&rsquo;s covered
                </h2>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>✅ Trade-show booths and attendance fees</li>
                  <li>✅ Overseas representatives and agents</li>
                  <li>✅ Foreign-market research and validation</li>
                  <li>✅ In-language promotional materials</li>
                  <li>✅ Inbound buyer visits to Australia</li>
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h2 className="font-extrabold text-red-900 mb-3 flex items-center gap-2">
                  <Icon name="x-circle" size={18} className="text-red-700" /> What&rsquo;s NOT covered
                </h2>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>❌ Domestic Australian marketing</li>
                  <li>❌ Capital expenditure</li>
                  <li>❌ Websites with multi-year amortisation</li>
                  <li>❌ Internal staff salaries (beyond defined cap)</li>
                  <li>❌ Anything related to selling into Australia</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Tier table */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The three EMDG tiers</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Tier</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Who it&rsquo;s for</th>
                    <th className="px-4 py-3 text-right font-extrabold text-slate-700">Max per year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr><td className="px-4 py-3 font-bold text-slate-900">Tier 1</td><td className="px-4 py-3 text-slate-700">SME ready to export, no current overseas revenue</td><td className="px-4 py-3 text-right font-extrabold text-slate-900">$30,000</td></tr>
                  <tr><td className="px-4 py-3 font-bold text-slate-900">Tier 2</td><td className="px-4 py-3 text-slate-700">SME already exporting in existing markets</td><td className="px-4 py-3 text-right font-extrabold text-slate-900">$50,000</td></tr>
                  <tr><td className="px-4 py-3 font-bold text-slate-900">Tier 3</td><td className="px-4 py-3 text-slate-700">SME entering new strategic markets</td><td className="px-4 py-3 text-right font-extrabold text-slate-900">$80,000</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Annual turnover must be under $20M. Reimbursement only — you wear the cost first, then receive the offset.</p>
          </div>
        </section>

        {/* EMDG + R&D */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-extrabold text-amber-900 mb-2 flex items-center gap-2">
                <Icon name="lightbulb" size={20} className="text-amber-700" />
                EMDG + R&amp;D Tax Incentive — stack them legally
              </h2>
              <p className="text-sm text-amber-900 leading-relaxed">
                You can claim both programs in the same year — but never on the same dollar of expenditure. A typical fintech: claim R&amp;D on the cost of building the localised product variant, claim EMDG on the trade-show, sales-rep and translated-collateral costs of selling that variant into Singapore or Hong Kong.
              </p>
            </div>
          </div>
        </section>

        {/* Lead form */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-2xl">
            <HubLeadForm
              heading="Connect with an EMDG consultant"
              subheading="Tier classification has a meaningful impact on the cheque size. A specialist gets it right and structures the reimbursement evidence."
              intent={{ need: "tax", context: ["tax_optimization"] }}
              source="grants_emdg"
              ctaLabel="Get matched with an EMDG specialist"
              extraFields={[{ name: "company", label: "Company name" }, { name: "target_markets", label: "Target export markets" }]}
            />
          </div>
        </section>

        {/* Cross-links */}
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/grants" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">All grants →</Link>
              <Link href="/grants/rd-tax-incentive" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">R&amp;D Tax Incentive →</Link>
              <Link href="/article/emdg-grant-australia-guide" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Read the deep-dive →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
