import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Family Office Australia — Setup, Structure & Services Guide (${CURRENT_YEAR}) | invest.com.au`,
  description: `Australian family office structures: single vs multi-family, trust and SMSF integration, estate planning, and net-worth thresholds. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Family Office Australia — Setup, Structure & Services Guide (${CURRENT_YEAR})`,
    description: "Single vs multi-family office, trust structures, SMSF integration, estate planning — for Australian families with investable assets $5M+.",
    url: `${SITE_URL}/family-office`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Family Office Australia")}&sub=${encodeURIComponent("Structure · SMSF · Trust · Estate Planning · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/family-office` },
};

const FAQS = [
  {
    q: "What is a family office in Australia?",
    a: "A family office is a private wealth management structure that consolidates investments, tax, legal, and estate planning for a single family (or group of related families). It is not a licensed financial product — it is a structural and governance arrangement, typically supported by a team of advisers (investment manager, tax agent, accountant, estate lawyer). In Australia, single-family offices are most common for families with $10M+ in investable assets. Multi-family offices (MFOs) serve multiple families at lower minimums, typically $3M–$5M+.",
  },
  {
    q: "What is the difference between a single-family office (SFO) and a multi-family office (MFO)?",
    a: "An SFO is established exclusively for one family. The family bears the full cost of the team and infrastructure, which can run $500k–$2M+ per year. An MFO pools the administrative overhead across multiple families, making it cost-effective from roughly $3M–$5M investable assets. MFOs charge management fees (typically 0.5%–1.5% p.a.) in exchange for shared services: investment reporting, tax compliance, estate document management, and adviser coordination. Most Australian families access family-office-style services through a licensed Private Wealth or Premium banking division (e.g. Ord Minnett Private, Macquarie Private Bank, JBWere, Morgan Stanley Wealth Management) rather than a standalone SFO.",
  },
  {
    q: "What net worth do I need to benefit from a family office structure?",
    a: "There is no legal minimum. The practical thresholds in Australia are: $2.5M net assets OR $250k income/year — the s708 Corporations Act 'wholesale investor' test, unlocking access to unregistered managed investment schemes and private credit. $3M–$5M+ investable assets — where multi-family office services become cost-effective. $10M+ — where a dedicated single-family office or Private Bank relationship becomes viable. $30M+ — where bespoke in-house structures (SMSF + unit trust + corporate trustee + family trust) with a dedicated investment team are justified by the cost savings.",
  },
  {
    q: "How does an SMSF fit into a family office structure?",
    a: "A self-managed super fund (SMSF) is almost universally a core pillar of Australian family office structures, because super assets are the most tax-efficient pool in the portfolio: concessional contributions taxed at 15%, pension-phase earnings taxed at 0%. The SMSF sits alongside (not inside) the family discretionary trust, unit trust, and personal holdings. The family office coordinates investment decisions across all vehicles to minimise total tax. For families with multiple adult members, each member can be a trustee of a corporate-trustee SMSF, aligning the super pool with the broader family investment strategy.",
  },
  {
    q: "Is a family office regulated by ASIC in Australia?",
    a: "Providing personal financial product advice requires an AFSL. If the family office holds an AFSL (or employs an AFSL-licensed adviser), it can formally advise on financial products. If it operates purely as a governance/coordination structure — coordinating external licensed advisers — it does not need its own AFSL. Most single-family offices in Australia engage an external licensed investment manager (AFSL holder) for execution and advice, keeping the family office itself as a non-licensed coordination layer.",
  },
  {
    q: "What services does a family office typically cover?",
    a: "Core services include: consolidated investment reporting and asset allocation, SMSF administration and compliance, family trust and corporate trustee administration, tax planning and lodgement (coordinated across all entities), estate planning and succession documentation, philanthropy structuring (PuAF or PAF if eligible), insurance reviews, and family governance (family constitution, investment policy statement, family council). Premium Australian family offices also offer lifestyle management, travel, and concierge services, though these are secondary to the financial governance function.",
  },
];

const STRUCTURES = [
  { vehicle: "Family Discretionary Trust", use: "Income splitting to lower-tax family members; capital gains distribution; asset protection", tax: "Trustee distributes income to beneficiaries at their marginal rates; 50% CGT discount available", complexity: "Medium" },
  { vehicle: "Self-Managed Super Fund (SMSF)", use: "Super accumulation + pension phase; direct property and listed equities", tax: "15% on accumulation income; 0% in pension phase (up to $1.9M transfer balance cap)", complexity: "Medium" },
  { vehicle: "Unit Trust", use: "Multiple families or investors; fixed entitlements; easier to value and transfer units", tax: "Pass-through to unitholders at their marginal rates; trust tax return required", complexity: "Medium" },
  { vehicle: "Company (Pty Ltd)", use: "Retained earnings; business operations; shareholder loans; SMSF ownership of trust units", tax: "30% / 25% (small business) corporate rate; franking credits on dividends", complexity: "Medium–High" },
  { vehicle: "Bare Trust / Custodian", use: "Hold assets for beneficiaries (e.g. children) until a specified age; SMSF custodian arrangements", tax: "Taxed in the beneficiary's hands (minor beneficiaries taxed at penalty rates on unearned income)", complexity: "Low" },
];

