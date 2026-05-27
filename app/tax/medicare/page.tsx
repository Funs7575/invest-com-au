import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Who pays the Medicare Levy?",
    a: "Most Australian residents pay the standard 2% Medicare Levy on their taxable income. You are exempt or pay a reduced amount if your income is below the low-income threshold ($26,000 for singles, $43,846 for families in 2024–25, plus $4,027 per dependent child) or if you qualify for an exemption — for example, certain categories of blind pension and sickness allowance recipients, or individuals who are not entitled to Medicare benefits (some temporary visa holders). Seniors and pensioners have a higher exemption threshold.",
  },
  {
    q: "What is the Medicare Levy Surcharge, and do I have to pay it?",
    a: "The Medicare Levy Surcharge (MLS) is an additional 1%–1.5% tax on top of the standard 2% Medicare Levy. It applies if your income for surcharge purposes exceeds $93,000 (single) or $186,000 (family) in 2024–25, AND you do not have an appropriate level of private hospital cover. The surcharge is designed to encourage higher-income earners to take out private health insurance and reduce demand on the public system. If you have private hospital cover with an excess under $500 (single) or $1,000 (family), you are exempt from the surcharge.",
  },
  {
    q: "Can I avoid the Medicare Levy Surcharge by taking out private health insurance?",
    a: "Yes. Taking out private hospital cover that meets the minimum requirements exempts you from the MLS. The cover must include hospital treatment with an excess no greater than $500 (single) or $1,000 (family). Extras-only (ancillary) cover does not count. If your income is above the MLS threshold, the cost of basic hospital cover is often less than the MLS itself — particularly for singles earning $93,001–$108,000 where the surcharge is 1% (approximately $930–$1,080 per year). Always compare the insurance premium vs the surcharge before deciding.",
  },
  {
    q: "What is the Lifetime Health Cover (LHC) loading?",
    a: "Lifetime Health Cover is a government policy that charges a 2% loading on private hospital premiums for every year you are over 31 when you first take out hospital cover, up to a maximum of 70%. For example, if you first take out hospital cover at age 40 (nine years after the base age of 31), your premium is loaded by 18%. The loading applies for 10 consecutive years of cover, after which it is removed. You have until 1 July following your 31st birthday to avoid any LHC loading. Returning Australians get a 12-month window from when they become eligible for Medicare.",
  },
  {
    q: "How does the private health insurance rebate work?",
    a: "The government provides a rebate on private health insurance premiums to encourage uptake. The rebate percentage reduces as income increases. For the 2024–25 year: singles earning under $93,000 receive a base rebate of 24.608% (under 65), 28.710% (65–69), or 32.812% (70+). The rebate is income-tested and reduces to zero above $140,000 (single) or $280,000 (family). You can claim the rebate as a reduction on your premium at the time of payment, or as a refundable tax offset in your tax return.",
  },
  {
    q: "Is the Medicare Levy included in PAYG withholding?",
    a: "Yes. When your employer withholds tax from your wages, the standard 2% Medicare Levy is included in the withholding amount using the ATO tax withholding tables. You will see the combined income tax + Medicare Levy on your payslip. The Medicare Levy Surcharge, however, is not typically withheld by your employer — it is calculated and assessed through your annual tax return if applicable. If you have private hospital cover, make sure your insurer provides a certificate for your tax return.",
  },
];

const MLS_RATES = [
  { income: "Under $93,000", single: "No MLS", family: "Under $186,000 — No MLS" },
  { income: "$93,001–$108,000", single: "1.0% surcharge", family: "$186,001–$216,000 — 1.0%" },
  { income: "$108,001–$144,000", single: "1.25% surcharge", family: "$216,001–$288,000 — 1.25%" },
  { income: "Over $144,000", single: "1.5% surcharge", family: "Over $288,000 — 1.5%" },
];

const REBATE_TIERS = [
  { tier: "Tier 0", single: "Under $93,000", family: "Under $186,000", rebate: "24.608% (under 65) / 28.710% (65–69) / 32.812% (70+)" },
  { tier: "Tier 1", single: "$93,001–$108,000", family: "$186,001–$216,000", rebate: "16.405% (under 65) / 20.507% (65–69) / 24.608% (70+)" },
  { tier: "Tier 2", single: "$108,001–$144,000", family: "$216,001–$288,000", rebate: "8.202% (under 65) / 12.303% (65–69) / 16.405% (70+)" },
  { tier: "Tier 3", single: "Over $144,000", family: "Over $288,000", rebate: "0% (no rebate)" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Medicare Levy & Surcharge Australia (${CURRENT_YEAR}) — Rates, Thresholds & Exemptions`,
  description: `Complete guide to Australia&apos;s Medicare Levy (2%) and Medicare Levy Surcharge (1–1.5%): income thresholds, private health insurance exemption, LHC loading, and government rebate rates. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Medicare Levy & Surcharge Australia (${CURRENT_YEAR})`,
    description: "Medicare Levy 2%, MLS thresholds, private health insurance exemption, Lifetime Health Cover loading, and government rebate explained.",
    url: `${SITE_URL}/tax/medicare`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Medicare Levy & Surcharge")}&sub=${encodeURIComponent("Rates · Thresholds · Private Health Rebate · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/medicare` },
};

