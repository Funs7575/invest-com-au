import Link from "next/link";
import type { Metadata } from "next";

import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  FIRB_DISCLAIMER,
  FOREIGN_INVESTOR_GENERAL_DISCLAIMER,
  LOAN_COMPARISON_DISCLAIMER,
  NON_RESIDENT_TAX_NOTE,
} from "@/lib/compliance";
import Icon from "@/components/Icon";
import AdvisorPrompt from "@/components/AdvisorPrompt";

export const revalidate = 86400;

const FAQS = [
  {
    q: "Can non-residents get a mortgage in Australia?",
    a: "Yes, but through a narrower lender panel than residents. Most major banks have tightened or withdrawn non-resident lending, so loans typically come from a subset of banks and specialist/non-bank lenders. Expect lower maximum LVRs (loan-to-value ratios) than residents — often meaningfully below the 80–95% available to local borrowers — larger cash deposit requirements, and closer scrutiny of foreign income. A mortgage broker experienced with non-resident lending knows which lenders are currently active.",
  },
  {
    q: "How much deposit does a non-resident need for an Australian property?",
    a: "More than a resident buying the same property. Between the reduced maximum LVR, FIRB application fees, and state foreign-buyer stamp duty surcharges (typically 7–8% on top of standard stamp duty), non-resident buyers should budget a substantially larger upfront amount. The exact figure depends on the lender, the property, and your circumstances — get a formal assessment before committing to a purchase.",
  },
  {
    q: "Does foreign income count for an Australian home loan?",
    a: "Lenders that accept non-residents generally accept foreign income but apply haircuts — commonly discounting (or 'shading') foreign salary and applying conservative exchange-rate assumptions — and many only accept income in major currencies. Documentation requirements are heavier: translated payslips, foreign tax returns and bank statements are typical. Self-employed foreign income is harder again.",
  },
  {
    q: "Do expats get better mortgage terms than foreign non-residents?",
    a: "Generally yes. Australian citizens and permanent residents living overseas ('expats') are usually treated more like local borrowers — more lenders, higher maximum LVRs — though foreign-currency income still attracts shading. Foreign nationals with no Australian visa face the narrowest options. Your citizenship/residency status is the single biggest variable, which is why brokers ask it first.",
  },
];

const faqLd = faqJsonLd(FAQS);

export const metadata: Metadata = {
  title: `Non-Resident Mortgages in Australia: How They Work (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "How non-residents and expats finance Australian property: which lenders participate, LVR and deposit expectations, foreign-income rules, and the approval process. General information only.",
  openGraph: {
    title: "Non-Resident Mortgages in Australia: How They Work",
    description:
      "Lender landscape, LVR and deposit expectations, foreign-income shading, and the process for non-resident and expat borrowers.",
    url: `${SITE_URL}/foreign-investment/guides/non-resident-mortgage`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Non-Resident Mortgages in Australia")}&sub=${encodeURIComponent("Lenders · LVR · Process · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/non-resident-mortgage` },
};

const REALITIES = [
  {
    icon: "building",
    title: "A narrower lender panel",
    body: "Most majors have pulled back from non-resident lending. Active lenders are typically a subset of banks plus specialist and non-bank lenders — and the panel changes. This is the main reason a broker who works non-resident files regularly adds real value.",
  },
  {
    icon: "pie-chart",
    title: "Lower maximum LVRs",
    body: "Non-resident borrowers face lower maximum loan-to-value ratios than residents, so a larger cash deposit is required. Expats (Australian citizens/PRs abroad) generally sit between locals and foreign nationals.",
  },
  {
    icon: "dollar-sign",
    title: "Foreign income is 'shaded'",
    body: "Lenders discount foreign income and apply conservative FX assumptions, and many accept only major currencies. Documentation is heavier: translated payslips, foreign tax returns, bank statements.",
  },
  {
    icon: "percent",
    title: "Pricing is usually higher",
    body: "Non-resident loans are commonly priced above comparable resident loans, and some lenders add approval conditions. Factor the all-in cost — rate, fees, FIRB application fee, and state foreign-buyer surcharges — not the headline rate alone.",
  },
];

