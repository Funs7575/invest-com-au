import Link from "next/link";
import type { Metadata } from "next";

import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { FIRB_DISCLAIMER, FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import { WHO_NEEDS_FIRB } from "@/lib/firb-data";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import CrossBorderNextStep from "@/components/foreign-investment/CrossBorderNextStep";
import FirbEligibilityWalkthrough from "./FirbEligibilityWalkthrough";

export const revalidate = 86400;

const FAQS = [
  {
    q: "Who needs FIRB approval to buy Australian residential property?",
    a: "Foreign persons generally need FIRB approval before buying Australian residential property — that includes non-residents and most temporary visa holders, plus foreign companies and trusts. Australian citizens (including those living overseas), permanent residents, and New Zealand citizens generally do not need approval. The exact position depends on your circumstances, so confirm with an Australian solicitor before committing.",
  },
  {
    q: "Can foreigners buy established (existing) homes in Australia?",
    a: "Generally no. Non-residents cannot buy established dwellings, and from 1 April 2025 to 31 March 2027 the Australian Government has also banned temporary residents from buying established dwellings, with limited exceptions. New dwellings, off-the-plan purchases and vacant land for development remain the standard routes for foreign buyers, subject to FIRB approval.", // dated-ok — legislated ban window (fixed dates); page-level staleness is badged on the guides hub banner
  },
  {
    q: "What can foreign buyers still purchase during the 2025–2027 ban?",
    a: "The ban targets established dwellings. New dwellings (never previously sold or occupied as a dwelling), off-the-plan properties and vacant residential land for development generally remain available to foreign buyers with FIRB approval, with standard conditions such as building on vacant land within four years.",
  },
];

const faqLd = faqJsonLd(FAQS);

export const metadata: Metadata = {
  title: `FIRB Eligibility Explained: Who Can Buy What (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Plain-English walkthrough of the published FIRB rules: which buyers need approval, which property types are generally approved, and the 2025–2027 established-dwelling ban. General information, not legal advice.",
  openGraph: {
    title: "FIRB Eligibility Explained: Who Can Buy What",
    description:
      "Which buyers need FIRB approval, which property types are generally approved, and what the 2025–2027 established-dwelling ban changes.",
    url: `${SITE_URL}/foreign-investment/guides/firb-eligibility`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("FIRB Eligibility Explained")}&sub=${encodeURIComponent("Who can buy what · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/firb-eligibility` },
};

export default function FirbEligibilityPage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Guides", url: `${SITE_URL}/foreign-investment/guides` },
              { name: "FIRB Eligibility" },
            ]),
          ),
        }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment/guides" className="hover:text-slate-900">Guides</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">FIRB Eligibility</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-slate-900 mb-3">
              FIRB eligibility, explained: <span className="text-amber-500">who can buy what</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Answer two questions and see what the published Foreign Investment Review Board rules
              generally say for that combination — including the 2025–2027 established-dwelling ban.
              General information only, not legal advice.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom max-w-4xl py-8 md:py-10">
        {/* ── The walkthrough ── */}
        <section className="mb-10">
          <FirbEligibilityWalkthrough />
        </section>

        {/* ── Next step (quiz international track + advisor directory) ── */}
        <section className="mb-10">
          <CrossBorderNextStep
            advisorHref="/advisors/firb-specialists"
            advisorLabel="FIRB specialists"
            title="Know what you can buy — now line up the right people"
            body="Eligibility is only the first gate. Answer a few questions about your country, visa status and goal and we'll point you to the brokers, specialists or property route that fit your situation."
          />
        </section>

        {/* ── Who needs FIRB (reference table) ── */}
        <section className="mb-10">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-3">
            The rules at a glance
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Buyer</th>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">FIRB approval</th>
                  <th scope="col" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {WHO_NEEDS_FIRB.map((row) => (
                  <tr key={row.group} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.group}</td>
                    <td className="px-4 py-3">
                      {row.needsFirb ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          <Icon name="clipboard-list" size={11} /> Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          <Icon name="check" size={11} /> Not required
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Professional CTA ── */}
        <section className="mb-10">
          <AdvisorPrompt
            type="foreign_investment_lawyer"
            heading="Confirm your position before you commit"
            description="FIRB rules are fact-specific and change. A foreign-investment lawyer can confirm how they apply to your situation and handle the application."
          />
        </section>

        {/* ── FAQ ── */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-4 py-3 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-4 pb-3">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Related ── */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Keep going</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { label: "FIRB application guide", href: "/foreign-investment/guides/firb-application-guide" },
              { label: "Property-ban guide (2025–27)", href: "/foreign-investment/guides/property-ban-2025" },
              { label: "FIRB fee estimator", href: "/firb-fee-estimator" },
              { label: "Stamp duty for foreign buyers", href: "/foreign-investment/guides/stamp-duty-foreign-buyers" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                <Icon name="arrow-right" size={14} className="text-amber-500 shrink-0" />
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Disclaimers ── */}
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-500 leading-relaxed">{FIRB_DISCLAIMER}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
