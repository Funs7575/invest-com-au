/**
 * FIRE (Financial Independence, Retire Early) guide for Australians.
 *
 * Covers: FIRE number, 4% SWR, FIRE variants, super preservation age,
 * savings rate impact table, super bridge strategy, sequence of returns
 * risk, Coast FIRE, and Australian tax strategy for FIRE.
 *
 * Compliance posture: general information only — "see a licensed financial
 * adviser" disclaimers per GENERAL_ADVICE_WARNING. No personal advice,
 * no product recommendations, no return guarantees.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  breadcrumbJsonLd,
  SITE_URL,
  CURRENT_YEAR,
  UPDATED_LABEL,
  absoluteUrl,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import ArticleReadingProgress from "@/components/ArticleReadingProgress";

export const revalidate = 86400;

const PAGE_TITLE = `FIRE in Australia: Financial Independence, Retire Early Guide (${CURRENT_YEAR})`;
const PAGE_DESC =
  "Complete guide to FIRE for Australians: the 4% rule, 25x number, super bridge strategy, savings rate tables, Lean/Fat/Barista/Coast FIRE variants, CGT discount, franking credits, and sequence-of-returns risk. General information only.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: `${SITE_URL}/invest/fire` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: `${SITE_URL}/invest/fire`,
    type: "article",
    images: [{ url: `/api/og?title=${encodeURIComponent("FIRE Investing Australia")}&sub=${encodeURIComponent("Financial Independence · 4% Rule · Early Retirement · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Invest", url: absoluteUrl("/invest") },
  { name: "FIRE Guide", url: absoluteUrl("/invest/fire") },
]);

const FAQS = [
  {
    q: "What is the 4% rule and does it apply in Australia?",
    a: "The 4% rule (or Safe Withdrawal Rate) originated from the 1994 Trinity Study using US equity and bond data. It suggests retirees can withdraw 4% of their portfolio in year one, then adjust for inflation each year, with a high probability of the portfolio lasting 30 years. Australian data broadly supports a similar withdrawal rate, but Australians should account for a potentially longer retirement horizon (40+ years for early retirees), the impact of franking credits boosting effective income, and Australian inflation patterns. Many Australian FIRE practitioners use 3.5% for extra safety with a 40+ year timeframe.",
  },
  {
    q: "Can I access my superannuation before age 60 for FIRE?",
    a: "Generally no — super is locked until you meet a condition of release, which for most people means reaching preservation age (60 for anyone born after 30 June 1964) and retiring. The only early access route relevant to FIRE practitioners is the Transition to Retirement (TTR) income stream, which allows you to draw up to 10% of your super account balance per year once you reach preservation age, even while still working. This is not an early access mechanism — it only applies at age 60. You must fund the gap between your early retirement date and age 60 entirely from non-super assets.",
  },
  {
    q: "What is the super bridge strategy?",
    a: "The super bridge strategy is the core planning framework for Australian FIRE. You split your wealth into two buckets: (1) non-super investments (shares, ETFs, property, cash) which you live off from your early retirement date until you turn 60; and (2) superannuation, which compounds untouched (or with ongoing concessional contributions to reduce tax) until you reach preservation age. At 60 you access super tax-free in pension phase. The bridge period is the gap between your FIRE date and age 60. A 35-year-old achieving FIRE faces a 25-year bridge; a 45-year-old faces a 15-year bridge.",
  },
  {
    q: "What is Coast FIRE?",
    a: "Coast FIRE is the point at which your existing super and investment balance, left to grow without any new contributions, will compound to your full FIRE number by your target retirement age. Once you have enough invested to coast, you only need to earn enough to cover current living expenses — you no longer need to save. For example, if your FIRE number is $1.5M and you need it in 25 years, at 7% real growth you need about $280,000 today to coast. A Coast FIRE milestone often comes well before full FIRE and can allow a dramatic reduction in work intensity.",
  },
  {
    q: "How does franking credits affect the FIRE withdrawal rate?",
    a: "Franking credits are a meaningful tailwind for Australian FIRE portfolios holding ASX equities. Fully franked dividends carry a 30% imputation credit — for a retiree with low taxable income, most of this credit is refunded in cash by the ATO. This effectively boosts the after-tax yield of your Australian share portfolio. A portfolio yielding 4% in gross dividends with full franking may deliver 5.5–5.7% after franking credit refunds at zero marginal tax rate. This means Australian FIRE investors with heavy ASX exposure can often sustain a higher effective withdrawal rate than the nominal 4% rule suggests.",
  },
  {
    q: "What is sequence of returns risk and why does it matter for FIRE?",
    a: "Sequence of returns risk is the danger that a run of bad investment returns early in retirement permanently depletes your portfolio, even if long-run average returns are fine. If your portfolio drops 40% in year 2 of retirement and you are still withdrawing 4% per year, you are forced to sell more units at depressed prices — reducing the number of units available to recover when markets rebound. Studies show the first 5–10 years of retirement returns are the most important determinant of portfolio survival. Common mitigations: holding 1–2 years of living expenses in cash; flexible withdrawal rules (reduce withdrawals in bad years); keeping a bond or defensive allocation as a buffer.",
  },
  {
    q: "What are the main FIRE variants and which suits Australians?",
    a: "Lean FIRE targets a very frugal lifestyle, typically under $40,000/year. Regular FIRE targets a comfortable lifestyle in the $60,000–$100,000 range. Fat FIRE targets $100,000/year or more and requires a much larger nest egg. Barista FIRE (also called Semi-FIRE) is popular in Australia — you retire from full-time work but take part-time or casual work to cover living costs while your investments grow, preserving the portfolio for later. Barista FIRE dramatically reduces the savings required and mitigates sequence risk. Coast FIRE (see above) is a milestone rather than a destination. Most Australian FIRE practitioners target Regular or Barista FIRE given median income and cost structures.",
  },
  {
    q: "What are common FIRE mistakes made by Australians?",
    a: "The most common mistakes are: (1) Not factoring superannuation into the plan — super is a powerful tax-sheltered vehicle that should be a key pillar, not an afterthought. (2) Underestimating healthcare costs before Medicare and PBS can't cover everything, especially dental, optical, and mental health. (3) Ignoring transaction costs — stamp duty on property, brokerage, CGT on liquidation all reduce actual returns significantly. (4) Using nominal returns instead of real (inflation-adjusted) returns when projecting. (5) Assuming a static withdrawal rate — lifestyle costs often change dramatically in early retirement. (6) Not stress-testing for a 40+ year retirement horizon with a 3.5% rather than 4% withdrawal rate.",
  },
];

const faqLd = faqJsonLd(FAQS);

const SAVINGS_RATE_TABLE = [
  { sr: "10%", years: "~46 years" },
  { sr: "20%", years: "~37 years" },
  { sr: "30%", years: "~28 years" },
  { sr: "40%", years: "~22 years" },
  { sr: "50%", years: "~17 years" },
  { sr: "60%", years: "~12.5 years" },
];

export default function FireGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <ArticleReadingProgress />

      <div>
        {/* Hero */}
        <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-6"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900 transition-colors">
                Home
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/invest" className="hover:text-slate-900 transition-colors">
                Invest
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium">FIRE Guide</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-emerald-500 text-white px-3 py-1 rounded-full">
                {UPDATED_LABEL}
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                Australian-specific
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                Super bridge strategy
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
              FIRE in Australia: Financial Independence, Retire Early
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              The complete Australian guide to FIRE — from calculating your number and choosing your
              variant to the super bridge strategy, franking credits, sequence risk, and the savings
              rate impact table. General information only; see a licensed financial adviser for
              personal advice.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/fire-calculator"
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                FIRE Calculator &rarr;
              </Link>
              <Link
                href="/lump-sum-investing"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg border border-slate-200 transition-colors"
              >
                Lump Sum vs DCA
              </Link>
              <Link
                href="/tax"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg border border-slate-200 transition-colors"
              >
                Tax-Loss Harvesting
              </Link>
            </div>
          </div>
        </section>

        {/* Section 1: What FIRE means */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 1
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              What does FIRE mean?
            </h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              FIRE stands for Financial Independence, Retire Early. The goal is simple: accumulate
              enough invested wealth that passive returns from your portfolio cover your living
              expenses indefinitely — achieving financial independence before the traditional
              Australian retirement age of 65–67.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Financial independence does not require you to stop working — it means you{' '}
              <em>choose</em> whether to work. Many FIRE practitioners continue working part-time,
              consulting, or pursuing passion projects. The defining moment is when your survival
              is no longer dependent on an employer.
            </p>
            <p className="text-slate-700 leading-relaxed">
              FIRE requires three inputs: your annual spending, your savings rate, and your
              investment return assumptions. The mathematics is straightforward; the behavioural
              discipline to maintain a high savings rate for 10–20 years is the hard part.
            </p>
          </div>
        </section>

        {/* Section 2: The FIRE number — 4% rule and 25x */}
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 2
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Your FIRE number: the 4% rule and the 25x rule
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
                  The 4% Safe Withdrawal Rate
                </p>
                <p className="font-bold text-slate-900 text-lg mb-2">
                  Withdraw 4% per year from your portfolio.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Based on the 1994 Trinity Study: a diversified portfolio of shares and bonds
                  has historically sustained a 4% annual withdrawal (adjusted for inflation) for
                  30 years with a high success rate. Many Australian FIRE practitioners use{' '}
                  <strong>3.5%</strong> for a 40+ year retirement horizon.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
                  The 25x Rule (your FIRE number)
                </p>
                <p className="font-bold text-slate-900 text-lg mb-2">
                  Annual expenses &times; 25 = FIRE number
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This is simply the inverse of 4%: if you spend $60,000/year, you need $1.5M
                  invested. If you use the 3.5% rate for a longer retirement, the multiplier
                  becomes 28.6x. This is the single most important number in your FIRE plan.
                </p>
              </div>
            </div>

            {/* Worked example */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                Worked example — Sarah
              </p>
              <h3 className="font-bold text-slate-900 text-lg mb-3">
                Age 35, $60K/year spending, 15% savings rate, $300K already invested
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Annual spending", value: "$60,000" },
                  { label: "FIRE number (25x)", value: "$1,500,000" },
                  { label: "Current portfolio", value: "$300,000" },
                  { label: "Gap to close", value: "$1,200,000" },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-lg p-4 text-center">
                    <p className="text-xl font-extrabold text-emerald-700">{item.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mt-4">
                At a 15% savings rate on a $70,600 gross income (saving ~$10,600/year after tax),
                investing at a 7% real return, and with $300,000 already compounding, Sarah reaches
                her $1.5M FIRE number in approximately 15 years — at age 50. Increasing her savings
                rate to 30–40% would cut the timeline to 10–12 years.
              </p>
              <p className="text-xs text-slate-500 italic mt-2">
                Projections assume a 7% real return (after inflation) and constant spending. Actual
                returns will vary. This is an illustration, not a forecast.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: FIRE variants */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 3
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
              FIRE variants: which type suits you?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  name: "Lean FIRE",
                  spend: "Under $40,000/year",
                  number: "~$1M at 4% SWR",
                  desc: "Maximum frugality — tight budget, minimal lifestyle inflation, typically requires a low cost of living (regional areas, shared housing, minimal travel). Hardest variant to sustain long-term; any health or lifestyle change can blow the budget.",
                  color: "bg-blue-50 border-blue-200",
                  badge: "bg-blue-100 text-blue-800",
                },
                {
                  name: "Regular FIRE",
                  spend: "$60,000–$100,000/year",
                  number: "$1.5M–$2.5M at 4% SWR",
                  desc: "The most common target for Australian FIRE practitioners. Covers a comfortable lifestyle — decent home, moderate travel, healthcare buffer. Requires a decade-plus of high savings rate but achievable on dual-income professional salaries.",
                  color: "bg-emerald-50 border-emerald-200",
                  badge: "bg-emerald-100 text-emerald-800",
                },
                {
                  name: "Fat FIRE",
                  spend: "Over $100,000/year",
                  number: "$2.5M+ at 4% SWR",
                  desc: "Luxury early retirement — business class travel, private schools, premium healthcare, investment property. Typically requires very high income, business exits, or inheritance. The portfolio size provides excellent sequence risk protection.",
                  color: "bg-amber-50 border-amber-200",
                  badge: "bg-amber-100 text-amber-800",
                },
                {
                  name: "Barista FIRE",
                  spend: "Part portfolio, part income",
                  number: "Smaller portfolio + casual income",
                  desc: "Retire from full-time corporate work but take casual or part-time work to cover living costs while investments compound. Popular in Australia — reduces the portfolio size needed, preserves social connection, and dramatically cuts sequence of returns risk. The &quot;barista&quot; metaphor comes from working a low-stress job with benefits.",
                  color: "bg-purple-50 border-purple-200",
                  badge: "bg-purple-100 text-purple-800",
                },
              ].map((v) => (
                <div key={v.name} className={`border rounded-xl p-5 ${v.color}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-bold text-slate-900 text-lg">{v.name}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${v.badge}`}>
                      {v.spend}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{v.number}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>

            {/* Coast FIRE */}
            <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h3 className="font-bold text-slate-900 text-lg mb-2">Coast FIRE — a milestone, not a destination</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Coast FIRE is the point at which your existing portfolio, left to compound with no
                further contributions, will reach your full FIRE number by your target age. Once
                you hit Coast FIRE, you only need to earn enough to cover current expenses — you
                can stop saving aggressively, reduce work hours, or take lower-paying work you
                enjoy.
              </p>
              <div className="bg-white rounded-lg p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Example — Coast FIRE calculation</p>
                <p className="text-sm text-slate-700">
                  FIRE number $1.5M needed in 25 years at 7% real growth. Coast FIRE balance today
                  = $1,500,000 &divide; (1.07)&sup2;&sup5; &asymp; <strong>$278,000</strong>. Once
                  you have $278,000 invested at age 35, the portfolio coasts to $1.5M by age 60
                  with zero new contributions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Australian-specific factors */}
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 4
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Australian-specific FIRE factors
            </h2>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  Superannuation preservation age (60)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  For anyone born after 30 June 1964, the preservation age is 60. You cannot
                  access your super before 60 (except in rare compassionate or severe financial
                  hardship cases). This is the single most important constraint for Australian
                  FIRE planning. Your non-super portfolio must fund 100% of your living expenses
                  from your FIRE date until you turn 60. Super balances should still be maximised
                  for the tax advantages — just treat them as locked until 60.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  Transition to Retirement (TTR) income stream
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  From age 60, the TTR allows you to draw up to 10% of your super account balance
                  per year as an income stream, even while still working. This is commonly used in
                  the final few years of the super bridge phase to supplement investment income
                  once you hit 60. TTR is not an early access mechanism — it only applies once you
                  reach preservation age.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  Medicare and PBS — important but not unlimited
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Australia&apos;s Medicare system covers GP visits, public hospital stays, and
                  subsidised pharmaceuticals via the Pharmaceutical Benefits Scheme (PBS). This
                  provides a meaningful safety net absent in many other countries, reducing the
                  catastrophic healthcare cost risk. However, Medicare does not cover dental,
                  optical, physiotherapy, psychology (beyond limited GP-referred sessions), private
                  hospital premiums, or many specialist services. Budget $3,000–$6,000/year per
                  person for out-of-pocket healthcare in your FIRE spending estimate.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  The super bridge strategy
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  The super bridge strategy is the core framework for Australian FIRE practitioners.
                  It splits your wealth into two buckets:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="font-bold text-sm text-emerald-800 mb-1">Bucket 1 — Non-super</p>
                    <p className="text-xs text-slate-600">
                      ASX/global ETFs, investment property, cash. Funds living expenses from FIRE
                      date until age 60. Must cover the entire bridge period independently of super.
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="font-bold text-sm text-blue-800 mb-1">Bucket 2 — Super</p>
                    <p className="text-xs text-slate-600">
                      Continues compounding tax-effectively. Accessed from age 60 as a
                      tax-free pension (in accumulation). Maximise with concessional contributions
                      while working.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Savings rate impact table */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 5
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              Savings rate impact on years to FIRE
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Assumes starting from zero, 7% real annual return, investing the saved portion each
              year. The single most powerful lever in your FIRE plan is your savings rate — a jump
              from 20% to 40% cuts your timeline by 15 years.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm border-collapse" aria-label="Savings rate impact on years to FIRE">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="text-left py-3 px-5 font-semibold text-slate-700 border-b border-slate-200">
                      Savings Rate
                    </th>
                    <th scope="col" className="text-left py-3 px-5 font-semibold text-slate-700 border-b border-slate-200">
                      Years to FIRE (from zero)
                    </th>
                    <th scope="col" className="text-left py-3 px-5 font-semibold text-slate-700 border-b border-slate-200">
                      Approximate retirement age (starting at 25)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SAVINGS_RATE_TABLE.map((row, i) => (
                    <tr key={row.sr} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-3 px-5 font-bold text-emerald-700 border-b border-slate-100">
                        {row.sr}
                      </td>
                      <td className="py-3 px-5 text-slate-800 border-b border-slate-100">
                        {row.years}
                      </td>
                      <td className="py-3 px-5 text-slate-500 border-b border-slate-100">
                        {row.sr === "10%"
                          ? "~71 (traditional retirement)"
                          : row.sr === "20%"
                          ? "~62"
                          : row.sr === "30%"
                          ? "~53"
                          : row.sr === "40%"
                          ? "~47"
                          : row.sr === "50%"
                          ? "~42"
                          : "~38"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              7% real return is a commonly used assumption — actual returns will differ. Starting
              with an existing portfolio shortens the timeline significantly. These projections do
              not constitute financial advice.
            </p>
          </div>
        </section>

        {/* Section 6: Investment allocation for FIRE */}
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 6
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Investment allocation for FIRE
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              FIRE portfolios typically favour high-growth, low-cost, diversified equities during
              the accumulation phase, shifting toward a more balanced allocation approaching and
              during early retirement to manage sequence risk.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">Accumulation phase (pre-FIRE)</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>VGS</strong> — Vanguard MSCI Index International Shares ETF (global
                      developed markets, AUD-unhedged)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      <strong>VAS</strong> — Vanguard Australian Shares Index ETF (ASX 300, high
                      franking credit yield)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      Low management expense ratios (&lt;0.20% p.a.) — costs compound against
                      you just as returns compound for you
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      Avoid over-diversifying across too many funds — a two-fund portfolio
                      (VGS + VAS) captures broad market exposure simply
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">
                  Early retirement phase (sequence risk buffer)
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      Hold 1–2 years of living expenses in cash or high-interest savings — do not
                      sell equities at depressed prices in early retirement
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      Consider a 10–20% bond allocation (VAF, IAF) to reduce portfolio volatility
                      once in retirement
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">&#10003;</span>
                    <span>
                      Flexible withdrawal strategy: draw from dividends first; sell units only
                      when portfolio is up
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Note on ticker references:</strong> ETF names and MERs are provided as
                general examples commonly cited in the Australian FIRE community. Always verify
                current fees, investment objectives, and product disclosure statements directly
                with the fund manager before investing. Invest.com.au does not recommend specific
                securities.
              </p>
            </div>
          </div>
        </section>

        {/* Section 7: Australian tax strategy */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 7
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Australian FIRE tax strategy
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              Australia&apos;s tax system has several features that are particularly powerful for
              FIRE practitioners — but they require deliberate structuring.
            </p>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  Concessional super contributions to reduce taxable income
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Concessional (before-tax) contributions are taxed at 15% inside super instead of
                  your marginal rate (which may be 32.5–47% during high-income working years).
                  The FY2026 concessional cap is $30,000 per year, including your employer&apos;s
                  Superannuation Guarantee (SG) contributions. Salary sacrificing the maximum while
                  you are in a high-income year can save tens of thousands in tax annually. This
                  compounds powerfully over a 10–20 year accumulation phase.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  Franking credits — cash refunds on your ASX dividends
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Fully franked dividends carry a 30% corporate tax credit (imputation credit).
                  In early retirement, when your taxable income is low, the ATO refunds excess
                  franking credits as cash. A $40,000 gross dividend from a fully franked
                  Australian share portfolio might deliver an additional $17,000 in franking
                  credit refunds — a significant cash top-up. This is why most Australian FIRE
                  portfolios maintain substantial ASX exposure alongside international ETFs.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  CGT 50% discount — hold assets for 12+ months
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Australian residents who hold assets for more than 12 months receive a 50% CGT
                  discount on capital gains. A $100,000 gain on assets held 12+ months is taxed
                  as if it were $50,000. For FIRE practitioners accumulating ETFs over many years,
                  this discount dramatically reduces the effective tax rate on portfolio
                  drawdowns. Structuring partial disposals across financial years to stay within
                  lower tax brackets is a standard FIRE optimisation.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">
                  Super in pension phase — 0% tax on income and gains
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Once you convert your super accumulation account to an account-based pension
                  (at age 60+), earnings inside the pension fund are taxed at 0% — no income tax,
                  no CGT. This is the most tax-effective investment environment available to
                  Australians. Maximising super during your working years, even if it means a
                  slightly smaller non-super portfolio, pays off significantly once you are drawing
                  from it in pension phase.
                </p>
              </div>

              <Link
                href="/tax"
                className="inline-block text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 text-sm"
              >
                Full guide to Australian investment tax, CGT, and tax-loss harvesting &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Section 8: Sequence of returns risk */}
        <section className="py-14 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 8
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Sequence of returns risk
            </h2>
            <p className="text-slate-700 leading-relaxed mb-6">
              Sequence of returns risk is the most dangerous threat to a FIRE portfolio and the
              most commonly underestimated. The <em>order</em> of investment returns matters
              enormously when you are withdrawing from a portfolio — not just the long-run average.
            </p>

            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-slate-900 mb-4">Why the first 5 years are critical</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2">
                    Scenario A — bad early returns
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    $1M portfolio, 4% withdrawal ($40K/year). Markets drop 35% in year 1. Portfolio
                    falls to $611K after withdrawal. Even if markets recover perfectly afterward,
                    you have sold significantly more units at depressed prices. Portfolio may be
                    depleted by year 20.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
                    Scenario B — good early returns
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Same $1M, same 4% withdrawal. Markets gain 25% in year 1. Portfolio grows
                    to $1.21M after withdrawal. Future downturns are absorbed from a larger base.
                    Portfolio survives comfortably for 35+ years — same 35-year average return as
                    Scenario A.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 mb-4">Mitigations</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Cash buffer",
                  desc: "Hold 1–2 years of expenses in cash or high-interest savings. Draw from cash in bad years; replenish in good years.",
                },
                {
                  title: "Flexible withdrawals",
                  desc: "Reduce spending in market downturns. Even a 10–15% spending cut in a crash year significantly improves portfolio survival.",
                },
                {
                  title: "Bond allocation",
                  desc: "A 10–20% bond or defensive allocation smooths returns and provides something to rebalance into equities from after a crash.",
                },
                {
                  title: "Part-time income",
                  desc: "Barista FIRE / consulting income in early retirement reduces withdrawal pressure exactly when it is most dangerous.",
                },
                {
                  title: "Super bridge timing",
                  desc: "Approaching age 60, you gain access to the super bucket. Sequence risk largely resolves once the super bridge is complete.",
                },
                {
                  title: "Larger buffer (3.5% SWR)",
                  desc: "Building a 28.6x portfolio instead of 25x gives a larger margin of safety for a 40+ year Australian early retirement.",
                },
              ].map((m) => (
                <div
                  key={m.title}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <p className="font-bold text-slate-900 text-sm mb-1">{m.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 9: Common FIRE mistakes */}
        <section className="py-14 bg-white">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 9
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Common FIRE mistakes for Australians
            </h2>

            <div className="space-y-3">
              {[
                {
                  num: "01",
                  title: "Ignoring superannuation",
                  desc: "Super is locked until 60 but it is also the most tax-effective accumulation vehicle available. Not maximising concessional contributions during working years — especially in high-income years — leaves significant wealth on the table. Treat super as Bucket 2 of your FIRE plan, not an afterthought.",
                },
                {
                  num: "02",
                  title: "Underestimating healthcare costs",
                  desc: "Medicare covers the basics but not dental, optical, physiotherapy, or private hospital premiums. In early retirement, without employer-subsidised private health, insurance premiums and out-of-pocket costs can reach $5,000–$10,000/year per household. Factor this into your spending estimate from day one.",
                },
                {
                  num: "03",
                  title: "Not accounting for property transaction costs",
                  desc: "Downsizing, relocating, or liquidating investment property involves stamp duty (2–5.5% of purchase price), agent commissions (~2%), CGT, and conveyancing fees. These can easily total $50,000–$100,000 on a median-priced property and are rarely modelled in FIRE projections.",
                },
                {
                  num: "04",
                  title: "Using nominal instead of real returns",
                  desc: "A 10% nominal return sounds impressive but at 3% inflation it is only 7% real. Model your FIRE projections in real terms — your spending target, your return assumption, and your FIRE number should all be in today's dollars. Mixing nominal and real numbers destroys projection accuracy.",
                },
                {
                  num: "05",
                  title: "Assuming static spending in retirement",
                  desc: "Early retirement spending is rarely constant. The &apos;go-go&apos; early years (travel, hobbies, projects) are typically higher-spend; the middle years stabilise; later years may see rising healthcare costs. Build flexibility into your withdrawal strategy rather than assuming a flat real-dollar spend.",
                },
                {
                  num: "06",
                  title: "Short-changing the bridge period",
                  desc: "A 35-year-old achieving FIRE faces a 25-year bridge period to access super at 60. That is a very long time for non-super investments to cover all expenses. Many FIRE calculators are designed for 30-year retirements starting at 65 — not 40-year retirements starting at 35. Run your projections for the full horizon.",
                },
              ].map((m) => (
                <div
                  key={m.num}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex gap-4"
                >
                  <span className="text-2xl font-extrabold text-slate-200 shrink-0 select-none">
                    {m.num}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 mb-1">{m.title}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — FIRE calculator + advisor */}
        <section className="py-14 bg-slate-50">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-emerald-600 text-white rounded-xl p-6 flex flex-col">
                <p className="text-sm font-bold uppercase tracking-wider mb-2 opacity-80">
                  Free tool
                </p>
                <h3 className="text-xl font-extrabold mb-3">FIRE Calculator</h3>
                <p className="text-sm opacity-90 leading-relaxed mb-5 flex-1">
                  Enter your current savings, savings rate, and expenses to project your FIRE
                  date, Coast FIRE number, and super bridge requirements.
                </p>
                <Link
                  href="/fire-calculator"
                  className="inline-flex items-center justify-center gap-1.5 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Open FIRE Calculator &rarr;
                </Link>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
                <p className="text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">
                  Personal advice
                </p>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                  Find a FIRE-friendly advisor
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-5 flex-1">
                  Not all financial planners are experienced with early retirement, super bridge
                  planning, or high-savings-rate clients. Find a planner who understands FIRE
                  objectives.
                </p>
                <Link
                  href="/find-advisor"
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Find an Advisor &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 10: FAQ */}
        <section className="py-14 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-8">
              Frequently asked questions about FIRE in Australia
            </h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="group bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-100 rounded-xl transition-colors">
                    {item.q}
                    <span
                      className="text-slate-500 group-open:rotate-180 transition-transform text-base ml-3 shrink-0"
                      aria-hidden="true"
                    >
                      &#x2304;
                    </span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related guides */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Related guides</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/fire-calculator"
                className="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                FIRE Calculator
              </Link>
              <Link
                href="/lump-sum-investing"
                className="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Lump Sum vs DCA Investing
              </Link>
              <Link
                href="/tax"
                className="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Australian Investment Tax &amp; CGT
              </Link>
              <Link
                href="/invest/dividend-investing"
                className="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Dividend Investing
              </Link>
              <Link
                href="/invest/smsf"
                className="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                SMSF Guide
              </Link>
              <Link
                href="/super-contributions-calculator"
                className="text-sm text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Super Contributions Calculator
              </Link>
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <footer className="py-8 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-3">
              Return projections (7% real return), withdrawal rates, and savings rate tables are
              illustrative models based on historical data. They do not constitute a forecast or
              guarantee of future returns. Past performance is not a reliable indicator of future
              performance. Investment values can fall as well as rise. Superannuation rules,
              preservation ages, contribution caps, and tax rates are subject to legislative change.
              Verify current rules with the ATO and your super fund. {UPDATED_LABEL}.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