const PROCESS = [
  {
    step: 1,
    title: "Confirm what you can buy",
    body: "FIRB rules decide the property types available to you before any lender does. Check the eligibility explainer and, for a specific purchase, confirm with a foreign-investment lawyer.",
    href: "/foreign-investment/guides/firb-eligibility",
    linkLabel: "FIRB eligibility explainer",
  },
  {
    step: 2,
    title: "Get a lender assessment early",
    body: "Borrowing capacity drives everything else. A broker experienced with non-resident files can pre-assess your income, currency and visa position against the lenders currently active.",
    href: "/advisors/mortgage-brokers",
    linkLabel: "Find a mortgage broker",
  },
  {
    step: 3,
    title: "Budget the full upfront stack",
    body: "Deposit at the reduced LVR, FIRB application fee, state foreign-buyer stamp duty surcharge (typically 7–8% extra), legal/conveyancing and inspection costs.",
    href: "/foreign-investment/guides/stamp-duty-foreign-buyers",
    linkLabel: "Foreign-buyer stamp duty by state",
  },
  {
    step: 4,
    title: "Apply for FIRB and the loan in parallel",
    body: "FIRB approval is per-property (or via a developer's exemption certificate). Coordinate the contract, finance clause and FIRB timing — your lawyer and broker should talk to each other.",
    href: "/foreign-investment/guides/firb-application-guide",
    linkLabel: "FIRB application guide",
  },
];

export default function NonResidentMortgagePage() {
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
              { name: "Non-Resident Mortgages" },
            ]),
          ),
        }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-amber-50 border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment/guides" className="hover:text-slate-900">Guides</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Non-Resident Mortgages</span>
          </nav>
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-slate-900 mb-3">
              Non-resident mortgages in Australia: <span className="text-blue-600">how they actually work</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl">
              Financing Australian property from overseas is possible — through a narrower lender
              panel, with bigger deposits and heavier paperwork. Here&apos;s the landscape and the
              process, and where a specialist broker fits in. General information only.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom max-w-4xl py-8 md:py-10">
        {/* ── The four realities ── */}
        <section className="mb-10">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">
            The four realities of non-resident lending
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {REALITIES.map((r) => (
              <div key={r.title} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon name={r.icon} size={16} className="text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Broker CTA (the referral path) ── */}
        <section className="mb-10">
          <AdvisorPrompt
            type="mortgage_broker"
            heading="Non-resident lending is a specialist's game"
            description="The active lender panel, LVR caps and income rules change constantly. A broker who regularly writes non-resident and expat loans can pre-assess your position before you commit to a property."
          />
        </section>

        {/* ── Process ── */}
        <section className="mb-10">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-4">
            The process, in order
          </h2>
          <ol className="space-y-3">
            {PROCESS.map((p) => (
              <li key={p.step} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-extrabold flex items-center justify-center shrink-0">
                  {p.step}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">{p.body}</p>
                  <Link
                    href={p.href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 mt-1.5"
                  >
                    {p.linkLabel}
                    <Icon name="arrow-right" size={12} />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Expat vs foreign national ── */}
        <section className="mb-10">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-3">
            Expat or foreign national? It changes everything
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="text-sm font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5">
                <Icon name="user-check" size={15} /> Australian citizen / PR abroad
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Treated closer to a local borrower: more lenders, higher maximum LVRs, and no FIRB
                approval needed. Foreign-currency income still gets shaded, and some lenders limit
                which countries and currencies they accept.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h3 className="text-sm font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                <Icon name="globe" size={15} /> Foreign national (no Australian visa)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The narrowest path: fewest lenders, lowest LVR caps, FIRB approval required, and
                state foreign-buyer surcharges on top. Property choice is limited to new dwellings,
                off-the-plan and vacant land under the current rules.
              </p>
            </div>
          </div>
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
              { label: "FIRB eligibility explainer", href: "/foreign-investment/guides/firb-eligibility" },
              { label: "Buy property as a foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { label: "Stamp duty for foreign buyers", href: "/foreign-investment/guides/stamp-duty-foreign-buyers" },
              { label: "Find a mortgage broker", href: "/advisors/mortgage-brokers" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                <Icon name="arrow-right" size={14} className="text-blue-500 shrink-0" />
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Disclaimers ── */}
        <div className="space-y-2 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-500 leading-relaxed">{LOAN_COMPARISON_DISCLAIMER}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{NON_RESIDENT_TAX_NOTE}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{FIRB_DISCLAIMER}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
