import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Age Pension Deeming Rates Australia — Current Rates & How They Work (${CURRENT_YEAR}) | invest.com.au`,
  description: `Deeming rates (0.25%/2.25%), thresholds for singles and couples, deemed assets, account-based pension rules, and worked examples. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Age Pension Deeming Rates (${CURRENT_YEAR}) — How Deeming Affects Your Pension`,
    description: "Current deeming rates, thresholds, deemed vs actual income, account-based pension rules, and worked examples for Australian Age Pension recipients.",
    url: absoluteUrl("/retirement/deeming-rates"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Age Pension Deeming Rates")}&sub=${encodeURIComponent("0.25% / 2.25% · Singles & Couples · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/retirement/deeming-rates") },
};

const DEEMING_RATES = [
  {
    tier: "Lower tier",
    threshold: "First $62,600 (single) / $103,800 (couple combined)",
    rate: "0.25%",
    example100k: "$250",
    example500k: "—",
  },
  {
    tier: "Upper tier",
    threshold: "Above $62,600 (single) / $103,800 (couple combined)",
    rate: "2.25%",
    example100k: "—",
    example500k: "Varies (see worked example)",
  },
];

const DEEMED_ASSETS = [
  { asset: "Bank accounts & savings", notes: "All transaction, savings, and offset accounts — regardless of actual interest rate" },
  { asset: "Term deposits", notes: "Full balance at reporting date; actual interest earned is irrelevant for deeming purposes" },
  { asset: "Shares & ETFs", notes: "ASX-listed and international equities; market value is deemed at the applicable rate" },
  { asset: "Managed funds", notes: "Includes index funds, active funds, and unlisted managed investments" },
  { asset: "Account-based pensions (post-2015)", notes: "ABPs commenced on or after 1 January 2015 — full balance is deemed" },  // dated-ok
  { asset: "Cash holdings", notes: "Physical cash above reasonable day-to-day amounts" },
  { asset: "Bonds & debentures", notes: "Face value of bonds, debentures, and similar fixed-income instruments" },
  { asset: "Loans to others", notes: "Money lent to family members or third parties is a financial asset subject to deeming" },
];

const NOT_DEEMED_ASSETS = [
  { asset: "Principal home", notes: "Fully exempt from the assets test — not assessed at all, let alone deemed" },
  { asset: "Investment property", notes: "Assessed under assets test at market value; rental income is actual income, not deemed" },
  { asset: "Defined benefit pensions", notes: "Specific assessment rules apply; generally assessed by converting to an income stream value" },
  { asset: "Life insurance", notes: "Surrender value is counted as an asset but income is not deemed on it" },
  { asset: "Grandfathered ABPs (pre-2015)", notes: "Account-based pensions started before 1 Jan 2015 — assessed on actual payments received" },
  { asset: "Superannuation (under pension age)", notes: "Super of a partner under Age Pension age is not assessed and not deemed" },
];

const FAQS = [
  {
    q: "What is the current deeming rate in Australia?",
    a: "The current deeming rates (since July 2024) are 0.25% on financial assets up to the lower threshold ($62,600 for singles, $103,800 for couples combined) and 2.25% on financial assets above that threshold. Rates have been frozen at historically low levels since 2020 as a response to the low interest rate environment.",
  },
  {
    q: "How does deeming affect my Age Pension?",
    a: "Deeming produces a deemed income figure, which is assessed under the income test. Under the income test, your pension reduces by 50 cents for every dollar of income above the income-free area ($212/fortnight for singles, $372/fortnight for couples combined in 2024-25). If deemed income plus other income exceeds your free area, your pension is reduced.",
  },
  {
    q: "Can I avoid deeming by putting money in term deposits or cash?",
    a: "No. Bank accounts, term deposits, and cash are all subject to deeming regardless of their actual interest rate. If your term deposit earns 4% but the deeming rate is 2.25%, Centrelink only assesses 2.25% — which is actually beneficial. However, if your account earns 0%, you are deemed to earn 2.25% even though you are not.",
  },
  {
    q: "Are account-based pensions subject to deeming?",
    a: "Account-based pensions started on or after 1 January 2015 are subject to deeming. The balance is treated as a financial asset and deemed income is calculated on it. Pre-2015 ABPs are grandfathered and assessed on actual payment amounts received. You permanently lose grandfathering if you switch funds or change the ABP structure.",  // dated-ok
  },
  {
    q: "What happens if my financial assets generate more than the deeming rate?",
    a: "If your actual returns exceed the deeming rate (common when rates are low as they currently are), deeming is beneficial — Centrelink assesses lower income than you actually receive. This is one reason many retirees keep growth assets in their portfolio rather than converting everything to cash: the tax and deeming treatment of higher-return investments can be more favorable.",
  },
  {
    q: "Can I gift assets to reduce deemed income?",
    a: "Centrelink has strict gifting rules. You can gift up to $10,000 per financial year (and $30,000 over 5 years) without affecting your pension. Gifts above these amounts are treated as if you still own the asset (called a &apos;deprived asset&apos;) for 5 years. Gifting to family members to reduce deeming beyond the gifting limits is a deprivation and will not reduce your assessed assets or income.",
  },
];

export default function DeemingRatesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Age Pension Deeming Rates" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">Home</Link><span>/</span>
            <Link href="/retirement" className="hover:text-white">Retirement</Link><span>/</span>
            <Link href="/retirement/age-pension" className="hover:text-white">Age Pension</Link><span>/</span>
            <span className="text-slate-200 font-medium">Deeming Rates</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Age Pension deeming rates ({CURRENT_YEAR}): how Centrelink assesses financial asset income
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            Deeming rules determine how much income Centrelink assumes your financial assets earn — regardless
            of what they actually return. Getting deeming right can significantly affect your Age Pension
            entitlement.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Lower deeming rate", value: "0.25%", sub: "Up to threshold" },
              { label: "Upper deeming rate", value: "2.25%", sub: "Above threshold" },
              { label: "Singles threshold", value: "$62,600", sub: "Lower rate applies below this" },
              { label: "Couples threshold", value: "$103,800", sub: "Combined, lower rate below this" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">{UPDATED_LABEL} · Rates current from July 2024; verify at servicesaustralia.gov.au</p>
        </div>
      </section>

      {/* What is deeming */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">What is deeming?</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Deeming</strong> is how Centrelink assesses income from
              financial investments for the Age Pension income test. Rather than using what your investments
              actually earn, Centrelink <em>deems</em> (assumes) you earn a standard rate of return on your
              financial assets.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The deemed income figure is then assessed under the income test, which reduces your pension
              by <strong>50 cents for every dollar</strong> of income above the income-free area. A lower
              deeming rate means less deemed income and a higher pension.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Deeming exists to prevent people from placing all their money into zero-return accounts to
              minimise assessed income. By applying a standard return regardless of actual earnings, the
              rules treat all financial assets consistently — and give pension recipients an incentive to
              earn more than the deemed rate.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Key insight:</strong> if your actual investment returns
              exceed the deeming rate, only the deemed rate is assessed — you keep the difference
              tax-efficiently. If your returns fall below the deeming rate, you are still assessed on the
              higher deemed amount.
            </p>
          </div>
        </div>
      </section>

      {/* Deeming rates table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Current deeming rates (2024–25)</h2>
          <p className="text-sm text-slate-500 mb-5">
            A two-tier structure applies: a lower rate on financial assets up to the threshold, and a higher
            rate above it. The thresholds differ for singles and couples.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="w-full text-sm" aria-label="Centrelink deeming rates 2024–25">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Tier</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Asset threshold</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Deeming rate</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Deemed income on $100k</th>
                  <th scope="col" className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Deemed income on $500k</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {DEEMING_RATES.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{row.tier}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{row.threshold}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold">{row.rate}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{row.example100k}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{row.example500k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Worked example */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="text-base font-extrabold text-slate-900 mb-3">
              Worked example — single person, $350,000 in financial assets
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">First $62,600 × 0.25%</span>
                <span className="font-bold text-slate-900">$157 deemed income</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Remaining $287,400 × 2.25%</span>
                <span className="font-bold text-slate-900">$6,467 deemed income</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="font-bold text-slate-900">Total deemed income</span>
                <span className="font-bold text-emerald-700">$6,624 / year ($255/fortnight)</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-700">
                  Pension reduction ($255 − $212 income-free area) × 50%
                </span>
                <span className="font-bold text-red-600">~$21.50/fortnight less pension</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Income-free area: $212/fortnight (single, 2024–25). Actual pension impact depends on assets
              test and other income sources. This example shows the income-test effect of deeming only.
            </p>
          </div>
        </div>
      </section>

      {/* What IS and IS NOT deemed */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Deemed assets */}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Assets subject to deeming</h2>
              <div className="space-y-3">
                {DEEMED_ASSETS.map((item, i) => (
                  <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-bold text-emerald-900">{item.asset}</p>
                    <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Not deemed */}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-4">Assets not subject to deeming</h2>
              <div className="space-y-3">
                {NOT_DEEMED_ASSETS.map((item, i) => (
                  <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-bold text-amber-900">{item.asset}</p>
                    <p className="text-xs text-amber-800 leading-relaxed mt-0.5">{item.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account-based pensions and deeming */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Account-based pensions and deeming
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong className="text-slate-900">1 January 2015 rule change</strong> is one of the most  {/* // dated-ok */}
              important deeming considerations for retirees. Account-based pensions (ABPs) started on or
              after that date are subject to deeming — the full account balance is treated as a financial
              asset and deemed income is calculated on it.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
                  Pre-2015 ABPs (grandfathered)
                </p>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  Account-based pensions commenced before 1 January 2015 retain their grandfathered status.  {/* // dated-ok */}
                  Income is assessed on <strong>actual payment amounts received</strong>, not on the
                  account balance. This is typically more favourable, particularly for larger balances
                  making minimum drawdowns.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Post-2015 ABPs (deemed)
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Pensions commenced on or after 1 January 2015 are fully subject to deeming. Centrelink  // dated-ok
                  assesses deemed income on the full account balance regardless of how much you draw down
                  each year.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">
                Warning — grandfathering is lost permanently
              </p>
              <p className="text-sm text-red-900 leading-relaxed">
                If you switch super funds, consolidate, or restructure your pre-2015 ABP, you permanently
                lose the grandfathered status. The new ABP is treated as post-2015 and becomes subject to
                deeming. This is one of the most significant and irreversible retirement income strategy
                decisions — always seek licensed financial advice before making any changes to a
                grandfathered ABP.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Deeming vs actual income */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            When deeming helps — and when it hurts
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Whether deeming works in your favour depends entirely on whether your actual investment
            returns are above or below the applicable deeming rate.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">
                Deeming helps you
              </p>
              <p className="text-sm text-emerald-900 leading-relaxed mb-3">
                Your actual returns <strong>exceed</strong> the deeming rate.
              </p>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Example: $200,000 in shares returning 6% earns $12,000 actual income. Centrelink deems
                only $4,358 (lower tier + upper tier calculation). You keep the extra $7,642 without it
                affecting your pension.
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                Deeming hurts you
              </p>
              <p className="text-sm text-red-900 leading-relaxed mb-3">
                Your actual returns <strong>fall below</strong> the deeming rate.
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                Example: $100,000 in a 1% savings account earns $1,000 actual income. Centrelink still
                deems $157 (lower tier at 0.25%) up to $62,600 and $837 above that — totalling $994
                deemed (close to actual here). But if earning 0%, you&apos;re still assessed on the deemed
                amount.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                Strategic implication
              </p>
              <p className="text-sm text-blue-900 leading-relaxed mb-3">
                Investment return optimisation matters less than it appears for Age Pension assessment.
              </p>
              <p className="text-xs text-blue-800 leading-relaxed">
                Because Centrelink assesses the <em>deemed</em> income — not the actual — there is no
                pension penalty for earning above the deeming rate. Growth assets that outperform deeming
                rates are not penalised. This can make a diversified growth portfolio more efficient for
                pensioners than moving everything to cash.
              </p>
            </div>
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
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden="true">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <HubAdvisorCTA
        heading="Model how deeming affects your Age Pension entitlement"
        subheading="Deeming rates affect your pension by treating financial assets as earning a notional income. A licensed financial planner can model whether restructuring your assets improves your entitlement."
        intent={{ need: "retirement", context: ["deeming_rates", "centrelink", "age_pension"] }}
        source="retirement_deeming_rates"
        ctaLabel="Find a retirement planner"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related guides */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {([
              ["/retirement/age-pension", "Age Pension overview"],
              ["/retirement/age-pension-assets-test", "Assets test in detail"],
              ["/retirement/how-much-do-you-need", "How much to retire?"],
              ["/retirement", "Retirement hub"],
            ] as [string, string][]).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/retirement/annuities"
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors"
            >
              Annuities &amp; Centrelink treatment
            </Link>
          </div>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Deeming rates, thresholds,
            and rules are subject to change — always verify current figures at servicesaustralia.gov.au.
            Account-based pension grandfathering decisions are complex and irreversible; seek advice from
            a licensed financial adviser before making changes. This page is general information only; it
            is not financial, social security, or legal advice.
          </p>
        </div>
      </section>
    </div>
  );
}
