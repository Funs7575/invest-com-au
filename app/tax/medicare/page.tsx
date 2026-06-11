import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Medicare Levy & Surcharge Australia (${CURRENT_YEAR}) — Investor's Guide`,
  description: `Medicare Levy (2%) and Surcharge (1–1.5%): 2025–26 thresholds, how to avoid the MLS, and why negative gearing won't reduce it. ${UPDATED_LABEL}`,
  openGraph: {
    title: `Medicare Levy & Medicare Levy Surcharge Australia (${CURRENT_YEAR})`,
    description:
      "The Medicare Levy vs the Medicare Levy Surcharge explained — 2024–25 thresholds, the negative gearing trap, and how high earners avoid the surcharge with basic hospital cover.",
    url: `${SITE_URL}/tax/medicare`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Medicare Levy & Surcharge Australia")}&sub=${encodeURIComponent("2% Levy · MLS Thresholds · Hospital Cover · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/medicare` },
};

/* ─── Medicare Levy low-income thresholds (2024–25) ─── */
const LEVY_THRESHOLDS = [
  {
    category: "Singles",
    noLevy: "Up to $26,000",
    reduced: "$26,000 – $32,500",
    fullLevy: "Above $32,500",
  },
  {
    category: "Singles (seniors & pensioners)",
    noLevy: "Up to $41,089",
    reduced: "$41,089 – $51,361",
    fullLevy: "Above $51,361",
  },
  {
    category: "Families",
    noLevy: "Up to $43,846",
    reduced: "$43,846 – $54,807",
    fullLevy: "Above $54,807",
  },
  {
    category: "Families (seniors & pensioners)",
    noLevy: "Up to $57,198",
    reduced: "$57,198 – $71,497",
    fullLevy: "Above $71,497",
  },
];

/* ─── Medicare Levy Surcharge income tiers (2024–25) ─── */
const MLS_SINGLES = [
  { tier: "Base tier", income: "$0 – $97,000", rate: "0%" },
  { tier: "Tier 1", income: "$97,001 – $113,000", rate: "1%" },
  { tier: "Tier 2", income: "$113,001 – $151,000", rate: "1.25%" },
  { tier: "Tier 3", income: "$151,001 and above", rate: "1.5%" },
];

const MLS_FAMILIES = [
  { tier: "Base tier", income: "$0 – $194,000", rate: "0%" },
  { tier: "Tier 1", income: "$194,001 – $226,000", rate: "1%" },
  { tier: "Tier 2", income: "$226,001 – $302,000", rate: "1.25%" },
  { tier: "Tier 3", income: "$302,001 and above", rate: "1.5%" },
];

/* ─── What counts toward "income for surcharge purposes" ─── */
const MLS_INCOME_COMPONENTS = [
  {
    label: "Taxable income",
    detail:
      "Your assessable income after allowable deductions — the figure your ordinary income tax is calculated on.",
  },
  {
    label: "Reportable fringe benefits",
    detail:
      "The grossed-up value of fringe benefits reported on your income statement, such as a novated car lease.",
  },
  {
    label: "Reportable super contributions",
    detail:
      "Salary-sacrificed (concessional) super contributions and personal deductible contributions are added back — sacrificing into super does not reduce your surcharge income.",
  },
  {
    label: "Net investment losses",
    detail:
      "Net financial-investment and net rental-property losses are added back. This is the negative gearing trap — a rental loss cuts taxable income but not surcharge income.",
  },
  {
    label: "Exempt foreign employment income",
    detail:
      "Certain foreign employment income that is exempt from Australian tax is still counted for the surcharge.",
  },
];

/* ─── Private Health Insurance Rebate (illustrative single tiers) ─── */
const REBATE_TIERS = [
  { tier: "Base tier", income: "$0 – $97,000", under65: "24.608%", age65to69: "28.710%", age70plus: "32.812%" },
  { tier: "Tier 1", income: "$97,001 – $113,000", under65: "16.405%", age65to69: "20.507%", age70plus: "24.608%" },
  { tier: "Tier 2", income: "$113,001 – $151,000", under65: "8.202%", age65to69: "12.303%", age70plus: "16.405%" },
  { tier: "Tier 3", income: "$151,001+", under65: "0%", age65to69: "0%", age70plus: "0%" },
];

const FAQS = [
  {
    q: "What is the difference between the Medicare Levy and the Medicare Levy Surcharge?",
    a: "They are two separate charges. The Medicare Levy is a flat 2% of taxable income paid by most Australian taxpayers to help fund the public health system; low-income earners pay a reduced rate or nothing. The Medicare Levy Surcharge (MLS) is an additional 1% to 1.5% charged only to higher-income earners who do NOT hold an appropriate level of private hospital cover. You can pay the Medicare Levy without ever paying the surcharge — the surcharge is designed to encourage high earners to take out private hospital insurance and ease pressure on the public system.",
  },
  {
    q: "Does negative gearing reduce my Medicare Levy Surcharge?",
    a: "No — and this surprises many property investors. The surcharge is calculated on your 'income for surcharge purposes', which adds your net investment and net rental-property losses back to your taxable income. So a negatively geared property reduces your ordinary income tax but does not reduce your MLS income. An investor whose taxable income sits just under a threshold can still be pushed into a surcharge tier once the rental loss is added back. The Medicare Levy itself (the 2%) is calculated on taxable income, so negative gearing does reduce that — it is only the surcharge that adds the losses back.",
  },
  {
    q: "How do I avoid the Medicare Levy Surcharge?",
    a: "Hold an appropriate level of private patient hospital cover for the full income year. If you have hospital cover for the entire year, you are not liable for the surcharge regardless of your income. For many high earners the premium on a basic hospital policy is lower than the surcharge they would otherwise pay, so taking out cover can be cheaper than paying the MLS. The cover must be hospital cover held with a registered Australian health insurer — extras-only ('ancillary') cover does not exempt you. If you only hold cover for part of the year, you may still be liable for the surcharge for the uncovered days.",
  },
  {
    q: "What income is counted for the Medicare Levy Surcharge?",
    a: "The MLS uses 'income for surcharge purposes', which is broader than taxable income. It is your taxable income plus reportable fringe benefits, plus reportable (salary-sacrificed and personal deductible) super contributions, plus net financial-investment and net rental-property losses, plus certain exempt foreign employment income. Because salary sacrifice and negative gearing are both added back, your surcharge income can be materially higher than the taxable income shown on your assessment — which is why investors should test their position using surcharge income, not taxable income.",
  },
  {
    q: "Is basic hospital cover enough to avoid the surcharge?",
    a: "Yes, provided it is genuine hospital cover from a registered health insurer and is held for the full income year. There is no requirement to buy comprehensive ('gold') cover to escape the surcharge — a basic or 'bronze' hospital policy is sufficient. From 1 April 2019 policies with an excess above $750 for singles or $1,500 for families/couples do not qualify, so check the excess on a cheap policy before relying on it. Extras-only cover (dental, optical, physio) does not count, because it is not hospital cover.",
  },
];

export default function MedicarePage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tax", item: `${SITE_URL}/tax` },
      { "@type": "ListItem", position: 3, name: "Medicare Levy", item: `${SITE_URL}/tax/medicare` },
    ],
  };

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ─── Hero ─── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-900">Tax</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Medicare Levy</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Medicare &amp; Health Cover · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Medicare Levy &amp; Surcharge{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Australia has two distinct Medicare charges. The{" "}
              <strong className="text-slate-900">Medicare Levy</strong> is a flat 2% of taxable income
              that almost every taxpayer pays to help fund the public health system. The{" "}
              <strong className="text-slate-900">Medicare Levy Surcharge</strong> is a separate
              extra charge of 1% to 1.5% that only applies to higher earners who don&apos;t hold private
              hospital cover. This guide explains both, the 2024&ndash;25 thresholds, and why investors
              with negatively geared assets are often caught by the surcharge.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Two-charges-at-a-glance ─── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Medicare Levy</p>
              <p className="text-xl font-black text-amber-700">2%</p>
              <p className="text-xs text-slate-600 mt-1">Of taxable income for most taxpayers — funds the public health system</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Medicare Levy Surcharge</p>
              <p className="text-xl font-black text-slate-900">1% – 1.5%</p>
              <p className="text-xs text-slate-600 mt-1">Extra charge for high earners without private hospital cover</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Singles MLS Threshold</p>
              <p className="text-xl font-black text-slate-900">$97,000</p>
              <p className="text-xs text-slate-600 mt-1">Surcharge income above this triggers the MLS if you have no hospital cover</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Guide body ─── */}
      <section className="py-10 md:py-12 bg-white">
        <div className="container-custom max-w-3xl space-y-12">

          {/* 1. Medicare Levy basics */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">The Medicare Levy — 2% of taxable income</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                The Medicare Levy helps fund Australia&apos;s public health system. For most taxpayers it is
                a flat <strong className="text-slate-900">2% of taxable income</strong>, calculated{" "}
                <em>after</em> your allowable deductions are taken out. It is collected through your normal
                income tax return rather than as a separate bill.
              </p>
              <p>
                Because it is charged on taxable income, deductions that lower your taxable income &mdash;
                including a negatively geared investment loss &mdash; also lower the Medicare Levy you pay.
                That is an important distinction from the surcharge below, which adds those losses back.
              </p>
              <p>
                Low-income earners pay a reduced levy or none at all. Where your income sits between the
                lower and upper thresholds, the levy <strong className="text-slate-900">phases in
                gradually</strong> rather than jumping straight to the full 2% &mdash; see the reduction
                section further down.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
                <p className="text-xs font-mono text-slate-700">
                  Medicare Levy = Taxable income &times; 2%
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Example: a taxable income of $90,000 produces a Medicare Levy of $90,000 &times; 2% = $1,800.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Low-income thresholds table */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Medicare Levy low-income thresholds (2024&ndash;25)</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                Below the lower threshold you pay no Medicare Levy. Between the lower and upper thresholds
                the levy is reduced (it phases in). Above the upper threshold you pay the full 2%. Family
                thresholds are higher and increase for each dependent child, and seniors and pensioners
                entitled to the seniors and pensioners tax offset have higher thresholds again.
              </p>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm border-collapse" aria-label="Medicare Levy low-income thresholds 2024–25">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th scope="col" className="text-left py-3 px-4 text-xs font-bold">Category</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold">No levy (below)</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Reduced levy</th>
                    <th scope="col" className="text-center py-3 px-4 text-xs font-bold">Full 2% levy (above)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {LEVY_THRESHOLDS.map((row) => (
                    <tr key={row.category} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-xs font-semibold text-slate-900">{row.category}</td>
                      <td className="py-3 px-4 text-center text-xs font-mono text-green-700">{row.noLevy}</td>
                      <td className="py-3 px-4 text-center text-xs font-mono text-amber-700">{row.reduced}</td>
                      <td className="py-3 px-4 text-center text-xs font-mono text-slate-700">{row.fullLevy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">
                Family thresholds rise by roughly $4,000 for each dependent child. Figures for 2024&ndash;25; verify the current year at ato.gov.au.
              </p>
            </div>
          </div>

          {/* 3. The surcharge — the investor's section */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">The Medicare Levy Surcharge (MLS) — what catches high earners</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                The Medicare Levy Surcharge is the charge investors and high earners need to watch. It
                applies when <strong className="text-slate-900">both</strong> of these are true:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You do <strong className="text-slate-900">not</strong> hold an appropriate level of private patient hospital cover for the full year; <em>and</em></li>
                <li>Your income for surcharge purposes is above the relevant threshold for your circumstances.</li>
              </ul>
              <p>
                The surcharge is charged at <strong className="text-slate-900">1%, 1.25% or 1.5%</strong> of
                your surcharge income depending on which tier you fall into, and it is on top of the 2%
                Medicare Levy. It exists to encourage higher earners to take out private hospital cover
                and reduce demand on the public system &mdash; which is why holding hospital cover removes
                the charge entirely.
              </p>
            </div>
          </div>

          {/* 4. MLS thresholds tables */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">MLS income thresholds (2024&ndash;25)</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              The thresholds depend on whether you are assessed as a single or a family. Note the surcharge
              is applied to your whole surcharge income once you cross a tier &mdash; not just the amount above
              the threshold.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="overflow-x-auto">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Singles</p>
                <table className="w-full text-sm border-collapse" aria-label="Medicare Levy Surcharge income tiers for singles 2024–25">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold">Tier</th>
                      <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Surcharge income</th>
                      <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {MLS_SINGLES.map((row) => (
                      <tr key={row.tier} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{row.tier}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-mono text-slate-700">{row.income}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-900">{row.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="overflow-x-auto">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Families</p>
                <table className="w-full text-sm border-collapse" aria-label="Medicare Levy Surcharge income tiers for families 2024–25">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold">Tier</th>
                      <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Surcharge income</th>
                      <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {MLS_FAMILIES.map((row) => (
                      <tr key={row.tier} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-semibold text-slate-900">{row.tier}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-mono text-slate-700">{row.income}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-slate-900">{row.rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              The family threshold increases by $1,500 for each dependent child after the first. Figures for 2024&ndash;25; verify at ato.gov.au.
            </p>
          </div>

          {/* 5. Income for surcharge purposes */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">&quot;Income for surcharge purposes&quot; — broader than taxable income</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                The surcharge is <strong className="text-slate-900">not</strong> calculated on taxable income.
                It is calculated on a broader figure the ATO calls{" "}
                <strong className="text-slate-900">income for surcharge purposes</strong>, which adds several
                amounts back. This catches far more than salary, and it is exactly why investors are often
                surprised to find themselves liable.
              </p>
            </div>
            <div className="mt-4 space-y-2.5">
              {MLS_INCOME_COMPONENTS.map((item) => (
                <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. The negative gearing trap */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">The negative gearing trap</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                This is the single most common surprise for property investors. When you negatively gear a
                property &mdash; deductible costs exceed rental income &mdash; the net rental loss reduces your
                taxable income, and therefore reduces your ordinary income tax and your 2% Medicare Levy.
              </p>
              <p>
                But for the surcharge, that <strong className="text-slate-900">net rental loss is added back</strong>.
                So negative gearing does <strong className="text-slate-900">not</strong> reduce your surcharge
                income at all. An investor who deliberately reduces taxable income below $97,000 with a rental
                loss can still be liable for the MLS once the loss is restored. The same applies to net
                financial-investment losses (for example, a margin-loan interest cost exceeding investment income).
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Key point</p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Negative gearing cuts your Medicare Levy (2%) but not your Medicare Levy Surcharge. Always
                  test your MLS position on surcharge income, not taxable income.
                </p>
              </div>
            </div>
          </div>

          {/* 7. Worked example */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Worked example — a negatively geared single</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                Priya is single with no private hospital cover. Her position for the year:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Taxable income</span>
                  <span className="font-mono font-semibold text-slate-900">$105,000</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">+ Salary-sacrificed super (added back)</span>
                  <span className="font-mono font-semibold text-slate-900">$10,000</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">+ Net rental loss / negative gearing (added back)</span>
                  <span className="font-mono font-semibold text-slate-900">$8,000</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">= Income for surcharge purposes</span>
                  <span className="font-mono font-bold text-amber-700">$123,000</span>
                </div>
              </div>
              <p>
                At $123,000 Priya falls in the <strong className="text-slate-900">Tier 2</strong> band for
                singles ($113,001 &ndash; $151,000), so her surcharge rate is{" "}
                <strong className="text-slate-900">1.25%</strong>. Because she had no hospital cover for the year:
              </p>
              <div className="bg-slate-900 text-white rounded-xl p-4">
                <p className="text-xs font-mono text-slate-300">
                  MLS = $123,000 &times; 1.25%
                </p>
                <p className="text-2xl font-black text-amber-400 mt-1">= $1,537.50</p>
                <p className="text-xs text-slate-400 mt-2">
                  Note her taxable income of $105,000 alone would have placed her in Tier 1 (1%). The add-backs
                  pushed her into the higher tier &mdash; and a basic hospital policy could often be bought for
                  less than this surcharge.
                </p>
              </div>
            </div>
          </div>

          {/* 8. How to avoid the MLS */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">How to avoid the surcharge</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                The only way to remove the surcharge is to hold an appropriate level of{" "}
                <strong className="text-slate-900">private patient hospital cover</strong> for the full income
                year. If you are covered for every day of the year, you are not liable for the MLS regardless
                of your income.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong className="text-slate-900">It must be hospital cover.</strong> Extras-only (ancillary)
                  cover &mdash; dental, optical, physio &mdash; does <em>not</em> exempt you. The policy must cover
                  hospital treatment.
                </li>
                <li>
                  <strong className="text-slate-900">Basic / bronze cover is enough.</strong> You do not need
                  comprehensive cover to escape the surcharge; the cheapest qualifying hospital policy works.
                </li>
                <li>
                  <strong className="text-slate-900">Watch the excess limit.</strong> Policies with an excess
                  above $750 (singles) or $1,500 (couples/families) do not qualify as exempting cover.
                </li>
                <li>
                  <strong className="text-slate-900">Compare the numbers.</strong> For many high earners a basic
                  hospital premium is cheaper than the surcharge they would otherwise pay &mdash; so taking cover
                  can save money outright, not just buy insurance.
                </li>
              </ul>
            </div>
          </div>

          {/* 9. Private Health Insurance Rebate */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">The Private Health Insurance Rebate</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                The rebate is a <strong className="text-slate-900">separate</strong> government contribution
                toward your private health insurance premium &mdash; it is not part of the surcharge, although
                the two interact. It is income-tested using the same tiers as the MLS, and the percentage also
                depends on the oldest person on the policy. You can take it as a reduced premium or as a tax offset.
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse" aria-label="Private Health Insurance Rebate percentages by income tier and age">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th scope="col" className="text-left py-2.5 px-3 text-xs font-bold">Income tier (singles)</th>
                    <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Under 65</th>
                    <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Age 65&ndash;69</th>
                    <th scope="col" className="text-center py-2.5 px-3 text-xs font-bold">Age 70+</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {REBATE_TIERS.map((row) => (
                    <tr key={row.tier} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-mono text-slate-700">{row.income}</td>
                      <td className="py-2.5 px-3 text-center text-xs font-semibold text-slate-900">{row.under65}</td>
                      <td className="py-2.5 px-3 text-center text-xs font-semibold text-slate-900">{row.age65to69}</td>
                      <td className="py-2.5 px-3 text-center text-xs font-semibold text-slate-900">{row.age70plus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">
                Rebate percentages are indexed annually (1 April) and shown for the 2024&ndash;25 year; verify at privatehealth.gov.au.
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              The interaction matters: a high earner in Tier 3 receives{" "}
              <strong className="text-slate-900">no rebate at all</strong> yet still faces the 1.5% surcharge if
              uncovered. For that person, buying a basic hospital policy &mdash; even with zero rebate &mdash; is often
              still cheaper than paying the surcharge, so the maths usually favours holding cover.
            </p>
          </div>

          {/* 10. Exemptions */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Medicare Levy exemptions</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                Some people are exempt from the Medicare Levy in full or in part. Common categories include:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Low-income earners whose taxable income is below the lower threshold (no levy applies).</li>
                <li>
                  People who held a <strong className="text-slate-900">Medicare Entitlement Statement</strong> for
                  all or part of the year because they were not eligible for Medicare (for example, some temporary
                  residents). The statement is requested from Services Australia.
                </li>
                <li>Certain foreign residents and people whose normal residence is a country without a reciprocal health-care agreement with Australia.</li>
                <li>Blind pensioners and recipients of a sickness allowance in some cases.</li>
                <li>Members of the Australian Defence Force entitled to free medical treatment, and certain veterans.</li>
              </ul>
              <p>
                You claim the exemption in the Medicare Levy section of your tax return, stating the number of
                exempt days. Where you were not eligible for Medicare, keep your Medicare Entitlement Statement
                as evidence. An exemption from the levy generally also removes the surcharge for the same days.
              </p>
            </div>
          </div>

          {/* 11. Levy reduction */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Medicare Levy reduction for low-income earners</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                If your income sits between the lower and upper thresholds in the table above, you do not jump
                straight to the full 2%. Instead the levy <strong className="text-slate-900">phases in
                gradually</strong>: in the reduction range the levy is charged at 10 cents for each dollar of
                income above the lower threshold, until it reaches the full 2% at the upper threshold.
              </p>
              <p>
                The result is a smooth transition rather than a cliff &mdash; someone just above the lower
                threshold pays only a small levy, and the amount rises steadily until the full rate applies.
                The ATO works the reduction out automatically from the income you report; you do not need a
                separate calculation, but it explains why two people with similar incomes near the threshold
                can pay quite different levy amounts.
              </p>
            </div>
          </div>

          {/* 12. Lifetime Health Cover loading */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-3">Lifetime Health Cover (LHC) loading</h2>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                Lifetime Health Cover is a third, separate mechanism &mdash; distinct from both the levy and the
                surcharge. If you do not take out private hospital cover by{" "}
                <strong className="text-slate-900">1 July following your 31st birthday</strong>, a loading of{" "}
                <strong className="text-slate-900">2% is added to your hospital premium for every year</strong>{" "}
                you delay, once you eventually take out cover.
              </p>
              <p>
                The loading is capped at 70% and is removed after you have held continuous hospital cover for 10
                years. It exists to encourage people to take out hospital cover early and keep it. The practical
                takeaway: the LHC loading and the surcharge together mean delaying hospital cover gets more
                expensive the longer you wait &mdash; both factors feed into the broader decision of whether and
                when to hold private hospital cover.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-2xl">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">FAQ</p>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Medicare Levy &amp; Surcharge questions answered</h2>
          <div className="mt-4 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Unsure if the surcharge applies to you?</h2>
          <p className="text-sm text-slate-300 mb-6">
            A registered tax agent can work out your income for surcharge purposes and weigh a basic hospital
            policy against the surcharge for your situation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
              Find a Tax Agent →
            </Link>
            <Link href="/tax" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
              Tax Strategy Hub →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Related tax guides ─── */}
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Related tax guides</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link href="/tax/negative-gearing" className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors">
              <p className="font-bold text-slate-900 text-sm">Negative Gearing</p>
              <p className="text-xs text-slate-500 mt-1">Why rental losses cut tax but not your MLS income</p>
            </Link>
            <Link href="/tax/capital-gains" className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors">
              <p className="font-bold text-slate-900 text-sm">Capital Gains Tax</p>
              <p className="text-xs text-slate-500 mt-1">The 50% discount, cost base, and tax-loss harvesting</p>
            </Link>
            <Link href="/tax/franking-credits" className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors">
              <p className="font-bold text-slate-900 text-sm">Franking Credits</p>
              <p className="text-xs text-slate-500 mt-1">How dividend imputation reduces tax on Australian shares</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Compliance ─── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING} Tax and Medicare information is general in nature and based on 2024&ndash;25
            rates. Thresholds and rebate percentages change each year &mdash; verify current figures with the ATO
            (ato.gov.au), privatehealth.gov.au, or a registered tax agent before acting.
          </p>
        </div>
      </section>
    </div>
  );
}
