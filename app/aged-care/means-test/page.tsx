import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Aged Care Means Test — Assets, Income & Fees (${CURRENT_YEAR}) | invest.com.au`,
  description: `How the aged care means test works in Australia: income assessment, assets assessment, how your family home is treated, accommodation threshold, and the means-tested care fee calculation. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Aged Care Means Test (${CURRENT_YEAR}) — Assets, Income & Fees`,
    description: "The aged care means test: income and assets assessment, family home treatment, accommodation threshold, and means-tested care fee calculation.",
    url: `${SITE_URL}/aged-care/means-test`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Aged Care Means Test")}&sub=${encodeURIComponent("Assets · Income · Family Home · Fees · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/aged-care/means-test` },
};

const ASSESSMENT_OVERVIEW = [
  { step: "Income assessment", detail: "All income is counted: Age Pension, super drawdowns, investment income, rental income, employment income. Some income is excluded: family payments, some compensation." },
  { step: "Assets assessment", detail: "Assessable assets include: financial assets (super, shares, bank accounts), investment property, vehicles. Special treatment: family home (2-year exemption if spouse/carer/dependent remains in home)." },
  { step: "Combined assessment", detail: "Both income and assets are assessed simultaneously. Services Australia uses the higher of two calculations: income-tested fee or assets-tested fee. The higher result is your means-tested care fee." },
  { step: "Accommodation threshold", detail: "If assessable assets are below $59,333 (2024–25), accommodation is fully funded by government (no RAD/DAP required). Above this: you pay accommodation costs." },
  { step: "Annual and lifetime caps", detail: "Annual cap: $33,309. Lifetime cap: $82,823. Once caps are reached, no further means-tested fee — government covers remaining care costs." },
];

const HOME_TREATMENT = [
  { scenario: "Spouse / partner remains at home", treatment: "Family home is exempt from assets test — fully excluded for as long as spouse/partner lives there", note: "Most common scenario — spouse at home, resident in care" },
  { scenario: "Dependent child remains at home", treatment: "Fully exempt while dependent child (under 25 or permanently disabled) resides there", note: "Rare but important for families with adult disabled children" },
  { scenario: "Carer lived there 2+ years", treatment: "Exempt if eligible carer has lived there for 2+ years and has no other home", note: "Eligible carer = person who was previously caring for the resident before they entered care" },
  { scenario: "No one remaining at home", treatment: "2-year exemption from entry to care; after 2 years, included in assets test at market value", note: "Plan ahead — if home will be sold within 2 years, timing of sale matters for fee calculations" },
];

const FAQS = [
  {
    q: "How is the means-tested care fee calculated?",
    a: "The means-tested care fee uses two calculations, and the higher result applies: (1) Income-tested: (assessable income − income-free area) × 50%, divided by 365 per day; (2) Assets-tested: (assessable assets − asset-free area) × a tiered rate, divided by 365. The income-free area is $32,057/year (single); the asset-free area is $59,333. Services Australia provides a calculation tool at servicesaustralia.gov.au. The key lever: if you can reduce your assessable assets (through RAD payment, or the family home becoming assessable after 2 years in care), the assets-tested fee may decrease.",
  },
  {
    q: "Can I reduce my means-tested fee by paying a larger RAD?",
    a: "Yes — this is one of the key reasons some residents pay a larger RAD than the minimum required. When you pay a RAD, that money leaves your assessable assets. A $300,000 RAD reduces your assessed assets by $300,000, which reduces your assets-tested care fee calculation. However, the RAD must be paid to the facility from your own funds — you can&apos;t borrow it. For residents near or above the lifetime means-tested fee cap, paying a larger RAD may have limited benefit as fees would be capped anyway. A CAFA (Certified Aged Care Financial Adviser) can model the optimal RAD amount for your situation.",
  },
  {
    q: "What is the accommodation threshold and how does it affect me?",
    a: "If your combined assessable income and assets are below the accommodation payment threshold ($59,333 in assets, plus income threshold), the government pays your accommodation costs and you only pay the basic daily fee plus means-tested care fee. Above the threshold: you pay accommodation costs (RAD or DAP). The threshold is lower for single people than for couples (a single person with $200k in super and a small income is above the threshold; a couple may have different treatment depending on how assets are held). Getting just below the threshold through legitimate means (like funding home modifications from savings) can save significant ongoing accommodation fees.",
  },
  {
    q: "How are super balances treated in the aged care means test?",
    a: "Superannuation balances are treated differently depending on whether they are &apos;accessible&apos;. For residents of Age Pension age or older: super balances in any phase (accumulation or pension) are fully assessable assets. For residents below Age Pension age (rare in residential aged care, but possible): super may not be assessable as an asset, though drawdowns would be counted as income. Account-based pensions are assessable at their full account balance. The RAD strategy of converting super to an accommodation deposit is one way to reduce the assessed super balance — but the financial modelling requires specialist advice.",
  },
];

export default function AgedCareMeansTestPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Aged Care", url: `${SITE_URL}/aged-care` },
    { name: "Means Test" },
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
            <span className="text-slate-900 font-medium">Means Test</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Aged care means test: how your income and assets affect your fees
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            The aged care means test determines your means-tested care fee and whether you pay
            accommodation costs. Both income and assets are assessed — the higher calculation applies.
            Your family home may be exempt, and annual and lifetime fee caps protect against unlimited charges.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · 2024–25 thresholds · General information only</p>
        </div>
      </section>

      {/* Assessment overview */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">How the assessment works</h2>
          <div className="space-y-3">
            {ASSESSMENT_OVERVIEW.map((item, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-slate-200 p-4 bg-white">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-extrabold shrink-0 text-sm">{i + 1}</div>
                <div>
                  <p className="font-bold text-slate-900 mb-1">{item.step}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Family home */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Family home treatment in aged care</h2>
          <div className="space-y-3">
            {HOME_TREATMENT.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <p className="font-bold text-slate-900 text-sm">{item.scenario}</p>
                </div>
                <div className="p-4 grid sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Treatment</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{item.treatment}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Note</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{item.note}</p>
                  </div>
                </div>
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

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Get your aged care means test modelled"
        subheading="The means test interaction with Centrelink, accommodation payments, and estate planning is complex. A Certified Aged Care Financial Adviser can model your specific situation."
        intent={{ need: "aged_care", context: ["means_test", "centrelink", "aged_care_planning"] }}
        source="aged_care_means_test"
        ctaLabel="Find a Certified Aged Care Adviser"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/aged-care/rad-vs-dap", label: "RAD vs DAP decision" },
              { href: "/aged-care/costs", label: "All aged care costs" },
              { href: "/aged-care/family-home", label: "Family home in aged care" },
              { href: "/aged-care/centrelink", label: "Centrelink assessment" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Means test thresholds and fee rules change with legislation. This page is general information only; it is not financial, legal, or aged care advice. For personalised means test modelling, consult a Certified Aged Care Financial Adviser (CAFA) via the Financial Planning Association aged care specialist register.
          </p>
        </div>
      </section>
    </div>
  );
}