export default function MedicareLevyPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax", url: absoluteUrl("/tax") },
    { name: "Medicare Levy & Surcharge", url: absoluteUrl("/tax/medicare") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/tax" className="hover:text-white">Tax</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Medicare Levy &amp; Surcharge</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Medicare Levy &amp; Surcharge Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Most Australians pay a 2% Medicare Levy. Higher earners without private hospital cover pay an additional 1%–1.5% surcharge. Here&apos;s how it all works.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Medicare Levy rate", value: "2%" },
                { label: "MLS surcharge (max)", value: "1.5%" },
                { label: "MLS threshold (single)", value: "$93,000" },
                { label: "Lifetime Health Cover base age", value: "31 years" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Medicare Levy basics */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">The Medicare Levy (standard 2%)</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">The Medicare Levy funds Australia&apos;s public health system. It is included in your PAYG withholding and assessed in your annual tax return.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Who pays it</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Most Australian tax residents pay 2% on taxable income</li>
                  <li>Included automatically in PAYG withholding</li>
                  <li>Assessed in your annual individual income tax return</li>
                  <li>Applies on top of income tax rates — adds 2% at all brackets</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Low-income exemptions (2024–25)</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Single: income below <strong>$26,000</strong> → no levy</li>
                  <li>Family: income below <strong>$43,846</strong> (+ $4,027 per child) → no levy</li>
                  <li>Seniors eligible for SAPTO: higher threshold applies</li>
                  <li>Reduced levy (phase-in): income between threshold and 10% above</li>
                  <li>Some temporary visa holders without Medicare access → apply for exemption</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* MLS section */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Medicare Levy Surcharge (MLS)</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Higher-income earners without private hospital cover pay an additional 1%–1.5% surcharge. For many, the cost of private hospital cover is less than the surcharge.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white mb-6">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Single income</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">MLS rate</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Family income equivalent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MLS_RATES.map((r) => (
                    <tr key={r.income} className={r.single === "No MLS" ? "bg-emerald-50" : ""}>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.income}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{r.single}</td>
                      <td className="px-4 py-3 text-slate-600">{r.family}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-2">Exemption: private hospital cover</h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                Having an appropriate level of private hospital cover exempts you from the MLS. The cover must be hospital treatment (not extras-only) with an excess no greater than <strong>$500 for singles</strong> or <strong>$1,000 for families</strong>. Basic single hospital cover typically costs $1,000–$1,500/year — compare this to your likely surcharge before deciding.
              </p>
            </div>
          </div>
        </section>

        {/* MLS calculation example */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Worked example — is private health worth it?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Alex — earns $105,000</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">MLS without private cover (1.0%)</span>
                    <span className="font-bold text-red-700">$1,050/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Basic hospital cover cost (estimate)</span>
                    <span className="font-bold text-slate-900">~$1,100/year</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-600">Net difference</span>
                    <span className="font-bold text-slate-700">~$50 better to take cover</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">At this income, it&apos;s roughly break-even. Factor in health benefits, LHC loading, and rebate when deciding.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Sam — earns $165,000</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">MLS without private cover (1.5%)</span>
                    <span className="font-bold text-red-700">$2,475/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Basic hospital cover cost (estimate)</span>
                    <span className="font-bold text-slate-900">~$1,200/year</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-600">Saving from private cover</span>
                    <span className="font-bold text-emerald-700">~$1,275/year better off</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">At higher incomes, basic hospital cover almost always wins financially — before considering actual health benefits.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Private health insurance rebate */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Private health insurance rebate</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The government rebate reduces your private health insurance premium. It is income-tested and reduces to zero for higher earners. Rates below are for 2024–25.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Tier</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Single income</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Family income</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Rebate rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {REBATE_TIERS.map((t) => (
                    <tr key={t.tier} className={t.tier === "Tier 3" ? "bg-red-50" : ""}>
                      <td className="px-4 py-3 font-bold text-slate-900">{t.tier}</td>
                      <td className="px-4 py-3 text-slate-700">{t.single}</td>
                      <td className="px-4 py-3 text-slate-700">{t.family}</td>
                      <td className="px-4 py-3 text-slate-700">{t.rebate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">Claim the rebate as a premium reduction (insurer applies it upfront) or as a refundable tax offset in your annual return.</p>
          </div>
        </section>

        {/* Lifetime Health Cover */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Lifetime Health Cover (LHC) loading</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">How loading works</h3>
                <p className="text-sm text-slate-700 leading-relaxed">2% added to hospital premiums for every year over 31 when you first take out cover. Maximum loading: 70% (at age 66+). Loading applies for 10 continuous years of cover, then is removed.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-2">The base age: 31</h3>
                <p className="text-sm text-amber-900 leading-relaxed">You have until 1 July after your 31st birthday to take out hospital cover with no LHC loading. Taking out cover at 40 means +18% loading. At 50: +38% loading. Starting early avoids compounding costs.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-2">Returning Australians</h3>
                <p className="text-sm text-slate-700 leading-relaxed">Australian citizens and permanent residents returning from overseas have a 12-month window from when they first become eligible for Medicare to take out cover without LHC penalty for that period.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Medicare and investments */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Medicare Levy and investment income</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Income included in Medicare Levy calculation</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Salary and wages</li>
                  <li>Investment income (dividends, interest, rent)</li>
                  <li>Capital gains (including 50% discount gains)</li>
                  <li>Business income</li>
                  <li>Trust distributions</li>
                  <li>Foreign income</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Not subject to Medicare Levy</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Super fund income (taxed inside the fund)</li>
                  <li>Income earned while a foreign resident</li>
                  <li>Certain government pensions and allowances</li>
                  <li>Income exempt from tax under tax treaties</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Investment note:</strong> The Medicare Levy Surcharge uses &ldquo;income for surcharge purposes&rdquo; which includes taxable income, reportable fringe benefits, reportable employer super contributions, and total net investment losses. Large investment losses that reduce taxable income may not reduce your MLS income for surcharge purposes.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Tax hub &#8594;
              </Link>
              <Link href="/insurance/health" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Health insurance guide &#8594;
              </Link>
              <Link href="/advisors/tax-agents" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Find a tax agent &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
