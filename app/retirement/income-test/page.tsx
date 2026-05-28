import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Age Pension Income Test — How It Works & Taper Rate (${CURRENT_YEAR}) | invest.com.au`,
  description: `How the Age Pension income test works: income-free area ($212/fortnight single, $372/fortnight couple), 50-cent taper rate, deeming, Work Bonus, and worked examples. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Age Pension Income Test — Taper Rate, Thresholds & Worked Examples (${CURRENT_YEAR})`,
    description:
      "Income-free area, 50c taper rate, income types counted, deeming rules, Work Bonus, and step-by-step worked examples for the Age Pension income test.",
    url: absoluteUrl("/retirement/income-test"),
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Age Pension Income Test")}&sub=${encodeURIComponent(
          "$212 single · 50¢ taper · " + CURRENT_YEAR
        )}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/retirement/income-test") },
};

const INCOME_TYPES = [
  {
    type: "Employment income",
    treatment: "Assessed after applying the Work Bonus ($300/fortnight exemption). Net of Work Bonus balance.",
    colour: "blue",
  },
  {
    type: "Super drawdowns (account-based pensions, post-2015)",
    treatment:
      "Not assessed as direct income. Instead, the account balance is deemed at standard deeming rates (0.25% / 2.25%).",
    colour: "blue",
  },
  {
    type: "Rental income",
    treatment:
      "Net rental income (gross rent minus allowable expenses: rates, insurance, repairs, agent fees, depreciation, interest). Assessed each fortnight.",
    colour: "blue",
  },
  {
    type: "Financial assets (deeming)",
    treatment:
      "Deemed income calculated on bank accounts, shares, managed funds, term deposits, and post-2015 ABPs — not actual returns.",
    colour: "blue",
  },
  {
    type: "Business income",
    treatment:
      "Net business income (revenue minus legitimate business expenses). Sole traders report net profit; distributions from companies or trusts assessed separately.",
    colour: "blue",
  },
  {
    type: "Overseas income & pensions",
    treatment:
      "Foreign pension payments and overseas employment income are assessed in full (converted to AUD). International agreements may affect treatment.",
    colour: "amber",
  },
  {
    type: "Compensation & insurance",
    treatment:
      "Some compensation payments are income-tested; others (e.g. damages for personal injury) are exempt. Assessment depends on payment structure.",
    colour: "amber",
  },
];

const NOT_INCOME = [
  {
    item: "Principal home proceeds (within 12 months)",
    notes: "Proceeds from selling your home are an exempt asset for up to 12 months if you intend to buy another home.",
  },
  {
    item: "Inheritances",
    notes: "An inheritance is a lump sum, not income. It becomes an assessable asset after receipt; no income test applies to the receipt itself.",
  },
  {
    item: "Tax refunds",
    notes: "ATO tax refunds are not assessed as income — they are a return of tax already paid.",
  },
  {
    item: "Pension payments themselves",
    notes: "Your Age Pension payment is not counted as income for further income test purposes.",
  },
  {
    item: "Exempt compensation payments",
    notes: "Payments specifically exempted by legislation (e.g. certain victims-of-crime payments).",
  },
];

const FAQS = [
  {
    q: "What is the income-free area for the Age Pension in 2024-25?",
    a: "For 2024-25, the income-free area is $212 per fortnight for single pensioners and $372 per fortnight combined for couples. Income below these thresholds does not reduce your Age Pension at all. Above these thresholds, the pension reduces by 50 cents for every additional dollar of income. These thresholds are indexed and reviewed periodically — always verify the current figure at servicesaustralia.gov.au.",
  },
  {
    q: "How does the 50-cent taper rate work?",
    a: "Once your total assessed income exceeds the income-free area, your fortnightly Age Pension reduces by 50 cents for every dollar over the threshold. For example, if a single pensioner has $312 in assessed income (which is $100 above the $212 free area), their pension reduces by $50 per fortnight ($100 × 50 cents). This continues proportionally until the pension reaches nil — the cut-off point for singles in 2024-25 is approximately $2,318 per fortnight.",
  },
  {
    q: "What happens when both the income test and assets test apply?",
    a: "Both tests are calculated independently and the one that produces the lower pension payment (higher reduction) is the one that applies. You cannot choose which test governs your payment — Services Australia applies both automatically and pays the lower result. It is possible for the assets test to reduce your pension to nil even if the income test would produce a partial pension, or vice versa.",
  },
  {
    q: "Is super counted in the Age Pension income test?",
    a: "It depends on the type of super arrangement and your age. Account-based pensions (ABPs) started on or after 1 January 2015 are subject to deeming — the full account balance is deemed at standard deeming rates rather than counting actual payments. ABPs opened before 1 January 2015 are grandfathered and assessed on actual payments received. Super accumulation accounts belonging to a partner who is still under Age Pension age are not assessed at all.",
  },
  {
    q: "Does the Work Bonus change how the income test applies to my earnings?",
    a: "Yes. The Work Bonus removes the first $300 per fortnight of employment income from the income test. Any unused Work Bonus from fortnights when you are not working accumulates in a balance (up to $11,800). When you do work, that balance is drawn down before the income test applies to earnings above $300. See our full Work Bonus guide for step-by-step examples.",
  },
  {
    q: "What is the income cut-off point for the Age Pension?",
    a: "In 2024-25, the approximate income cut-off (where the full pension reaches nil) for a single pensioner is around $2,318 per fortnight. For couples, the combined income cut-off is around $3,544 per fortnight. Above these thresholds, no Age Pension is payable. However, your pension is suspended rather than cancelled for up to 26 fortnights — meaning you can have it reinstated without reapplying if your income drops again. Always confirm current cut-off figures with Services Australia.",
  },
];

export default function IncomTestPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Retirement", url: `${SITE_URL}/retirement` },
    { name: "Age Pension Income Test" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      {/* Hero */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <Link href="/retirement" className="hover:text-white">
              Retirement
            </Link>
            <span>/</span>
            <Link href="/retirement/age-pension" className="hover:text-white">
              Age Pension
            </Link>
            <span>/</span>
            <span className="text-slate-200 font-medium">Income Test</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Age Pension income test ({CURRENT_YEAR}): thresholds, taper rate &amp; worked examples
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            The income test determines how much your Age Pension reduces when you have other income.
            Understanding the income-free area, the 50-cent taper, and which income types count — and which
            don&apos;t — can make a material difference to your retirement income.
          </p>
          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Free area (single)", value: "$212", sub: "Per fortnight, 2024–25" },
              { label: "Free area (couple combined)", value: "$372", sub: "Per fortnight, 2024–25" },
              { label: "Taper rate", value: "50¢", sub: "Per $1 over the threshold" },
              { label: "Cut-off (single)", value: "~$2,318", sub: "Per fortnight income" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            {UPDATED_LABEL} &middot; Figures current for 2024&ndash;25; verify at servicesaustralia.gov.au
          </p>
        </div>
      </section>

      {/* How the income test works */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">How the income test works</h2>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong className="text-slate-900">income test</strong> is one of two means tests Services
              Australia applies to determine your Age Pension entitlement (the other is the assets test). Both
              tests are run independently, and the one that produces the lower pension is the one that applies
              to your payment.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Under the income test, your total assessable income each fortnight is compared against an
              income-free area. Income below the threshold has no effect on your pension. Income above the
              threshold reduces your pension by <strong>50 cents for every dollar of excess</strong> — this
              is known as the taper rate.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Important:</strong> not all income is counted in the same
              way. Employment income is reduced by the Work Bonus; financial asset income uses deeming rates
              rather than actual returns; and some income types are excluded entirely. Each category is
              explained in detail below.
            </p>
          </div>
        </div>
      </section>

      {/* Taper rate calculation */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Income-free area and taper rate (2024&ndash;25)
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            The income-free area and taper rate together determine how quickly your pension reduces as income
            rises.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Situation
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Income-free area (fortnight)
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Taper rate
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Approx. cut-off
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  {
                    situation: "Single",
                    freeArea: "$212",
                    taper: "50c per $1 over",
                    cutoff: "~$2,318/fortnight",
                  },
                  {
                    situation: "Couple (combined)",
                    freeArea: "$372",
                    taper: "50c per $1 over",
                    cutoff: "~$3,544/fortnight (combined)",
                  },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{row.situation}</td>
                    <td className="px-3 py-3 text-emerald-700 font-bold">{row.freeArea}</td>
                    <td className="px-3 py-3 text-slate-700 text-xs">{row.taper}</td>
                    <td className="px-3 py-3 text-red-600 text-xs font-semibold">{row.cutoff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
              How taper interacts with maximum pension
            </p>
            <p className="text-sm text-amber-900 leading-relaxed">
              The maximum single Age Pension rate is approximately $1,144 per fortnight (base rate plus
              supplements). Under the income test, every dollar over the $212 free area reduces the pension
              by 50 cents. To reach nil pension: ($1,144 &divide; 0.50) + $212 &asymp; $2,500 — though the
              actual cut-off differs once supplements are included. Supplements phase out separately.
            </p>
          </div>
        </div>
      </section>

      {/* Income types covered */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Income types assessed</h2>
          <p className="text-sm text-slate-500 mb-5">
            The income test covers a wide range of income sources. How each type is assessed varies — some
            are counted at face value, others at a deemed rate, and others are reduced by deductions.
          </p>
          <div className="space-y-3">
            {INCOME_TYPES.map((item, i) => (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  item.colour === "amber"
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-100 bg-blue-50"
                }`}
              >
                <p
                  className={`text-sm font-bold mb-1 ${
                    item.colour === "amber" ? "text-amber-900" : "text-blue-900"
                  }`}
                >
                  {item.type}
                </p>
                <p
                  className={`text-xs leading-relaxed ${
                    item.colour === "amber" ? "text-amber-800" : "text-blue-800"
                  }`}
                >
                  {item.treatment}
                </p>
              </div>
            ))}
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mt-8 mb-3">What is NOT assessed as income</h3>
          <div className="space-y-3">
            {NOT_INCOME.map((item, i) => (
              <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-900">{item.item}</p>
                <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">{item.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deeming */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Deeming rates on financial assets
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Financial assets — bank accounts, shares, managed funds, term deposits, and post-2015
            account-based pensions — are not assessed on their actual returns. Instead, Centrelink{" "}
            <em>deems</em> a standard return regardless of what the asset actually earns.
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Tier
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Single — asset value
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Couple — combined asset value
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Deeming rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs">Lower tier</td>
                  <td className="px-3 py-3 text-xs text-slate-600">First $60,400</td>
                  <td className="px-3 py-3 text-xs text-slate-600">First $100,200 combined</td>
                  <td className="px-3 py-3 text-emerald-700 font-bold">0.25%</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900 text-xs">Upper tier</td>
                  <td className="px-3 py-3 text-xs text-slate-600">Above $60,400</td>
                  <td className="px-3 py-3 text-xs text-slate-600">Above $100,200 combined</td>
                  <td className="px-3 py-3 text-amber-700 font-bold">2.25%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                How deemed income enters the income test
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                The deemed income figure is an annual amount — converted to a fortnightly figure by dividing
                by 26 — and added to all other fortnightly income before comparing against the income-free
                area. If total income including deemed income exceeds the free area, the taper applies.
              </p>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">
                Pre-2015 ABP grandfathering
              </p>
              <p className="text-sm text-red-900 leading-relaxed">
                Account-based pensions commenced before 1 January 2015 are grandfathered: income is assessed
                on <strong>actual payments received</strong>, not on the account balance. Grandfathering is
                permanently lost if the ABP is restructured or rolled to a new fund.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/retirement/deeming-rates"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
            >
              Read the full deeming rates guide &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Work Bonus */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Work Bonus: employment income concession</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong className="text-slate-900">Work Bonus</strong> is a concession that reduces the
              amount of employment income assessed under the income test. The first{" "}
              <strong>$300 per fortnight</strong> of eligible employment income is excluded from the income
              test entirely.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
                  Fortnightly exemption
                </p>
                <p className="text-2xl font-extrabold text-emerald-900">$300</p>
                <p className="text-xs text-emerald-700 leading-relaxed mt-1">
                  Per person, per fortnight. Applies to wages, salary, and personal-exertion
                  self-employment income only.
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                  Accumulating balance
                </p>
                <p className="text-2xl font-extrabold text-amber-900">$11,800</p>
                <p className="text-xs text-amber-700 leading-relaxed mt-1">
                  Unused Work Bonus accrues (even when not working) up to a $11,800 cap. Used to offset
                  earnings above $300 when you return to work.
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                  Does NOT apply to
                </p>
                <p className="text-xs text-blue-800 leading-relaxed mt-1">
                  Investment income, rental income, deemed income, business income from passive ownership,
                  or super income streams.
                </p>
              </div>
            </div>
            <div className="mt-2">
              <Link
                href="/retirement/work-bonus"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
              >
                Read the full Work Bonus guide &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Worked examples */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Worked examples</h2>

          {/* Example 1 — no income */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 1 &mdash; Single pensioner with no other income (full pension)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Single pensioner, no employment, no financial assets, no rental income. Age Pension full rate
              (base + supplements) approximately $1,144 per fortnight.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                <span className="text-slate-700">Total assessable income (fortnight)</span>
                <span className="font-bold text-slate-900">$0</span>
              </div>
              <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                <span className="text-slate-700">Income-free area (single)</span>
                <span className="font-bold text-slate-900">$212</span>
              </div>
              <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                <span className="text-slate-700">Excess above free area</span>
                <span className="font-bold text-emerald-700">$0 (below threshold)</span>
              </div>
              <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                <span className="text-slate-700">Income test reduction ($0 &times; 50c)</span>
                <span className="font-bold text-emerald-700">$0</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-900">Age Pension payable (income test)</span>
                <span className="font-bold text-emerald-700">Full rate &mdash; ~$1,144/fortnight</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              The assets test applies independently. If assets exceed the assets test threshold, the pension
              may still be reduced below the full rate even though the income test produces no reduction.
            </p>
          </div>

          {/* Example 2 — couple with $800 combined */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-6">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 2 &mdash; Couple with $800 per fortnight combined income (step-by-step)
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Couple on full Age Pension. Combined assessable income of $800/fortnight (e.g. from deemed
              financial assets and a small super drawdown). No employment income. Full couple pension rate
              approximately $1,725/fortnight combined.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Step 1: Total combined assessable income</span>
                <span className="font-bold text-slate-900">$800/fortnight</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Step 2: Subtract income-free area (couple combined)</span>
                <span className="font-bold text-slate-900">&minus;$372</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Step 3: Excess income above free area</span>
                <span className="font-bold text-slate-900">$428</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Step 4: Apply 50-cent taper ($428 &times; 50c)</span>
                <span className="font-bold text-red-600">&minus;$214 pension reduction</span>
              </div>
              <div className="flex justify-between items-center border-b border-amber-200 pb-2">
                <span className="text-slate-700">Step 5: Income test pension result</span>
                <span className="font-bold text-slate-900">$1,725 &minus; $214 = $1,511/fortnight</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-900">
                  Combined Age Pension (income test result)
                </span>
                <span className="font-bold text-amber-700">~$1,511/fortnight</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              This is the income test result only. The assets test result is also calculated separately.
              Whichever produces the lower pension governs the actual payment. The reduction is split equally
              between both members of the couple — each receives approximately $756/fortnight.
            </p>
          </div>

          {/* Example 3 — rental property */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">
              Example 3 &mdash; Single pensioner with a rental property
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Single pensioner owns an investment property (not the principal home). Gross rent $1,200/month.
              Allowable expenses: $400/month (council rates, insurance, property manager fees, repairs).
              No other income.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Gross monthly rent</span>
                <span className="font-bold text-slate-900">$1,200</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">
                  Less: allowable expenses (rates, insurance, manager, repairs)
                </span>
                <span className="font-bold text-emerald-700">&minus;$400</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Net monthly rental income</span>
                <span className="font-bold text-slate-900">$800/month</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">
                  Converted to fortnightly ($800 &times; 12 &divide; 26)
                </span>
                <span className="font-bold text-slate-900">~$369/fortnight assessed</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Less: income-free area (single)</span>
                <span className="font-bold text-slate-900">&minus;$212</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Excess income</span>
                <span className="font-bold text-slate-900">$157</span>
              </div>
              <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                <span className="text-slate-700">Income test reduction ($157 &times; 50c)</span>
                <span className="font-bold text-red-600">&minus;$78.50/fortnight</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-bold text-slate-900">Age Pension (income test)</span>
                <span className="font-bold text-blue-700">~$1,065/fortnight (partial pension)</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Note: the investment property itself is also an assessable asset under the assets test at its
              current market value. The asset value of the property may independently reduce the pension
              further via the assets test taper — whichever test produces the lower payment applies.
            </p>
          </div>
        </div>
      </section>

      {/* Income test vs assets test */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Income test vs assets test: which one applies?
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Both tests run simultaneously. Services Australia calculates your pension entitlement under each
            test independently and pays the result that produces the lower pension (greater reduction). You
            cannot elect which test governs your payment.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mb-5">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Income test</p>
              <ul className="text-sm text-blue-900 space-y-1.5 leading-relaxed">
                <li>Based on what you earn each fortnight</li>
                <li>Includes employment, rental, deemed financial asset income, business income</li>
                <li>
                  Income-free area: $212 (single) / $372 (couple combined) per fortnight
                </li>
                <li>50c taper on excess income</li>
                <li>Work Bonus reduces employment income assessed</li>
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Assets test</p>
              <ul className="text-sm text-amber-900 space-y-1.5 leading-relaxed">
                <li>Based on what you own (total assessable assets)</li>
                <li>Includes investments, property (not the home), vehicles, and household contents</li>
                <li>
                  Free area: $314,000 (homeowner single) / $470,000 (homeowner couple combined) in
                  2024&ndash;25
                </li>
                <li>$3 per fortnight taper per $1,000 of assets above threshold</li>
                <li>Principal home is exempt from the assets test</li>
              </ul>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
              Practical rule of thumb
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              The <strong>income test tends to govern</strong> when you have high income relative to assets
              (e.g. working part-time, large rental income, or a high-returning portfolio). The{" "}
              <strong>assets test tends to govern</strong> when you have substantial assets even with modest
              income (e.g. large share portfolio producing only modest dividends, or a high-value investment
              property with low yield). Many retirees with both assets and income find the assets test is the
              binding constraint.
            </p>
          </div>
        </div>
      </section>

      {/* Waiting period / income over cut-off */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            What happens when income exceeds the cut-off?
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">
              When assessable income reaches approximately $2,318 per fortnight (single, 2024&ndash;25), the
              income test reduces the pension to nil. At this point the pension is{" "}
              <strong>suspended</strong>, not cancelled.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
                  Suspension (income temporarily too high)
                </p>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  If the pension is suspended rather than cancelled, you can have it reinstated within{" "}
                  <strong>26 fortnights</strong> without re-applying. Your Pensioner Concession Card and
                  other concession entitlements may also be retained during suspension. Work Bonus balance
                  is preserved.
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wide mb-1">
                  Cancellation (26 fortnights at nil)
                </p>
                <p className="text-sm text-red-900 leading-relaxed">
                  If the pension remains at nil for more than 26 fortnights, it is cancelled. You must
                  re-apply from scratch if you subsequently qualify. Your Work Bonus balance resets to zero.
                  Concession entitlements tied to the pension also cease.
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              There is no formal &quot;waiting period&quot; for income that temporarily spikes above the
              cut-off — the pension simply suspends in the affected fortnight(s) and resumes when income
              drops. Report all income changes promptly to Services Australia to avoid overpayments or
              underpayments.
            </p>
          </div>
        </div>
      </section>

      {/* Step-by-step full calculation */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            Full income test calculation — step by step
          </h2>
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide w-8">
                    Step
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    What you calculate
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  {
                    step: "1",
                    action: "Gross employment income (if any)",
                    notes:
                      "All wages, salaries, contractor income from personal exertion. Gross, before tax.",
                  },
                  {
                    step: "2",
                    action: "Apply Work Bonus (employment income only)",
                    notes:
                      "Subtract $300/fortnight exemption, then draw from any accumulated Work Bonus balance for excess above $300.",
                  },
                  {
                    step: "3",
                    action: "Calculate deemed income on financial assets",
                    notes:
                      "0.25% annual rate on first $60,400 (single) / $100,200 (couple); 2.25% on the remainder. Divide annual figure by 26 for fortnightly amount.",
                  },
                  {
                    step: "4",
                    action: "Add net rental income (if any)",
                    notes: "Gross rent minus allowable deductions, converted to a fortnightly figure.",
                  },
                  {
                    step: "5",
                    action: "Add any other assessable income",
                    notes: "Business income, overseas pension, compensation payments, etc.",
                  },
                  {
                    step: "6",
                    action: "Sum all assessable income (Steps 2 through 5)",
                    notes: "This is your total fortnightly assessable income for the income test.",
                  },
                  {
                    step: "7",
                    action: "Subtract income-free area",
                    notes:
                      "$212/fortnight (single) or $372/fortnight (couple combined). If total is at or below the free area: no income test reduction — stop here.",
                  },
                  {
                    step: "8",
                    action: "Multiply excess by 50 cents",
                    notes:
                      "This is the fortnightly income test reduction to apply to the maximum pension rate.",
                  },
                  {
                    step: "9",
                    action: "Maximum pension minus reduction = income-test pension",
                    notes:
                      "Compare this result with the assets test result. The lower of the two is your actual payment.",
                  },
                ].map((row) => (
                  <tr key={row.step} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-amber-600 text-center">{row.step}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{row.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4 bg-white">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related guides */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["/retirement/age-pension", "Age Pension overview"],
                ["/retirement/age-pension-assets-test", "Assets test in detail"],
                ["/retirement/deeming-rates", "Deeming rates explained"],
                ["/retirement/work-bonus", "Work Bonus scheme"],
                ["/retirement", "Retirement hub"],
              ] as [string, string][]
            ).map(([href, label]) => (
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Age Pension income test
            thresholds, taper rates, deeming rates, and Work Bonus caps are subject to change — always
            verify current figures at servicesaustralia.gov.au. Account-based pension grandfathering
            decisions are complex and irreversible; seek advice from a licensed financial adviser before
            making changes. Individual circumstances vary significantly; the worked examples on this page
            are illustrative only. This page is general information only; it is not financial, social
            security, or legal advice.
          </p>
        </div>
      </section>
    </div>
  );
}