export default function FamilyOfficePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Family Office" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-14 bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Family Office</span>
          </nav>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700 mb-4">
            Wholesale &amp; High-Net-Worth
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
            Family Office Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            How Australian families with $3M–$30M+ in investable assets structure investment governance,
            trust administration, SMSF integration, and estate planning — and when a dedicated family
            office structure is worth the complexity.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not advice</p>
        </div>
      </section>

      {/* Threshold guide */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">When does a family office make sense?</h2>
          <div className="space-y-3">
            {[
              { range: "$250k income or $2.5M net assets", label: "Wholesale investor threshold", detail: "Unlocks access to private credit, unregistered MIS, and direct wholesale deals. Also the threshold at which private banking divisions begin engagement.", badge: "s708 Corporations Act", color: "bg-amber-50 border-amber-200" },
              { range: "$3M – $5M investable", label: "Multi-family office viable", detail: "Multi-family office (MFO) fees (~0.5%–1% p.a.) become cost-effective vs. a complex set of uncoordinated individual advisers. Purpose: consolidated reporting, trust admin, SMSF oversight, tax coordination.", badge: "MFO tier", color: "bg-blue-50 border-blue-200" },
              { range: "$10M – $30M investable", label: "Private bank or dedicated SFO structure", detail: "Private banking divisions (JBWere, Macquarie, Morgan Stanley) engage directly. A single-family office (SFO) running cost can be justified if the administrative complexity exceeds what an MFO can handle — e.g. multiple operating businesses, overseas assets, complex estate layers.", badge: "SFO or private bank", color: "bg-violet-50 border-violet-200" },
              { range: "$30M+ investable", label: "In-house single-family office", detail: "Dedicated team: chief investment officer, CFO/family accountant, estate and succession lawyer, family governance advisor. Typical running cost $500k–$2M+ p.a. (offset by better tax outcomes, co-investment access, and institutional-quality deal flow).", badge: "In-house SFO", color: "bg-emerald-50 border-emerald-200" },
            ].map(tier => (
              <div key={tier.range} className={`rounded-xl border p-4 ${tier.color}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-extrabold text-slate-900">{tier.range}</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{tier.label}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{tier.detail}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-600">{tier.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Structure comparison table */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Common family office vehicles</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Common family office vehicles — primary use, tax treatment and complexity">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Vehicle</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Primary use</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Tax treatment</th>
                  <th scope="col" className="text-center px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Complexity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {STRUCTURES.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{s.vehicle}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{s.use}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{s.tax}</td>
                    <td className="px-3 py-3 text-center text-xs text-slate-600">{s.complexity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Core family office services</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "📊", title: "Consolidated reporting", body: "Single view across SMSF, trust, direct holdings, and any overseas assets. Replaces 4–8 separate statements with one portfolio dashboard." },
              { icon: "🏛️", title: "SMSF administration", body: "Trustee minutes, ATO lodgements, audit coordination, investment strategy reviews, and pension commencement documentation." },
              { icon: "⚖️", title: "Estate planning", body: "Wills, enduring power of attorney, testamentary trusts, superannuation binding death nominations, and a succession plan covering all trust and corporate structures." },
              { icon: "💰", title: "Tax consolidation", body: "Coordinate income distribution decisions across all entities to minimise effective tax. Trust income splitting, franking credit utilisation, capital loss harvesting." },
              { icon: "🤝", title: "Philanthropy", body: "Public Ancillary Fund (PuAF) or Private Ancillary Fund (PAF) establishment, giving strategy, and DGR-eligible asset transfers." },
              { icon: "🔒", title: "Asset protection", body: "Structuring to separate personal, operating, and investment assets. Creditor-proofing strategies. Insurance audit (life, TPD, business succession)." },
            ].map(item => (
              <div key={item.title} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{item.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
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
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <HubAdvisorCTA
        heading="Find a private wealth adviser for your family"
        subheading="Family office structures require coordinated advice across investments, tax, estate planning, and legal. A private wealth specialist can help you decide whether an SFO, MFO, or premium advisory model suits your assets."
        intent={{ need: "planning", context: ["family_office", "private_wealth", "high_net_worth"] }}
        source="family_office"
        ctaLabel="Find a private wealth adviser"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related / CTA */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/find-advisor", label: "Find a private wealth adviser" },
              { href: "/smsf", label: "SMSF hub" },
              { href: "/wealth-stack", label: "Wealth stack overview" },
              { href: "/global-investing/tax", label: "Tax for high-net-worth investors" },
              { href: "/advisors", label: "All financial advisers" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general information about family office structures. It is not financial, tax, or legal advice. Wholesale investor thresholds are subject to change — verify with a registered financial adviser and solicitor before acting.
          </p>
        </div>
      </section>
    </div>
  );
}
