import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Aged Care Costs Australia — What You&apos;ll Pay (${CURRENT_YEAR} Guide) | invest.com.au`,
  description: `Full breakdown of Australian aged care costs: basic daily fee, means-tested care fee, accommodation costs (RAD/DAP), extra service fees, and what government subsidy covers. Home care vs residential costs compared. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Aged Care Costs Australia (${CURRENT_YEAR}) — What You&apos;ll Pay`,
    description: "Residential aged care fees: basic daily fee, means-tested care fee, RAD/DAP accommodation, extra service charges — and what Medicare/government covers.",
    url: `${SITE_URL}/aged-care/costs`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Aged Care Costs Australia")}&sub=${encodeURIComponent("RAD · DAP · Means Test · Home Care · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/costs` },
};

const COST_COMPONENTS = [
  {
    component: "Basic Daily Fee",
    amount: "$61.96/day ($22,615/year) — 2024–25",
    whoPayesIt: "Everyone in residential aged care",
    notes: "85% of the single Age Pension rate. Government sets this — not negotiable. Covers food, accommodation basics, personal care.",
  },
  {
    component: "Means-Tested Care Fee",
    amount: "$0–$82.23/day ($30,014/year cap); lifetime cap $82,823",
    whoPayesIt: "Residents with assessable income/assets above threshold",
    notes: "Annual and lifetime caps apply. Once you hit the annual/lifetime cap, no further means-tested fee. Calculated by My Aged Care based on your financial assessment.",
  },
  {
    component: "Accommodation (RAD or DAP)",
    amount: "RAD: typically $200k–$600k lump sum. DAP: RAD × 8.38% MPIR ÷ 365",
    whoPayesIt: "Residents above the means-test accommodation threshold",
    notes: "Below-threshold residents have accommodation fully funded by government. RAD refundable on exit; DAP is daily fee.",
  },
  {
    component: "Extra/Additional Service Fee",
    amount: "Varies widely — $10–$100+/day for premium rooms, wine with dinner, extra activities",
    whoPayesIt: "Optional — only in &apos;extra service&apos; or &apos;residential service agreements&apos; facilities",
    notes: "Not regulated for premium services. Must be disclosed upfront. Not means-tested — you pay regardless of income.",
  },
];

const HOME_CARE_COSTS = [
  { level: "Level 1 (basic needs)", govSubsidy: "$10,271/year", typicalGap: "~$0–$500 (basic daily fee of $12.56/day)", services: "Low-level support: home cleaning, basic personal care" },
  { level: "Level 2 (low care)", govSubsidy: "$18,063/year", typicalGap: "~$500–$2,000", services: "More frequent personal care, some nursing" },
  { level: "Level 3 (intermediate)", govSubsidy: "$39,310/year", typicalGap: "~$1,000–$5,000", services: "Complex personal care, nursing, allied health" },
  { level: "Level 4 (high care)", govSubsidy: "$59,593/year", typicalGap: "~$2,000–$10,000+", services: "High nursing needs, dementia care, complex medical" },
];

const FAQS = [
  {
    q: "What does the government pay for in residential aged care?",
    a: "The Australian government pays: (1) Care subsidy — covers nursing, personal care, and allied health based on the resident&apos;s assessed care needs (ACFI/AN-ACC funding). This can be $50–$200+/day depending on complexity. (2) Accommodation supplement — for low-means residents (below the means-test threshold), the government pays the accommodation contribution in lieu of a RAD/DAP. (3) Hardship supplement — for residents unable to pay fees. What the government does NOT pay: basic daily fee (resident pays 85% of Age Pension), means-tested care fee, and accommodation for above-threshold residents.",
  },
  {
    q: "What is the annual and lifetime cap on means-tested fees?",
    a: "The means-tested care fee has two caps: (1) Annual cap: $33,309/year (2024–25) — once you&apos;ve paid this amount in means-tested fees in any financial year, no further means-tested fee applies for the rest of that year; (2) Lifetime cap: $82,823 — once you&apos;ve paid this total in means-tested fees across your entire aged care journey, no further means-tested fee applies ever. These caps prevent residents with high assets from being charged indefinitely. If you have significant assets, the lifetime cap may be reached within 2–5 years in residential care.",
  },
  {
    q: "How much does home care cost compared to residential care?",
    a: "Home care is generally less expensive in government subsidy terms but has a smaller care coverage. The government Home Care Package subsidises $10,271–$59,593/year depending on level. Residents pay a basic daily fee ($12.56/day for standard income, varies by means test) and an income-tested care fee. Residential aged care is more expensive but includes accommodation, meals, full-time supervision, and 24/7 nursing access. For high-care-needs individuals, residential care is often better value per unit of care — home care at Level 4 providing equivalent oversight would cost $100,000–$150,000/year privately.",
  },
  {
    q: "Are there costs after a loved one passes away in aged care?",
    a: "The facility will invoice for outstanding fees up to the date of death. The RAD must be refunded within 14 days. Outstanding means-tested fees and daily fees up to the death date remain payable. If you had an extra service agreement with scheduled future payments, check whether those obligations end at death or continue for any notice period. Typically, all contractual fees end at death — the estate receives the RAD refund and the care contract terminates. Executor responsibilities include notifying the facility promptly and requesting the final fee statement.",
  },
];

export default function AgedCareCostsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Aged Care Costs" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/aged-care" className="hover:text-slate-900">Aged Care</Link><span>/</span>
            <span className="text-slate-900 font-medium">Aged Care Costs</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Aged care costs in Australia: what you&apos;ll actually pay
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Residential aged care has four fee components: basic daily fee, means-tested care fee,
            accommodation (RAD or DAP), and optional extras. Government subsidises care based on
            needs — but accommodation and extra service fees are yours to fund.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · 2024–25 rates · General information only</p>
        </div>
      </section>

      {/* Fee components */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Residential aged care: fee components</h2>
          <div className="space-y-4">
            {COST_COMPONENTS.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{c.component}</p>
                  <p className="text-xs font-mono text-amber-300">{c.amount}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Who pays</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.whoPayesIt}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Key notes</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.notes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Home care packages */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Home Care Package subsidy levels (2024–25)</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Home Care Package subsidy levels 2024-25" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Level</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Govt subsidy/year</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Typical client gap</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Services covered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {HOME_CARE_COSTS.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.level}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold text-xs">{row.govSubsidy}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.typicalGap}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.services}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Home care packages have significant wait times (3–18 months at Level 3–4). Register with My Aged Care early.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get a personalised aged care cost estimate"
        subheading="Your actual costs depend on means testing, RAD vs DAP choice, and care level. An aged care specialist can model your specific situation and help minimise the means-tested care fee."
        intent={{ need: "aged_care", context: ["aged_care_costs", "means_test", "aged_care_planning"] }}
        source="aged_care_costs"
        ctaLabel="Find an aged care financial specialist"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/rad-vs-dap", label: "RAD vs DAP decision" },
              { href: "/aged-care/means-test", label: "Aged care means test" },
              { href: "/aged-care/home-care-packages", label: "Home care packages" },
              { href: "/aged-care/family-home", label: "Family home in aged care" },
              { href: "/aged-care", label: "Aged care hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Fee rates and subsidy levels change annually. Verify current figures at health.gov.au/aged-care and myagedcare.gov.au. This page is general information only; it is not financial advice. Consult a licensed aged care financial adviser (CAFA) for personalised cost modelling.
          </p>
        </div>
      </section>
    </div>
  );
}
